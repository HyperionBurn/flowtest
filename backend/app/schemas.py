from pydantic import BaseModel
from typing import Optional


class CurvePoint(BaseModel):
    x: float
    value: float


class PinnTrainingSnapshot(BaseModel):
    epoch: int
    loss: float
    pde_loss: float
    floor_loss: float
    min_ffr: float
    ffr_curve: list[float]
    pressure_curve: list[float]
    velocity_curve: list[float]
    residual: float


class SimulationResults(BaseModel):
    min_ffr_value: float
    stenosis_location: float
    ffr_curve: list[CurvePoint]
    velocity_curve: list[CurvePoint]
    pressure_curve: list[CurvePoint]
    mesh_nodes_calculated: int
    pinn_residual: float
    training_history: Optional[list[PinnTrainingSnapshot]] = None


class DicomMetadata(BaseModel):
    patient_id: Optional[str] = None
    patient_age: Optional[int] = None
    patient_sex: Optional[str] = None
    slice_count: Optional[int] = None


class PatientClinicalData(BaseModel):
    age: int = 62
    sex: str = "M"
    bp_systolic: int = 135
    total_cholesterol: int = 210
    hdl: int = 45
    is_smoker: bool = False
    has_diabetes: bool = False
    lesion_severity: int = 55
    aortic_velocity: float = 0.25


class AnalyzeResponse(BaseModel):
    success: bool
    results: SimulationResults
    metadata: DicomMetadata
    clinical: PatientClinicalData
    processing_time_sec: float
    error: Optional[str] = None
