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
    // Configuración del reto del globo
    balloonChallenge: {
        active: false,
        target: 50,
        duration: 30,
        currentLikes: 0,
        startTime: null,
        color: '#ff4d4d',
    },
    // Configuración del banner personalizado
    bannerConfig: {
        title: 'Bienvenido al Stream',
        message:
            'Gracias por unirte. ¡No olvides seguirme y activar las notificaciones!',
        theme: 'purple',
    },
    // Configuración actualizada para advertising
    advertisingConfig: {
        videos: [
            {
                path: 'videos/publicidad.mp4',
                name: 'Promoción Canal 1',
            },
            // {
            //     path: 'videos/publicidad1.mp4',
            //     name: 'Promoción Canal 2',
            // },
            // {
            //     path: 'videos/publicidad2.mp4',
            //     name: 'Promoción Canal 3',
            // },
            // Puedes agregar más videos aquí si es necesario
        ],
        autoRotate: true,
        rotationInterval: 10 * 60 * 1000, // Cambiado a 1 minuto para facilitar pruebas
    },
};

// Verificar si los archivos de video existen
function checkMediaFiles() {
    console.log('Verificando archivos de medios...');

    // Verificar directorio de videos
    const videoDir = path.join(__dirname, 'public', 'videos');
    if (!fs.existsSync(videoDir)) {
        console.log('⚠️ El directorio videos no existe. Creándolo...');
        try {
            fs.mkdirSync(videoDir, { recursive: true });
            console.log('✅ Directorio videos creado en: ' + videoDir);
        } catch (err) {
            console.error('❌ Error al crear directorio de videos:', err);
        }
    } else {
        console.log('✅ Directorio de videos encontrado en: ' + videoDir);
    }

    // Verificar archivos de video
    gameConfig.advertisingConfig.videos.forEach((video) => {
        const videoPath = path.join(__dirname, 'public', video.path);
        if (fs.existsSync(videoPath)) {
            console.log(`✅ Video encontrado: ${video.path}`);
        } else {
            console.log(`❌ Video NO encontrado: ${video.path}`);

            // Si falta el archivo, intentar buscar otros formatos
            const altFormats = ['.mp4', '.webm', '.mov'];
            let foundAlternative = false;

            for (const format of altFormats) {
                const baseName = video.path.substring(
                    0,
                    video.path.lastIndexOf('.')
                );
                const altPath = path.join(
                    __dirname,
                    'public',
                    baseName + format
                );

                if (fs.existsSync(altPath)) {
                    console.log(
                        `✅ Encontrado formato alternativo: ${
                            baseName + format
                        }`
                    );
                    // Actualizar la ruta en la configuración
                    video.path = baseName + format;
                    foundAlternative = true;
                    break;
                }
            }

            if (!foundAlternative) {
                console.log(
                    `⚠️ No se encontraron alternativas para ${video.path}. Asegúrate de tener un video en la carpeta videos.`
                );
                // Crear un archivo de video de ejemplo si no existe ninguno
                try {
                    if (!fs.existsSync(path.join(videoDir, 'ejemplo.mp4'))) {
                        // Mensaje informativo - realmente necesitarías crear el video manualmente
                        console.log(
                            "ℹ️ Por favor, agrega manualmente archivos de video en formato MP4 a la carpeta 'public/videos/'"
                        );
                    }
                } catch (err) {
                    console.error(
                        'Error al verificar archivo de ejemplo:',
                        err
                    );
                }
            }
        }
    });
}

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
// Ruta específica para videos
app.use('/videos', express.static(path.join(__dirname, 'public', 'videos')));

// Ruta principal que ahora muestra index.html como página de navegación
app.get('/', (req, res) =>
    res.sendFile(path.join(__dirname, 'public', 'index.html'))
);

// Ruta para la votación
app.get('/voting', (req, res) =>
    res.sendFile(path.join(__dirname, 'public', 'voting.html'))
);

app.get('/configuracion', (req, res) =>
    res.sendFile(path.join(__dirname, 'public', 'config.html'))
);

// Ruta para el overlay del globo
app.get('/ballon', (req, res) =>
    res.sendFile(path.join(__dirname, 'public', 'ballon.html'))
);

app.get('/banner', (req, res) =>
    res.sendFile(path.join(__dirname, 'public', 'banner.html'))
);

// Agregar la nueva ruta para advertising
app.get('/advertising', (req, res) =>
    res.sendFile(path.join(__dirname, 'public', 'advertising.html'))
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

    // Eventos para el reto del globo
    socket.on('startBalloonChallenge', (config) => {
        startBalloonChallenge(config.target, config.duration, config.color);
        io.emit('playSound', 'balloonStart');
    });

    socket.on('endBalloonChallenge', () => {
        endBalloonChallenge(false);
    });

    socket.on('balloonChallengeEnded', (result) => {
        // Agregar evento a actividad reciente
        const message = result.success
            ? `¡Reto completado! Se consiguieron ${result.likesReceived} likes de ${result.targetLikes}`
            : `Reto fallido. Se consiguieron ${result.likesReceived} likes de ${result.targetLikes}`;

        addRecentEvent({
            type: result.success ? 'success' : 'info',
            text: message,
        });
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

    socket.on('getBannerConfig', () => {
        console.log(
            'Cliente solicitó configuración del banner. Enviando:',
            gameConfig.bannerConfig
        );
        socket.emit('bannerConfig', gameConfig.bannerConfig);
    });

    socket.on('updateBannerConfig', (config) => {
        console.log('Recibida solicitud para actualizar banner:', config);

        gameConfig.bannerConfig = {
            title: config.title || 'Título del Banner',
            message:
                config.message ||
                'Este es un mensaje de ejemplo para el banner. Configúralo desde el panel de control.',
            theme: config.theme || 'purple',
        };

        console.log(
            'Banner actualizado. Nueva configuración:',
            gameConfig.bannerConfig
        );

        // Emitir a todos los clientes conectados
        io.emit('bannerConfig', gameConfig.bannerConfig);

        addRecentEvent({
            type: 'system',
            text: `Banner actualizado: "${config.title}"`,
        });
    });

    // En la parte donde se manejan los eventos de Socket.io, agregar:
    socket.on('getAdvertisingConfig', () => {
        console.log('Cliente solicitó configuración de advertising');
        socket.emit('advertisingConfig', gameConfig.advertisingConfig);
    });

    // Agregar manejador para actualizar configuración de advertising
    socket.on('updateAdvertisingConfig', (config) => {
        console.log('Recibida solicitud para actualizar advertising:', config);

        if (config) {
            gameConfig.advertisingConfig = {
                ...gameConfig.advertisingConfig,
                ...config,
            };

            // Notificar a todos los clientes
            io.emit('advertisingConfig', gameConfig.advertisingConfig);

            addRecentEvent({
                type: 'system',
                text: `Configuración de advertising actualizada`,
            });
        }
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

        // También actualizar el reto del globo si está activo
        if (gameConfig.balloonChallenge.active) {
            updateBalloonChallenge(data.likeCount || 1);
        }
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
    gameConfig.votingDuration = duration; // Guardamos la duración en la configuración
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

    console.log(`Votación iniciada con duración: ${duration} segundos`); // Debug

    io.emit('gameState', gameConfig);

    // 🔴 Se corrige el tiempo de finalización de la votación para que termine exactamente cuando debe
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

// Funciones para el reto del globo
// Iniciar un reto de globo
function startBalloonChallenge(target = 50, duration = 30, color = '#ff4d4d') {
    gameConfig.balloonChallenge = {
        active: true,
        target: target,
        duration: duration,
        currentLikes: 0,
        startTime: Date.now(),
        color: color,
    };

    io.emit('balloonChallenge', {
        active: true,
        target: target,
        duration: duration,
        color: color,
    });

    addRecentEvent({
        type: 'system',
        text: `Reto del globo iniciado: ${target} likes en ${duration} segundos`,
    });

    // Finalizar automáticamente cuando se acabe el tiempo
    setTimeout(() => {
        if (gameConfig.balloonChallenge.active) {
            endBalloonChallenge(false);
        }
    }, duration * 1000);
}

// Actualizar el conteo de likes del reto
function updateBalloonChallenge(count = 1) {
    if (!gameConfig.balloonChallenge.active) return;

    gameConfig.balloonChallenge.currentLikes += count;

    io.emit('balloonLike', {
        count: count,
        total: gameConfig.balloonChallenge.currentLikes,
    });

    // Comprobar si se alcanzó el objetivo
    if (
        gameConfig.balloonChallenge.currentLikes >=
        gameConfig.balloonChallenge.target
    ) {
        endBalloonChallenge(true);
    }
}

// Finalizar un reto de globo
function endBalloonChallenge(success = false) {
    if (!gameConfig.balloonChallenge.active) return;

    const challengeResult = {
        success: success,
        likesReceived: gameConfig.balloonChallenge.currentLikes,
        targetLikes: gameConfig.balloonChallenge.target,
        duration: Math.round(
            (Date.now() - gameConfig.balloonChallenge.startTime) / 1000
        ),
    };

    // Desactivar el reto
    gameConfig.balloonChallenge.active = false;

    // Notificar a los clientes
    io.emit('balloonChallenge', { active: false });

    // Agregar evento a la actividad reciente
    const resultText = success
        ? `¡Reto del globo completado! ${challengeResult.likesReceived} likes en ${challengeResult.duration} segundos.`
        : `Reto del globo fallido. ${challengeResult.likesReceived}/${challengeResult.targetLikes} likes conseguidos.`;

    addRecentEvent({
        type: success ? 'success' : 'info',
        text: resultText,
    });

    // Reproducir sonido dependiendo del resultado
    io.emit('playSound', success ? 'balloonSuccess' : 'balloonFail');

    // Send updated game state to all clients (not to a specific socket)
    io.emit('gameState', gameConfig);
    // Also emit banner config to all clients
    io.emit('bannerConfig', gameConfig.bannerConfig);
}

// Llamar a la función de verificación de archivos al inicio
checkMediaFiles();

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Servidor funcionando en http://localhost:${PORT}`);
    console.log(
        `📱 Panel de configuración: http://localhost:${PORT}/configuracion`
    );
    initTikTokConnection();
});
