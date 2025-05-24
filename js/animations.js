export function addAnimationClasses() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeOut {
            from { opacity: 1; transform: translateY(0); }
            to { opacity: 0; transform: translateY(-20px); }
        }

        @keyframes bounce {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.2); }
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
        
        @keyframes slideIn {
            from { transform: translateX(-100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes countUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes glow {
            0%, 100% { box-shadow: 0 0 5px rgba(255, 215, 0, 0.5); }
            50% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.8); }
        }

        .fade-in {
            animation: fadeIn 0.5s ease-out forwards;
        }
        
        .fade-out {
            animation: fadeOut 0.3s ease-out forwards;
        }

        .bounce {
            animation: bounce 0.5s ease-in-out;
        }

        .shake {
            animation: shake 0.5s ease-in-out;
        }

        .pulse {
            animation: pulse 1s ease-in-out infinite;
        }
        
        .slide-in {
            animation: slideIn 0.5s ease-out;
        }
        
        .count-up {
            animation: countUp 0.5s ease-out;
        }
        
        .selected {
            transform: scale(1.1);
            box-shadow: 0 0 15px rgba(0, 255, 0, 0.7);
            transition: all 0.3s ease;
            z-index: 10;
        }
        
        .not-selected {
            opacity: 0.6;
            transform: scale(0.9);
            transition: all 0.3s ease;
        }
        
        .win-result {
            color: #2ecc71;
            font-weight: bold;
        }
        
        .lose-result {
            color: #e74c3c;
        }
        
        .draw-result {
            color: #f39c12;
        }
        
        .game-over {
            font-size: 1.2em;
            font-weight: bold;
            white-space: pre-line;
            text-align: center;
            padding: 15px;
            border-radius: 10px;
            background: rgba(0,0,0,0.05);
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        
        .current-player {
            background-color: rgba(255, 255, 0, 0.1);
            animation: glow 2s infinite;
        }
        
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            border-radius: 5px;
            color: white;
            z-index: 1000;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            animation: slideIn 0.3s ease-out, fadeOut 0.5s ease-out 3s forwards;
        }
        
        .notification.success {
            background-color: #2ecc71;
        }
        
        .notification.error {
            background-color: #e74c3c;
        }
        
        .notification.info {
            background-color: #3498db;
        }
        
        #leaderboard-table tbody tr {
            transition: all 0.3s ease;
        }
    `;
    document.head.appendChild(style);
}

export function animateCounterUpdate(element, newValue) {
    const currentValue = parseInt(element.textContent);
    if (currentValue === newValue) return;

    element.classList.add('count-up');
    element.textContent = newValue;

    setTimeout(() => {
        element.classList.remove('count-up');
    }, 500);
}