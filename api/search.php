<?php
// ============================================================
// EquityLens — Universal Search API
// GET /api/search.php?q=BBCA
// GET /api/search.php?q=Robert+Budi
// ============================================================
require_once __DIR__ . '/../config/database.php';

$q = trim($_GET['q'] ?? '');

if (strlen($q) < 1) {
    jsonResponse(['error' => 'Query parameter q is required'], 400);
}

$db = getDB();

// --- Detection Logic ---
// Rule: 2–5 uppercase letters = likely a stock ticker
// Otherwise = holder name search
$isTickerQuery = preg_match('/^[A-Z]{2,5}$/', strtoupper($q));

if ($isTickerQuery) {
    $ticker = strtoupper($q);
    $stmt = $db->prepare('SELECT id, ticker, company_name, sector, current_price FROM stocks WHERE ticker = ?');
    $stmt->execute([$ticker]);
    $stock = $stmt->fetch();

    if ($stock) {
        jsonResponse([
            'type'    => 'stock',
            'redirect'=> "stock.html?ticker={$stock['ticker']}",
            'data'    => $stock
        ]);
    }
    // If no ticker match, fall through to name search
}

// --- Name Search ---
$stmt = $db->prepare(
    'SELECT id, full_name, domicile, investor_type
     FROM holders
     WHERE full_name LIKE ?
     ORDER BY full_name ASC
     LIMIT 10'
);
$stmt->execute(['%' . $q . '%']);
$holders = $stmt->fetchAll();

// Also search stocks by company name
$stmt2 = $db->prepare(
    'SELECT id, ticker, company_name, sector, current_price
     FROM stocks
     WHERE company_name LIKE ? OR ticker LIKE ?
     ORDER BY ticker ASC
     LIMIT 10'
);
$stmt2->execute(['%' . $q . '%', '%' . strtoupper($q) . '%']);
$stocks = $stmt2->fetchAll();

if (count($holders) === 1 && count($stocks) === 0) {
    // Single holder match — redirect directly
    jsonResponse([
        'type'     => 'holder',
        'redirect' => "holder.html?id={$holders[0]['id']}",
        'data'     => $holders[0]
    ]);
} elseif (count($stocks) === 1 && count($holders) === 0) {
    jsonResponse([
        'type'     => 'stock',
        'redirect' => "stock.html?ticker={$stocks[0]['ticker']}",
        'data'     => $stocks[0]
    ]);
} else {
    // Multiple results — return combined list
    jsonResponse([
        'type'    => 'multi',
        'holders' => $holders,
        'stocks'  => $stocks,
        'total'   => count($holders) + count($stocks)
    ]);
}
