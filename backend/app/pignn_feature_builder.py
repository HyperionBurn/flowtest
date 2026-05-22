import numpy as np
import torch
import math

# Physical constants matching data_generator.py
RHO = 1060.0       # Blood density, kg/m^3
MU = 0.0035        # Blood dynamic viscosity, Pa*s
MMHG_TO_PA = 133.322
PA_TO_MMHG = 1.0 / MMHG_TO_PA

def compute_geometric_features(pts, area, dx):
    """
    Computes curvature kappa, torsion tau, and area gradient dA/ds along a 3D path.
    Matches the training script implementation exactly.
    """
    diffs = np.diff(pts, axis=0)
    dists = np.linalg.norm(diffs, axis=1)
    s = np.concatenate([[0.0], np.cumsum(dists)])
    
    if s[-1] < 1e-7:
        s = np.linspace(0, 1e-5, len(pts))
        
    r_prime = np.zeros_like(pts)
    r_double_prime = np.zeros_like(pts)
    r_triple_prime = np.zeros_like(pts)
    
    for dim in range(3):
        r_prime[:, dim] = np.gradient(pts[:, dim], s)
        r_double_prime[:, dim] = np.gradient(r_prime[:, dim], s)
        r_triple_prime[:, dim] = np.gradient(r_double_prime[:, dim], s)
        
    cross_product = np.cross(r_prime, r_double_prime)
    cross_norm = np.linalg.norm(cross_product, axis=1)
    r_prime_norm = np.linalg.norm(r_prime, axis=1)
    
    kappa = cross_norm / (r_prime_norm**3 + 1e-8)
    
    numerator = np.sum(cross_product * r_triple_prime, axis=1)
    denominator = cross_norm**2
    tau = numerator / (denominator + 1e-8)
    
    grad_A = np.gradient(area, s)
    
    return kappa.astype(np.float32), tau.astype(np.float32), grad_A.astype(np.float32)

def build_graph_from_patient(pat: dict) -> dict:
    """
    Converts a patient record dict (having seg0, seg1, seg2, and params)
    into normalized PyTorch tensors for node features, edge index, and edge attributes.
    """
    # 1. Determine number of nodes per segment
    NX0 = len(pat['seg0']['diameter'])
    NX1 = len(pat['seg1']['diameter'])
    NX2 = len(pat['seg2']['diameter'])
    NUM_NODES = NX0 + NX1 + NX2
    
    # 2. Extract or build 3D coordinates
    L0 = pat['params'].get('L0', 0.02)
    L1 = pat['params'].get('L1', 0.08)
    L2 = pat['params'].get('L2', 0.06)
    
    if 'points_3d' not in pat['seg0']:
        t0 = np.linspace(0, 1, NX0)
        pts0 = np.column_stack([np.zeros(NX0), np.zeros(NX0), t0 * L0])
        t1 = np.linspace(0, 1, NX1)
        pts1 = np.column_stack([0.015 * np.sin(np.pi * t1), 0.015 * (1.0 - np.cos(np.pi * t1)), L0 + t1 * L1])
        t2 = np.linspace(0, 1, NX2)
        pts2 = np.column_stack([0.012 * np.sin(-np.pi * t2), 0.012 * (1.0 - np.cos(-np.pi * t2)), L0 + t2 * L2])
    else:
        # Convert list of coordinates (if json loaded) to numpy arrays
        pts0 = np.array(pat['seg0']['points_3d'])
        pts1 = np.array(pat['seg1']['points_3d'])
        pts2 = np.array(pat['seg2']['points_3d'])
        
    # 3. Calculate geometric features (curvature, torsion, area gradient)
    dx0 = L0 / (NX0 - 1)
    dx1 = L1 / (NX1 - 1)
    dx2 = L2 / (NX2 - 1)
    
    area0 = np.array(pat['seg0']['area'])
    area1 = np.array(pat['seg1']['area'])
    area2 = np.array(pat['seg2']['area'])
    
    kappa0, tau0, grad_A0 = compute_geometric_features(pts0, area0, dx0)
    kappa1, tau1, grad_A1 = compute_geometric_features(pts1, area1, dx1)
    kappa2, tau2, grad_A2 = compute_geometric_features(pts2, area2, dx2)
    
    node_kappa = np.concatenate([kappa0, kappa1, kappa2])
    node_tau = np.concatenate([tau0, tau1, tau2])
    node_grad_A = np.concatenate([grad_A0, grad_A1, grad_A2])
    
    # 4. Build node features: [x, Area, P_inlet, R_outlet, is_inlet, is_outlet, is_bifurcation, R_visc_cum, A_min_upstream]
    node_feats = np.zeros((NUM_NODES, 9), dtype=np.float32)
    
    # Segment 0 (Main Stem)
    r0 = 128.0 * MU / (np.pi * (np.array(pat['seg0']['diameter']) ** 4)) * dx0
    r0_cum = np.cumsum(r0)
    a0_min = np.minimum.accumulate(area0)
    for i in range(NX0):
        node_feats[i, 0] = (i / (NX0 - 1)) * L0  # local x
        node_feats[i, 1] = area0[i]
        node_feats[i, 2] = pat['p_in'] if i == 0 else 0.0
        node_feats[i, 4] = 1.0 if i == 0 else 0.0  # is_inlet
        node_feats[i, 6] = 1.0 if i == NX0 - 1 else 0.0  # is_bifurcation
        node_feats[i, 7] = r0_cum[i]
        node_feats[i, 8] = a0_min[i]
        
    # Segment 1 (LAD)
    r1 = 128.0 * MU / (np.pi * (np.array(pat['seg1']['diameter']) ** 4)) * dx1
    r1_cum = r0_cum[-1] + np.cumsum(r1)
    a1_min = np.minimum(a0_min[-1], np.minimum.accumulate(area1))
    for i in range(NX1):
        idx_node = NX0 + i
        node_feats[idx_node, 0] = (i / (NX1 - 1)) * L1
        node_feats[idx_node, 1] = area1[i]
        node_feats[idx_node, 3] = pat['R1'] if i == NX1 - 1 else 0.0
        node_feats[idx_node, 5] = 1.0 if i == NX1 - 1 else 0.0  # is_outlet
        node_feats[idx_node, 7] = r1_cum[i]
        node_feats[idx_node, 8] = a1_min[i]
        
    # Segment 2 (LCx)
    r2 = 128.0 * MU / (np.pi * (np.array(pat['seg2']['diameter']) ** 4)) * dx2
    r2_cum = r0_cum[-1] + np.cumsum(r2)
    a2_min = np.minimum(a0_min[-1], np.minimum.accumulate(area2))
    for i in range(NX2):
        idx_node = NX0 + NX1 + i
        node_feats[idx_node, 0] = (i / (NX2 - 1)) * L2
        node_feats[idx_node, 1] = area2[i]
        node_feats[idx_node, 3] = pat['R2'] if i == NX2 - 1 else 0.0
        node_feats[idx_node, 5] = 1.0 if i == NX2 - 1 else 0.0  # is_outlet
        node_feats[idx_node, 7] = r2_cum[i]
        node_feats[idx_node, 8] = a2_min[i]
        
    # 5. Normalization scalers to keep values O(1)
    node_feats[:, 0] /= 0.08  # Normalize lengths by max length (approx 0.08 m)
    node_feats[:, 1] *= 1e5   # Scale areas (m^2 -> scale by 100,000)
    node_feats[:, 2] /= (100.0 * MMHG_TO_PA)  # Normalize inlet pressure by 100 mmHg
    node_feats[:, 3] /= 3e9   # Normalize resistances by 3.0e9 Pa*s/m^3
    node_feats[:, 7] /= 3e9   # Normalize cumulative resistance by 3.0e9 Pa*s/m^3
    node_feats[:, 8] *= 1e5   # Scale minimum upstream area (m^2 -> scale by 100,000)
    
    # 6. Build edge index: chain connections + bifurcation connections
    edges_from = []
    edges_to = []
    
    # Seg 0
    for k in range(NX0 - 1):
        edges_from.extend([k, k + 1])
        edges_to.extend([k + 1, k])
        
    # Seg 1
    for k in range(NX1 - 1):
        u = NX0 + k
        v = NX0 + k + 1
        edges_from.extend([u, v])
        edges_to.extend([v, u])
        
    # Seg 2
    for k in range(NX2 - 1):
        u = NX0 + NX1 + k
        v = NX0 + NX1 + k + 1
        edges_from.extend([u, v])
        edges_to.extend([v, u])
        
    # Bifurcation
    u_bif = NX0 - 1
    v_seg1 = NX0
    v_seg2 = NX0 + NX1
    edges_from.extend([u_bif, v_seg1, v_seg1, u_bif])
    edges_to.extend([v_seg1, u_bif, u_bif, v_seg1])
    
    edges_from.extend([u_bif, v_seg2, v_seg2, u_bif])
    edges_to.extend([v_seg2, u_bif, u_bif, v_seg2])
    
    edge_index = torch.tensor([edges_from, edges_to], dtype=torch.long)
    
    # 7. Build edge features: [dx, average_area, curvature, torsion, area_gradient]
    num_edges = edge_index.size(1)
    edge_attr = np.zeros((num_edges, 5), dtype=np.float32)
    
    row, col = edge_index[0].numpy(), edge_index[1].numpy()
    for e in range(num_edges):
        u, v = row[e], col[e]
        if u < NX0 and v < NX0:
            dx_val = L0 / (NX0 - 1)
        elif u >= NX0 and u < NX0 + NX1 and v >= NX0 and v < NX0 + NX1:
            dx_val = L1 / (NX1 - 1)
        elif u >= NX0 + NX1 and v >= NX0 + NX1:
            dx_val = L2 / (NX2 - 1)
        else:
            dx_val = 0.001  # bifurcation bridge
            
        edge_attr[e, 0] = dx_val
        edge_attr[e, 1] = 0.5 * (node_feats[u, 1] + node_feats[v, 1])
        edge_attr[e, 2] = 0.5 * (node_kappa[u] + node_kappa[v]) / 100.0
        edge_attr[e, 3] = 0.5 * (node_tau[u] + node_tau[v]) / 100.0
        edge_attr[e, 4] = 0.5 * (node_grad_A[u] + node_grad_A[v]) * 1000.0
        
    return {
        'node_features': torch.tensor(node_feats, dtype=torch.float32),
        'edge_index': edge_index,
        'edge_attr': torch.tensor(edge_attr, dtype=torch.float32),
        'p_inlet_val': torch.tensor(pat['p_in'], dtype=torch.float32),
        'p_venous_val': torch.tensor(pat['p_v'], dtype=torch.float32),
        'R1_val': torch.tensor(pat['R1'], dtype=torch.float32),
        'R2_val': torch.tensor(pat['R2'], dtype=torch.float32),
        'NX0': NX0,
        'NX1': NX1,
        'NX2': NX2,
        # Keep 3D coordinates for returning to the frontend/rendering
        'points_3d_0': pts0.tolist(),
        'points_3d_1': pts1.tolist(),
        'points_3d_2': pts2.tolist()
    }

def construct_patient_from_clinical(
    lesion_severity: float,
    aortic_velocity: float,
    bp_systolic: float,
    patient_age: int = 62,
    patient_sex: str = 'M',
    num_nodes_per_seg: int = 40
) -> dict:
    """
    Constructs a synthetic patient coronary tree structure based on clinical inputs,
    applying a Gaussian stenosis on the LAD (Segment 1) and a smaller stenosis on the LCx (Segment 2).
    """
    p_inlet_mmhg = bp_systolic
    p_venous_mmhg = 5.0
    
    # Standard geometry parameters (in meters)
    L0 = 0.02
    L1 = 0.08
    L2 = 0.06
    
    d_in0 = 0.0040
    d_out0 = 0.0038
    d_in1 = 0.0035
    d_out1 = 0.0025
    d_in2 = 0.0032
    d_out2 = 0.0022
    
    # 1. Main Stem (Segment 0)
    x0 = np.linspace(0, L0, num_nodes_per_seg)
    d0 = d_in0 - (d_in0 - d_out0) * (x0 / L0)
    area0 = 0.25 * np.pi * (d0 ** 2)
    
    # 2. LAD (Segment 1) - Apply Primary Stenosis
    x1 = np.linspace(0, L1, num_nodes_per_seg)
    d1_healthy = d_in1 - (d_in1 - d_out1) * (x1 / L1)
    area1_healthy = 0.25 * np.pi * (d1_healthy ** 2)
    
    # Apply Gaussian stenosis to LAD (severity is area reduction fraction)
    severity_frac = lesion_severity / 100.0
    stenosis_center_rel = 0.5
    stenosis_width_rel = 0.08
    gaussian_reduction_1 = severity_frac * np.exp(
        -0.5 * ((x1 - stenosis_center_rel * L1) / (stenosis_width_rel * L1)) ** 2
    )
    area1 = area1_healthy * (1.0 - gaussian_reduction_1)
    d1 = 2.0 * np.sqrt(area1 / np.pi)
    
    # 3. LCx (Segment 2) - Apply Secondary Stenosis (half the severity of LAD)
    x2 = np.linspace(0, L2, num_nodes_per_seg)
    d2_healthy = d_in2 - (d_in2 - d_out2) * (x2 / L2)
    area2_healthy = 0.25 * np.pi * (d2_healthy ** 2)
    
    # Secondary stenosis is 30% or 0.3 * severity of LAD
    sec_severity = 0.3 * severity_frac
    gaussian_reduction_2 = sec_severity * np.exp(
        -0.5 * ((x2 - stenosis_center_rel * L2) / (stenosis_width_rel * L2)) ** 2
    )
    area2 = area2_healthy * (1.0 - gaussian_reduction_2)
    d2 = 2.0 * np.sqrt(area2 / np.pi)
    
    # Setup boundary microvascular resistances
    # If velocity is high, resistance is lower (to model hyperemic state)
    # Target Combined Resting Flow ~ 1.6 ml/s = 1.6e-6 m^3/s
    # Flow Q = A_inlet * velocity
    A0_inlet = 0.25 * np.pi * (d_in0 ** 2)
    Q0 = A0_inlet * aortic_velocity
    
    # Solve for boundary resistances that yield this flow:
    # Typical: R1 = 2.5e9, R2 = 3.5e9
    # Let's adjust them inversely with aortic_velocity
    R_scale = 0.25 / max(aortic_velocity, 0.05)
    R1 = 2.5e9 * R_scale
    R2 = 3.5e9 * R_scale
    
    # Build 3D coordinates with realistic helical perturbations
    t0 = np.linspace(0, 1, num_nodes_per_seg)
    pts0 = np.column_stack([np.zeros(num_nodes_per_seg), np.zeros(num_nodes_per_seg), t0 * L0])
    
    t1 = np.linspace(0, 1, num_nodes_per_seg)
    pts1 = np.column_stack([0.015 * np.sin(np.pi * t1), 0.015 * (1.0 - np.cos(np.pi * t1)), L0 + t1 * L1])
    
    t2 = np.linspace(0, 1, num_nodes_per_seg)
    pts2 = np.column_stack([0.012 * np.sin(-np.pi * t2), 0.012 * (1.0 - np.cos(-np.pi * t2)), L0 + t2 * L2])
    
    patient = {
        'id': 0,
        'p_in': p_inlet_mmhg * MMHG_TO_PA,
        'p_v': p_venous_mmhg * MMHG_TO_PA,
        'R1': R1,
        'R2': R2,
        'params': {
            'L0': L0, 'L1': L1, 'L2': L2,
            'd_in0': d_in0, 'd_out0': d_out0,
            'd_in1': d_in1, 'd_out1': d_out1,
            'd_in2': d_in2, 'd_out2': d_out2,
            'NX0': num_nodes_per_seg,
            'NX1': num_nodes_per_seg,
            'NX2': num_nodes_per_seg
        },
        'seg0': {
            'diameter': d0.tolist(),
            'area': area0.tolist(),
            'points_3d': pts0.tolist()
        },
        'seg1': {
            'diameter': d1.tolist(),
            'area': area1.tolist(),
            'points_3d': pts1.tolist()
        },
        'seg2': {
            'diameter': d2.tolist(),
            'area': area2.tolist(),
            'points_3d': pts2.tolist()
        }
    }
    return patient
