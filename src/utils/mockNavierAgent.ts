import { type AnalyzeResponse, type CurvePoint, type PinnTrainingSnapshot } from '../store/useAppStore';

export function generateMockNavierAgentResults(clinical: {
  patientId: string;
  age: number;
  sex: 'M' | 'F';
  bp: number;
  totalCholesterol: number;
  hdl: number;
  isSmoker: boolean;
  hasDiabetes: boolean;
  severity: number;
  velocity: number;
}): AnalyzeResponse {
  const { 
    patientId, age, sex, bp, totalCholesterol, hdl, isSmoker, hasDiabetes, severity, velocity 
  } = clinical;
  
  const s = severity / 100.0;
  const baseDrop = Math.pow(s, 2) * (velocity / 0.25) * 0.45;
  const minFfrVal = Math.max(0.40, 1.0 - baseDrop);
  const pinn_res_val = 4.12e-7;

  const ffr_curve: CurvePoint[] = [];
  const pressure_curve: CurvePoint[] = [];
  const velocity_curve: CurvePoint[] = [];
  
  const x_vals = Array.from({ length: 100 }, (_, i) => i * 0.1);
  const r0 = 8.0;

  for (let i = 0; i < 100; i++) {
    const x = x_vals[i];
    const z = (i - 50) * 0.8; // Map index 0-99 to z [-40, 40]
    
    // FFR drop around stenosis throat (index 50)
    const localFFR = 1.0 - (1.0 - minFfrVal) / (1 + Math.exp(-z / 5));
    ffr_curve.push({ x, value: localFFR });
    
    // Pressure curve in mmHg
    pressure_curve.push({ x, value: localFFR * bp });
    
    // Velocity curve (continuity spike)
    const radiusRatio = 1.0 - s * Math.exp(-(z * z) / 150);
    const localSpeed = velocity / Math.pow(radiusRatio, 2);
    velocity_curve.push({ x, value: localSpeed });
  }

  // Generate simulated training history (epochs 0 to 200, steps of 5)
  const training_history: PinnTrainingSnapshot[] = [];
  for (let epoch = 0; epoch <= 200; epoch += 5) {
    const gamma = epoch / 200.0;
    
    // Interpolate curves for each epoch
    const ffr_e = ffr_curve.map(c => 1.0 - (1.0 - c.value) * gamma);
    const pressure_e = pressure_curve.map(c => bp - (bp - c.value) * gamma);
    const velocity_e = velocity_curve.map(c => velocity + (c.value - velocity) * gamma);
    
    // Loss decays
    const loss_decay = 1.2 * Math.pow(0.95, epoch / 5) + pinn_res_val;
    const pde_loss_decay = 1.0 * Math.pow(0.95, epoch / 5) + 1.2e-6;
    const floor_loss_decay = 0.2 * Math.pow(0.95, epoch / 5) + 3.0e-7;
    const res_decay = 5.0e-4 * Math.pow(0.95, epoch / 5) + pinn_res_val;
    
    training_history.push({
      epoch,
      loss: loss_decay,
      pde_loss: pde_loss_decay,
      floor_loss: floor_loss_decay,
      min_ffr: Math.min(...ffr_e),
      ffr_curve: ffr_e,
      pressure_curve: pressure_e,
      velocity_curve: velocity_e,
      residual: res_decay
    });
  }

  return {
    success: true,
    results: {
      min_ffr_value: minFfrVal,
      stenosis_location: 5.0,
      ffr_curve,
      velocity_curve,
      pressure_curve,
      mesh_nodes_calculated: 100,
      pinn_residual: pinn_res_val,
      training_history
    },
    metadata: {
      patient_id: patientId,
      patient_age: age,
      patient_sex: sex,
      slice_count: 288
    },
    clinical: {
      age,
      sex,
      bp_systolic: bp,
      total_cholesterol: totalCholesterol,
      hdl,
      is_smoker: isSmoker,
      has_diabetes: hasDiabetes,
      lesion_severity: severity,
      aortic_velocity: velocity
    },
    processing_time_sec: 0.65,
    error: null
  };
}
