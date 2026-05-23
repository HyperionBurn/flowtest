import os
import sys
# Configure stdout and stderr to use UTF-8 to prevent encoding errors on Windows
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')
import time
import paramiko
import re

HOST = '129.212.179.50'
USER = 'root'
KEY_PATH = r'C:\Users\wasif\.ssh\id_ed25519'
KEY_PASSPHRASE = 'wasif'
REMOTE_ROOT = '/root/cardioflow'

def sftp_upload_dir(sftp, local_dir, remote_dir):
    """
    Recursively uploads a directory via SFTP.
    """
    try:
        sftp.mkdir(remote_dir)
    except IOError:
        pass  # Directory already exists

    for entry in os.listdir(local_dir):
        # Skip pycache, virtual environments, and weights directory
        if entry in ('__pycache__', '.venv', 'venv', 'node_modules', '.git', 'weights'):
            continue
            
        local_path = os.path.join(local_dir, entry)
        remote_path = f"{remote_dir}/{entry}"
        
        if os.path.isdir(local_path):
            sftp_upload_dir(sftp, local_path, remote_path)
        else:
            print(f"Uploading {local_path} -> {remote_path}...")
            sftp.put(local_path, remote_path)

def main():
    print("====================================================")
    # 1. Establish SSH & SFTP Connection
    print(f"Connecting to remote GPU VPS: {USER}@{HOST}...")
    key = paramiko.Ed25519Key.from_private_key_file(KEY_PATH, password=KEY_PASSPHRASE)
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, pkey=key, timeout=10)
    
    sftp = client.open_sftp()
    
    # 2. Upload the backend app files to VPS
    local_app_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "app")
    remote_app_dir = f"{REMOTE_ROOT}/app"
    print(f"Syncing local app directory {local_app_dir} -> {remote_app_dir}...")
    sftp_upload_dir(sftp, local_app_dir, remote_app_dir)
    sftp.close()
    
    # 3. Kill existing uvicorn and cloudflared processes on VPS
    print("Stopping any running uvicorn/cloudflared processes on remote droplet...")
    client.exec_command("pkill -f uvicorn")
    client.exec_command("pkill -f cloudflared")
    time.sleep(2)
    
    # 4. Install FastAPI and system dependencies on VPS
    print("Installing Python dependencies (FastAPI, uvicorn, pydicom, pillow, multipart) on remote droplet...")
    cmd_install = "pip3 install fastapi uvicorn pydicom pillow python-multipart jinja2 python-dotenv paramiko --break-system-packages"
    stdin, stdout, stderr = client.exec_command(cmd_install)
    exit_status = stdout.channel.recv_exit_status()
    if exit_status != 0:
        err_msg = stderr.read().decode('utf-8', errors='replace')
        print("Dependency installation failed:", err_msg)
        client.close()
        sys.exit(1)
    print("Python dependencies verified/installed successfully.")
    
    # 5. Verify / Install cloudflared on VPS
    print("Checking if cloudflared is installed on remote droplet...")
    stdin, stdout, stderr = client.exec_command("which cloudflared")
    cf_path = stdout.read().decode().strip()
    
    if not cf_path:
        print("cloudflared not found. Downloading latest Linux binary...")
        cf_url = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64"
        stdin, stdout, stderr = client.exec_command(f"curl -L --output /usr/local/bin/cloudflared {cf_url}")
        stdout.channel.recv_exit_status()
        client.exec_command("chmod +x /usr/local/bin/cloudflared")
        print("cloudflared binary installed successfully.")
    else:
        print(f"cloudflared already installed at: {cf_path}")
        
    # 6. Start uvicorn server on VPS
    print("Starting FastAPI uvicorn server on remote GPU droplet...")
    # Run uvicorn in remote root directory so imports work
    uv_cmd = f"cd {REMOTE_ROOT} && nohup python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8081 > {REMOTE_ROOT}/backend.log 2>&1 &"
    client.exec_command(uv_cmd)
    time.sleep(3)
    
    # Verify uvicorn is running
    stdin, stdout, stderr = client.exec_command("pgrep -f uvicorn")
    uv_pids = stdout.read().decode().strip()
    if not uv_pids:
        print("ERROR: FastAPI uvicorn server failed to start. Logs:")
        stdin, stdout, stderr = client.exec_command(f"cat {REMOTE_ROOT}/backend.log")
        print(stdout.read().decode())
        client.close()
        sys.exit(1)
    print(f"FastAPI uvicorn server is running under PIDs: {uv_pids}")
    
    # 7. Start Cloudflare Tunnel on VPS
    print("Launching Cloudflare Tunnel to expose FastAPI server over HTTPS...")
    # Cloudflared tunnel creates a free HTTPS URL pointing to port 8081
    cf_cmd = f"nohup cloudflared tunnel --url http://localhost:8081 > {REMOTE_ROOT}/tunnel.log 2>&1 &"
    client.exec_command(cf_cmd)
    
    # Wait for tunnel to spin up and fetch the public URL
    print("Waiting for Cloudflare Tunnel to establish secure endpoint (10s)...")
    tunnel_url = None
    for attempt in range(15):
        time.sleep(2)
        stdin, stdout, stderr = client.exec_command(f"cat {REMOTE_ROOT}/tunnel.log")
        logs = stdout.read().decode()
        
        # Regex search for the trycloudflare URL
        match = re.search(r'https://[a-zA-Z0-9-]+\.trycloudflare\.com', logs)
        if match:
            tunnel_url = match.group(0)
            break
            
    if not tunnel_url:
        print("ERROR: Failed to establish Cloudflare Tunnel. Tunnel logs:")
        stdin, stdout, stderr = client.exec_command(f"cat {REMOTE_ROOT}/tunnel.log")
        print(stdout.read().decode())
        client.close()
        sys.exit(1)
        
    print("====================================================")
    print(f" SUCCESS: Secure Cloudflare Tunnel active!")
    print(f" Public HTTPS Backend URL: {tunnel_url}")
    print("====================================================")
    
    client.close()
    
    # 8. Update Local Frontend Environment Files
    frontend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    env_paths = [
        os.path.join(frontend_dir, ".env"),
        os.path.join(frontend_dir, ".env.production"),
        os.path.join(frontend_dir, ".env.development")
    ]
    
    for env_path in env_paths:
        print(f"Updating {env_path} to use public API URL...")
        with open(env_path, "w") as f:
            f.write(f"VITE_API_URL={tunnel_url}\n")
            
    print("\nNext Steps:")
    print("1. Build and redeploy the frontend client using: npm run build && vercel --prod")
    print("====================================================")

if __name__ == "__main__":
    main()
