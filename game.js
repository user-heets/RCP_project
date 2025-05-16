class RockSizersPaper {
    constructor() {
        this.playerName = '';
        this.gameInProgress = false;
        this.initializeElements();
        this.addEventListeners();
        this.fetchLeaderboard();
        this.addAnimationClasses();
    }

    initializeElements() {
        this.playerNameInput = document.getElementById('player-name');
        this.startGameButton = document.getElementById('start-game');
        this.gameDiv = document.getElementById('game');
        this.resultDiv = document.getElementById('result');
        this.roundSpan = document.getElementById('round');
        this.winsSpan = document.getElementById('wins');
        this.leaderboardTableBody = document.querySelector('#leaderboard-table tbody');
    }

    addEventListeners() {
        this.startGameButton.addEventListener('click', () => this.startGame());
        document.querySelectorAll('.choice').forEach(choice => {
            choice.addEventListener('click', (e) => {
                if (this.gameInProgress) {
                    this.makeChoice(e.target.dataset.choice);
                }
            });
        });
    }

    async startGame() {
        this.playerName = this.playerNameInput.value.trim();
        if (!this.playerName) {
            alert('Please enter your name!');
            return;
        }

        try {
            const response = await fetch('api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    new_game: true,
                    player_name: this.playerName
                })
            });

            const data = await response.json();
            if (data.success) {
                this.gameInProgress = true;
                this.resetGameUI();
                this.gameDiv.classList.add('fade-in');
            }
        } catch (error) {
            alert('Failed to start game. Please try again.');
        }
    }

    async makeChoice(userChoice) {
        if (!this.gameInProgress) return;
        const choiceElement = document.querySelector(`[data-choice="${userChoice}"]`);
        choiceElement.classList.add('bounce');
        setTimeout(() => choiceElement.classList.remove('bounce'), 500);
        try {
            const response = await fetch('api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    player_name: this.playerName,
                    user_choice: userChoice
                })
            });

            const data = await response.json();
            if (data.success) {
                this.updateGameState(data, userChoice);
            } else {
                throw new Error(data.error || 'Unknown error occurred');
            }
        } catch (error) {
            console.error('Error making choice:', error);
            this.gameInProgress = false;
            this.resultDiv.textContent = 'Game is over. Please start a new game!';
            document.getElementById('name-input').style.display = 'block';
            this.gameDiv.style.display = 'none';
        }
    }

    updateGameState(data, userChoice) {
        let resultText = '';
        if (data.ai_choice && data.result) {
            if (data.result === 'draw') {
                resultText = `DRAW! You and AI chose ${userChoice}. Lets replay.`;
            } else {
                resultText = `You chose ${userChoice}, AI chose ${data.ai_choice}. You ${data.result}!`;
            }
        }
        this.resultDiv.textContent = resultText;
        this.roundSpan.textContent = data.round;
        this.winsSpan.textContent = data.wins;

        if (data.game_over) {
            this.handleGameOver(data);
        }
    }

    handleGameOver(data) {
        this.gameInProgress = false;
        const losses = 10 - data.wins;
        const draws = 10 - data.wins - losses;

        this.gameDiv.style.display = 'none';
        document.getElementById('name-input').style.display = 'block';
        this.playerNameInput.value = '';

        let resultText = `Game over! Final score:\n`;
        resultText += `Wins: ${data.wins}\n`;
        resultText += `Losses: ${losses}\n`;
        if (draws > 0) {
            resultText += `Draws: ${draws}\n`;
        }
        resultText += `\nEnter your name to play again!`;

        this.resultDiv.textContent = resultText;
        this.fetchLeaderboard();
    }

    resetGameUI() {
        document.getElementById('name-input').style.display = 'none';
        this.gameDiv.style.display = 'block';
        this.roundSpan.textContent = '0';
        this.winsSpan.textContent = '0';
        this.resultDiv.textContent = '';
    }

    async fetchLeaderboard() {
        try {
            const response = await fetch('api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ get_leaderboard: true })
            });

            const data = await response.json();
            if (data.success) {
                this.updateLeaderboardTable(data.leaderboard);
            }
        } catch (error) {
            this.leaderboardTableBody.innerHTML = '<tr><td colspan="3">Error loading leaderboard. Please try again later.</td></tr>';
        }
    }

    updateLeaderboardTable(leaderboard) {
        this.leaderboardTableBody.innerHTML = leaderboard
            .map((player, index) => {
                let place = '';
                if (index === 0) place = '🥇';
                else if (index === 1) place = '🥈';
                else if (index === 2) place = '🥉';
                else place = `#${index + 1}`;

                return `
                <tr>
                    <td>${place}</td>
                    <td>${this.escapeHtml(player.player_name)}</td>
                    <td>${player.wins}</td>
                    <td>${player.played_at}</td>
                </tr>
            `;
            }).join('');
    }
    addAnimationClasses() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-20px); }
                to { opacity: 1; transform: translateY(0); }
            }

            @keyframes bounce {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
            }

            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-10px); }
                75% { transform: translateX(10px); }
            }

            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
            }

            .fade-in {
                animation: fadeIn 0.5s ease-out;
            }

            .bounce {
                animation: bounce 0.5s ease-in-out;
            }

            .shake {
                animation: shake 0.5s ease-in-out;
            }

            .pulse {
                animation: pulse 0.5s ease-in-out;
            }
        `;
        document.head.appendChild(style);
    }
    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new RockSizersPaper();
});