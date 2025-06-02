import { addAnimationClasses, animateCounterUpdate } from './animations.js';
import { showNotification, translateChoice, escapeHtml } from './ui.js';
import { startNewGame, makePlayerChoice, fetchLeaderboardData } from './api.js';

export class RockScissorsPaper {
    constructor() {
        this.playerName = '';
        this.gameInProgress = false;
        this.choices = ['rock', 'paper', 'scissors'];
        this.cachedElements = {};
        this.initializeElements();
        this.addEventListeners();
        this.fetchLeaderboard();
        addAnimationClasses();
    }

    initializeElements() {
        const elements = [
            'player-name', 'start-game', 'game', 'result',
            'round', 'wins', 'name-input', 'leaderboard'
        ];

        elements.forEach(id => {
            this.cachedElements[id] = document.getElementById(id);
        });

        this.choiceElements = document.querySelectorAll('.choice');
        this.leaderboardTableBody = document.querySelector('#leaderboard-table tbody');
    }

    addEventListeners() {
        this.cachedElements['start-game'].addEventListener('click', () => this.startGame());

        this.choiceElements.forEach(choice => {
            choice.addEventListener('click', (e) => {
                if (this.gameInProgress) {
                    this.makeChoice(e.target.dataset.choice);
                } else {
                    e.target.classList.add('shake');
                    setTimeout(() => e.target.classList.remove('shake'), 500);
                }
            });
        });
    }

    async startGame() {
        this.playerName = this.cachedElements['player-name'].value.trim();
        if (!this.playerName) {
            showNotification('Enter your name, please', 'error');
            this.cachedElements['player-name'].classList.add('shake');
            setTimeout(() => this.cachedElements['player-name'].classList.remove('shake'), 500);
            return;
        }

        try {
            const data = await startNewGame(this.playerName);

            if (data.success) {
                this.gameInProgress = true;
                this.resetGameUI();
                this.cachedElements['game'].classList.add('fade-in');
                showNotification(`Game started, good luck ${this.playerName}!`, 'success');
            } else {
                // Show back err
                showNotification(data.error || 'Unknown error occurred', 'error');
                throw new Error(data.error || 'Unknown error occurred');
            }
        } catch (error) {
            // show internal err 
            showNotification('Error. Try again', 'error');
            console.error('Start game error:', error);
        }
    }

    async makeChoice(userChoice) {
        if (!this.gameInProgress) return;

        if (!this.choices.includes(userChoice)) {
            console.error('Invalid choice:', userChoice);
            return;
        }

        const choiceElement = document.querySelector(`[data-choice="${userChoice}"]`);
        choiceElement.classList.add('bounce');
        setTimeout(() => choiceElement.classList.remove('bounce'), 500);

        this.choiceElements.forEach(el => {
            el.classList.remove('selected');
            el.classList.add('not-selected');
        });
        choiceElement.classList.add('selected');
        choiceElement.classList.remove('not-selected');

        try {
            const data = await makePlayerChoice(this.playerName, userChoice);

            if (data.success) {
                this.updateGameState(data, userChoice);
            } else {
                // show back err
                showNotification(data.error || 'Unknown error occurred', 'error');
                throw new Error(data.error || 'Unknown error occurred');
            }
        } catch (error) {
            console.error('Error making choice:', error);
            this.gameInProgress = false;
            this.cachedElements['result'].textContent = '👾 Game over! Start new game';
            this.cachedElements['name-input'].style.display = 'block';
            this.cachedElements['game'].style.display = 'none';
            // show internal err
            showNotification('Error. Try again', 'error');
        } finally {
            setTimeout(() => {
                this.choiceElements.forEach(el => {
                    el.classList.remove('selected', 'not-selected');
                });
            }, 1500);
        }
    }

    updateGameState(data, userChoice) {
        let resultText = '';
        let resultClass = '';

        if (data.ai_choice && data.result) {
            if (data.result === 'draw') {
                resultText = `🙈 DRAW! You and AI choose ${translateChoice(userChoice)}. Try again!.`;
                resultClass = 'draw-result';
            } else if (data.result === 'win') {
                resultText = `🍾 WIN! You choose - ${translateChoice(userChoice)}, AI choose - ${translateChoice(data.ai_choice)}`;
                resultClass = 'win-result';
            } else {
                resultText = `😫 LOSE! You choose - ${translateChoice(userChoice)}, AI choose - ${translateChoice(data.ai_choice)}`;
                resultClass = 'lose-result';
            }
        }

        this.cachedElements['result'].className = '';
        this.cachedElements['result'].textContent = resultText;
        this.cachedElements['result'].classList.add(resultClass, 'fade-in');

        animateCounterUpdate(this.cachedElements['round'], data.round);
        animateCounterUpdate(this.cachedElements['wins'], data.wins);

        if (data.game_over) {
            this.handleGameOver(data);
        }
    }

    handleGameOver(data) {
        this.gameInProgress = false;
        const losses = 10 - data.wins;
        const draws = 10 - data.wins - losses;

        this.cachedElements['game'].style.display = 'none';
        this.cachedElements['name-input'].style.display = 'block';
        this.cachedElements['player-name'].value = '';

        let resultText = `👾 The game is over! Final score:\n`;
        resultText += `🍾 Wins: ${data.wins}\n`;
        resultText += `😫 Loses: ${losses}\n`;
        if (draws > 0) {
            resultText += `🙈 Draws: ${draws}\n`;
        }
        resultText += `\nEnter your name to play again!`;

        this.cachedElements['result'].textContent = resultText;
        this.cachedElements['result'].classList.add('game-over', 'pulse');

        showNotification(`👾 The game is over! You win ${data.wins} from 10 rounds.`,
            data.wins >= 5 ? 'success' : 'info');

        this.fetchLeaderboard();
    }

    resetGameUI() {
        this.cachedElements['name-input'].style.display = 'none';
        this.cachedElements['game'].style.display = 'block';
        this.cachedElements['round'].textContent = '0';
        this.cachedElements['wins'].textContent = '0';
        this.cachedElements['result'].textContent = '';
        this.cachedElements['result'].className = '';
    }

    async fetchLeaderboard() {
        try {
            const data = await fetchLeaderboardData();

            if (data.success) {
                this.updateLeaderboardTable(data.leaderboard);
            } else {
                // show err
                showNotification(data.error || 'Failed to fetch leaderboard', 'error');
                throw new Error(data.error || 'Failed to fetch leaderboard');
            }
        } catch (error) {
            console.error('Leaderboard error:', error);
            this.leaderboardTableBody.innerHTML = '<tr><td colspan="4">Fail. Please reload page.</td></tr>';
        }
    }

    updateLeaderboardTable(leaderboard) {
        this.leaderboardTableBody.classList.add('fade-out');

        setTimeout(() => {
            this.leaderboardTableBody.innerHTML = leaderboard
                .map((player, index) => {
                    let place = '';
                    if (index === 0) place = '🥇';
                    else if (index === 1) place = '🥈';
                    else if (index === 2) place = '🥉';
                    else place = `#${index + 1}`;

                    const isCurrentPlayer = player.player_name === this.playerName;
                    const rowClass = isCurrentPlayer ? 'current-player pulse' : '';

                    return `
                    <tr class="${rowClass}" data-index="${index}">
                        <td>${place}</td>
                        <td>${escapeHtml(player.player_name)}</td>
                        <td>${player.wins}</td>
                        <td>${player.played_at}</td>
                    </tr>
                `;
                }).join('');

            this.leaderboardTableBody.classList.remove('fade-out');
            this.leaderboardTableBody.classList.add('fade-in');

            const rows = this.leaderboardTableBody.querySelectorAll('tr');
            rows.forEach((row, index) => {
                row.style.animationDelay = `${index * 0.1}s`;
            });

            setTimeout(() => {
                this.leaderboardTableBody.classList.remove('fade-in');
                rows.forEach(row => {
                    row.style.animationDelay = '';
                });
            }, 1000);
        }, 300);
    }
}