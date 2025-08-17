import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const TetrisGame = ({ socket, player, room }) => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState(null);
  const [opponents, setOpponents] = useState([]);
  const [gameActive, setGameActive] = useState(false);
  const [powerUps, setPowerUps] = useState([]);
  const [countdown, setCountdown] = useState(null);

  // Tetris piece definitions
  const TETROMINOS = {
    I: { shape: [[1,1,1,1]], color: '#00f0f0' },
    O: { shape: [[1,1],[1,1]], color: '#f0f000' },
    T: { shape: [[0,1,0],[1,1,1]], color: '#a000f0' },
    S: { shape: [[0,1,1],[1,1,0]], color: '#00f000' },
    Z: { shape: [[1,1,0],[0,1,1]], color: '#f00000' },
    J: { shape: [[1,0,0],[1,1,1]], color: '#0000f0' },
    L: { shape: [[0,0,1],[1,1,1]], color: '#f0a000' }
  };

  useEffect(() => {
    if (!socket || !player || !room) return;

    // Initialize game
    initializeGame();

    // Listen for game events
    socket.on('game:start', (data) => {
      setGameActive(true);
      startGameCountdown();
    });

    socket.on('game:update', (data) => {
      if (data.playerId === player.id) {
        setGameState(data.gameState);
      } else {
        updateOpponent(data.playerId, data.gameState);
      }
    });

    socket.on('game:over', (data) => {
      setGameActive(false);
      if (data.winner === player.id) {
        showGameOverMessage('You Win! 🎉');
      } else {
        showGameOverMessage('Game Over! 😞');
      }
    });

    // Keyboard controls
    const handleKeyPress = (e) => {
      // Prevent default for game keys even when game is not active
      if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' '].includes(e.key)) {
        e.preventDefault();
      }
      
      if (!gameActive || !gameState) return;
      
      switch (e.key) {
        case 'ArrowLeft':
          sendMove({ type: 'move', direction: 'left' });
          break;
        case 'ArrowRight':
          sendMove({ type: 'move', direction: 'right' });
          break;
        case 'ArrowDown':
          sendMove({ type: 'drop' });
          break;
        case 'ArrowUp':
          sendMove({ type: 'rotate' });
          break;
        case ' ':
          sendMove({ type: 'hard_drop' });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      socket.off('game:start');
      socket.off('game:update');
      socket.off('game:over');
    };
  }, [socket, player, room, gameActive, gameState]);

  const initializeGame = () => {
    const initialGameState = {
      board: Array(20).fill().map(() => Array(10).fill(0)),
      currentPiece: getRandomPiece(),
      nextPiece: getRandomPiece(),
      score: 0,
      lines: 0,
      level: 1,
      gameOver: false,
      powerUps: [],
      shields: 0
    };
    setGameState(initialGameState);
  };

  const getRandomPiece = () => {
    const pieces = Object.keys(TETROMINOS);
    const randomPiece = pieces[Math.floor(Math.random() * pieces.length)];
    return {
      type: randomPiece,
      shape: TETROMINOS[randomPiece].shape,
      color: TETROMINOS[randomPiece].color,
      x: Math.floor((10 - TETROMINOS[randomPiece].shape[0].length) / 2),
      y: 0
    };
  };

  const rotateMatrix = (matrix) => {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const rotated = Array(cols).fill().map(() => Array(rows).fill(0));
    
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        rotated[j][rows - 1 - i] = matrix[i][j];
      }
    }
    
    return rotated;
  };

  const startGameCountdown = () => {
    let timeLeft = 3;
    setCountdown(timeLeft);
    
    const interval = setInterval(() => {
      timeLeft -= 1;
      setCountdown(timeLeft);
      
      if (timeLeft <= 0) {
        clearInterval(interval);
        setCountdown(null);
      }
    }, 1000);
  };

  const sendMove = (move) => {
    if (socket) {
      socket.emit('game:move', { roomId, move });
    }
  };

  const usePowerUp = (powerUp, targetPlayerId = null) => {
    if (socket) {
      socket.emit('powerup:use', { roomId, powerUp, targetPlayerId });
      setPowerUps(prev => prev.filter(p => p !== powerUp));
    }
  };

  const updateOpponent = (playerId, gameState) => {
    setOpponents(prev => {
      const existing = prev.find(o => o.id === playerId);
      if (existing) {
        return prev.map(o => o.id === playerId ? { ...o, gameState } : o);
      } else {
        return [...prev, { id: playerId, gameState }];
      }
    });
  };

  const showGameOverMessage = (message) => {
    setTimeout(() => {
      if (window.confirm(message + '\n\nReturn to lobby?')) {
        navigate('/');
      }
    }, 1000);
  };

  const renderBoard = useCallback(() => {
    if (!canvasRef.current || !gameState) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const cellSize = 30;

    // Clear canvas
    ctx.fillStyle = '#16213e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw board
    for (let y = 0; y < 20; y++) {
      for (let x = 0; x < 10; x++) {
        if (gameState.board[y][x]) {
          ctx.fillStyle = gameState.board[y][x];
          ctx.fillRect(x * cellSize, y * cellSize, cellSize - 1, cellSize - 1);
        }
      }
    }

    // Draw current piece
    if (gameState.currentPiece) {
      ctx.fillStyle = gameState.currentPiece.color;
      const shape = gameState.currentPiece.shape;
      for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
          if (shape[y][x]) {
            const boardX = gameState.currentPiece.x + x;
            const boardY = gameState.currentPiece.y + y;
            if (boardX >= 0 && boardX < 10 && boardY >= 0 && boardY < 20) {
              ctx.fillRect(boardX * cellSize, boardY * cellSize, cellSize - 1, cellSize - 1);
            }
          }
        }
      }
    }

    // Draw grid lines
    ctx.strokeStyle = '#0f3460';
    ctx.lineWidth = 1;
    for (let x = 0; x <= 10; x++) {
      ctx.beginPath();
      ctx.moveTo(x * cellSize, 0);
      ctx.lineTo(x * cellSize, 600);
      ctx.stroke();
    }
    for (let y = 0; y <= 20; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * cellSize);
      ctx.lineTo(300, y * cellSize);
      ctx.stroke();
    }
  }, [gameState]);

  useEffect(() => {
    renderBoard();
  }, [gameState, renderBoard]);

  if (!gameState) {
    return (
      <div className="text-center py-12">
        <div className="text-xl mb-4">Loading game...</div>
      </div>
    );
  }

  const renderMiniBoard = (opponentState) => {
    if (!opponentState) return null;

    return (
      <div className="bg-tetris-bg border border-tetris-border rounded p-2">
        <div className="text-xs text-gray-400 mb-1">{opponentState.score} pts</div>
        <div className="grid grid-cols-10 gap-px" style={{ gridTemplateRows: 'repeat(20, 8px)' }}>
          {opponentState.board && opponentState.board.flat().map((cell, index) => (
            <div
              key={index}
              className="w-1.5 h-1.5"
              style={{ backgroundColor: cell || '#16213e' }}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-tetris-t game-text mb-2">
          {room.name} - {room.gameMode.toUpperCase()} MODE
        </h2>
        <div className="flex justify-center items-center space-x-6 text-sm">
          <span className="text-tetris-i">Room: {roomId}</span>
          <span className={`px-3 py-1 rounded ${
            gameActive ? 'bg-green-600' : 'bg-yellow-600'
          }`}>
            {gameActive ? 'PLAYING' : 'WAITING'}
          </span>
        </div>
      </div>

      {countdown !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="text-8xl font-bold text-tetris-t game-text animate-pulse-fast">
              {countdown}
            </div>
            <div className="text-xl text-gray-300 mt-4 game-text">Get Ready!</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Game Board */}
        <div className="lg:col-span-2">
          <div className="bg-tetris-grid border border-tetris-border rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-tetris-i">Your Board</h3>
              <div className="flex space-x-4 text-sm">
                <span className="text-tetris-s">Score: {gameState.score}</span>
                <span className="text-tetris-t">Lines: {gameState.lines}</span>
                <span className="text-tetris-o">Level: {gameState.level}</span>
              </div>
            </div>
            
            <div className="flex justify-center">
              <canvas
                ref={canvasRef}
                width={300}
                height={600}
                className="game-board border-2 border-tetris-border"
              />
            </div>

            {/* Game Controls */}
            <div className="mt-4 text-center">
              <div className="text-sm text-gray-400 mb-2">Controls</div>
              <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto text-xs">
                <div></div>
                <div className="bg-tetris-bg border border-tetris-border rounded p-2">↑ Rotate</div>
                <div></div>
                <div className="bg-tetris-bg border border-tetris-border rounded p-2">← Left</div>
                <div className="bg-tetris-bg border border-tetris-border rounded p-2">↓ Drop</div>
                <div className="bg-tetris-bg border border-tetris-border rounded p-2">→ Right</div>
                <div></div>
                <div className="bg-tetris-bg border border-tetris-border rounded p-2">Space Hard Drop</div>
                <div></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Side Panel */}
      <div className="space-y-6">
        {/* Next Piece */}
        <div className="bg-tetris-grid border border-tetris-border rounded-lg p-4">
          <h3 className="text-lg font-bold text-tetris-i mb-3">Next Piece</h3>
          <div className="flex justify-center">
            {gameState.nextPiece && (
              <div className="grid gap-px" style={{ 
                gridTemplateColumns: `repeat(${gameState.nextPiece.shape[0].length}, 20px)`,
                gridTemplateRows: `repeat(${gameState.nextPiece.shape.length}, 20px)`
              }}>
                {gameState.nextPiece.shape.flat().map((cell, index) => (
                  <div
                    key={index}
                    className="w-5 h-5"
                    style={{ backgroundColor: cell ? gameState.nextPiece.color : 'transparent' }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Power-ups */}
        <div className="bg-tetris-grid border border-tetris-border rounded-lg p-4">
          <h3 className="text-lg font-bold text-tetris-i mb-3">Power-ups</h3>
          <div className="space-y-2">
            {gameState.powerUps && gameState.powerUps.length > 0 ? (
              gameState.powerUps.map((powerUp, index) => (
                <button
                  key={index}
                  onClick={() => usePowerUp(powerUp)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-sm transition-colors"
                >
                  {powerUp.replace('_', ' ').toUpperCase()}
                </button>
              ))
            ) : (
              <div className="text-sm text-gray-400 text-center py-4">
                No power-ups available
              </div>
            )}
          </div>
        </div>

        {/* Shields */}
        <div className="bg-tetris-grid border border-tetris-border rounded-lg p-4">
          <h3 className="text-lg font-bold text-tetris-i mb-3">Shields</h3>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">
              {gameState.shields || 0}
            </div>
            <div className="text-sm text-gray-400">Active Shields</div>
          </div>
        </div>

        {/* Opponents */}
        {opponents.length > 0 && (
          <div className="bg-tetris-grid border border-tetris-border rounded-lg p-4">
            <h3 className="text-lg font-bold text-tetris-i mb-3">Opponents</h3>
            <div className="space-y-3">
              {opponents.map((opponent) => (
                <div key={opponent.id} className="text-center">
                  <div className="text-sm text-gray-400 mb-1">
                    {opponent.gameState?.score || 0} pts
                  </div>
                  {renderMiniBoard(opponent.gameState)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Game Actions */}
        <div className="space-y-2">
          <button
            onClick={() => navigate('/')}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            Leave Game
          </button>
        </div>
      </div>
    </div>
  );
};

export default TetrisGame;
