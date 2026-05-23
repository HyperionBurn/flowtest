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
    
    print("SSH Connected! Querying active servers on VPS...")
    cmd = "pgrep -l uvicorn; pgrep -l cloudflared; cat /root/cardioflow/tunnel.log | grep -o 'https://.*trycloudflare.com'"
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    
    print("STDOUT:")
    print(out)
    if err:
        print("STDERR:")
        print(err)
        
    client.close()
except Exception as e:
    print(f"Connection failed: {e}", file=sys.stderr)
    sys.exit(1)
