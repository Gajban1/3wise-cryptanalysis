# 3WiseBreaker - Multivariate Crypto Explorer

> **Projekt zaliczeniowy z przedmiotu Kryptografia**  
> Semestr zimowy 2025/26

---

## Opis projektu

Interaktywna aplikacja webowa demonstrująca **kryptoanalyzę wielomianowych systemów szyfrujących**. Projekt pokazuje praktyczną podatność kryptosystemów opartych na wielomianach sześciennych na atak MinRank.

### Czym jest atak MinRank?

Atak MinRank to technika kryptoanalityczna wykorzystująca fakt, że wielomiany klucza publicznego można przedstawić jako kombinacje liniowe macierzy pierwszego rzędu. Pozwala to na odzyskanie klucza prywatnego (lub bezpośrednio plaintextu) w czasie wielomianowym.

### Jak działa nasza aplikacja?

1. **Szyfrowanie** - użytkownik wpisuje wiadomość, która jest szyfrowana przy użyciu losowo wygenerowanego klucza publicznego (wielomiany sześcienne nad GF(257))
2. **Atak** - aplikacja przeprowadza atak MinRank, szukając bazy podprzestrzeni macierzy rangi 1
3. **Deszyfrowanie** - po znalezieniu bazy, wiadomość jest odszyfrowywana przez rozwiązanie układu równań liniowych

---

## Struktura projektu

```
projekt/
├── app/
│   ├── backend/
│   │   ├── main.py           # Serwer FastAPI - obsługuje endpointy API
│   │   ├── crypto_engine.py  # Wrapper do SageMath - odpala skrypty sage
│   │   └── requirements.txt  # Zależności Pythona
│   └── frontend/
│       ├── index.html        # Strona główna dashboardu
│       ├── styles.css        # Style CSS
│       └── app.js            # Logika frontendu 
├── encryptor_api.sage        # Skrypt szyfrujący (SageMath)
├── solver_api.sage           # Skrypt ataku MinRank (SageMath)
└── README.md                 
```

---

## Wymagania

| Narzędzie | Wersja | Uwagi |
|-----------|--------|-------|
| Python | 3.10+ | Testowane na 3.11 |
| SageMath | 10.x | Musi być dostępny jako `sage` w PATH |
| Przeglądarka | Bieżąca | Chrome, Firefox, Safari |

### Instalacja zależności

```bash
cd projekt/app/backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# lub: venv\Scripts\activate  # Windows

pip install -r requirements.txt
```

---

## Uruchomienie

```bash
# 1. Aktywuj środowisko wirtualne
cd projekt/app/backend
source venv/bin/activate

# 2. Uruchom serwer (z hot-reload dla wygody)
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# 3. Otwórz w przeglądarce pod adresem: http://localhost:8000 
```

Serwer powinien wystartować i pokazać:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Started reloader process...
```

---

## API Endpoints

| Endpoint | Metoda | Opis |
|----------|--------|------|
| `/` | GET | Dashboard UI (strona główna) |
| `/api` | GET | Informacje o API |
| `/encrypt` | POST | Szyfruj wiadomość |
| `/decrypt` | POST | Złam szyfr atakiem MinRank |
| `/ciphers` | GET | Lista zapisanych szyfrogramów |
| `/ciphers/{id}` | GET | Pobierz konkretny szyfrogram |
| `/ciphers/{id}` | DELETE | Usuń szyfrogram |

### Przykład użycia API (curl)

```bash
# Szyfrowanie
curl -X POST http://localhost:8000/encrypt \
  -H "Content-Type: application/json" \
  -d '{"message": "Tajne hasło!", "name": "Test"}'

# Deszyfrowanie (użyj raw_content z poprzedniej odpowiedzi)
curl -X POST http://localhost:8000/decrypt \
  -H "Content-Type: application/json" \
  -d '{"cipher_data": "..."}'
```

---

## Technologie

| Warstwa | Technologia | Dlaczego? |
|---------|-------------|-----------|
| Backend | FastAPI | Szybki, nowoczesny framework Python |
| Kryptografia | SageMath | Biblioteka do obliczeń algebraicznych |
| Frontend | HTML/CSS/JS | Vanilla, bez frameworków |
| Styl | CSS Custom Properties | Motyw cyberpunk z gradientami |

### Parametry kryptograficzne

- **Ciało skończone**: GF(257) - pierwsze q > 256, żeby pomieścić ASCII
- **Wielomiany**: Sześcienne (stopień 3)
- **Rozmiar bloku**: 20 znaków (n=20)
- **Padding**: PKCS#7 dla dłuższych wiadomości

---

## Źródła i literatura

1. D. Smith-Tone. *"[A Total Break of the 3WISE Digital Signature Scheme](https://eprint.iacr.org/2023/1535.pdf)"* . National Institute of Standards and Technology, 2023.
2. B. Gómez Rodríguez. *"[3WISE: Cubic Element-Wise trapdoor based MPKC cryptosystem](http://rfc.nop.hu/nist/3wise-spec-web.pdf)"* . Specyfikacja dla NIST, 31 maja 2023.
3. N. T. Courtois. *"[Kryptografia wielu zmiennych](http://www.minrank.org/kurs.pdf)"* . Materiały z konferencji Enigma 2000, Warszawa.
4. Kipnis A., Shamir A. *"[Cryptanalysis of the HFE Public Key Cryptosystem](http://www.minrank.org/hfesubreg.pdf)"* . 1999.
5. Faugère J.C., Levy-dit-Vehel F., Perret L. *"[Cryptanalysis of MinRank](https://link.springer.com/chapter/10.1007/978-3-540-85174-5_16)"* . 2008
6. Notatki z wykładów - Kryptografia, semestr zimowy 2025/26

---

## Znane problemy

- [ ] Szyfrowanie dłuższych wiadomości może trwać kilka sekund (każdy blok = osobne wywołanie SageMath)
- [ ] Szyfrogramy są przechowywane w pamięci - znikają po restarcie serwera
- [ ] Brak obsługi polskich znaków (tylko ASCII)

---

## Autorzy
- Piotr Straszak
- Bartłomiej Ząbek
- Kamil Szkarłat
- Jakub Szkaradek
- Paweł Lorenc



---

Projekt wykonany w ramach przedmiotu **Kryptografia** na kierunku Cyberbezpieczeństwo.

---

*Ostatnia aktualizacja: styczeń 2026*
