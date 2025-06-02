<?php
class GameLogic {
    private $db;
    private const CHOICES = ['rock', 'paper', 'scissors'];
    private const WINNING_COMBINATIONS = [
        'rock' => 'scissors',
        'paper' => 'rock',
        'scissors' => 'paper'
    ];

    public function __construct(PDO $db) {
        $this->db = $db;
        $this->initSession();
    }

    private function initSession(): void {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        if (!isset($_SESSION['security_initiated'])) {
            session_regenerate_id(true);
            $_SESSION['security_initiated'] = true;
        }

        // Check last last_activity
        $inactive_timeout = 120; // 120 sec to reset game
        if (isset($_SESSION['last_activity']) && (time() - $_SESSION['last_activity'] > $inactive_timeout)) {
            // Reset game
            unset(
                $_SESSION['game_id'],
                $_SESSION['round'],
                $_SESSION['wins'],
                $_SESSION['player_name'],
                $_SESSION['last_move_time']
            );
            session_regenerate_id(true); // ID
            $_SESSION['message'] = 'Game reset due to inactivity';
        }
        $_SESSION['last_activity'] = time();
    }

    private function getClientIp(): string {
        if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
            return $_SERVER['HTTP_CLIENT_IP'];
        } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            return explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0];
        } else {
            return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        }
    }

    public function startNewGame(string $player_name): void {
        $ip = $this->getClientIp();

        // IP rate limiting: 2 games 60 sec for one IP
        $stmt = $this->db->prepare(
            "SELECT COUNT(*) as cnt FROM ip_game_starts
             WHERE ip = ? AND started_at > DATETIME('now', '-60 seconds')"
        );
        $stmt->execute([$ip]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row && $row['cnt'] >= 2) {
            throw new Exception('Too many new games from your IP. Please try again later.');
        }

        if (isset($_SESSION['game_id']) && isset($_SESSION['round']) && $_SESSION['round'] < 10) {
            throw new Exception('Game already in progress. Finish current game first.');
        }

        // Log new game
        $stmt = $this->db->prepare(
            "INSERT INTO ip_game_starts (ip) VALUES (?)"
        );
        $stmt->execute([$ip]);

        $game_id = uniqid();
        $_SESSION['game_id'] = $game_id;
        $_SESSION['round'] = 0;
        $_SESSION['wins'] = 0;
        $_SESSION['player_name'] = $player_name;

        // Reset last game
        unset($_SESSION['last_move_time']);

        // Last last_activity
        $_SESSION['last_activity'] = time();
    }

    public function getLeaderboard(): array {
        $stmt = $this->db->prepare(
            "SELECT player_name, wins, played_at
            FROM leaderboard
            ORDER BY wins DESC, played_at ASC
            LIMIT 20"
        );
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function playRound(string $player_name, string $user_choice): array {
        $this->validateChoice($user_choice);
        $this->validateGameSession($player_name);
        $this->enforceRateLimit(); // Speed Protector

        $game_id = $_SESSION['game_id'];
        $this->validateMoveFrequency($game_id, $player_name);
        
        // Renew  last_activity
        $_SESSION['last_activity'] = time();

        $ai_choice = $this->getAIChoice($game_id, $player_name);
        $result = $this->determineWinner($user_choice, $ai_choice);

        // draw case
        if ($result === 'draw') {
            return [
                'ai_choice' => $ai_choice,
                'result' => $result,
                'round' => $_SESSION['round'],
                'wins' => $_SESSION['wins'],
                'game_over' => false
            ];
        }

        // save if not draw
        $this->saveRound($game_id, $player_name, $user_choice, $ai_choice, $result);

        $_SESSION['round']++;
        if ($result === 'win') {
            $_SESSION['wins']++;
        }

        $game_over = $_SESSION['round'] >= 10;

        $current_round = $_SESSION['round'];
        $current_wins = $_SESSION['wins'];

        if ($game_over) {
            $this->finalizeGame($player_name);
        }

        return [
            'ai_choice' => $ai_choice,
            'result' => $result,
            'round' => $current_round,
            'wins' => $current_wins,
            'game_over' => $game_over
        ];
    }

    private function enforceRateLimit(): void {
        $current_time = time();

        if (isset($_SESSION['last_move_time'])) {
            $time_diff = $current_time - $_SESSION['last_move_time'];
            if ($time_diff < 1) {
                throw new Exception('Please wait 1 second before making next move');
            }
        }

        $_SESSION['last_move_time'] = $current_time;
    }

    private function validateMoveFrequency(string $game_id, string $player_name): void {
        // speed test
        $stmt = $this->db->prepare(
            "SELECT COUNT(*) as move_count
            FROM games
            WHERE game_id = ? AND player_name = ?
            AND played_at > DATETIME('now', '-10 seconds')"
        );
        $stmt->execute([$game_id, $player_name]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($result['move_count'] >= 5) {
            throw new Exception('Too many moves in short time. Please slow down!');
        }
    }

    private function validateChoice(string $choice): void {
        if (!in_array($choice, self::CHOICES)) {
            throw new Exception('Invalid choice');
        }
    }

    private function validateGameSession(string $player_name): void {
        if (!isset($_SESSION['game_id']) || $_SESSION['player_name'] !== $player_name) {
            throw new Exception('Invalid game session');
        }
    }

    private function getAIChoice(string $game_id, string $player_name): string {
        // get history
        $stmt = $this->db->prepare(
            "SELECT user_choice
            FROM games
            WHERE game_id = ? AND player_name = ?
            ORDER BY played_at DESC
            LIMIT 10"
        );
        $stmt->execute([$game_id, $player_name]);
        $history = $stmt->fetchAll(PDO::FETCH_COLUMN);

        // history check
        if (empty($history)) {
            return self::CHOICES[array_rand(self::CHOICES)];
        }

        // analyse
        $counts = array_count_values($history);
        $most_frequent = array_search(max($counts), $counts);

        // try to win if pattern
        $winning_moves = array_flip(self::WINNING_COMBINATIONS);
        if (max($counts) > count($history) / 3) {
            return $winning_moves[$most_frequent];
        }

        return self::CHOICES[array_rand(self::CHOICES)];
    }

    private function determineWinner(string $user_choice, string $ai_choice): string {
        if ($user_choice === $ai_choice) {
            return 'draw';
        }
        return self::WINNING_COMBINATIONS[$user_choice] === $ai_choice ? 'win' : 'lose';
    }

    private function saveRound(
        string $game_id,
        string $player_name,
        string $user_choice,
        string $ai_choice,
        string $result
    ): void {
        $stmt = $this->db->prepare(
            "INSERT INTO games (game_id, player_name, user_choice, ai_choice, result)
            VALUES (?, ?, ?, ?, ?)"
        );
        $stmt->execute([$game_id, $player_name, $user_choice, $ai_choice, $result]);
    }

    private function finalizeGame(string $player_name): void {
        // save to leaderboard
        $stmt = $this->db->prepare(
            "INSERT INTO leaderboard (player_name, wins)
            VALUES (?, ?)"
        );
        $stmt->execute([$player_name, $_SESSION['wins']]);

        // clean session
        unset(
            $_SESSION['game_id'],
            $_SESSION['round'],
            $_SESSION['wins'],
            $_SESSION['player_name'],
            $_SESSION['last_move_time']
        );
    }
}
?>