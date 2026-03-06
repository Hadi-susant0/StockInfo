<?php
// ============================================================
// EquityLens — Holder Profile API
// GET /api/holder.php?id=1
// ============================================================
require_once __DIR__ . '/../config/database.php';

$holderId = (int)($_GET['id'] ?? 0);

if ($holderId < 1) {
    jsonResponse(['error' => 'id parameter is required and must be a positive integer'], 400);
}

$db = getDB();

// Fetch holder details
$stmt = $db->prepare('SELECT * FROM holders WHERE id = ? LIMIT 1');
$stmt->execute([$holderId]);
$holder = $stmt->fetch();

if (!$holder) {
    jsonResponse(['error' => "Holder with id={$holderId} not found"], 404);
}

// Fetch all stocks in this holder's portfolio
$stmt = $db->prepare(
    'SELECT
        s.id            AS stock_id,
        s.ticker,
        s.company_name,
        s.sector,
        s.current_price,
        s.total_shares,
        o.shares_owned,
        o.is_controlling,
        o.recorded_date,
        (o.shares_owned * s.current_price)          AS ownership_value,
        (o.shares_owned / s.total_shares * 100)     AS ownership_pct,
        (s.total_shares * s.current_price)          AS market_cap
     FROM ownership o
     JOIN stocks  s ON s.id = o.stock_id
     WHERE o.holder_id = ?
     ORDER BY (o.shares_owned * s.current_price) DESC'
);
$stmt->execute([$holderId]);
$portfolio = $stmt->fetchAll();

// Calculate portfolio totals
$totalPortfolioValue = 0;
foreach ($portfolio as &$holding) {
    $holding['shares_owned']    = (float)$holding['shares_owned'];
    $holding['ownership_value'] = (float)$holding['ownership_value'];
    $holding['ownership_pct']   = round((float)$holding['ownership_pct'], 4);
    $holding['is_controlling']  = (bool)$holding['is_controlling'];
    $holding['market_cap']      = (float)$holding['market_cap'];
    $totalPortfolioValue       += $holding['ownership_value'];
}
unset($holding);

jsonResponse([
    'holder' => [
        'id'            => (int)$holder['id'],
        'full_name'     => $holder['full_name'],
        'domicile'      => $holder['domicile'],
        'investor_type' => $holder['investor_type'],
        'description'   => $holder['description'],
    ],
    'portfolio'            => $portfolio,
    'holdings_count'       => count($portfolio),
    'total_portfolio_value'=> $totalPortfolioValue,
]);
