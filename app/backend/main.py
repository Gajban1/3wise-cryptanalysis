"""
Backend FastAPI dla 3WiseBreaker (Eksplorator Kryptografii Wielomianowej)
"""
import os
import uuid
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
from crypto_engine import encrypt_message, solve_cipher

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

# Przechowywanie szyfrogramów w pamięci
cipher_storage = {}

app = FastAPI(
    title="3WiseBreaker API",
    description="API do szyfrowania i łamania kryptosystemów wielomianowych",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")


class EncryptRequest(BaseModel):
    message: str
    name: Optional[str] = None
    save: Optional[bool] = True


class DecryptRequest(BaseModel):
    cipher_data: str


@app.get("/")
def serve_frontend():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))


@app.get("/api")
def api_info():
    return {
        "name": "3WiseBreaker API",
        "status": "online",
        "endpoints": {
            "/encrypt": "POST",
            "/decrypt": "POST",
            "/ciphers": "GET",
            "/ciphers/{id}": "GET"
        }
    }


@app.get("/ciphers")
def list_ciphers():
    """Zwraca listę wszystkich zapisanych szyfrogramów"""
    ciphers = []
    for cid, data in cipher_storage.items():
        ciphers.append({
            "id": cid,
            "name": data.get("name"),
            "created_at": data["created_at"],
            "n": data["n"],
            "q": data["q"],
            "preview": data["ciphertext"][:50] + "..." if len(data["ciphertext"]) > 50 else data["ciphertext"]
        })
    ciphers.sort(key=lambda x: x["created_at"], reverse=True)
    return {"ciphers": ciphers, "count": len(ciphers)}


@app.get("/ciphers/{cipher_id}")
def get_cipher(cipher_id: str):
    if cipher_id not in cipher_storage:
        raise HTTPException(status_code=404, detail="Nie znaleziono szyfrogramu")
    return cipher_storage[cipher_id]


@app.delete("/ciphers/{cipher_id}")
def delete_cipher(cipher_id: str):
    if cipher_id not in cipher_storage:
        raise HTTPException(status_code=404, detail="Nie znaleziono szyfrogramu")
    del cipher_storage[cipher_id]
    return {"status": "deleted", "id": cipher_id}


@app.post("/encrypt")
def encrypt(request: EncryptRequest):
    """
    Szyfruje wiadomość przy użyciu kryptosystemu wielomianowego.
    """
    if not request.message or len(request.message) > 50:
        raise HTTPException(status_code=400, detail="Wiadomość musi mieć 1-50 znaków")
    
    result = encrypt_message(request.message)
    
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    
    if request.save:
        cipher_id = str(uuid.uuid4())[:8]
        cipher_storage[cipher_id] = {
            "id": cipher_id,
            "name": request.name,
            "created_at": datetime.now().isoformat(),
            "num_blocks": result.get("num_blocks", 1),
            "n": result["n"],
            "q": result["q"],
            "public_key": result["public_key"],
            "ciphertext": result["ciphertext"],
            "raw_content": result["raw_content"]
        }
        result["id"] = cipher_id
        result["name"] = request.name
    
    return result


@app.post("/decrypt")
def decrypt(request: DecryptRequest):
    """
    Łamie szyfr przy użyciu ataku MinRank.
    """
    if not request.cipher_data:
        raise HTTPException(status_code=400, detail="cipher_data jest wymagane")
    
    result = solve_cipher(request.cipher_data)
    
    if result.get("error"):
        raise HTTPException(status_code=500, detail=result["error"])
    
    return result


@app.post("/solve")
def solve(request: DecryptRequest):
    """Alias dla /decrypt"""
    return decrypt(request)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
