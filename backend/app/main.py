import time
import os
from typing import Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.pinn_solver import solve_1d_pinn
from app.dicom_processor import process_dicom_bytes
from app.schemas import (
    AnalyzeResponse,
    SimulationResults,
    DicomMetadata,
    PatientClinicalData,
    CurvePoint,
)

load_dotenv()

app = FastAPI(
    title="CardioFlow AI - Physics Engine",
    description="1D Navier-Stokes finite difference solver for coronary FFR computation",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "healthy", "solver": "1D Navier-Stokes (Young-Tsai stenosis model)"}


@app.post("/api/v1/analyze-scan", response_model=AnalyzeResponse)
async def analyze_scan(
    file: UploadFile = File(...),
    patient_age: int = Form(62),
    patient_sex: str = Form("M"),
    bp_systolic: int = Form(135),
    total_cholesterol: int = Form(210),
    hdl: int = Form(45),
    is_smoker: bool = Form(False),
    has_diabetes: bool = Form(False),
    lesion_severity: int = Form(55),
    aortic_velocity: float = Form(0.25),
):
    t_overall_start = time.perf_counter()

    # -----------------------------------------------------------
    # STEP 1: Process DICOM file
    # -----------------------------------------------------------
    dicom_bytes = await file.read()
    dicom_result = process_dicom_bytes(dicom_bytes)

    # -----------------------------------------------------------
    # STEP 2: Run 1D Navier-Stokes solver
    # -----------------------------------------------------------
    solver_result = solve_1d_pinn(
        severity=lesion_severity,
        aortic_velocity=aortic_velocity,
        aortic_pressure=90.0,
        vessel_length=10.0,
        reference_radius=0.002,
        num_nodes=100,
    )

    # -----------------------------------------------------------
    # STEP 3: Build response
    # -----------------------------------------------------------
    results = SimulationResults(
        min_ffr_value=solver_result["min_ffr_value"],
        stenosis_location=solver_result["stenosis_location"],
        ffr_curve=[
            CurvePoint(x=p["x"], value=p["value"])
            for p in solver_result["ffr_curve"]
        ],
        velocity_curve=[
            CurvePoint(x=p["x"], value=p["value"])
            for p in solver_result["velocity_curve"]
        ],
        pressure_curve=[
            CurvePoint(x=p["x"], value=p["value"])
            for p in solver_result["pressure_curve"]
        ],
        mesh_nodes_calculated=solver_result["mesh_nodes_calculated"],
        pinn_residual=solver_result["pinn_residual"],
        training_history=solver_result["training_history"]
    )

    age_val = patient_age
    if dicom_result.get("success") and dicom_result.get("patient_age"):
        age_val = dicom_result["patient_age"]

    sex_val = patient_sex
    if dicom_result.get("success") and dicom_result.get("patient_sex"):
        sex_val = dicom_result["patient_sex"]

    metadata = DicomMetadata(
        patient_id=dicom_result.get("patient_id") if dicom_result.get("success") else None,
        patient_age=age_val,
        patient_sex=sex_val,
        slice_count=dicom_result.get("slice_count"),
    )

    clinical = PatientClinicalData(
        age=age_val,
        sex=sex_val,
        bp_systolic=bp_systolic,
        total_cholesterol=total_cholesterol,
        hdl=hdl,
        is_smoker=is_smoker,
        has_diabetes=has_diabetes,
        lesion_severity=lesion_severity,
        aortic_velocity=aortic_velocity,
    )

    processing_time = time.perf_counter() - t_overall_start

    return AnalyzeResponse(
        success=True,
        results=results,
        metadata=metadata,
        clinical=clinical,
        processing_time_sec=round(processing_time, 3),
        error=dicom_result.get("error") if not dicom_result.get("success") else None,
    )


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=False)
