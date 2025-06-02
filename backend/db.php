<?php
try {
    $db = new PDO('sqlite:rock_sizers_paper.sqlite');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $db->exec("CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id TEXT,
        player_name TEXT,
        user_choice TEXT,
        ai_choice TEXT,
        result TEXT,
        played_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");

    $db->exec("CREATE TABLE IF NOT EXISTS leaderboard (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_name TEXT,
        wins INTEGER,
        played_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");

    // IP rate limiting
    $db->exec("CREATE TABLE IF NOT EXISTS ip_game_starts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip TEXT,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");

    // Garbage
    $db->exec("DELETE FROM ip_game_starts WHERE started_at < DATETIME('now', '-1 day')");

} catch(PDOException $e) {
    throw new Exception('Database connection failed: ' . $e->getMessage());
}
?>