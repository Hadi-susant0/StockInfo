<?php
// ============================================================
// EquityLens — Stock Profile API
// GET /api/stock.php?ticker=BBCA
// ============================================================
require_once __DIR__ . '/../config/database.php';

$ticker = strtoupper(trim($_GET['ticker'] ?? ''));

if (empty($ticker)) {
    jsonResponse(['error' => 'ticker parameter is required'], 400);
}

$db = getDB();

// Fetch stock details
$stmt = $db->prepare('SELECT * FROM stocks WHERE ticker = ? LIMIT 1');
$stmt->execute([$ticker]);
$stock = $stmt->fetch();

if (!$stock) {
    jsonResponse(['error' => "Stock '{$ticker}' not found"], 404);
}

$totalShares   = (float)$stock['total_shares'];
$currentPrice  = (float)$stock['current_price'];
$marketCap     = $totalShares * $currentPrice;

// Fetch all owners for this stock
$stmt = $db->prepare(
    'SELECT
        h.id            AS holder_id,
        h.full_name,
        h.domicile,
        h.investor_type,
        o.shares_owned,
        o.is_controlling,
        o.recorded_date,
        (o.shares_owned * s.current_price)          AS ownership_value,
        (o.shares_owned / s.total_shares * 100)     AS ownership_pct
     FROM ownership o
     JOIN holders h ON h.id = o.holder_id
     JOIN stocks  s ON s.id = o.stock_id
     WHERE s.ticker = ?
     ORDER BY o.shares_owned DESC'
);
$stmt->execute([$ticker]);
$owners = $stmt->fetchAll();

// Calculate Free Float and controlling breakdown
$controllingShares = 0;
$totalOwnedPct     = 0;
foreach ($owners as &$owner) {
    $owner['shares_owned']    = (float)$owner['shares_owned'];
    $owner['ownership_value'] = (float)$owner['ownership_value'];
    $owner['ownership_pct']   = round((float)$owner['ownership_pct'], 4);
    $owner['is_controlling']  = (bool)$owner['is_controlling'];

    $totalOwnedPct += $owner['ownership_pct'];

    if ($owner['is_controlling']) {
        $controllingShares += $owner['shares_owned'];
    }
}
unset($owner);

// Free Float = 100% - semua % kepemilikan yang tercatat di PDF
$freeFloatPct   = max(0, round(100 - $totalOwnedPct, 2));
$controllingPct = $totalShares > 0 ? round(($controllingShares / $totalShares) * 100, 2) : 0;

jsonResponse([
    'stock' => [
        'id'           => (int)$stock['id'],
        'ticker'       => $stock['ticker'],
        'company_name' => $stock['company_name'],
        'sector'       => $stock['sector'],
        'total_shares' => $totalShares,
        'current_price'=> $currentPrice,
        'listing_date' => $stock['listing_date'],
        'market_cap'   => $marketCap,
        'free_float_pct'    => $freeFloatPct,
        'controlling_pct'   => $controllingPct,
        'public_shares'     => round($freeFloatPct / 100 * $totalShares),
        'controlling_shares'=> $controllingShares,
    ],
    'owners' => $owners,
    'owner_count' => count($owners),
]);
