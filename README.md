# Rock, Paper, Scissors Website

An interactive web game where you play Rock, Paper, Scissors against a computer opponent.  
This is the first stage of a larger open-source project inspired by [Mark Rober's unbeatable robot hand](https://www.youtube.com/watch?v=qgZReY9jnj4).

## 🚀 Project Description

This website is a fun and engaging online experience that lets users play Rock, Paper, Scissors against a pseudo-AI.  
It features a leaderboard, smooth animations, and a computer opponent that analyzes your moves to provide a more challenging gameplay.



## 🛠️ Project Stages

1. **Website (current stage):**  
   Interactive web game with leaderboard and basic AI.

2. **AI Model:**  
   Real-time hand gesture recognition using a camera (planned).

3. **Robotic Hand:**  
   A physical robotic hand that plays Rock, Paper, Scissors and always wins (planned).

## ✨ Features

- Play 10 rounds against the computer.
- Leaderboard showing top 20 players by wins.
- Pseudo-AI analyzes your move history to detect patterns.
- If you favor a certain move, the AI will try to beat it; otherwise, it picks randomly.
- Smooth CSS animations and responsive design.

## 💻 Technical Implementation

### Frontend

- **HTML5, CSS3, JavaScript** (no frameworks)
- Animations via CSS `@keyframes`
- Responsive and modern UI

### Backend

- **PHP** with PDO for database operations
- **SQLite** database for storing game results and leaderboard
- REST API for communication between frontend and backend

#### Example: Pseudo-AI Logic (PHP)
```php
private function getAIChoice(string $game_id, string $player_name): string {
    // Get player's move history
    $stmt = $this->db->prepare(
        "SELECT user_choice
         FROM games
         WHERE game_id = ? AND player_name = ?
         ORDER BY played_at DESC
         LIMIT 10"
    );
    $stmt->execute([$game_id, $player_name]);
    $history = $stmt->fetchAll(PDO::FETCH_COLUMN);

    // If no history, pick randomly
    if (empty($history)) {
        return self::CHOICES[array_rand(self::CHOICES)];
    }

    // Analyze player patterns
    $counts = array_count_values($history);
    $most_frequent = array_search(max($counts), $counts);

    // Try to win if a pattern is detected
    $winning_moves = array_flip(self::WINNING_COMBINATIONS);
    if (max($counts) > count($history) / 3) {
        return $winning_moves[$most_frequent];
    }

    return self::CHOICES[array_rand(self::CHOICES)];
}