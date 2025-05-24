const API_BASE_URL = 'backend/api.php';

export async function startNewGame(playerName) {
    const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            new_game: true,
            player_name: playerName
        })
    });

    if (!response.ok) throw new Error('Network response was not ok');
    return await response.json();
}

export async function makePlayerChoice(playerName, userChoice) {
    const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            player_name: playerName,
            user_choice: userChoice
        })
    });

    if (!response.ok) throw new Error('Network response was not ok');
    return await response.json();
}

export async function fetchLeaderboardData() {
    const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ get_leaderboard: true })
    });

    if (!response.ok) throw new Error('Network response was not ok');
    return await response.json();
}