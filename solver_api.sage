"""
Solver API - wersja dla aplikacji webowej.
Używa deszyfrowania blokowego z unpaddingiem PKCS#7 i przetwarzaniem sekwencyjnym.
"""
import time
import os

# Workers (zredukowane dla kontekstu subprocess)
DEFAULT_WORKERS = 4

class RobustMinRankAttacker:
    """Implementacja ataku MinRank."""
    
    def __init__(self, public_key_list, ciphertext_list, n, q):
        self.n = n
        self.q = q
        self.F = GF(q)
        self.R = PolynomialRing(self.F, names=[f'x{i}' for i in range(n)])
        self.vars = self.R.gens()
        
        self.P = vector(self.R, public_key_list)
        self.ct = vector(self.F, ciphertext_list)
        
        self.inv_exp = inverse_mod(3, q - 1)

    def _get_hessian_projection(self, poly, z_vec):
        H = matrix(self.F, self.n, self.n)
        for i in range(self.n):
            for j in range(self.n):
                if i > j: 
                    H[i,j] = H[j,i]
                    continue
                d2 = diff(poly, self.vars[i], self.vars[j])
                val = d2.substitute({self.vars[k]: z_vec[k] for k in range(self.n)})
                H[i,j] = val
        return H

    def _is_perfect_cube(self, candidate_poly):
        coeffs = []
        for i in range(self.n):
            sub_map = {v: 0 for v in self.vars}
            sub_map[self.vars[i]] = 1
            val = candidate_poly.substitute(sub_map)
            root = val^self.inv_exp
            coeffs.append(root)
            
        L = sum(coeffs[i] * self.vars[i] for i in range(self.n))
        if L^3 == candidate_poly:
            return True, L, coeffs
        return False, None, None

    def attack(self):
        """Sekwencyjny atak MinRank."""
        print(f"[INIT] Parametry: N={self.n}, Q={self.q}, InvExp={self.inv_exp}")
        print("[PHASE] Rozpoczynanie MinRank (szukanie bazy U)...")
        
        found_L_vecs = []
        found_polys = []
        
        max_attempts = 1000
        attempts = 0
        
        while len(found_polys) < self.n and attempts < max_attempts:
            attempts += 1
            z = random_vector(self.F, self.n)
            matrices = [self._get_hessian_projection(p, z) for p in self.P]
            
            for _ in range(5):
                ker_vec = random_vector(self.F, self.n)
                cols = [M * ker_vec for M in matrices]
                S = matrix(self.F, cols).transpose()
                kernel = S.right_kernel()
                
                for vec_lambda in kernel.basis():
                    poly_cand = sum(vec_lambda[i] * self.P[i] for i in range(self.n))
                    
                    is_cube, L_form, L_coeffs = self._is_perfect_cube(poly_cand)
                    
                    if is_cube:
                        new_vec = vector(self.F, L_coeffs)
                        if not found_L_vecs:
                            found_L_vecs.append(new_vec)
                            found_polys.append(poly_cand)
                            print(f"[FOUND] Element bazy 1/{self.n}")
                        else:
                            temp_mat = matrix(self.F, found_L_vecs + [new_vec])
                            if temp_mat.rank() > len(found_L_vecs):
                                found_L_vecs.append(new_vec)
                                found_polys.append(poly_cand)
                                print(f"[FOUND] Element bazy {len(found_L_vecs)}/{self.n}")
                                
                    if len(found_polys) == self.n: break
                if len(found_polys) == self.n: break
        
        if len(found_polys) < self.n:
            raise Exception(f"Niepowodzenie po {max_attempts} próbach")
        
        print("[PHASE] Znaleziono bazę. Deszyfrowanie...")
        return self._decrypt(found_L_vecs, found_polys)

    def _decrypt(self, L_vecs, pure_cubes):
        test_points = [random_vector(self.F, self.n) for _ in range(self.n)]
        
        A_vals = [[pc.substitute({self.vars[k]: tp[k] for k in range(self.n)}) for pc in pure_cubes] for tp in test_points]
        A = matrix(self.F, A_vals)
        
        B_vals = [[p.substitute({self.vars[k]: tp[k] for k in range(self.n)}) for p in self.P] for tp in test_points]
        B = matrix(self.F, B_vals)
        
        TRANS = A.inverse() * B
        pure_vals_for_cipher = self.ct * TRANS.inverse()
        
        L_vals = [val^self.inv_exp for val in pure_vals_for_cipher]
        
        M = matrix(self.F, L_vecs)
        target = vector(self.F, L_vals)
        
        decrypted_vec = M.solve_right(target)
        return decrypted_vec


def pkcs7_unpad(data):
    """Usuwanie paddingu PKCS#7."""
    if not data:
        return data
    pad_len = ord(data[-1])
    if pad_len > len(data) or pad_len == 0:
        return data
    for i in range(1, pad_len + 1):
        if ord(data[-i]) != pad_len:
            return data
    return data[:-pad_len]


def decrypt_block(n, public_key_str, ciphertext_str, q, block_num, total_blocks):
    """Deszyfrowanie pojedynczego bloku."""
    print(f"[INFO] Deszyfrowanie bloku {block_num}/{total_blocks}...")
    
    F = GF(q)
    R = PolynomialRing(F, names=[f'x{i}' for i in range(n)])
    ctx = {str(gen): gen for gen in R.gens()}
    
    public_key = sage_eval(public_key_str, locals=ctx)
    ciphertext = sage_eval(ciphertext_str)
    
    attacker = RobustMinRankAttacker(public_key, ciphertext, n, q)
    decrypted_vec = attacker.attack()
    
    block_text = "".join([chr(int(x)) for x in decrypted_vec])
    return block_text


def run_solver():
    """Główna pętla deszyfrująca."""
    filename = "cipher.txt"
    print(f"[INFO] Wczytywanie pliku '{filename}'...")
    
    try:
        with open(filename, "r") as f:
            lines = f.readlines()
    except FileNotFoundError:
        print("[ERROR] Nie znaleziono pliku cipher.txt!")
        return

    num_blocks = int(lines[0].strip())
    q = int(lines[1].strip())
    
    print(f"[INFO] Bloków: {num_blocks}, Q={q}")
    
    # Parse block data
    decrypted_blocks = []
    line_idx = 2
    
    start_time = time.time()
    
    for block_num in range(num_blocks):
        try:
            n = int(lines[line_idx].strip())
            public_key_str = lines[line_idx + 1].strip()
            ciphertext_str = lines[line_idx + 2].strip()
            line_idx += 3
            
            block_text = decrypt_block(n, public_key_str, ciphertext_str, q, block_num + 1, num_blocks)
            decrypted_blocks.append(block_text)
        except IndexError:
            print("[ERROR] Nieoczekiwany koniec pliku")
            break
    
    elapsed = time.time() - start_time
    
    # Combine and unpad
    full_message = "".join(decrypted_blocks)
    original_message = pkcs7_unpad(full_message)
    
    print(f"[INFO] Czas: {elapsed:.2f}s")
    print("")
    print("=" * 40)
    print(f"ODSZYFROWANA WIADOMOŚĆ: {original_message}")
    print("=" * 40)


if __name__ == "__main__":
    run_solver()
