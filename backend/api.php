<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

session_start();
require_once 'db.php';
require_once 'game_logic.php';

try {
    $input = file_get_contents('php://input');
    if (empty($input)) {
        throw new Exception('No input data provided');
    }

    $data = json_decode($input, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON: ' . json_last_error_msg());
    }

    $game = new GameLogic($db);
    $response = ['success' => true];

    if (isset($data['get_leaderboard'])) {
        $response['leaderboard'] = $game->getLeaderboard();
    }
    elseif (isset($data['new_game'])) {
        $player_name = isset($data['player_name']) ? trim($data['player_name']) : '';
        $captcha_token = $data['captcha_token'] ?? '';

        if (empty($player_name)) {
            throw new Exception('Player name is required');
        }
        if (empty($captcha_token)) {
            throw new Exception('Captcha is required');
        }

        // reCAPTCHA v3
        $secret = 'SECRET_KEY'; // ADD AFTER DEPLOY
        $verify_url = "https://www.google.com/recaptcha/api/siteverify?secret={$secret}&response={$captcha_token}";

        $verify_response = file_get_contents($verify_url);
        if ($verify_response === false) {
            throw new Exception('Failed to verify captcha');
        }

        $captcha_result = json_decode($verify_response, true);

        if (!$captcha_result['success']) {
            throw new Exception('Captcha verification failed');
        }

        // score reCAPTCHA v3 (>= 0.5)
        if (!isset($captcha_result['score']) || $captcha_result['score'] < 0.5) {
            throw new Exception('Captcha score too low. Please try again.');
        }

        // action
        if (isset($captcha_result['action']) && $captcha_result['action'] !== 'start_game') {
            throw new Exception('Invalid captcha action');
        }

        $game->startNewGame($player_name);
        $response['message'] = 'Game started';
    }
    elseif (isset($data['user_choice'])) {
        if (!isset($data['player_name'])) {
            throw new Exception('Player name is required');
        }
        $result = $game->playRound($data['player_name'], $data['user_choice']);
        $response = array_merge($response, $result);
    }
    elseif (isset($data['reset_game'])) {
        unset(
            $_SESSION['game_id'],
            $_SESSION['round'],
            $_SESSION['wins'],
            $_SESSION['player_name'],
            $_SESSION['last_move_time']
        );
        $response['message'] = 'Game reset';
    }
    else {
        throw new Exception('Invalid request type');
    }

    echo json_encode($response);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>