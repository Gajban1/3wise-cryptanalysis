"""
Silnik kryptograficzny - wrapper Pythona wywołujący skrypty SageMath.
Obsługuje szyfrowanie blokowe z paddingiem PKCS#7.
"""
import subprocess
import json
import os
import tempfile
import re

SAGE_PATH = "sage"
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def encrypt_message(message: str) -> dict:
    """
    Szyfruje wiadomość przy użyciu kryptosystemu wielomianowego.
    Zwraca wielomiany klucza publicznego i szyfrogram.
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        encryptor_script = os.path.join(BASE_DIR, "encryptor_api.sage")
        
        # Zwiększamy timeout dla dłuższych wiadomości
        timeout = max(120, len(message) * 5)
        
        result = subprocess.run(
            [SAGE_PATH, encryptor_script, message],
            capture_output=True,
            text=True,
            cwd=tmpdir,
            timeout=timeout
        )
        
        if result.returncode != 0:
            return {"error": result.stderr or "Szyfrowanie nie powiodło się"}
        
        cipher_path = os.path.join(tmpdir, "cipher.txt")
        if not os.path.exists(cipher_path):
            return {"error": "Nie wygenerowano pliku cipher.txt"}
        
        with open(cipher_path, "r") as f:
            lines = f.readlines()
        
        # Format: liczba_bloków, q, potem (n, klucz_publiczny, szyfrogram) dla każdego bloku
        num_blocks = int(lines[0].strip())
        q = int(lines[1].strip())
        
        # Dane z pierwszego bloku do podglądu
        n = int(lines[2].strip()) if len(lines) > 2 else 0
        public_key = lines[3].strip() if len(lines) > 3 else ""
        ciphertext = lines[4].strip() if len(lines) > 4 else ""
        
        return {
            "num_blocks": num_blocks,
            "n": n,
            "q": q,
            "public_key": public_key,
            "ciphertext": ciphertext,
            "raw_content": "".join(lines)
        }


def solve_cipher(cipher_data: str) -> dict:
    """
    Próbuje złamać szyfr przy użyciu ataku MinRank.
    Zwraca odszyfrowaną wiadomość i logi z ataku.
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        cipher_path = os.path.join(tmpdir, "cipher.txt")
        with open(cipher_path, "w") as f:
            f.write(cipher_data)
        
        solver_script = os.path.join(BASE_DIR, "solver_api.sage")
        
        try:
            num_blocks = int(cipher_data.split('\n')[0].strip())
        except:
            num_blocks = 1
        
        timeout = max(180, num_blocks * 120)
        
        result = subprocess.run(
            [SAGE_PATH, solver_script],
            capture_output=True,
            text=True,
            cwd=tmpdir,
            timeout=timeout
        )
        
        output = result.stdout
        
        match = re.search(r"ODSZYFROWANA WIADOMOŚĆ: (.+)", output)
        decrypted = match.group(1) if match else None
        
        return {
            "decrypted": decrypted,
            "logs": output,
            "error": result.stderr if result.returncode != 0 else None
        }
