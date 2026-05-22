import torch
import torch.nn as nn

class CustomGNNLayer(nn.Module):
    """
    Custom message passing Graph Neural Network layer in pure PyTorch.
    Aggregates edge-wise messages to update node representations.
    """
    def __init__(self, in_features, out_features, edge_features_dim):
        super(CustomGNNLayer, self).__init__()
        self.message_mlp = nn.Sequential(
            nn.Linear(2 * in_features + edge_features_dim, out_features),
            nn.LayerNorm(out_features),
            nn.SiLU(),
            nn.Linear(out_features, out_features)
        )
        self.update_mlp = nn.Sequential(
            nn.Linear(in_features + out_features, out_features),
            nn.LayerNorm(out_features),
            nn.SiLU(),
            nn.Linear(out_features, out_features)
        )

    def forward(self, x, edge_index, edge_attr):
        # x: [num_nodes, in_features]
        # edge_index: [2, num_edges] (long tensor)
        # edge_attr: [num_edges, edge_features_dim]
        
        row, col = edge_index[0], edge_index[1]
        
        # Gather source and target node features
        x_source = torch.index_select(x, 0, row)  # [num_edges, in_features]
        x_target = torch.index_select(x, 0, col)  # [num_edges, in_features]
        
        # Compute message
        msg_input = torch.cat([x_source, x_target, edge_attr], dim=-1)
        messages = self.message_mlp(msg_input)     # [num_edges, out_features]
        
        # Aggregate messages (sum pooling to target nodes)
        num_nodes = x.size(0)
        aggregated = torch.zeros(num_nodes, messages.size(1), dtype=x.dtype, device=x.device)
        aggregated.index_add_(0, col, messages)
        
        # Node update
        update_input = torch.cat([x, aggregated], dim=-1)
        out = self.update_mlp(update_input)        # [num_nodes, out_features]
        return out

class SVROperator(nn.Module):
    """
    Spatially Varying Neural Resistance Operator (SVRO) MLP.
    Maps local 3D geometric features [average_area, curvature, torsion, area_gradient]
    to correction factors. Final layer is initialized to zero and exponentiated to
    ensure initial correction factor is exactly 1.0.
    """
    def __init__(self, in_dim=4, hidden_dim=64):
        super(SVROperator, self).__init__()
        self.mlp = nn.Sequential(
            nn.Linear(in_dim, hidden_dim),
            nn.SiLU(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.SiLU(),
            nn.Linear(hidden_dim, 1)
        )
        # Initialize final weights and bias to zero so exp(0) = 1.0
        nn.init.zeros_(self.mlp[-1].weight)
        nn.init.zeros_(self.mlp[-1].bias)

    def forward(self, edge_geom):
        return torch.exp(self.mlp(edge_geom)).squeeze(-1)

class PIGNN(nn.Module):
    """
    Physics-Informed Graph Neural Network for multi-branch coronary tree FFR.
    Predicts continuous pressure p and flow Q fields at every node.
    Incorporates SVRO correction factor predictions on edges.
    """
    def __init__(self, node_in_dim=9, edge_in_dim=5, hidden_dim=128, num_layers=6):
        super(PIGNN, self).__init__()
        
        self.node_encoder = nn.Sequential(
            nn.Linear(node_in_dim, hidden_dim),
            nn.SiLU(),
            nn.Linear(hidden_dim, hidden_dim)
        )
        
        self.edge_encoder = nn.Sequential(
            nn.Linear(edge_in_dim, hidden_dim),
            nn.SiLU(),
            nn.Linear(hidden_dim, hidden_dim)
        )
        
        # Message passing layers
        self.gnn_layers = nn.ModuleList([
            CustomGNNLayer(hidden_dim, hidden_dim, hidden_dim) 
            for _ in range(num_layers)
        ])
        
        # Predictor heads: separate heads for pressure and flow
        self.p_regressor = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim),
            nn.SiLU(),
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.SiLU(),
            nn.Linear(hidden_dim // 2, 1)  # [p_predicted]
        )
        
        self.Q_regressor = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim),
            nn.SiLU(),
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.SiLU(),
            nn.Linear(hidden_dim // 2, 1)  # [Q_predicted]
        )

        # Spatially Varying Neural Resistance Operators
        self.alpha_operator = SVROperator(in_dim=4, hidden_dim=hidden_dim)
        self.beta_operator = SVROperator(in_dim=4, hidden_dim=hidden_dim)

    def forward(self, node_features, edge_index, edge_attr):
        """
        node_features: [num_nodes, node_in_dim]
        edge_index: [2, num_edges]
        edge_attr: [num_edges, edge_in_dim]
        """
        # Encode initial features
        h_node = self.node_encoder(node_features)  # [num_nodes, hidden_dim]
        h_edge = self.edge_encoder(edge_attr)      # [num_edges, hidden_dim]
        
        # Perform message passing
        for layer in self.gnn_layers:
            h_node = layer(h_node, edge_index, h_edge) + h_node  # residual connection
            
        # Predict pressure and flow using separate heads
        p_pred = self.p_regressor(h_node).squeeze(-1)  # [num_nodes]
        Q_pred = self.Q_regressor(h_node).squeeze(-1)  # [num_nodes]
        
        # Extract edge geometric features [average_area, curvature, torsion, area_gradient]
        edge_geom = edge_attr[:, 1:]  # [num_edges, 4]
        alpha_pred = self.alpha_operator(edge_geom)
        beta_pred = self.beta_operator(edge_geom)
        
        return p_pred, Q_pred, alpha_pred, beta_pred
