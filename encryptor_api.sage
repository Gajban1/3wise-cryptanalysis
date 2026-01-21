"""
API Szyfrujące - wersja dla aplikacji webowej.
Używa szyfrowania blokowego z paddingiem PKCS#7.
"""
import sys
import os

BLOCK_SIZE = 20  # Musi pasować do solvera

def pkcs7_pad(data, block_size):
    """Padding PKCS#7."""
    pad_len = block_size - (len(data) % block_size)
    if pad_len == 0:
        pad_len = block_size
    return data + chr(pad_len) * pad_len

def encrypt_block(block):
    """Szyfrowanie pojedynczego bloku."""
    Q = 257
    F = GF(Q)
    msg_bytes = [ord(c) for c in block]
    n = len(msg_bytes)
    msg_vec = vector(F, msg_bytes)
    
    U = random_matrix(F, n)
    T = random_matrix(F, n)
    
    R = PolynomialRing(F, names=[f'x{i}' for i in range(n)])
    vars_vec = vector(R, R.gens())

    public_key = (vars_vec * U).apply_map(lambda c: c^3) * T
    ciphertext = (msg_vec * U).apply_map(lambda c: c^3) * T

    return n, list(public_key), list(ciphertext)

def main():
    if len(sys.argv) < 2:
        print("Użycie: sage encryptor_api.sage <wiadomość>")
        sys.exit(1)
    
    user_input = sys.argv[1]
    Q = 257
    
    # Zastosuj padding PKCS#7
    padded_msg = pkcs7_pad(user_input, BLOCK_SIZE)
    
    # Podziel na bloki
    blocks = [padded_msg[i:i+BLOCK_SIZE] for i in range(0, len(padded_msg), BLOCK_SIZE)]
    num_blocks = len(blocks)
    
    print(f"[INFO] Wiadomość: {len(user_input)} znaków -> {num_blocks} bloków (PKCS#7)")
    
    filename = "cipher.txt"
    
    with open(filename, "w") as f:
        f.write(str(num_blocks) + "\n")
        f.write(str(Q) + "\n")
        
        for i, block in enumerate(blocks):
            print(f"[INFO] Szyfrowanie bloku {i+1}/{num_blocks}...")
            n, public_key, ciphertext = encrypt_block(block)
            f.write(str(n) + "\n")
            f.write(str(public_key) + "\n")
            f.write(str(ciphertext) + "\n")
    
    print("[INFO] Szyfrowanie zakończone.")

if __name__ == "__main__":
    main()
