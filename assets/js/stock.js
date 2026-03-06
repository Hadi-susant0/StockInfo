/* ============================================================
   EquityLens — stock.js
   Stock Profile Page Logic
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
    // Read ticker from URL: stock.html?ticker=BBCA
    const params = new URLSearchParams(window.location.search);
    const ticker = (params.get('ticker') || '').toUpperCase();

    if (!ticker) {
        showError('Kode saham tidak ditemukan di URL.');
        return;
    }

    try {
        const res = await fetch(`api/stock.php?ticker=${encodeURIComponent(ticker)}`);
        const json = await res.json();

        if (!res.ok || json.error) {
            showError(json.error || 'Saham tidak ditemukan.');
            return;
        }

        renderPage(json);
    } catch (err) {
        showError('Gagal memuat data. Pastikan server berjalan.');
        console.error(err);
    }
});

function renderPage({ stock, owners, owner_count }) {
    document.title = `${stock.ticker} — ${stock.company_name} | EquityLens`;

    // Breadcrumb
    document.getElementById('bcTicker').textContent = stock.ticker;

    // Profile Header
    document.getElementById('avatarText').textContent = stock.ticker.slice(0, 2);
    document.getElementById('profileTicker').textContent = stock.ticker;
    document.getElementById('profileName').textContent = stock.company_name;
    document.getElementById('profileSector').textContent = stock.sector;
    document.getElementById('profileListing').textContent = stock.listing_date
        ? new Date(stock.listing_date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })
        : '—';
    document.getElementById('profileOwnerCount').textContent = `${owner_count} Pemegang`;

    // KPI Cards
    document.getElementById('kpiMarketCap').textContent = formatIDR(stock.market_cap);
    document.getElementById('kpiPrice').textContent = `Rp ${Number(stock.current_price).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById('kpiFreeFloat').textContent = formatPct(stock.free_float_pct);
    document.getElementById('kpiTotalShares').textContent = formatShares(stock.total_shares);
    document.getElementById('kpiControlling').textContent = formatPct(stock.controlling_pct);

    // Free Float Bar
    document.getElementById('freeFloatBar').style.width = Math.min(100, stock.free_float_pct) + '%';
    document.getElementById('freeFloatPctLabel').textContent = formatPct(stock.free_float_pct) + ' Free Float';
    document.getElementById('controllingPctLabel').textContent = formatPct(stock.controlling_pct) + ' Pengendali';

    // Donut Chart — Top 10 holders + Free Float sebagai segmen terpisah
    const top10 = owners.slice(0, 10);
    const top10Labels = top10.map(o => o.full_name);
    const top10Data = top10.map(o => parseFloat(o.ownership_pct));

    // Hitung pct yang sudah dicakup top10, sisanya adalah "Other" atau Free Float
    const top10Total = top10Data.reduce((a, b) => a + b, 0);
    const freeFloatPct = parseFloat(stock.free_float_pct);

    // Tambahkan segmen Free Float di akhir chart
    const chartLabels = [...top10Labels, 'Free Float (Publik)'];
    const chartData = [...top10Data, Math.max(0, freeFloatPct)];

    // Warna: 10 warna standar dominan hijau + warna abu-abu khusus Free Float
    const chartColors = [
        '#1a7f37', '#2ea043', '#3fb950', '#56d364', '#7ee787',
        '#115822', '#22863a', '#28a745', '#40c463', '#85e89d',
        '#8b949e', // Free Float — abu-abu netral
    ];

    renderDonutChart('ownershipChart', chartLabels, chartData, chartColors);
    document.getElementById('chartLegend').innerHTML = buildChartLegend(chartLabels, chartData, chartColors);

    // Owners Table — tanpa kolom Klasifikasi
    const tbody = document.getElementById('ownersTbody');
    tbody.innerHTML = owners.map((o, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>
                <a href="holder.html?id=${o.holder_id}" class="d-flex align-center gap-8" style="color:var(--text-primary);font-weight:500;">
                    ${escHtml(o.full_name)}
                </a>
            </td>
            <td><span class="${badgeClass(o.investor_type)}">${investorTypeLabel(o.investor_type)}</span></td>
            <td>${escHtml(o.domicile)}</td>
            <td class="text-right font-mono" data-col="shares" data-raw="${o.shares_owned}">
                ${formatSharesExact(o.shares_owned)}
            </td>
            <td class="text-right fw-600 text-blue" data-col="pct" data-raw="${o.ownership_pct}">
                ${formatPct(o.ownership_pct)}
            </td>
            <td class="text-right fw-700" data-col="value" data-raw="${o.ownership_value}">
                ${formatIDR(o.ownership_value)}
            </td>
        </tr>
    `).join('');

    makeSortable('ownersTable');

    // Show page
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('pageContent').style.display = 'block';
}

/** Format angka saham dengan ribuan separator (xx.xxx) tanpa memotong jadi juta/miliar */
function formatSharesExact(value) {
    const n = parseFloat(value);
    if (!n) return '0 lembar';
    return n.toLocaleString('id-ID', { maximumFractionDigits: 0 }) + ' lembar';
}

function showError(msg) {
    document.getElementById('loadingState').style.display = 'none';
    const err = document.getElementById('errorState');
    if (err) {
        err.style.display = 'block';
        err.querySelector('.error-msg').textContent = msg;
    }
}
