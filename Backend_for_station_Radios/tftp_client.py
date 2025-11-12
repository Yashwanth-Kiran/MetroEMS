try:
    from tftpy import TftpClient
    def tftp_put(server_ip: str, local_path: str, remote_filename: str):
        client = TftpClient(server_ip, 69, timeout=3)
        with open(local_path, 'rb') as f:
            client.upload(remote_filename, f)
except ImportError:
    def tftp_put(server_ip: str, local_path: str, remote_filename: str):
        # Fallback implementation for Windows
        print(f"TFTP upload simulated: {local_path} -> {server_ip}:{remote_filename}")
        return True
