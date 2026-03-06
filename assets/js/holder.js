/* ============================================================
   EquityLens — holder.js
   Holder Profile Page Logic
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const holderId = parseInt(params.get('id') || '0');

    if (!holderId) {
        showError('ID pemegang saham tidak valid.');
        return;
    }

    try {
        const res = await fetch(`api/holder.php?id=${holderId}`);
        const json = await res.json();

        if (!res.ok || json.error) {
            showError(json.error || 'Pemegang saham tidak ditemukan.');
            return;
        }

        renderPage(json);
    } catch (err) {
        showError('Gagal memuat data. Pastikan server berjalan.');
        console.error(err);
    }
});

function renderPage({ holder, portfolio, holdings_count, total_portfolio_value }) {
    document.title = `${holder.full_name} | EquityLens`;

    // Breadcrumb
    document.getElementById('bcName').textContent = holder.full_name;

    // Avatar (initials)
    const initials = holder.full_name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
    document.getElementById('avatarText').textContent = initials;

    // Profile Header
    document.getElementById('profileName').textContent = holder.full_name;
    document.getElementById('profileType').innerHTML = `<span class="${badgeClass(holder.investor_type)}">${investorTypeLabel(holder.investor_type)}</span>`;
    document.getElementById('profileDomicile').textContent = holder.domicile;
    document.getElementById('profileDesc').textContent = holder.description || '';
    document.getElementById('profileHoldings').textContent = `${holdings_count} Portofolio Saham`;

    // KPI Cards
    document.getElementById('kpiPortfolioValue').textContent = formatIDR(total_portfolio_value);
    document.getElementById('kpiHoldingsCount').textContent = holdings_count;

    // Count controlling positions
    const controllingCount = portfolio.filter(h => h.is_controlling).length;
    document.getElementById('kpiControlling').textContent = controllingCount;
    document.getElementById('kpiDomicile').textContent = holder.domicile;

    // Donut Chart of portfolio by value
    if (portfolio.length > 0) {
        const totalVal = portfolio.reduce((s, h) => s + h.ownership_value, 0);
        const labels = portfolio.map(h => h.ticker);
        const data = portfolio.map(h => totalVal > 0 ? (h.ownership_value / totalVal * 100) : 0);
        renderDonutChart('portfolioChart', labels, data);
        document.getElementById('portfolioLegend').innerHTML = buildChartLegend(labels, data);
    }

    // Portfolio Table
    const tbody = document.getElementById('portfolioTbody');
    tbody.innerHTML = portfolio.map((h, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>
                <a href="stock.html?ticker=${h.ticker}" class="ticker-badge">${h.ticker}</a>
            </td>
            <td style="color:var(--text-secondary);">${escHtml(h.company_name)}</td>
            <td><span class="sector-tag">${escHtml(h.sector)}</span></td>
            <td class="text-right font-mono" data-col="shares" data-raw="${h.shares_owned}">
                ${formatShares(h.shares_owned)}
            </td>
            <td class="text-right fw-600 text-blue" data-col="pct" data-raw="${h.ownership_pct}">
                ${formatPct(h.ownership_pct)}
            </td>
            <td class="text-right" data-col="price" data-raw="${h.current_price}">
                Rp ${Number(h.current_price).toLocaleString('id-ID')}
            </td>
            <td class="text-right fw-700 text-green" data-col="value" data-raw="${h.ownership_value}">
                ${formatIDR(h.ownership_value)}
            </td>
            <td>
                ${h.is_controlling
            ? '<span class="controlling-badge">⭐ Pengendali</span>'
            : '<span class="text-muted" style="font-size:0.8rem;">Non-pengendali</span>'
        }
            </td>
        </tr>
    `).join('');

    makeSortable('portfolioTable');

    // Show page
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('pageContent').style.display = 'block';
}

function showError(msg) {
    document.getElementById('loadingState').style.display = 'none';
    const err = document.getElementById('errorState');
    if (err) {
        err.style.display = 'block';
        err.querySelector('.error-msg').textContent = msg;
    }
}
