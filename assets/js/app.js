/* ============================================================
   EquityLens — app.js
   Universal search logic, theme toggle, shared utilities
   ============================================================ */

// ============================================================
// Theme Management
// ============================================================
const THEME_KEY = 'equitylens_theme';

function getTheme() {
    return localStorage.getItem(THEME_KEY) || 'dark';
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    const btn = document.getElementById('themeToggle');
    if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
}

function toggleTheme() {
    applyTheme(getTheme() === 'dark' ? 'light' : 'dark');
}

// ============================================================
// Number Formatters
// ============================================================
function formatIDR(value) {
    const n = parseFloat(value) || 0;
    if (n >= 1e12) return 'Rp ' + (n / 1e12).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' T';
    if (n >= 1e9) return 'Rp ' + (n / 1e9).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' M';
    if (n >= 1e6) return 'Rp ' + (n / 1e6).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Jt';
    return 'Rp ' + n.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatShares(value) {
    const n = parseFloat(value) || 0;
    if (n >= 1e9) return (n / 1e9).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' M lembar';
    if (n >= 1e6) return (n / 1e6).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Jt lembar';
    if (n >= 1e3) return (n / 1e3).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Rb lembar';
    return n.toLocaleString('id-ID') + ' lembar';
}

function formatPct(value) {
    return parseFloat(value).toFixed(2) + '%';
}

function investorTypeLabel(type) {
    const map = { individual: 'Individu', institution: 'Institusi', government: 'Pemerintah', foreign: 'Asing' };
    return map[type] || type;
}

function badgeClass(type) {
    return `type-badge ${type}`;
}

// ============================================================
// Universal Search
// ============================================================
let searchTimeout = null;
let currentResults = null;

function initSearch(inputId, resultsId) {
    const input = document.getElementById(inputId);
    const results = document.getElementById(resultsId);
    if (!input) return;

    input.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        const q = input.value.trim();
        if (q.length < 1) {
            hideResults(results);
            return;
        }
        searchTimeout = setTimeout(() => doSearch(q, input, results), 350);
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            clearTimeout(searchTimeout);
            const q = input.value.trim();
            if (q.length > 0) doSearch(q, input, results, true);
        }
    });

    // Hide results on outside click
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && results && !results.contains(e.target)) {
            hideResults(results);
        }
    });
}

async function doSearch(query, input, resultsEl, navigate = false) {
    try {
        const res = await fetch(`api/search.php?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        currentResults = data;

        if (navigate && data.redirect) {
            window.location.href = data.redirect;
            return;
        }

        if (data.type === 'stock' && navigate) {
            window.location.href = data.redirect;
        } else if (data.type === 'holder' && navigate) {
            window.location.href = data.redirect;
        } else {
            showResults(data, resultsEl);
        }
    } catch (err) {
        console.error('Search error:', err);
    }
}

function showResults(data, container) {
    if (!container) return;

    let html = '';

    if ((data.stocks && data.stocks.length > 0) || data.type === 'stock') {
        const stocks = data.stocks || (data.data ? [data.data] : []);
        if (stocks.length > 0) {
            html += `<div class="search-result-section">
                <div class="search-result-label">📈 Saham</div>`;
            stocks.forEach(s => {
                html += `<div class="search-result-item" onclick="window.location.href='stock.html?ticker=${s.ticker}'">
                    <div class="sri-icon stock">${s.ticker}</div>
                    <div>
                        <div class="sri-title">${s.ticker}</div>
                        <div class="sri-sub">${s.company_name}</div>
                    </div>
                </div>`;
            });
            html += '</div>';
        }
    }

    if ((data.holders && data.holders.length > 0) || data.type === 'holder') {
        const holders = data.holders || (data.data ? [data.data] : []);
        if (holders.length > 0) {
            html += `<div class="search-result-section">
                <div class="search-result-label">👤 Pemegang Saham</div>`;
            holders.forEach(h => {
                html += `<div class="search-result-item" onclick="window.location.href='holder.html?id=${h.id}'">
                    <div class="sri-icon holder">${h.full_name.charAt(0)}</div>
                    <div>
                        <div class="sri-title">${h.full_name}</div>
                        <div class="sri-sub">${investorTypeLabel(h.investor_type)} · ${h.domicile}</div>
                    </div>
                </div>`;
            });
            html += '</div>';
        }
    }

    if (!html) {
        html = `<div class="search-result-section">
            <div style="padding:16px;text-align:center;color:var(--text-muted);font-size:0.85rem;">
                Tidak ada hasil untuk "<strong>${escHtml(currentResults?.query || '')}</strong>"
            </div>
        </div>`;
    }

    container.innerHTML = html;
    container.classList.add('active');
}

function hideResults(container) {
    if (container) container.classList.remove('active');
}

function escHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Hint chips
function fillSearch(query) {
    const inputs = ['heroSearch', 'navSearch'];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.value = query; el.focus(); }
    });
    doSearch(query, null, document.getElementById('searchResults'));
}

// ============================================================
// Sortable Table
// ============================================================
function makeSortable(tableId) {
    const table = document.getElementById(tableId);
    if (!table) return;
    const headers = table.querySelectorAll('thead th[data-sort]');
    let currentSort = { col: null, dir: 1 };

    headers.forEach(th => {
        th.addEventListener('click', () => {
            const col = th.dataset.sort;
            const type = th.dataset.type || 'string';
            if (currentSort.col === col) {
                currentSort.dir *= -1;
            } else {
                currentSort.col = col;
                currentSort.dir = -1; // default: descending for numbers
            }

            headers.forEach(h => {
                h.classList.remove('sorted');
                h.querySelector('.sort-icon').textContent = '⇅';
            });
            th.classList.add('sorted');
            th.querySelector('.sort-icon').textContent = currentSort.dir === 1 ? '↑' : '↓';

            const tbody = table.querySelector('tbody');
            const rows = Array.from(tbody.querySelectorAll('tr'));

            rows.sort((a, b) => {
                const aVal = a.querySelector(`[data-col="${col}"]`)?.dataset?.raw ?? a.cells[parseInt(col)]?.textContent ?? '';
                const bVal = b.querySelector(`[data-col="${col}"]`)?.dataset?.raw ?? b.cells[parseInt(col)]?.textContent ?? '';
                if (type === 'number') {
                    return (parseFloat(aVal) - parseFloat(bVal)) * currentSort.dir;
                }
                return aVal.localeCompare(bVal) * currentSort.dir;
            });

            rows.forEach(r => tbody.appendChild(r));
        });
    });
}

// ============================================================
// Init on DOMContentLoaded
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    applyTheme(getTheme());

    const toggleBtn = document.getElementById('themeToggle');
    if (toggleBtn) toggleBtn.addEventListener('click', toggleTheme);

    // Init search bars
    initSearch('heroSearch', 'searchResults');
    initSearch('navSearch', 'navSearchResults');
});
