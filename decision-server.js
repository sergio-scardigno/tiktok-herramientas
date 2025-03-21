// const express = require('express');
// const http = require('http');
// const socketIo = require('socket.io');
// const { WebcastPushConnection } = require('tiktok-live-connector');
// const path = require('path');
// const fs = require('fs');

// const app = express();
// const server = http.createServer(app);
// const io = socketIo(server);

// let tiktokConnection = null;
// let retryCount = 0;
// const maxRetries = 5;
// let simulationInterval = null;

// // Game configuration
// const gameConfig = {
//     username: 'lisaschillin',
//     votingActive: false,
//     votingDuration: 30,
//     currentVoting: {
//         id: null,
//         title: '',
//         likeOption: '',
//         commentOption: '',
//         likes: 0,
//         comments: 0,
//         likesVoters: {},
//         commentsVoters: {},
//     },
//     recentEvents: [],
//     maxRecentEvents: 15,
//     soundSettings: {
//         enableSounds: true,
//     },
// };

// // Game presets
// const gamePresets = [
//     {
//         id: 'phasmophobia',
//         name: 'Phasmophobia',
//         votings: [
//             {
//                 title: 'Mapa para jugar',
//                 likeOption: 'Mapa pequeño',
//                 commentOption: 'Mapa grande',
//             },
//             {
//                 title: 'Dificultad',
//                 likeOption: 'Profesional',
//                 commentOption: 'Pesadilla',
//             },
//             {
//                 title: '¿Usar sanidad?',
//                 likeOption: 'Sí',
//                 commentOption: 'No',
//             },
//         ],
//     },
//     {
//         id: 'fortnite',
//         name: 'Fortnite',
//         votings: [
//             {
//                 title: '¿Dónde aterrizar?',
//                 likeOption: 'Lugar concurrido',
//                 commentOption: 'Lugar tranquilo',
//             },
//             {
//                 title: 'Estrategia',
//                 likeOption: 'Agresiva',
//                 commentOption: 'Pasiva',
//             },
//         ],
//     },
// ];

// // Custom votings storage
// let customVotings = [];
// try {
//     if (fs.existsSync('./custom_votings.json')) {
//         customVotings = JSON.parse(
//             fs.readFileSync('./custom_votings.json', 'utf8')
//         );
//     }
// } catch (err) {
//     console.error('Error loading custom votings:', err);
//     customVotings = [];
// }

// // Static files and routes
// app.use(express.static(path.join(__dirname, 'public')));
// app.get('/', (req, res) =>
//     res.sendFile(path.join(__dirname, 'public', 'voting.html'))
// );
// app.get('/configuracion', (req, res) =>
//     res.sendFile(path.join(__dirname, 'public', 'config.html'))
// );

// // API routes
// app.get('/api/presets', (req, res) => {
//     res.json(gamePresets);
// });

// // Socket.io connection
// io.on('connection', (socket) => {
//     console.log('Cliente conectado:', socket.id);

//     // Send initial game state to client
//     socket.emit('gameState', gameConfig);
//     socket.emit('soundSettings', gameConfig.soundSettings);
//     socket.emit('customVotingsUpdated', customVotings);

//     // Event handlers
//     socket.on(
//         'startVoting',
//         ({ title, likeOption, commentOption, duration }) => {
//             startVoting(title, likeOption, commentOption, duration);
//             io.emit('playSound', 'voteStart');
//         }
//     );

//     socket.on('endVoting', () => {
//         endVoting(true);
//         io.emit('playSound', 'voteEnd');
//     });

//     socket.on('getGameState', () => {
//         socket.emit('gameState', gameConfig);
//     });

//     socket.on('toggleSounds', (enabled) => {
//         gameConfig.soundSettings.enableSounds = enabled;
//         io.emit('soundSettings', gameConfig.soundSettings);
//     });

//     socket.on('saveCustomVoting', (voting) => {
//         customVotings.push(voting);
//         fs.writeFileSync(
//             './custom_votings.json',
//             JSON.stringify(customVotings, null, 2)
//         );
//         io.emit('customVotingsUpdated', customVotings);
//     });

//     socket.on('getCustomVotings', () => {
//         socket.emit('customVotingsUpdated', customVotings);
//     });

//     socket.on('startSimulation', () => {
//         startSimulation();
//         addRecentEvent({ type: 'system', text: 'Simulación iniciada' });
//     });

//     socket.on('stopSimulation', () => {
//         stopSimulation();
//         addRecentEvent({ type: 'system', text: 'Simulación detenida' });
//     });

//     socket.on('disconnect', () => {
//         console.log('Cliente desconectado:', socket.id);
//     });
// });

// // TikTok connection initialization
// async function initTikTokConnection() {
//     if (retryCount >= maxRetries) {
//         console.error(
//             'Se alcanzó el número máximo de intentos de conexión. Verifica que el usuario esté en vivo.'
//         );
//         addRecentEvent({
//             type: 'error',
//             text: 'Error de conexión: Número máximo de intentos alcanzado. Verifica que el usuario esté en vivo.',
//         });
//         return;
//     }

//     if (tiktokConnection) {
//         tiktokConnection.disconnect();
//     }

//     tiktokConnection = new WebcastPushConnection(gameConfig.username);

//     // TikTok connection event handlers
//     tiktokConnection.on('streamEnd', () => {
//         console.log('📴 El stream ha finalizado. Intentando reconectar...');
//         addRecentEvent({
//             type: 'system',
//             text: 'Stream finalizado. Reconectando...',
//         });
//         setTimeout(initTikTokConnection, 10000);
//     });

//     tiktokConnection.on('like', (data) => {
//         console.log(`❤️ Like de ${data.uniqueId}`);
//         handleVote('likes', data.uniqueId, data.likeCount || 1);
//         io.emit('playSound', 'newVote');
//     });

//     tiktokConnection.on('chat', (data) => {
//         if (data.comment) {
//             console.log(`💬 ${data.uniqueId}: ${data.comment}`);
//             handleVote('comments', data.uniqueId);
//             io.emit('playSound', 'newVote');
//         }
//     });

//     try {
//         await tiktokConnection.connect();
//         console.log('✅ Conectado a TikTok Live de:', gameConfig.username);
//         addRecentEvent({
//             type: 'system',
//             text: `Conectado a TikTok Live de: ${gameConfig.username}`,
//         });
//         retryCount = 0;
//     } catch (err) {
//         console.error('❌ Error al conectar con TikTok:', err.message);
//         addRecentEvent({
//             type: 'error',
//             text: `Error de conexión: ${err.message}`,
//         });
//         retryCount++;
//         setTimeout(initTikTokConnection, 10000);
//     }
// }

// // Start voting
// function startVoting(title, likeOption, commentOption, duration = 30) {
//     if (gameConfig.votingActive) {
//         endVoting();
//     }

//     gameConfig.votingActive = true;
//     gameConfig.currentVoting = {
//         id: Date.now(),
//         title: title || '¿Qué decisión tomar?',
//         likeOption: likeOption || 'Opción A',
//         commentOption: commentOption || 'Opción B',
//         likes: 0,
//         comments: 0,
//         likesVoters: {},
//         commentsVoters: {},
//     };

//     addRecentEvent({
//         type: 'system',
//         text: `Votación iniciada: "${title}" - ${duration} segundos`,
//     });

//     io.emit('gameState', gameConfig);

//     // Auto-end voting after duration
//     setTimeout(() => {
//         if (gameConfig.votingActive && gameConfig.currentVoting.id) {
//             endVoting();
//         }
//     }, duration * 1000);
// }

// // End voting
// function endVoting(manual = false) {
//     if (!gameConfig.votingActive) return;

//     gameConfig.votingActive = false;

//     // Determine the winner
//     let resultText = 'Votación finalizada - ';
//     let soundType = 'voteEnd';

//     if (gameConfig.currentVoting.likes > gameConfig.currentVoting.comments) {
//         resultText += `¡Gana "${gameConfig.currentVoting.likeOption}" con ${gameConfig.currentVoting.likes} votos!`;
//         soundType = 'winnerLikes';
//     } else if (
//         gameConfig.currentVoting.comments > gameConfig.currentVoting.likes
//     ) {
//         resultText += `¡Gana "${gameConfig.currentVoting.commentOption}" con ${gameConfig.currentVoting.comments} votos!`;
//         soundType = 'winnerComments';
//     } else if (
//         gameConfig.currentVoting.likes === 0 &&
//         gameConfig.currentVoting.comments === 0
//     ) {
//         resultText += 'Sin votos';
//     } else {
//         resultText += `¡Empate! ${gameConfig.currentVoting.likes} a ${gameConfig.currentVoting.comments}`;
//         soundType = 'tie';
//     }

//     addRecentEvent({ type: 'result', text: resultText });

//     if (manual) {
//         io.emit('playSound', soundType);
//     }

//     io.emit('gameState', gameConfig);
// }

// // Handle vote
// function handleVote(type, userId, count = 1) {
//     if (!gameConfig.votingActive) return;

//     if (type === 'likes') {
//         gameConfig.currentVoting.likes += count;

//         if (!gameConfig.currentVoting.likesVoters) {
//             gameConfig.currentVoting.likesVoters = {};
//         }

//         gameConfig.currentVoting.likesVoters[userId] =
//             (gameConfig.currentVoting.likesVoters[userId] || 0) + count;

//         addRecentEvent({
//             type: 'like',
//             user: userId,
//             text: `${userId} votó por "${gameConfig.currentVoting.likeOption}"`,
//             count,
//         });
//     } else if (type === 'comments') {
//         gameConfig.currentVoting.comments += count;

//         if (!gameConfig.currentVoting.commentsVoters) {
//             gameConfig.currentVoting.commentsVoters = {};
//         }

//         gameConfig.currentVoting.commentsVoters[userId] =
//             (gameConfig.currentVoting.commentsVoters[userId] || 0) + count;

//         addRecentEvent({
//             type: 'comment',
//             user: userId,
//             text: `${userId} votó por "${gameConfig.currentVoting.commentOption}"`,
//             count,
//         });
//     }

//     io.emit('gameState', gameConfig);
// }

// // Add recent event
// function addRecentEvent(event) {
//     gameConfig.recentEvents.unshift({ ...event, id: Date.now() });

//     if (gameConfig.recentEvents.length > gameConfig.maxRecentEvents) {
//         gameConfig.recentEvents.pop();
//     }

//     io.emit('gameState', gameConfig);
// }

// // Simulation mode for testing
// function startSimulation() {
//     if (simulationInterval) {
//         clearInterval(simulationInterval);
//     }

//     simulationInterval = setInterval(() => {
//         if (!gameConfig.votingActive) return;

//         const isLike = Math.random() > 0.5;
//         const randomUser = `user_${Math.floor(Math.random() * 1000)}`;

//         handleVote(isLike ? 'likes' : 'comments', randomUser, 1);
//     }, 2000);
// }

// function stopSimulation() {
//     if (simulationInterval) {
//         clearInterval(simulationInterval);
//         simulationInterval = null;
//     }
// }

// // Start server
// const PORT = process.env.PORT || 3000;
// server.listen(PORT, () => {
//     console.log(`🚀 Servidor funcionando en http://localhost:${PORT}`);
//     console.log(
//         `📱 Panel de configuración: http://localhost:${PORT}/configuracion`
//     );
//     initTikTokConnection();
// });

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { WebcastPushConnection } = require('tiktok-live-connector');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let tiktokConnection = null;
let retryCount = 0;
const maxRetries = 5;
let simulationInterval = null;

// Game configuration
const gameConfig = {
    username: 'lisaschillin',
    votingActive: false,
    votingDuration: 30,
    currentVoting: {
        id: null,
        title: '',
        likeOption: '',
        commentOption: '',
        likes: 0,
        comments: 0,
        likesVoters: {},
        commentsVoters: {},
    },
    recentEvents: [],
    maxRecentEvents: 15,
    soundSettings: {
        enableSounds: true,
    },
};

// Game presets
const gamePresets = [
    {
        id: 'phasmophobia',
        name: 'Phasmophobia',
        votings: [
            {
                title: 'Mapa para jugar',
                likeOption: 'Mapa pequeño',
                commentOption: 'Mapa grande',
            },
            {
                title: 'Dificultad',
                likeOption: 'Profesional',
                commentOption: 'Pesadilla',
            },
            {
                title: '¿Usar sanidad?',
                likeOption: 'Sí',
                commentOption: 'No',
            },
        ],
    },
    {
        id: 'fortnite',
        name: 'Fortnite',
        votings: [
            {
                title: '¿Dónde aterrizar?',
                likeOption: 'Lugar concurrido',
                commentOption: 'Lugar tranquilo',
            },
            {
                title: 'Estrategia',
                likeOption: 'Agresiva',
                commentOption: 'Pasiva',
            },
        ],
    },
];

// Custom votings storage
let customVotings = [];
try {
    if (fs.existsSync('./custom_votings.json')) {
        customVotings = JSON.parse(
            fs.readFileSync('./custom_votings.json', 'utf8')
        );
    }
} catch (err) {
    console.error('Error loading custom votings:', err);
    customVotings = [];
}

// Static files and routes
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) =>
    res.sendFile(path.join(__dirname, 'public', 'voting.html'))
);
app.get('/configuracion', (req, res) =>
    res.sendFile(path.join(__dirname, 'public', 'config.html'))
);

// API routes
app.get('/api/presets', (req, res) => {
    res.json(gamePresets);
});

// Socket.io connection
io.on('connection', (socket) => {
    console.log('Cliente conectado:', socket.id);

    // Send initial game state to client
    socket.emit('gameState', gameConfig);
    socket.emit('soundSettings', gameConfig.soundSettings);
    socket.emit('customVotingsUpdated', customVotings);

    // Send current connection status
    const connectionStatus = tiktokConnection
        ? { connected: true, message: `Conectado a: ${gameConfig.username}` }
        : { connected: false, message: 'No conectado' };
    socket.emit('connectionStatus', connectionStatus);

    // Event handlers
    socket.on(
        'startVoting',
        ({ title, likeOption, commentOption, duration }) => {
            startVoting(title, likeOption, commentOption, duration);
            io.emit('playSound', 'voteStart');
        }
    );

    socket.on('endVoting', () => {
        endVoting(true);
        io.emit('playSound', 'voteEnd');
    });

    socket.on('getGameState', () => {
        socket.emit('gameState', gameConfig);
    });

    socket.on('toggleSounds', (enabled) => {
        gameConfig.soundSettings.enableSounds = enabled;
        io.emit('soundSettings', gameConfig.soundSettings);
    });

    socket.on('saveCustomVoting', (voting) => {
        customVotings.push(voting);
        fs.writeFileSync(
            './custom_votings.json',
            JSON.stringify(customVotings, null, 2)
        );
        io.emit('customVotingsUpdated', customVotings);
    });

    socket.on('getCustomVotings', () => {
        socket.emit('customVotingsUpdated', customVotings);
    });

    socket.on('startSimulation', () => {
        startSimulation();
        addRecentEvent({ type: 'system', text: 'Simulación iniciada' });
    });

    socket.on('stopSimulation', () => {
        stopSimulation();
        addRecentEvent({ type: 'system', text: 'Simulación detenida' });
    });

    // New event handler for updating TikTok username
    socket.on('updateTiktokUsername', async (username) => {
        if (!username || username.trim() === '') {
            io.emit('connectionStatus', {
                connected: false,
                message: 'Error: Nombre de usuario inválido',
            });
            return;
        }

        // Update username in config
        gameConfig.username = username.trim();

        // Notify about reconnection
        addRecentEvent({
            type: 'system',
            text: `Cambiando conexión a: ${username}`,
        });

        io.emit('connectionStatus', {
            connected: false,
            message: 'Conectando...',
        });

        // Reset retry count and disconnect current connection
        retryCount = 0;

        // Reinitialize TikTok connection with new username
        await initTikTokConnection();

        // Send updated game state to all clients
        io.emit('gameState', gameConfig);
    });

    socket.on('disconnect', () => {
        console.log('Cliente desconectado:', socket.id);
    });
});

// TikTok connection initialization
async function initTikTokConnection() {
    if (retryCount >= maxRetries) {
        console.error(
            'Se alcanzó el número máximo de intentos de conexión. Verifica que el usuario esté en vivo.'
        );
        addRecentEvent({
            type: 'error',
            text: 'Error de conexión: Número máximo de intentos alcanzado. Verifica que el usuario esté en vivo.',
        });

        io.emit('connectionStatus', {
            connected: false,
            message: 'Error: Máximo de intentos alcanzado',
        });

        return;
    }

    if (tiktokConnection) {
        tiktokConnection.disconnect();
        tiktokConnection = null;
    }

    tiktokConnection = new WebcastPushConnection(gameConfig.username);

    // TikTok connection event handlers
    tiktokConnection.on('streamEnd', () => {
        console.log('📴 El stream ha finalizado. Intentando reconectar...');
        addRecentEvent({
            type: 'system',
            text: 'Stream finalizado. Reconectando...',
        });

        io.emit('connectionStatus', {
            connected: false,
            message: 'Stream finalizado. Reconectando...',
        });

        setTimeout(initTikTokConnection, 10000);
    });

    tiktokConnection.on('like', (data) => {
        console.log(`❤️ Like de ${data.uniqueId}`);
        handleVote('likes', data.uniqueId, data.likeCount || 1);
        io.emit('playSound', 'newVote');
    });

    tiktokConnection.on('chat', (data) => {
        if (data.comment) {
            console.log(`💬 ${data.uniqueId}: ${data.comment}`);
            handleVote('comments', data.uniqueId);
            io.emit('playSound', 'newVote');
        }
    });

    try {
        await tiktokConnection.connect();
        console.log('✅ Conectado a TikTok Live de:', gameConfig.username);
        addRecentEvent({
            type: 'system',
            text: `Conectado a TikTok Live de: ${gameConfig.username}`,
        });

        io.emit('connectionStatus', {
            connected: true,
            message: `Conectado a: ${gameConfig.username}`,
        });

        retryCount = 0;
    } catch (err) {
        console.error('❌ Error al conectar con TikTok:', err.message);
        addRecentEvent({
            type: 'error',
            text: `Error de conexión: ${err.message}`,
        });

        io.emit('connectionStatus', {
            connected: false,
            message: `Error: ${err.message}`,
        });

        retryCount++;
        setTimeout(initTikTokConnection, 10000);
    }
}

// Start voting
function startVoting(title, likeOption, commentOption, duration = 30) {
    if (gameConfig.votingActive) {
        endVoting();
    }

    gameConfig.votingActive = true;
    gameConfig.currentVoting = {
        id: Date.now(),
        title: title || '¿Qué decisión tomar?',
        likeOption: likeOption || 'Opción A',
        commentOption: commentOption || 'Opción B',
        likes: 0,
        comments: 0,
        likesVoters: {},
        commentsVoters: {},
    };

    addRecentEvent({
        type: 'system',
        text: `Votación iniciada: "${title}" - ${duration} segundos`,
    });

    io.emit('gameState', gameConfig);

    // Auto-end voting after duration
    setTimeout(() => {
        if (gameConfig.votingActive && gameConfig.currentVoting.id) {
            endVoting();
        }
    }, duration * 1000);
}

// End voting
function endVoting(manual = false) {
    if (!gameConfig.votingActive) return;

    gameConfig.votingActive = false;

    // Determine the winner
    let resultText = 'Votación finalizada - ';
    let soundType = 'voteEnd';

    if (gameConfig.currentVoting.likes > gameConfig.currentVoting.comments) {
        resultText += `¡Gana "${gameConfig.currentVoting.likeOption}" con ${gameConfig.currentVoting.likes} votos!`;
        soundType = 'winnerLikes';
    } else if (
        gameConfig.currentVoting.comments > gameConfig.currentVoting.likes
    ) {
        resultText += `¡Gana "${gameConfig.currentVoting.commentOption}" con ${gameConfig.currentVoting.comments} votos!`;
        soundType = 'winnerComments';
    } else if (
        gameConfig.currentVoting.likes === 0 &&
        gameConfig.currentVoting.comments === 0
    ) {
        resultText += 'Sin votos';
    } else {
        resultText += `¡Empate! ${gameConfig.currentVoting.likes} a ${gameConfig.currentVoting.comments}`;
        soundType = 'tie';
    }

    addRecentEvent({ type: 'result', text: resultText });

    if (manual) {
        io.emit('playSound', soundType);
    }

    io.emit('gameState', gameConfig);
}

// Handle vote
function handleVote(type, userId, count = 1) {
    if (!gameConfig.votingActive) return;

    if (type === 'likes') {
        gameConfig.currentVoting.likes += count;

        if (!gameConfig.currentVoting.likesVoters) {
            gameConfig.currentVoting.likesVoters = {};
        }

        gameConfig.currentVoting.likesVoters[userId] =
            (gameConfig.currentVoting.likesVoters[userId] || 0) + count;

        addRecentEvent({
            type: 'like',
            user: userId,
            text: `${userId} votó por "${gameConfig.currentVoting.likeOption}"`,
            count,
        });
    } else if (type === 'comments') {
        gameConfig.currentVoting.comments += count;

        if (!gameConfig.currentVoting.commentsVoters) {
            gameConfig.currentVoting.commentsVoters = {};
        }

        gameConfig.currentVoting.commentsVoters[userId] =
            (gameConfig.currentVoting.commentsVoters[userId] || 0) + count;

        addRecentEvent({
            type: 'comment',
            user: userId,
            text: `${userId} votó por "${gameConfig.currentVoting.commentOption}"`,
            count,
        });
    }

    io.emit('gameState', gameConfig);
}

// Add recent event
function addRecentEvent(event) {
    gameConfig.recentEvents.unshift({ ...event, id: Date.now() });

    if (gameConfig.recentEvents.length > gameConfig.maxRecentEvents) {
        gameConfig.recentEvents.pop();
    }

    io.emit('gameState', gameConfig);
}

// Simulation mode for testing
function startSimulation() {
    if (simulationInterval) {
        clearInterval(simulationInterval);
    }

    simulationInterval = setInterval(() => {
        if (!gameConfig.votingActive) return;

        const isLike = Math.random() > 0.5;
        const randomUser = `user_${Math.floor(Math.random() * 1000)}`;

        handleVote(isLike ? 'likes' : 'comments', randomUser, 1);
    }, 2000);
}

function stopSimulation() {
    if (simulationInterval) {
        clearInterval(simulationInterval);
        simulationInterval = null;
    }
}

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Servidor funcionando en http://localhost:${PORT}`);
    console.log(
        `📱 Panel de configuración: http://localhost:${PORT}/configuracion`
    );
    initTikTokConnection();
});
