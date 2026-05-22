import pydicom
import numpy as np
from PIL import Image
import io
import base64
from typing import Optional
import os


def process_dicom_bytes(file_bytes: bytes) -> dict:
    """
    Process a DICOM file from raw bytes and extract:
    - Patient metadata (ID, age, sex)
    - A 2D slice preview as base64 JPEG
    - Slice count from multi-frame DICOM

    Returns dict with keys: patient_id, patient_age, patient_sex,
    slice_count, preview_base64, success, error
    """
    try:
        ds = pydicom.dcmread(io.BytesIO(file_bytes))

        patient_id = getattr(ds, "PatientID", "UNKNOWN")

        age_str = getattr(ds, "PatientAge", None)
        patient_age = None
        if age_str and isinstance(age_str, str):
            digits = "".join(c for c in age_str if c.isdigit())
            if digits:
                patient_age = int(digits)

        sex_str = getattr(ds, "PatientSex", None)
        patient_sex = None
        if sex_str and sex_str in ("M", "F", "O"):
            patient_sex = sex_str
        elif sex_str:
            patient_sex = str(sex_str)

        slice_count = 1
        if hasattr(ds, "NumberOfFrames"):
            slice_count = int(ds.NumberOfFrames)

        preview_b64 = None
        if hasattr(ds, "pixel_array"):
            pixel_array = ds.pixel_array

            if pixel_array.ndim == 2:
                frame = pixel_array
            elif pixel_array.ndim == 3:
                frame = pixel_array[0]
            else:
                frame = pixel_array

            frame = frame.astype(np.float64)

            if frame.max() > frame.min():
                frame = 255.0 * (frame - frame.min()) / (frame.max() - frame.min())

            frame = frame.astype(np.uint8)
            img = Image.fromarray(frame)
            img.thumbnail((512, 512), Image.LANCZOS)

            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=75)
            preview_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")

        return {
            "patient_id": patient_id,
            "patient_age": patient_age,
            "patient_sex": patient_sex,
            "slice_count": slice_count,
            "preview_base64": preview_b64,
            "success": True,
            "error": None,
        }

    except Exception as e:
        return {
            "patient_id": None,
            "patient_age": None,
            "patient_sex": None,
            "slice_count": None,
            "preview_base64": None,
            "success": False,
            "error": str(e),
        }
