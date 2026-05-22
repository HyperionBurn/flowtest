import numpy as np
import time


def solve_1d_navier_stokes(
    severity: float = 55.0,
    aortic_velocity: float = 0.25,
    aortic_pressure: float = 90.0,
    vessel_length: float = 10.0,
    reference_radius: float = 0.002,
    num_nodes: int = 200,
) -> dict:
    """
    1D Navier-Stokes blood flow solver using finite difference method
    with Young-Tsai stenosis pressure drop model.

    Returns dict with ffr_curve, velocity_curve, pressure_curve,
    min_ffr_value, stenosis_location, etc.
    """

    t_start = time.perf_counter()

    RHO = 1050.0
    MU = 0.0035
    K_T = 1.52
    SIGMA = 0.35

    pressure_pa = aortic_pressure * 133.322

    s = severity / 100.0
    stenosis_center = vessel_length / 2
    x = np.linspace(0, vessel_length, num_nodes)
    r0 = reference_radius

    r = r0 * (1.0 - s * np.exp(-((x - stenosis_center) ** 2) / (2 * SIGMA**2)))
    A = np.pi * r**2

    A_min = np.min(A)
    stenosis_idx = np.argmin(A)
    stenosis_loc_norm = float(x[stenosis_idx] / vessel_length)

    # Steady-state: Q = constant from continuity
    Q = A[0] * aortic_velocity

    # Velocity field from continuity
    v = Q / (A + 1e-20)

    # Pressure field via finite difference with Young-Tsai loss model
    L_cm_to_m = 0.01
    p = np.zeros(num_nodes)
    p[0] = pressure_pa

    for i in range(1, num_nodes):
        dx_m = (x[i] - x[i - 1]) * L_cm_to_m

        A_i = A[i]
        A_prev = A[i - 1]
        r_avg = (r[i] + r[i - 1]) / 2.0

        # Poiseuille viscous loss
        viscous_loss = (8.0 * MU * dx_m * Q) / (np.pi * r_avg**4 + 1e-20)

        # Bernoulli energy conversion
        v_i = Q / (A_i + 1e-20)
        v_prev = Q / (A_prev + 1e-20)
        bernoulli_dp = 0.5 * RHO * (v_prev**2 - v_i**2)

        # Young-Tsai separation loss (expansion only)
        sep_loss = 0.0
        if A_i > 0 and A_prev > A_i:
            exp_ratio = (A_prev / A_i) - 1.0
            sep_loss = (RHO * K_T / (2.0 * A_prev**2)) * exp_ratio**2 * Q**2

        # Net pressure change: negative viscous, Bernoulli can be + or -, sep is loss
        dp_dx = -viscous_loss + bernoulli_dp - sep_loss
        p[i] = p[i - 1] + dp_dx

    # FFR with physiological floor (P_distal never drops below venous pressure ~5 mmHg)
    p_floor = 5.0 * 133.322
    p_clamped = np.clip(p, p_floor, None)
    ffr = float(p_clamped[-1] / p_clamped[0])
    ffr_curve = np.clip(p / (p[0] + 1e-20), 0.0, 1.0)

    # Residual
    residual = float(np.max(np.abs(np.gradient(p_clamped) / (np.clip(p_clamped, 1e-10, None)))))

    # Decimate curves for API response
    n_out = min(num_nodes, 200)

    def decimate(arr):
        if len(arr) <= n_out:
            return [{"x": round(float(x[j]), 3), "value": round(float(arr[j]), 6)} for j in range(len(arr))]
        indices = np.linspace(0, len(arr) - 1, n_out, dtype=int)
        return [{"x": round(float(x[j]), 3), "value": round(float(arr[j]), 6)} for j in indices]

    processing_time = time.perf_counter() - t_start

    return {
        "min_ffr_value": round(ffr, 4),
        "stenosis_location": round(stenosis_loc_norm, 4),
        "ffr_curve": decimate(ffr_curve),
        "velocity_curve": decimate(v),
        "pressure_curve": decimate(p_clamped / 133.322),
        "mesh_nodes_calculated": num_nodes,
        "pinn_residual": round(residual, 10),
        "processing_time_sec": round(processing_time, 3),
    }
