<?php
// ============================================================
// EquityLens — Dashboard Stats API
// GET /api/dashboard.php
// ============================================================
require_once __DIR__ . '/../config/database.php';

$db = getDB();

// Top stocks by market cap
$topStocks = $db->query(
    'SELECT ticker, company_name, sector, current_price, total_shares,
            (total_shares * current_price) AS market_cap
     FROM stocks
     ORDER BY market_cap DESC
     LIMIT 8'
)->fetchAll();

foreach ($topStocks as &$s) {
    $s['market_cap']    = (float)$s['market_cap'];
    $s['total_shares']  = (float)$s['total_shares'];
    $s['current_price'] = (float)$s['current_price'];
}
unset($s);

// Aggregate counts
$totals = $db->query(
    'SELECT
        (SELECT COUNT(*) FROM stocks)  AS total_stocks,
        (SELECT COUNT(*) FROM holders) AS total_holders,
        (SELECT COUNT(*) FROM ownership) AS total_records,
        (SELECT SUM(total_shares * current_price) FROM stocks) AS total_market_cap'
)->fetch();

$totals['total_market_cap'] = (float)$totals['total_market_cap'];
$totals['total_stocks']     = (int)$totals['total_stocks'];
$totals['total_holders']    = (int)$totals['total_holders'];
$totals['total_records']    = (int)$totals['total_records'];

// Market cap by sector
$bySector = $db->query(
    'SELECT sector, COUNT(*) AS count, SUM(total_shares * current_price) AS sector_cap
     FROM stocks GROUP BY sector ORDER BY sector_cap DESC'
)->fetchAll();

foreach ($bySector as &$row) {
    $row['sector_cap'] = (float)$row['sector_cap'];
    $row['count']      = (int)$row['count'];
}
unset($row);

// All stocks list (for table display)
$allStocks = $db->query(
    'SELECT s.ticker, s.company_name, s.sector, s.current_price, s.total_shares,
            (s.total_shares * s.current_price) AS market_cap,
            COUNT(o.id) AS holder_count
     FROM stocks s
     LEFT JOIN ownership o ON o.stock_id = s.id
     GROUP BY s.id
     ORDER BY market_cap DESC'
)->fetchAll();

foreach ($allStocks as &$s) {
    $s['market_cap']    = (float)$s['market_cap'];
    $s['total_shares']  = (float)$s['total_shares'];
    $s['current_price'] = (float)$s['current_price'];
    $s['holder_count']  = (int)$s['holder_count'];
}
unset($s);

jsonResponse([
    'stats'      => $totals,
    'top_stocks' => $topStocks,
    'by_sector'  => $bySector,
    'all_stocks' => $allStocks,
]);
