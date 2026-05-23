import argparse
import os
import torch
import torch.nn as nn
import torch.nn.functional as F

# ---- GATv2 Attention Layer (Pure PyTorch) ----

class GATv2Conv(nn.Module):
    def __init__(self, in_dim, out_dim, edge_dim, heads=4, dropout=0.1, residual=True):
        super().__init__()
        self.heads = heads
        self.out_dim = out_dim
        self.dropout = dropout
        self.residual = residual

        self.lin_src = nn.Linear(in_dim, out_dim * heads, bias=False)
        self.lin_dst = nn.Linear(in_dim, out_dim * heads, bias=False)
        self.lin_edge = nn.Linear(edge_dim, out_dim * heads, bias=False)
        self.attn = nn.Linear(out_dim * heads, heads, bias=False)

        self.update = nn.Sequential(
            nn.Linear(in_dim + out_dim * heads, out_dim),
            nn.LayerNorm(out_dim),
            nn.SiLU(),
            nn.Linear(out_dim, out_dim)
        )
        if residual and in_dim != out_dim:
            self.res_proj = nn.Linear(in_dim, out_dim)
        else:
            self.res_proj = nn.Identity()

    def forward(self, x, edge_index, edge_attr):
        row, col = edge_index[0], edge_index[1]
        H, D = self.heads, self.out_dim

        src = self.lin_src(x[row]).view(-1, H, D)
        dst = self.lin_dst(x[col]).view(-1, H, D)
        edge = self.lin_edge(edge_attr).view(-1, H, D)

        logits = self.attn(F.leaky_relu((src + dst + edge).reshape(-1, H * D), 0.2))
        alpha = scatter_softmax(logits, col, dim_size=x.size(0))

        alpha = F.dropout(alpha, p=self.dropout, training=self.training)
        messages = (src * alpha.unsqueeze(-1)).reshape(-1, H * D)

        aggregated = torch.zeros(x.size(0), H * D, device=x.device, dtype=x.dtype)
        aggregated.index_add_(0, col, messages)

        out = self.update(torch.cat([x, aggregated], dim=-1))
        return out + self.res_proj(x)


def scatter_softmax(logits, index, dim_size):
    orig_dtype = logits.dtype
    logits = logits.float()
    max_vals = torch.zeros(dim_size, logits.size(1), device=logits.device, dtype=torch.float32)
    max_vals.index_reduce_(0, index, logits, 'amax', include_self=False)
    exp_vals = torch.exp(logits - max_vals[index])
    sum_vals = torch.zeros(dim_size, logits.size(1), device=logits.device, dtype=torch.float32)
    sum_vals.index_add_(0, index, exp_vals)
    return (exp_vals / (sum_vals[index] + 1e-8)).to(orig_dtype)


# ---- Cross-Section Shape Encoder ----

class CrossSectionEncoder(nn.Module):
    def __init__(self, out_dim=32):
        super().__init__()
        self.mlp = nn.Sequential(
            nn.Linear(6, 64), nn.SiLU(),
            nn.Linear(64, 64), nn.SiLU(),
            nn.Linear(64, out_dim)
        )

    def forward(self, descriptors):
        return F.silu(self.mlp(descriptors))


# ---- SVRO with LayerNorm ----

class SVROperatorV2(nn.Module):
    def __init__(self, in_dim=4, hidden_dim=128):
        super().__init__()
        self.mlp = nn.Sequential(
            nn.Linear(in_dim, hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.SiLU(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.SiLU(),
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.LayerNorm(hidden_dim // 2),
            nn.SiLU(),
            nn.Linear(hidden_dim // 2, 1)
        )
        nn.init.zeros_(self.mlp[-1].weight)
        nn.init.zeros_(self.mlp[-1].bias)

    def forward(self, edge_geom):
        return torch.exp(self.mlp(edge_geom)).squeeze(-1)


# ---- PIGNN v2 ----

class PIGNNv2(nn.Module):
    def __init__(self, node_in_dim=9, edge_in_dim=5, hidden_dim=256, num_layers=8, heads=4,
                 dropout=0.1, use_uncertainty=False, use_cross_section=False):
        super().__init__()
        self.use_uncertainty = use_uncertainty
        self.use_cross_section = use_cross_section

        if use_cross_section:
            self.cs_encoder = CrossSectionEncoder(out_dim=32)
            total_node_dim = node_in_dim + 32
        else:
            total_node_dim = node_in_dim

        self.node_encoder = nn.Sequential(
            nn.Linear(total_node_dim, hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.SiLU(),
            nn.Linear(hidden_dim, hidden_dim)
        )

        self.edge_encoder = nn.Sequential(
            nn.Linear(edge_in_dim, hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.SiLU(),
            nn.Linear(hidden_dim, hidden_dim)
        )

        self.gnn_layers = nn.ModuleList([
            GATv2Conv(hidden_dim, hidden_dim, hidden_dim, heads, dropout)
            for _ in range(num_layers)
        ])

        self.p_mean_head = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim // 2), nn.SiLU(),
            nn.Linear(hidden_dim // 2, hidden_dim // 4), nn.SiLU(),
            nn.Linear(hidden_dim // 4, 1)
        )

        self.Q_head = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim // 2), nn.SiLU(),
            nn.Linear(hidden_dim // 2, hidden_dim // 4), nn.SiLU(),
            nn.Linear(hidden_dim // 4, 1)
        )

        if use_uncertainty:
            self.p_logvar_head = nn.Sequential(
                nn.Linear(hidden_dim, hidden_dim // 2), nn.SiLU(),
                nn.Linear(hidden_dim // 2, hidden_dim // 4), nn.SiLU(),
                nn.Linear(hidden_dim // 4, 1)
            )

        self.alpha_operator = SVROperatorV2(in_dim=4, hidden_dim=hidden_dim)
        self.beta_operator = SVROperatorV2(in_dim=4, hidden_dim=hidden_dim)

    def forward(self, node_features, edge_index, edge_attr, cs_features=None):
        if self.use_cross_section and cs_features is not None:
            cs_embed = self.cs_encoder(cs_features)
            h_node = self.node_encoder(torch.cat([node_features, cs_embed], dim=-1))
        else:
            h_node = self.node_encoder(node_features)

        h_edge = self.edge_encoder(edge_attr)

        for layer in self.gnn_layers:
            h_node = layer(h_node, edge_index, h_edge)

        p_mean = self.p_mean_head(h_node).squeeze(-1)
        Q_pred = self.Q_head(h_node).squeeze(-1)

        edge_geom = edge_attr[:, 1:5]
        alpha_pred = self.alpha_operator(edge_geom)
        beta_pred = self.beta_operator(edge_geom)

        if self.use_uncertainty:
            p_logvar = self.p_logvar_head(h_node).squeeze(-1)
            return p_mean, p_logvar, Q_pred, alpha_pred, beta_pred
        return p_mean, None, Q_pred, alpha_pred, beta_pred


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', type=str, required=True, help="Path to input .pt file")
    parser.add_argument('--output', type=str, required=True, help="Path to save output .pt file")
    parser.add_argument('--weights', type=str, default="/root/cardioflow/weights/pignn_pccac.pt", help="Path to model weights")
    args = parser.parse_args()

    # Determine device
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Running inference on device: {device}")

    # Load input data
    if not os.path.exists(args.input):
        print(f"Error: Input file {args.input} not found.")
        return
        
    data = torch.load(args.input, map_location=device, weights_only=False)
    node_features = data['node_features'].to(device)
    edge_index = data['edge_index'].to(device)
    edge_attr = data['edge_attr'].to(device)

    # Initialize model with GNN v2 architecture
    model = PIGNNv2(
        node_in_dim=9, 
        edge_in_dim=5, 
        hidden_dim=256, 
        num_layers=8, 
        heads=4, 
        dropout=0.1, 
        use_uncertainty=False, 
        use_cross_section=False
    )
    
    # Load weights
    if not os.path.exists(args.weights):
        # Fallback to check other paths
        weights_candidates = [
            args.weights,
            os.path.expanduser("~/cardioflow/weights/pignn_pccac.pt"),
            "/root/cardioflow/weights/pignn_pccac.pt",
            "weights/pignn_pccac.pt"
        ]
        for path in weights_candidates:
            if os.path.exists(path):
                args.weights = path
                break

    print(f"Loading weights from: {args.weights}")
    state_dict = torch.load(args.weights, map_location=device, weights_only=False)
    
    # Clean state dict keys if they have '_orig_mod' or similar wrapper prefixes
    clean_state_dict = {}
    for k, v in state_dict.items():
        name = k.replace('_orig_mod.', '')
        clean_state_dict[name] = v

    model.load_state_dict(clean_state_dict)
    model.to(device)
    model.eval()

    # Forward pass
    with torch.no_grad():
        out = model(node_features, edge_index, edge_attr)
        p_pred, p_logvar, Q_pred, alpha_pred, beta_pred = out

    # Save outputs (convert back to CPU numpy or tensors)
    output = {
        'p_pred': p_pred.cpu(),
        'Q_pred': Q_pred.cpu(),
        'alpha_pred': alpha_pred.cpu(),
        'beta_pred': beta_pred.cpu()
    }
    
    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    torch.save(output, args.output)
    print(f"Inference outputs successfully saved to {args.output}")

def run_local_inference(graph_data: dict, weights_path: str = None, device_str: str = "cpu") -> dict:
    """
    Runs PIGNNv2 GNN inference locally on the specified device.
    """
    import time
    t_start = time.perf_counter()

    if weights_path is None:
        # Default local weights path in backend
        weights_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "weights", "pignn_pccac.pt")
        if not os.path.exists(weights_path):
            # Fallback candidate
            weights_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "weights", "pignn_ffr_model.pt")

    if device_str == "cuda" and not torch.cuda.is_available():
        device_str = "cpu"

    device = torch.device(device_str)
    
    # Reconstruct tensors on target device
    node_features = torch.as_tensor(graph_data['node_features'], dtype=torch.float32, device=device)
    edge_index = torch.as_tensor(graph_data['edge_index'], dtype=torch.long, device=device)
    edge_attr = torch.as_tensor(graph_data['edge_attr'], dtype=torch.float32, device=device)

    # Initialize model with PIGNNv2 architecture
    model = PIGNNv2(
        node_in_dim=9, 
        edge_in_dim=5, 
        hidden_dim=256, 
        num_layers=8, 
        heads=4, 
        dropout=0.1, 
        use_uncertainty=False, 
        use_cross_section=False
    )

    if not os.path.exists(weights_path):
        raise FileNotFoundError(f"Local model weights not found at: {weights_path}")

    state_dict = torch.load(weights_path, map_location=device, weights_only=False)
    
    # Clean state dict keys
    clean_state_dict = {}
    for k, v in state_dict.items():
        name = k.replace('_orig_mod.', '')
        clean_state_dict[name] = v

    model.load_state_dict(clean_state_dict)
    model.to(device)
    model.eval()

    with torch.no_grad():
        out = model(node_features, edge_index, edge_attr)
        p_pred, p_logvar, Q_pred, alpha_pred, beta_pred = out

    t_duration = time.perf_counter() - t_start

    return {
        'success': True,
        'p_pred': p_pred.cpu().numpy(),
        'Q_pred': Q_pred.cpu().numpy(),
        'alpha_pred': alpha_pred.cpu().numpy(),
        'beta_pred': beta_pred.cpu().numpy(),
        'execution_mode': 'local_gpu' if device.type == 'cuda' else 'local_cpu',
        'duration_sec': t_duration
    }

if __name__ == '__main__':
    main()
