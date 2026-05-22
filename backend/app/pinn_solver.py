import torch
import torch.nn as nn
import numpy as np
import time
import math

class FlowMLP(nn.Module):
    """
    Lightweight MLP representing the pressure deviation field.
    """
    def __init__(self, hidden_dim=20):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(1, hidden_dim),
            nn.Tanh(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.Tanh(),
            nn.Linear(hidden_dim, 1)
        )
        
    def forward(self, x):
        return self.net(x)

def solve_1d_pinn(
    severity: float = 55.0,
    aortic_velocity: float = 0.25,
    aortic_pressure: float = 90.0,
    vessel_length: float = 10.0,
    reference_radius: float = 0.002,
    num_nodes: int = 100,
    epochs: int = 200,
    lr: float = 0.02,
) -> dict:
    """
    Solves the 1D Navier-Stokes equations along a stenosed vessel
    using a Physics-Informed Neural Network (PINN) in PyTorch.
    
    Optimized for real-time web responses (< 1.0 second execution):
    - Uses Physics-Guided Baseline: NN learns deviations from a Hagen-Poiseuille baseline.
    - Loss scaling: normalizes Navier-Stokes residuals for fast convergence.
    - Captures 41 snapshots (every 5 epochs of a 200-epoch run) for frontend playback.
    """
    t_start = time.perf_counter()
    
    # Physical Constants
    RHO = 1050.0  # kg/m^3 (blood density)
    MU = 0.0035   # Pa*s (blood viscosity)
    K_T = 1.52    # Young-Tsai separation loss coefficient
    SIGMA = 0.35  # Stenosis width parameter (cm)
    
    # Scale aortic pressure from mmHg to Pascals (Pa)
    P_inlet_pa = aortic_pressure * 133.322
    
    # Geometry Setup
    s = severity / 100.0
    x_center = vessel_length / 2.0
    r0 = reference_radius
    
    # Volumetric flow rate from inlet boundary condition
    A_inlet = math.pi * r0**2
    Q = A_inlet * aortic_velocity
    
    # Setup PyTorch model
    torch.manual_seed(42)
    model = FlowMLP(hidden_dim=16)
    optimizer = torch.optim.Adam(model.parameters(), lr=lr)
    
    # Collocation grid for training
    n_train = 40
    x_train_grid = np.linspace(0, vessel_length, n_train, dtype=np.float32)
    x_tensor = torch.tensor(x_train_grid, requires_grad=True).unsqueeze(-1)
    x_m = x_tensor * 0.01  # convert cm to m
    
    # Radius profile: r(x) = r0 * (1 - s * exp(-(x - x_center)^2 / (2 * SIGMA^2)))
    r_tensor = r0 * (1.0 - s * torch.exp(-((x_tensor - x_center) ** 2) / (2.0 * SIGMA**2)))
    A_tensor = math.pi * r_tensor**2
    v_tensor = Q / A_tensor
    A_min = torch.min(A_tensor)
    
    # Compute analytical dv/dx using autograd (wrt x_tensor, convert to per-meter)
    dv_dx = torch.autograd.grad(
        v_tensor, x_tensor, 
        grad_outputs=torch.ones_like(v_tensor), 
        create_graph=True
    )[0]
    dv_dm = dv_dx / 0.01  # dv/dx per meter
    
    # Separation loss density downstream of the throat (expansion region)
    dp_sep_total = (RHO * K_T / (2.0 * A_inlet**2)) * ((A_inlet / A_min) - 1.0)**2 * Q**2
    
    sigma_s = 0.8  # cm
    mean_s = x_center + 1.0  # cm
    phi_x = torch.exp(-((x_tensor - mean_s) ** 2) / (2.0 * sigma_s**2)) / (sigma_s * math.sqrt(2.0 * math.pi))
    mask = (x_tensor > x_center).float()
    f_separation = dp_sep_total * phi_x * mask * 100.0  # Scale by 100 for per-meter loss
    
    # Output grid for interpolation
    x_out_grid = np.linspace(0, vessel_length, num_nodes, dtype=np.float32)
    x_out_tensor = torch.tensor(x_out_grid).unsqueeze(-1)
    
    # Analytical curves for output grid
    r_out = r0 * (1.0 - s * np.exp(-((x_out_grid - x_center) ** 2) / (2.0 * SIGMA**2)))
    A_out = np.pi * r_out**2
    v_out = Q / A_out
    
    # Hagen-Poiseuille baseline pressure drop (in Pa)
    dp_dx_baseline = (8.0 * MU * Q) / (math.pi * r0**4)
    
    # We normalise residuals by P_inlet_pa/100 to get a stable, O(1) loss
    scale_factor = P_inlet_pa / 100.0  
    
    history = []
    
    for epoch in range(epochs + 1):
        optimizer.zero_grad()
        
        # Physics-Guided ansatz:
        # P_baseline = P_inlet - x_m * dP_dx_baseline
        # P_pred = P_baseline - x_m * NN(x)
        # Enforces P(0) = P_inlet exactly and starts from Poiseuille solution
        P_baseline = P_inlet_pa - x_m * dp_dx_baseline
        P_pred = P_baseline - x_m * model(x_tensor)
        
        # dP/dx via autograd (differentiate wrt x_tensor and divide by 0.01 for Pa/m)
        dP_dx = torch.autograd.grad(
            P_pred, x_tensor, 
            grad_outputs=torch.ones_like(P_pred), 
            create_graph=True
        )[0]
        dP_dm = dP_dx / 0.01
        
        # Navier-Stokes Momentum Residual
        viscous_term = (8.0 * math.pi * MU * v_tensor) / A_tensor
        convective_term = RHO * v_tensor * dv_dm
        pde_residual = dP_dm + convective_term + viscous_term + f_separation
        
        # Normalized PDE loss
        loss_pde = torch.mean((pde_residual / scale_factor) ** 2)
        
        # Physiological constraint floor (5 mmHg)
        p_floor = 5.0 * 133.322
        loss_floor = torch.mean(torch.relu(p_floor - P_pred) ** 2) / scale_factor
        
        loss = loss_pde + 50.0 * loss_floor
        loss.backward(retain_graph=True)
        optimizer.step()
        
        # Capture snapshot every 5 epochs
        if epoch % 5 == 0 or epoch == epochs:
            with torch.no_grad():
                # Predict on 100-node output grid
                P_baseline_out = P_inlet_pa - (x_out_tensor * 0.01) * dp_dx_baseline
                P_pred_out = P_baseline_out - (x_out_tensor * 0.01) * model(x_out_tensor)
                p_out_mmHg = P_pred_out.squeeze().numpy() / 133.322
                ffr_out = p_out_mmHg / p_out_mmHg[0]
                
                # Compute residual metrics on training grid
                current_residual = float(torch.max(torch.abs(pde_residual)).item())
                
                history.append({
                    "epoch": epoch,
                    "loss": float(loss.item()),
                    "pde_loss": float(loss_pde.item()),
                    "floor_loss": float(loss_floor.item()),
                    "min_ffr": float(np.min(ffr_out)),
                    "ffr_curve": [round(float(val), 4) for val in ffr_out],
                    "pressure_curve": [round(float(val), 2) for val in p_out_mmHg],
                    "velocity_curve": [round(float(val), 4) for val in v_out],
                    "residual": current_residual
                })
                
    t_end = time.perf_counter()
    processing_time = t_end - t_start
    
    final_state = history[-1]
    
    return {
        "min_ffr_value": round(final_state["min_ffr"], 4),
        "stenosis_location": 0.5,
        "ffr_curve": [{"x": round(float(x_out_grid[i]), 3), "value": final_state["ffr_curve"][i]} for i in range(num_nodes)],
        "velocity_curve": [{"x": round(float(x_out_grid[i]), 3), "value": final_state["velocity_curve"][i]} for i in range(num_nodes)],
        "pressure_curve": [{"x": round(float(x_out_grid[i]), 3), "value": final_state["pressure_curve"][i]} for i in range(num_nodes)],
        "mesh_nodes_calculated": num_nodes,
        "pinn_residual": float(final_state["residual"]),
        "processing_time_sec": round(processing_time, 3),
        "training_history": history
    }
