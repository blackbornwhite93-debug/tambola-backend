const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origin: "*" } });

app.use(express.static('public'));

let availableNumbers = Array.from({length: 90}, (_, i) => i + 1);
let drawnNumbers = [];
let gameInterval = null;

function drawNumber() {
    if (availableNumbers.length === 0) {
        clearInterval(gameInterval);
        gameInterval = null;
        io.emit('game-over', { message: 'All numbers drawn!' });
        return;
    }
    const randomIndex = Math.floor(Math.random() * availableNumbers.length);
    const num = availableNumbers.splice(randomIndex, 1)[0];
    drawnNumbers.push(num);
    io.emit('number-drawn', { current: num, history: drawnNumbers });
}

io.on('connection', (socket) => {
    socket.emit('sync-state', { history: drawnNumbers });

    socket.on('start-game', (data) => {
        if (!gameInterval) {
            const speed = data && data.speed ? data.speed : 5000;
            // Wipes any stale old games automatically on restart
            availableNumbers = Array.from({length: 90}, (_, i) => i + 1);
            drawnNumbers = [];
            gameInterval = setInterval(drawNumber, speed);
        }
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Engine running on port ${PORT}`));
