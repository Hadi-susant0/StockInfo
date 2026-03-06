/* ============================================================
   EquityLens — Chart.js Helpers
   ============================================================ */

const CHART_COLORS = [
    '#1a7f37', '#2ea043', '#3fb950', '#56d364', '#7ee787',
    '#115822', '#22863a', '#28a745', '#40c463', '#85e89d'
];

/**
 * Renders a Donut Chart on a given canvas element.
 * @param {string} canvasId   - Canvas element ID
 * @param {string[]} labels   - Array of label strings
 * @param {number[]} data     - Array of numeric values (percentages or absolutes)
 * @param {string[]} colors   - Array of hex/rgb colors (optional, defaults to CHART_COLORS)
 * @returns {Chart}           - Chart.js instance
 */
function renderDonutChart(canvasId, labels, data, colors = null) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;

    // Destroy existing chart if re-rendering
    if (ctx._chartInstance) {
        ctx._chartInstance.destroy();
    }

    const palette = colors || CHART_COLORS;

    const chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: palette.map(c => c + 'cc'),
                borderColor: palette,
                borderWidth: 2,
                hoverOffset: 8,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            cutout: '68%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function (ctx) {
                            const val = ctx.parsed;
                            return ` ${ctx.label}: ${val.toFixed(2)}%`;
                        }
                    },
                    backgroundColor: 'rgba(13,17,23,0.95)',
                    titleColor: '#e6edf3',
                    bodyColor: '#8b949e',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8,
                }
            },
            animation: {
                animateRotate: true,
                duration: 800,
                easing: 'easeInOutCubic',
            }
        }
    });

    ctx._chartInstance = chart;
    return chart;
}

/**
 * Builds the HTML legend for a donut chart
 * @param {string[]} labels
 * @param {number[]} data
 * @param {string[]} colors
 * @returns {string} HTML string
 */
function buildChartLegend(labels, data, colors = null) {
    const palette = colors || CHART_COLORS;
    return labels.map((label, i) => `
        <div class="legend-item">
            <div class="legend-dot" style="background:${palette[i] || '#888'}"></div>
            <span class="legend-name" title="${label}">${label}</span>
            <span class="legend-pct">${Number(data[i]).toFixed(2)}%</span>
        </div>
    `).join('');
}
