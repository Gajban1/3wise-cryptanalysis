/**
 * Crypto Explorer - Aplikacja frontendowa
 */

const API_BASE = 'http://localhost:8000';

const plaintextInput = document.getElementById('plaintext');
const cipherNameInput = document.getElementById('cipherName');
const encryptBtn = document.getElementById('encryptBtn');
const encryptResult = document.getElementById('encryptResult');
const polynomialDisplay = document.getElementById('polynomialDisplay');
const solveBtn = document.getElementById('solveBtn');
const attackConsole = document.getElementById('attackConsole');
const decryptedMessage = document.getElementById('decryptedMessage');

const statN = document.getElementById('statN');
const statQ = document.getElementById('statQ');
const statPoly = document.getElementById('statPoly');

let currentCipherData = null;

function updateClock() {
    const now = new Date();
    document.getElementById('clock').textContent = now.toLocaleTimeString('pl-PL');
}
setInterval(updateClock, 1000);
updateClock();

function logToConsole(message, type = '') {
    const line = document.createElement('div');
    line.className = `console-line ${type}`;
    line.textContent = message;
    attackConsole.appendChild(line);
    attackConsole.scrollTop = attackConsole.scrollHeight;
}

function clearConsole() {
    attackConsole.innerHTML = '';
}

function formatPolynomial(poly) {
    const subscripts = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉' };
    const superscripts = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };

    let formatted = poly;

    formatted = formatted.replace(/x(\d+)/g, (match, digits) => {
        return 'x' + digits.split('').map(d => subscripts[d] || d).join('');
    });

    formatted = formatted.replace(/\^(\d+)/g, (match, digits) => {
        return digits.split('').map(d => superscripts[d] || d).join('');
    });

    formatted = formatted.replace(/\+/g, ' + ');
    formatted = formatted.replace(/\-/g, ' − ');
    formatted = formatted.replace(/\*/g, '·');

    return formatted.replace(/\s+/g, ' ').trim();
}

function displayPolynomials(polyString) {
    try {
        const cleaned = polyString.slice(1, -1);
        const polys = cleaned.split(', ').slice(0, 10);

        polynomialDisplay.innerHTML = polys.map((poly, i) => {
            const formatted = formatPolynomial(poly);
            const truncated = formatted.length > 100 ? formatted.substring(0, 100) + '…' : formatted;
            return `<div class="poly-line"><span class="poly-index">P<sub>${i}</sub>:</span> ${truncated}</div>`;
        }).join('');

        if (polys.length < cleaned.split(', ').length) {
            polynomialDisplay.innerHTML += `<div class="poly-line" style="color: var(--text-muted)">… i ${cleaned.split(', ').length - 10} więcej wielomianów</div>`;
        }
    } catch (e) {
        polynomialDisplay.innerHTML = `<div class="placeholder">Błąd parsowania wielomianów</div>`;
    }
}


// ============================================
// SZYFROWANIE
// ============================================

async function encrypt() {
    const message = plaintextInput.value.trim();
    if (!message) {
        alert('Wprowadź wiadomość do zaszyfrowania!');
        return;
    }

    encryptBtn.classList.add('loading');
    encryptBtn.disabled = true;
    clearConsole();
    logToConsole('[ENCRYPT] Rozpoczynanie szyfrowania...', 'info');

    try {
        const name = cipherNameInput.value.trim() || null;
        const response = await fetch(`${API_BASE}/encrypt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, name })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Szyfrowanie nie powiodło się');
        }

        const data = await response.json();

        encryptResult.innerHTML = `<pre>${data.raw_content}</pre>`;
        displayPolynomials(data.public_key);

        statN.textContent = data.n;
        statQ.textContent = data.q;
        statPoly.textContent = data.n;

        currentCipherData = data.raw_content;
        solveBtn.disabled = false;

        logToConsole(`[ENCRYPT] Sukces! Wygenerowano ${data.n} wielomianów.`, 'found');
        logToConsole('[SYSTEM] Gotowy do ataku MinRank.', 'info');

        loadCiphers();

    } catch (error) {
        logToConsole(`[ERROR] ${error.message}`, 'error');
        encryptResult.innerHTML = `<div class="placeholder" style="color: var(--accent-tertiary)">Błąd: ${error.message}</div>`;
    } finally {
        encryptBtn.classList.remove('loading');
        encryptBtn.disabled = false;
    }
}


// ============================================
// DESZYFROWANIE
// ============================================

async function solve() {
    if (!currentCipherData) {
        alert('Najpierw zaszyfruj wiadomość!');
        return;
    }

    solveBtn.classList.add('loading');
    solveBtn.disabled = true;
    decryptedMessage.innerHTML = '<span class="waiting">Łamanie szyfru...</span>';

    logToConsole('', '');
    logToConsole('═'.repeat(40), 'info');
    logToConsole('[ATTACK] Uruchamianie ataku MinRank...', 'phase');
    logToConsole('[WAIT] Proszę czekać, trwa analiza szyfrogramu...', 'info');

    try {
        const response = await fetch(`${API_BASE}/solve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cipher_data: currentCipherData })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Atak nie powiódł się');
        }

        const data = await response.json();

        clearConsole();
        logToConsole('═'.repeat(40), 'info');
        logToConsole('[ATTACK] Atak MinRank zakończony!', 'phase');

        if (data.logs) {
            const lines = data.logs.split('\n').filter(l => l.trim());
            for (const line of lines) {
                let type = '';
                if (line.includes('[PHASE]')) type = 'phase';
                else if (line.includes('[FOUND]')) type = 'found';
                else if (line.includes('[INIT]') || line.includes('[INFO]')) type = 'info';
                else if (line.includes('ODSZYFROWANA')) type = 'result';

                logToConsole(line, type);
                await new Promise(r => setTimeout(r, 50));
            }
        }

        if (data.decrypted) {
            decryptedMessage.innerHTML = `<span class="success">${data.decrypted}</span>`;
            logToConsole('', '');
            logToConsole('[SUCCESS] Atak zakończony sukcesem!', 'found');
        } else {
            decryptedMessage.innerHTML = '<span class="waiting">Nie udało się odszyfrować</span>';
            logToConsole('[WARN] Atak nie zwrócił wyniku.', 'error');
        }

    } catch (error) {
        logToConsole(`[ERROR] ${error.message}`, 'error');
        decryptedMessage.innerHTML = `<span class="waiting" style="color: var(--accent-tertiary)">Błąd: ${error.message}</span>`;
    } finally {
        solveBtn.classList.remove('loading');
        solveBtn.disabled = false;
    }
}


// ============================================
// OBSŁUGA LISTY
// ============================================

const cipherList = document.getElementById('cipherList');
const refreshCiphersBtn = document.getElementById('refreshCiphersBtn');

async function loadCiphers() {
    try {
        const response = await fetch(`${API_BASE}/ciphers`);
        const data = await response.json();

        if (data.count === 0) {
            cipherList.innerHTML = '<div class="placeholder">Brak zapisanych szyfrogramów...</div>';
            return;
        }

        cipherList.innerHTML = data.ciphers.map(cipher => `
            <div class="cipher-item" data-id="${cipher.id}">
                <span class="cipher-label">${cipher.name || '#' + cipher.id}</span>
                <span class="cipher-info">N=${cipher.n}, Q=${cipher.q}</span>
                <span class="cipher-time">${new Date(cipher.created_at).toLocaleTimeString('pl-PL')}</span>
                <div class="cipher-actions">
                    <button class="cipher-load" onclick="loadCipher('${cipher.id}')">LOAD</button>
                    <button class="cipher-delete" onclick="deleteCipher('${cipher.id}')">✕</button>
                </div>
            </div>
        `).join('');

    } catch (error) {
        cipherList.innerHTML = `<div class="placeholder" style="color: var(--accent-tertiary)">Błąd ładowania: ${error.message}</div>`;
    }
}

async function loadCipher(cipherId) {
    try {
        const response = await fetch(`${API_BASE}/ciphers/${cipherId}`);
        if (!response.ok) throw new Error('Nie znaleziono szyfrogramu');

        const data = await response.json();

        currentCipherData = data.raw_content;
        displayPolynomials(data.public_key);

        statN.textContent = data.n;
        statQ.textContent = data.q;
        statPoly.textContent = data.n;

        encryptResult.innerHTML = `<pre>${data.raw_content}</pre>`;
        solveBtn.disabled = false;

        document.querySelectorAll('.cipher-item').forEach(el => el.classList.remove('selected'));
        document.querySelector(`.cipher-item[data-id="${cipherId}"]`)?.classList.add('selected');

        clearConsole();
        logToConsole(`[LOAD] Załadowano szyfrogram #${cipherId}`, 'info');
        logToConsole('[SYSTEM] Gotowy do ataku MinRank.', 'info');

    } catch (error) {
        logToConsole(`[ERROR] ${error.message}`, 'error');
    }
}

async function deleteCipher(cipherId) {
    try {
        const response = await fetch(`${API_BASE}/ciphers/${cipherId}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Usuwanie nie powiodło się');

        logToConsole(`[DELETE] Usunięto szyfrogram #${cipherId}`, 'info');
        loadCiphers();

    } catch (error) {
        logToConsole(`[ERROR] ${error.message}`, 'error');
    }
}

encryptBtn.addEventListener('click', encrypt);
solveBtn.addEventListener('click', solve);
refreshCiphersBtn.addEventListener('click', loadCiphers);

plaintextInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        encrypt();
    }
});

function autoResizeTextarea() {
    plaintextInput.style.height = 'auto';
    plaintextInput.style.height = Math.min(plaintextInput.scrollHeight, 200) + 'px';
}
plaintextInput.addEventListener('input', autoResizeTextarea);

logToConsole('[SYSTEM] Crypto Explorer uruchomiony.', 'info');
logToConsole('[SYSTEM] Oczekiwanie na wiadomość do zaszyfrowania...', '');
loadCiphers();
