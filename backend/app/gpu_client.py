import os
import tempfile
import torch
import time

HOST = '129.212.179.50'
USER = 'root'
KEY_PATH = r'C:\Users\wasif\.ssh\id_ed25519'
KEY_PASSPHRASE = 'wasif'
REMOTE_ROOT = '/root/cardioflow'

def run_remote_inference(graph_data: dict) -> dict:
    """
    Executes inference on the remote AMD Instinct MI300X droplet.
    Saves graph data locally, copies it to the droplet, executes inference.py via SSH,
    downloads the results, and returns them as a python dictionary.
    
    If the connection fails or an exception occurs, raises RuntimeError so the caller
    can fall back to local CPU execution.
    """
    import paramiko
    t_start = time.perf_counter()
    
    # 1. Create temporary files
    local_in_fd, local_in_path = tempfile.mkstemp(suffix='.pt')
    local_out_fd, local_out_path = tempfile.mkstemp(suffix='.pt')
    
    # Close file descriptors since we will open them with torch/open
    os.close(local_in_fd)
    os.close(local_out_fd)
    
    client = None
    try:
        # Save graph_data locally
        torch.save(graph_data, local_in_path)
        
        # 2. Establish SSH & SFTP Connection
        print(f"[GPU Droplet] Connecting to {USER}@{HOST}...")
        key = paramiko.Ed25519Key.from_private_key_file(KEY_PATH, password=KEY_PASSPHRASE)
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(HOST, username=USER, pkey=key, timeout=3.0)
        
        sftp = client.open_sftp()
        
        # Ensure remote directories exist
        try:
            sftp.mkdir(f"{REMOTE_ROOT}")
        except IOError:
            pass
        try:
            sftp.mkdir(f"{REMOTE_ROOT}/data")
        except IOError:
            pass
        try:
            sftp.mkdir(f"{REMOTE_ROOT}/src")
        except IOError:
            pass
            
        # 3. Check and upload inference.py if necessary (or update it to match local)
        local_inference_py = os.path.join(os.path.dirname(os.path.abspath(__file__)), "inference.py")
        remote_inference_py = f"{REMOTE_ROOT}/src/inference.py"
        print(f"[GPU Droplet] Syncing inference script to remote droplet...")
        sftp.put(local_inference_py, remote_inference_py)
        
        # 4. Upload patient input graph file
        remote_in_path = f"{REMOTE_ROOT}/data/patient_input.pt"
        remote_out_path = f"{REMOTE_ROOT}/data/patient_output.pt"
        print(f"[GPU Droplet] Copying patient graph features to remote droplet...")
        sftp.put(local_in_path, remote_in_path)
        
        # 5. Run inference via SSH
        cmd = f"python3 {remote_inference_py} --input {remote_in_path} --output {remote_out_path} --weights /root/cardioflow/weights/pignn_pccac.pt"
        print(f"[GPU Droplet] Executing command: {cmd}")
        stdin, stdout, stderr = client.exec_command(cmd, timeout=10.0)
        
        # Force command execution to complete
        exit_status = stdout.channel.recv_exit_status()
        out_msg = stdout.read().decode().strip()
        err_msg = stderr.read().decode().strip()
        
        if exit_status != 0:
            raise RuntimeError(f"Remote inference command returned non-zero exit status {exit_status}.\nOut: {out_msg}\nErr: {err_msg}")
            
        # 6. Download inference results
        print(f"[GPU Droplet] Downloading prediction tensors...")
        sftp.get(remote_out_path, local_out_path)
        
        # Load output data
        prediction = torch.load(local_out_path, map_location='cpu', weights_only=False)
        
        sftp.close()
        client.close()
        
        t_duration = time.perf_counter() - t_start
        print(f"[GPU Droplet] Remote GPU inference succeeded in {t_duration:.3f} seconds.")
        
        return {
            'success': True,
            'p_pred': prediction['p_pred'].numpy(),
            'Q_pred': prediction['Q_pred'].numpy(),
            'alpha_pred': prediction['alpha_pred'].numpy(),
            'beta_pred': prediction['beta_pred'].numpy(),
            'execution_mode': 'remote_gpu',
            'duration_sec': t_duration
        }
        
    except Exception as e:
        print(f"[GPU Droplet] Remote inference failure: {e}")
        # Clean up client
        if client:
            try:
                client.close()
            except Exception:
                pass
        raise RuntimeError(f"Remote droplet solver unavailable: {str(e)}")
        
    finally:
        # 7. Clean up local temp files
        for path in (local_in_path, local_out_path):
            if os.path.exists(path):
                try:
                    os.remove(path)
                except Exception:
                    pass
