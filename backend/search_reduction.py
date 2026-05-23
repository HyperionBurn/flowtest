import os

src_dir = r"C:\Users\wasif\OneDrive\Desktop\flowtest\CardioFlowAI\src"

for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith(('.tsx', '.ts')):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                lines = f.readlines()
                for idx, line in enumerate(lines):
                    if '%' in line or 'reduction' in line.lower() or 'reduced' in line.lower():
                        print(f"{file}:{idx+1}: {line.strip()}")
