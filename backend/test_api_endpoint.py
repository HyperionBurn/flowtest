import requests
import io

url = "http://127.0.0.1:8000/api/v1/analyze-scan"
mock_dicom = io.BytesIO(b"DICM_MOCK_DATA_HEMODYNAMICS")

files = {
    'file': ('mock_scan.dcm', mock_dicom, 'application/octet-stream')
}

data = {
    'patient_age': 65,
    'patient_sex': 'M',
    'bp_systolic': 130,
    'total_cholesterol': 220,
    'hdl': 40,
    'is_smoker': 'false',
    'has_diabetes': 'false',
    'lesion_severity': 60,
    'aortic_velocity': 0.30
}

print("Sending request to FastAPI backend...")
try:
    response = requests.post(url, files=files, data=data)
    print("Response status code:", response.status_code)
    if response.status_code == 200:
        json_data = response.json()
        print("Success:", json_data.get("success"))
        results = json_data.get("results", {})
        print("Min FFR:", results.get("min_ffr_value"))
        print("Nodes calculated:", results.get("mesh_nodes_calculated"))
        print("PINN Residual:", results.get("pinn_residual"))
        print("Processing time:", json_data.get("processing_time_sec"))
        history = results.get("training_history", [])
        print("History steps:", len(history))
        if history:
            print("First step loss:", history[0]["loss"])
            print("Final step loss:", history[-1]["loss"])
    else:
        print("Error details:", response.text)
except Exception as e:
    print("Failed to connect or process request:", str(e))
