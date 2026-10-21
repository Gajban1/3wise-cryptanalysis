# 3WiseBreaker — Multivariate Cryptography Demonstrator

Educational SageMath implementation of a cubic multivariate encryption demonstrator and a MinRank-based plaintext-recovery attack, with a FastAPI backend and web interface.

## My contribution

**Piotr Straszak:** implementation of the cryptographic core in SageMath and adjustment of message block sizes to balance encryption and attack runtime. Teammates developed the visual web interface. The project draws on published cryptanalysis and a CTF-inspired concept; it is not a claim of a newly discovered vulnerability.

**Original team:** Piotr Straszak, Bartłomiej Ząbek, Kamil Szkarłat, Jakub Szkaradek, Paweł Lorenc. Original repository: [pawelorenc/Kryptosystem-3WISE](https://github.com/pawelorenc/Kryptosystem-3WISE). Original Git history is preserved.

## Technical highlights

- Cubic polynomial transformations over GF(257).
- SageMath finite-field, polynomial and matrix computations.
- Hessian projections and rank-one structure recovery in the attack implementation.
- Block-wise message handling, padding and plaintext reconstruction.
- FastAPI endpoints connecting the demonstrator to a browser UI.

## Run locally

Requirements: Python 3.10+ and SageMath 10.x, with `sage` on PATH.

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r app/backend/requirements.txt
cd app/backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Open http://127.0.0.1:8000. Encrypt a short ASCII message and use the attack view to recover it. SageMath execution can take several seconds per block. No live application is hosted by this repository.

## Scope and limitations

This is a **3WISE-inspired educational encryption construction**, not a complete implementation of the original digital-signature submission. The demonstrated plaintext recovery applies to this construction and its parameters. It reproduces a known attack idea rather than establishing a new break.

The application is deliberately not a secure messaging product. Run it only on localhost with trusted demo inputs: the solver uses `sage_eval` on supplied expressions, there is no authentication or resource isolation, and execution can be computationally expensive. Never expose the API to untrusted users. Ciphertexts are held in memory and disappear on restart. Message support is limited to ASCII. No end-to-end SageMath execution is claimed unless recorded in validation notes.

## References

- D. Smith-Tone, [A Total Break of the 3WISE Digital Signature Scheme](https://eprint.iacr.org/2023/1535.pdf), 2023.
- B. Gómez Rodríguez, *3WISE: Cubic Element-Wise trapdoor based MPKC cryptosystem*, 2023.
- Additional references and the original academic documentation: [docs/original-README.md](docs/original-README.md).

## Attribution and license

Original authors are credited above and in Git history. Upstream contains no license file; this portfolio copy does not add a license over the team's work.
