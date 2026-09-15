const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origin: "*" } });

app.use(express.static('public'));

let gameState = {
    availableNumbers: Array.from({length: 90}, (_, i) => i + 1),
    drawnNumbers: [],
    gameInterval: null,
    currentSpeed: 5000,
    isActive: false
};

function executeGameLoop() {
    if (gameState.availableNumbers.length === 0) {
        if (gameState.gameInterval) clearInterval(gameState.gameInterval);
        gameState.gameInterval = null;
        gameState.isActive = false;
        io.emit('game-state-change', { type: 'GAME_OVER', message: 'All 90 numbers called!' });
        return;
    }
    const targetIndex = Math.floor(Math.random() * gameState.availableNumbers.length);
    const selectedNum = gameState.availableNumbers.splice(targetIndex, 1)[0];
    gameState.drawnNumbers.push(selectedNum);
    
    io.emit('number-broadcast', { 
        current: selectedNum, 
        history: gameState.drawnNumbers,
        remaining: gameState.availableNumbers.length 
    });
}

io.on('connection', (socket) => {
    socket.emit('sync-client-state', { 
        history: gameState.drawnNumbers,
        current: gameState.drawnNumbers[gameState.drawnNumbers.length - 1] || '-',
        isActive: gameState.isActive
    });

    socket.on('admin-action', (action) => {
        if (action.type === 'START_GAME') {
            if (!gameState.isActive) {
                gameState.isActive = true;
                gameState.currentSpeed = action.speed || 5000;
                gameState.availableNumbers = Array.from({length: 90}, (_, i) => i + 1);
                gameState.drawnNumbers = [];
                gameState.gameInterval = setInterval(executeGameLoop, gameState.currentSpeed);
                io.emit('game-state-change', { type: 'STARTED', speed: gameState.currentSpeed });
            }
        } else if (action.type === 'RESET_GAME') {
            if (gameState.gameInterval) clearInterval(gameState.gameInterval);
            gameState.gameInterval = null;
            gameState.isActive = false;
            gameState.availableNumbers = Array.from({length: 90}, (_, i) => i + 1);
            gameState.drawnNumbers = [];
            io.emit('game-state-change', { type: 'RESET' });
        }
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Production Tambola Engine operational on port ${PORT}`));
