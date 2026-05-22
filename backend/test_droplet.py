import paramiko
import sys

HOST = '129.212.179.50'
USER = 'root'
KEY_PATH = r'C:\Users\wasif\.ssh\id_ed25519'
KEY_PASSPHRASE = 'wasif'

try:
    print(f"Connecting to {HOST}...")
    key = paramiko.Ed25519Key.from_private_key_file(KEY_PATH, password=KEY_PASSPHRASE)
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, pkey=key, timeout=10)
    
    print("SSH Connected! Running python command to check CUDA/ROCm...")
    stdin, stdout, stderr = client.exec_command("python3 -c \"import torch; print('CUDA/ROCm Available:', torch.cuda.is_available()); print('Device Name:', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'None')\"")
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    
    print("STDOUT:", out)
    if err:
        print("STDERR:", err)
        
    client.close()
except Exception as e:
    print(f"Connection failed: {e}", file=sys.stderr)
    sys.exit(1)
