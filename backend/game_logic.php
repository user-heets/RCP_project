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
    }

    public function startNewGame(string $player_name): void {
        $game_id = uniqid();
        $_SESSION['game_id'] = $game_id;
        $_SESSION['round'] = 0;
        $_SESSION['wins'] = 0;
        $_SESSION['player_name'] = $player_name;
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

        $game_id = $_SESSION['game_id'];
        $ai_choice = $this->getAIChoice($game_id, $player_name);
        $result = $this->determineWinner($user_choice, $ai_choice);

        // drw cause
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
        // save to lb
        $stmt = $this->db->prepare(
            "INSERT INTO leaderboard (player_name, wins)
            VALUES (?, ?)"
        );
        $stmt->execute([$player_name, $_SESSION['wins']]);

        //clean
        unset(
            $_SESSION['game_id'],
            $_SESSION['round'],
            $_SESSION['wins'],
            $_SESSION['player_name']
        );
    }
}
?>