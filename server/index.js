const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

// Mock database connections for development
let mockDbConnected = false;
let mockRedisConnected = false;

// Try to connect to real databases if available, otherwise use mock
try {
  const mongoose = require('mongoose');
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tetris', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }).then(() => {
    console.log('MongoDB connected');
    mockDbConnected = true;
  }).catch(() => {
    console.log('MongoDB not available, using mock database');
    mockDbConnected = false;
  });
} catch (error) {
  console.log('MongoDB not available, using mock database');
  mockDbConnected = false;
}

try {
  const redis = require('redis');
  const redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  });
  
  redisClient.on('error', (err) => {
    console.log('Redis not available, using mock storage');
    mockRedisConnected = false;
  });
  
  redisClient.connect().then(() => {
    console.log('Redis connected');
    mockRedisConnected = true;
  }).catch(() => {
    console.log('Redis not available, using mock storage');
    mockRedisConnected = false;
  });
} catch (error) {
  console.log('Redis not available, using mock storage');
  mockRedisConnected = false;
}

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Mock Redis client for development
const mockRedisClient = {
  connect: async () => {},
  on: (event, callback) => {
    if (event === 'error') {
      // Mock no error for development
    }
  }
};

// Use mock Redis client if real Redis is not available
const redisClient = mockRedisConnected ? require('redis').createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
}) : mockRedisClient;

if (!mockRedisConnected) {
  console.log('Using mock Redis client for development');
}

// Game state management
const gameRooms = new Map();
const players = new Map();

// Single player scores storage (mock database)
const singlePlayerScores = [];

// Game logic utilities
const TETROMINOS = {
  I: { shape: [[1,1,1,1]], color: '#00f0f0' },
  O: { shape: [[1,1],[1,1]], color: '#f0f000' },
  T: { shape: [[0,1,0],[1,1,1]], color: '#a000f0' },
  S: { shape: [[0,1,1],[1,1,0]], color: '#00f000' },
  Z: { shape: [[1,1,0],[0,1,1]], color: '#f00000' },
  J: { shape: [[1,0,0],[1,1,1]], color: '#0000f0' },
  L: { shape: [[0,0,1],[1,1,1]], color: '#f0a000' }
};

class GameRoom {
  constructor(id, name, maxPlayers = 2, isPrivate = false) {
    this.id = id;
    this.name = name;
    this.maxPlayers = maxPlayers;
    this.isPrivate = isPrivate;
    this.players = new Map();
    this.gameState = 'waiting'; // waiting, playing, finished
    this.gameMode = 'battle'; // battle, classic, tournament
    this.powerUps = ['clear_lines', 'slow_opponent', 'add_garbage', 'shield'];
    this.tournamentMode = false;
  }

  addPlayer(player) {
    if (this.players.size < this.maxPlayers) {
      this.players.set(player.id, player);
      player.roomId = this.id;
      return true;
    }
    return false;
  }

  removePlayer(playerId) {
    this.players.delete(playerId);
    if (this.players.size === 0) {
      gameRooms.delete(this.id);
    }
  }

  startGame() {
    this.gameState = 'playing';
    this.players.forEach(player => {
      player.gameState = this.createInitialGameState();
      player.gameState.isAlive = true;
    });
  }

  createInitialGameState() {
    return {
      board: Array(20).fill().map(() => Array(10).fill(0)),
      currentPiece: this.getRandomPiece(),
      nextPiece: this.getRandomPiece(),
      score: 0,
      lines: 0,
      level: 1,
      gameOver: false,
      powerUps: [],
      shields: 0
    };
  }

  getRandomPiece() {
    const pieces = Object.keys(TETROMINOS);
    const randomPiece = pieces[Math.floor(Math.random() * pieces.length)];
    return {
      type: randomPiece,
      shape: TETROMINOS[randomPiece].shape,
      color: TETROMINOS[randomPiece].color,
      x: Math.floor((10 - TETROMINOS[randomPiece].shape[0].length) / 2),
      y: 0
    };
  }
}

class Player {
  constructor(id, username, socketId) {
    this.id = id;
    this.username = username;
    this.socketId = socketId;
    this.roomId = null;
    this.gameState = null;
    this.isReady = false;
    this.score = 0;
    this.wins = 0;
    this.losses = 0;
  }
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Player joins the game
  socket.on('player:join', (data) => {
    const { username } = data;
    const player = new Player(socket.id, username, socket.id);
    players.set(socket.id, player);
    
    socket.emit('player:joined', {
      playerId: socket.id,
      username: username
    });
  });

  // Create a new game room
  socket.on('room:create', (data) => {
    const { name, maxPlayers, isPrivate, gameMode } = data;
    const roomId = generateRoomId();
    const room = new GameRoom(roomId, name, maxPlayers, isPrivate);
    room.gameMode = gameMode;
    
    gameRooms.set(roomId, room);
    
    socket.emit('room:created', {
      roomId: roomId,
      room: room
    });
  });

  // Join a room
  socket.on('room:join', (data) => {
    const { roomId } = data;
    const room = gameRooms.get(roomId);
    const player = players.get(socket.id);
    
    if (room && player) {
      if (room.addPlayer(player)) {
        socket.join(roomId);
        socket.emit('room:joined', { roomId, room });
        
        // Notify other players in the room
        socket.to(roomId).emit('player:joined_room', {
          playerId: player.id,
          username: player.username
        });
        
        // Start game if room is full
        if (room.players.size === room.maxPlayers) {
          room.startGame();
          io.to(roomId).emit('game:start', { room });
        }
      } else {
        socket.emit('room:full', { roomId });
      }
    } else {
      socket.emit('room:not_found', { roomId });
    }
  });

  // Handle game moves
  socket.on('game:move', (data) => {
    const { roomId, move } = data;
    const room = gameRooms.get(roomId);
    const player = players.get(socket.id);
    
    if (room && player && room.gameState === 'playing') {
      handleGameMove(room, player, move);
    }
  });

  // Handle power-up usage
  socket.on('powerup:use', (data) => {
    const { roomId, powerUp, targetPlayerId } = data;
    const room = gameRooms.get(roomId);
    const player = players.get(socket.id);
    
    if (room && player && room.gameState === 'playing') {
      handlePowerUp(room, player, powerUp, targetPlayerId);
    }
  });

  // Disconnect handling
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    const player = players.get(socket.id);
    
    if (player) {
      if (player.roomId) {
        const room = gameRooms.get(player.roomId);
        if (room) {
          room.removePlayer(socket.id);
          io.to(player.roomId).emit('player:left', {
            playerId: socket.id,
            username: player.username
          });
        }
      }
      players.delete(socket.id);
    }
  });
});

// Game move handler
function handleGameMove(room, player, move) {
  const gameState = player.gameState;
  
  switch (move.type) {
    case 'move':
      movePiece(gameState, move.direction);
      break;
    case 'rotate':
      rotatePiece(gameState);
      break;
    case 'drop':
      dropPiece(gameState);
      break;
    case 'hard_drop':
      hardDrop(gameState);
      break;
  }
  
  // Check for line clears
  const clearedLines = checkLineClears(gameState.board);
  if (clearedLines > 0) {
    gameState.lines += clearedLines;
    gameState.score += calculateScore(clearedLines, gameState.level);
    
    // Send garbage lines to opponents in battle mode
    if (room.gameMode === 'battle' && clearedLines > 1) {
      sendGarbageLines(room, player, clearedLines - 1);
    }
    
    // Award power-ups
    if (clearedLines >= 2) {
      awardPowerUp(player);
    }
  }
  
  // Spawn new piece
  if (gameState.currentPiece.y >= 20 || !isValidPosition(gameState)) {
    spawnNewPiece(gameState);
  }
  
  // Check game over
  if (isGameOver(gameState)) {
    gameState.gameOver = true;
    gameState.isAlive = false;
    handleGameOver(room, player);
  }
  
  // Broadcast game state update
  io.to(room.id).emit('game:update', {
    playerId: player.id,
    gameState: gameState
  });
}

// Helper functions
function generateRoomId() {
  return Math.random().toString(36).substr(2, 9);
}

function movePiece(gameState, direction) {
  const piece = gameState.currentPiece;
  const newX = direction === 'left' ? piece.x - 1 : piece.x + 1;
  
  if (isValidMove(gameState, piece.shape, newX, piece.y)) {
    piece.x = newX;
    return true;
  }
  return false;
}

function rotatePiece(gameState) {
  const piece = gameState.currentPiece;
  const rotated = rotateMatrix(piece.shape);
  
  if (isValidMove(gameState, rotated, piece.x, piece.y)) {
    piece.shape = rotated;
    return true;
  }
  return false;
}

function dropPiece(gameState) {
  const piece = gameState.currentPiece;
  const newY = piece.y + 1;
  
  if (isValidMove(gameState, piece.shape, piece.x, newY)) {
    piece.y = newY;
    gameState.score += 1;
    return true;
  }
  return false;
}

function hardDrop(gameState) {
  const piece = gameState.currentPiece;
  let dropDistance = 0;
  
  while (isValidMove(gameState, piece.shape, piece.x, piece.y + dropDistance + 1)) {
    dropDistance++;
  }
  
  piece.y += dropDistance;
  gameState.score += dropDistance * 2;
  lockPiece(gameState);
  return dropDistance;
}

function checkLineClears(board) {
  const linesToClear = [];
  
  for (let y = board.length - 1; y >= 0; y--) {
    if (board[y].every(cell => cell !== 0)) {
      linesToClear.push(y);
    }
  }
  
  // Clear the lines
  linesToClear.forEach(line => {
    board.splice(line, 1);
    board.unshift(Array(10).fill(0));
  });
  
  return linesToClear.length;
}

function calculateScore(lines, level) {
  const scoreMap = { 1: 100, 2: 300, 3: 500, 4: 800 };
  return scoreMap[lines] * level;
}

function sendGarbageLines(room, sender, lines) {
  const opponents = Array.from(room.players.values()).filter(p => p.id !== sender.id);
  
  opponents.forEach(opponent => {
    if (opponent.gameState && opponent.gameState.isAlive) {
      // Add garbage lines at the bottom
      for (let i = 0; i < lines; i++) {
        opponent.gameState.board.shift();
        const garbageLine = Array(10).fill('gray');
        // Leave one random hole
        const holeIndex = Math.floor(Math.random() * 10);
        garbageLine[holeIndex] = 0;
        opponent.gameState.board.push(garbageLine);
      }
    }
  });
}

function awardPowerUp(player) {
  const availablePowerUps = ['clear_lines', 'slow_opponent', 'add_garbage', 'shield'];
  const randomPowerUp = availablePowerUps[Math.floor(Math.random() * availablePowerUps.length)];
  
  if (!player.gameState.powerUps.includes(randomPowerUp)) {
    player.gameState.powerUps.push(randomPowerUp);
  }
}

function spawnNewPiece(gameState) {
  gameState.currentPiece = gameState.nextPiece;
  gameState.nextPiece = getRandomPiece();
}

function isValidMove(gameState, shape, x, y) {
  for (let py = 0; py < shape.length; py++) {
    for (let px = 0; px < shape[py].length; px++) {
      if (shape[py][px]) {
        const newX = x + px;
        const newY = y + py;
        
        if (newX < 0 || newX >= 10 || newY >= 20) {
          return false;
        }
        
        if (newY >= 0 && gameState.board[newY][newX] !== 0) {
          return false;
        }
      }
    }
  }
  return true;
}

function isValidPosition(gameState) {
  return isValidMove(gameState, gameState.currentPiece.shape, gameState.currentPiece.x, gameState.currentPiece.y);
}

function isGameOver(gameState) {
  return !isValidMove(gameState, gameState.currentPiece.shape, gameState.currentPiece.x, gameState.currentPiece.y);
}

function lockPiece(gameState) {
  const piece = gameState.currentPiece;
  const shape = piece.shape;
  
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (shape[y][x]) {
        const boardY = piece.y + y;
        const boardX = piece.x + x;
        if (boardY >= 0) {
          gameState.board[boardY][boardX] = piece.color;
        }
      }
    }
  }
}

function rotateMatrix(matrix) {
  const N = matrix.length;
  const rotated = Array(N).fill().map(() => Array(N).fill(0));
  
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      rotated[i][j] = matrix[N - 1 - j][i];
    }
  }
  
  return rotated;
}

function handleGameOver(room, player) {
  player.gameState.isAlive = false;
  player.gameState.gameOver = true;
  
  // Check if game should end
  const alivePlayers = Array.from(room.players.values()).filter(p => p.gameState.isAlive);
  
  if (alivePlayers.length <= 1) {
    room.gameState = 'finished';
    const winner = alivePlayers.length === 1 ? alivePlayers[0] : null;
    
    // Update player stats
    room.players.forEach(p => {
      if (p.id === winner?.id) {
        p.wins++;
      } else {
        p.losses++;
      }
    });
    
    io.to(room.id).emit('game:over', { 
      winner: winner?.id, 
      roomId: room.id 
    });
  }
}

function handlePowerUp(room, player, powerUp, targetPlayerId) {
  if (!player.gameState.powerUps.includes(powerUp)) {
    return;
  }
  
  const target = targetPlayerId ? room.players.get(targetPlayerId) : null;
  
  switch (powerUp) {
    case 'clear_lines':
      // Clear bottom 2 lines
      player.gameState.board.splice(-2);
      player.gameState.board.unshift(Array(10).fill(0), Array(10).fill(0));
      break;
      
    case 'slow_opponent':
      if (target) {
        // Add delay to opponent's next piece
        target.gameState.slowed = true;
        setTimeout(() => {
          if (target.gameState) {
            target.gameState.slowed = false;
          }
        }, 5000);
      }
      break;
      
    case 'add_garbage':
      if (target) {
        // Add 3 garbage lines to target
        for (let i = 0; i < 3; i++) {
          target.gameState.board.shift();
          const garbageLine = Array(10).fill('gray');
          const holeIndex = Math.floor(Math.random() * 10);
          garbageLine[holeIndex] = 0;
          target.gameState.board.push(garbageLine);
        }
      }
      break;
      
    case 'shield':
      player.gameState.shields++;
      break;
  }
  
  // Remove used power-up
  player.gameState.powerUps = player.gameState.powerUps.filter(p => p !== powerUp);
  
  // Notify players
  io.to(room.id).emit('powerup:used', {
    playerId: player.id,
    powerUp: powerUp,
    targetPlayerId: targetPlayerId
  });
}

function getRandomPiece() {
  const pieces = Object.keys(TETROMINOS);
  const randomPiece = pieces[Math.floor(Math.random() * pieces.length)];
  return {
    type: randomPiece,
    shape: TETROMINOS[randomPiece].shape,
    color: TETROMINOS[randomPiece].color,
    x: Math.floor((10 - TETROMINOS[randomPiece].shape[0].length) / 2),
    y: 0
  };
}

// API Routes
app.get('/api/rooms', (req, res) => {
  const publicRooms = Array.from(gameRooms.values()).filter(room => !room.isPrivate);
  res.json({ rooms: publicRooms });
});

// Single Player Score Submission
app.post('/api/single-player/score', (req, res) => {
  try {
    const { playerName, score, lines, level, date } = req.body;
    
    // Validate input
    if (!playerName || !score || score < 0) {
      return res.status(400).json({ error: 'Invalid score data' });
    }
    
    // Create new score entry
    const newScore = {
      id: singlePlayerScores.length + 1,
      playerName: playerName.trim(),
      score: parseInt(score),
      lines: parseInt(lines) || 0,
      level: parseInt(level) || 1,
      date: date || new Date().toISOString()
    };
    
    // Add to scores array
    singlePlayerScores.push(newScore);
    
    // Sort scores by highest score first
    singlePlayerScores.sort((a, b) => b.score - a.score);
    
    // Update ranks
    singlePlayerScores.forEach((score, index) => {
      score.rank = index + 1;
    });
    
    console.log('New single player score submitted:', newScore);
    
    res.status(201).json({ 
      message: 'Score submitted successfully',
      score: newScore 
    });
  } catch (error) {
    console.error('Error submitting single player score:', error);
    res.status(500).json({ error: 'Failed to submit score' });
  }
});

// Get Single Player Leaderboard
app.get('/api/single-player/leaderboard', (req, res) => {
  try {
    const { limit = 50, period = 'all' } = req.query;
    const limitNum = parseInt(limit);
    
    let filteredScores = [...singlePlayerScores];
    
    // Filter by period if specified
    if (period !== 'all') {
      const now = new Date();
      let cutoffDate;
      
      switch (period) {
        case 'daily':
          cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'weekly':
          cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'monthly':
          cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          cutoffDate = null;
      }
      
      if (cutoffDate) {
        filteredScores = filteredScores.filter(score => 
          new Date(score.date) >= cutoffDate
        );
      }
    }
    
    // Limit results and add rank
    const leaderboard = filteredScores
      .slice(0, limitNum)
      .map((score, index) => ({
        rank: index + 1,
        ...score
      }));
    
    res.json({ 
      leaderboard,
      totalScores: filteredScores.length,
      period 
    });
  } catch (error) {
    console.error('Error fetching single player leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Enhanced Multiplayer Leaderboard
app.get('/api/leaderboard', async (req, res) => {
  try {
    const { mode = 'multiplayer', period = 'all' } = req.query;
    
    if (mode === 'single-player') {
      // Redirect to single player leaderboard
      const { limit = 50 } = req.query;
      const singlePlayerResponse = await fetch(`http://localhost:5000/api/single-player/leaderboard?limit=${limit}&period=${period}`);
      const singlePlayerData = await singlePlayerResponse.json();
      return res.json(singlePlayerData);
    }
    
    // Mock multiplayer leaderboard data (existing functionality)
    const mockMultiplayerLeaderboard = [
      { rank: 1, username: 'TetrisMaster', score: 15420, wins: 89, losses: 12, winRate: 88 },
      { rank: 2, username: 'BlockDropper', score: 14850, wins: 76, losses: 18, winRate: 81 },
      { rank: 3, username: 'LineClearer', score: 13980, wins: 65, losses: 22, winRate: 75 },
      { rank: 4, username: 'SpeedRunner', score: 13200, wins: 58, losses: 25, winRate: 70 },
      { rank: 5, username: 'ProGamer', score: 12800, wins: 52, losses: 28, winRate: 65 },
      { rank: 6, username: 'CasualPlayer', score: 11500, wins: 45, losses: 35, winRate: 56 },
      { rank: 7, username: 'RisingStar', score: 10200, wins: 38, losses: 42, winRate: 48 },
      { rank: 8, username: 'Newbie', score: 8900, wins: 25, losses: 55, winRate: 31 },
    ];
    
    res.json({ 
      leaderboard: mockMultiplayerLeaderboard,
      mode: 'multiplayer',
      period 
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
