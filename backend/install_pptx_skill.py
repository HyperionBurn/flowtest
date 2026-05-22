import os
import requests

def install_pptx_skill():
    repo_url = "https://api.github.com/repos/anthropics/skills/contents/skills/pptx"
    target_dir = r"C:\Users\wasif\.gemini\antigravity\skills\pptx"
    
    os.makedirs(target_dir, exist_ok=True)
    
    print(f"Fetching repository file listing from: {repo_url}")
    response = requests.get(repo_url)
    if response.status_code != 200:
        print(f"Failed to fetch file listing: {response.status_code}")
        print(response.text)
        return
        
    files = response.json()
    for file_info in files:
        name = file_info["name"]
        download_url = file_info["download_url"]
        
        # We only want to download files, not directories (unless they are scripts)
        if file_info["type"] == "file":
            print(f"Downloading {name} from {download_url}...")
            file_response = requests.get(download_url)
            if file_response.status_code == 200:
                dest_path = os.path.join(target_dir, name)
                with open(dest_path, "wb") as f:
                    f.write(file_response.content)
                print(f"Successfully saved to {dest_path}")
            else:
                print(f"Failed to download {name}: {file_response.status_code}")
                
if __name__ == "__main__":
    install_pptx_skill()
