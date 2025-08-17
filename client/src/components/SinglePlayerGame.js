import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const SinglePlayerGame = () => {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState(null);
  const [gameActive, setGameActive] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [heldPiece, setHeldPiece] = useState(null);
  const [canHold, setCanHold] = useState(true);

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
    if (!gameActive || !gameState) return;
    const gameLoop = setInterval(() => {
      if (gameActive && !gameOver) dropPiece();
    }, Math.max(100, 1000 - (gameState.level - 1) * 100));
    return () => clearInterval(gameLoop);
  }, [gameActive, gameState, gameOver]);

  useEffect(() => {
    initializeGame();
    startGameCountdown();
  }, []);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' ', 'p', 'P', 'Shift'].includes(e.key)) {
        e.preventDefault();
      }
      if (!gameActive || gameOver) return;
      switch (e.key) {
        case 'ArrowLeft': movePiece('left'); break;
        case 'ArrowRight': movePiece('right'); break;
        case 'ArrowDown': dropPiece(); break;
        case 'ArrowUp': rotatePiece(); break;
        case ' ': hardDrop(); break;
        case 'p': case 'P': setGameActive(!gameActive); break;
        case 'Shift': holdPiece(); break;
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameActive, gameState, gameOver]);

  const initializeGame = () => {
    const initialGameState = {
      board: Array(20).fill().map(() => Array(10).fill(0)),
      currentPiece: getRandomPiece(),
      nextPiece: getRandomPiece(),
      score: 0, lines: 0, level: 1, gameOver: false, dropTime: 1000
    };
    setGameState(initialGameState);
    setGameOver(false); setGameActive(false); setHeldPiece(null); setCanHold(true);
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

  const startGameCountdown = () => {
    let timeLeft = 3;
    setCountdown(timeLeft);
    const interval = setInterval(() => {
      timeLeft -= 1;
      setCountdown(timeLeft);
      if (timeLeft <= 0) {
        clearInterval(interval);
        setCountdown(null);
        setGameActive(true);
      }
    }, 1000);
  };

  const movePiece = (direction) => {
    if (!gameState || gameOver) return;
    const piece = gameState.currentPiece;
    const newX = direction === 'left' ? piece.x - 1 : piece.x + 1;
    if (isValidMove(piece.shape, newX, piece.y)) {
      setGameState(prev => ({ ...prev, currentPiece: { ...piece, x: newX } }));
    }
  };

  const rotatePiece = () => {
    if (!gameState || gameOver) return;
    const piece = gameState.currentPiece;
    const rotated = rotateMatrix(piece.shape);
    if (isValidMove(rotated, piece.x, piece.y)) {
      setGameState(prev => ({ ...prev, currentPiece: { ...piece, shape: rotated } }));
    }
  };

  const dropPiece = () => {
    if (!gameState || gameOver) return;
    const piece = gameState.currentPiece;
    const newY = piece.y + 1;
    if (isValidMove(piece.shape, piece.x, newY)) {
      setGameState(prev => ({ ...prev, currentPiece: { ...piece, y: newY }, score: prev.score + 1 }));
    } else {
      lockPiece();
      checkLineClears();
      setTimeout(() => {
        spawnNewPiece();
        setCanHold(true);
        setTimeout(() => {
          if (isGameOver()) endGame();
        }, 50);
      }, 50);
    }
  };

  const hardDrop = () => {
    if (!gameState || gameOver) return;
    const piece = gameState.currentPiece;
    let dropDistance = 0;
    while (isValidMove(piece.shape, piece.x, piece.y + dropDistance + 1)) {
      dropDistance++;
    }
    const finalY = piece.y + dropDistance;
    
    // Update the piece position first
    const updatedPiece = { ...piece, y: finalY };
    const updatedState = {
      ...gameState,
      currentPiece: updatedPiece,
      score: gameState.score + dropDistance * 2
    };
    
    // Set the state with the updated piece position
    setGameState(updatedState);
    
    // Immediately lock the piece and continue with the game logic
    lockPieceForState(updatedState);
    checkLineClearsForState(updatedState);
    
    setTimeout(() => {
      spawnNewPiece();
      setCanHold(true);
      setTimeout(() => {
        if (isGameOver()) endGame();
      }, 50);
    }, 50);
  };

  const lockPieceForState = (state) => {
    if (!state) return;
    const piece = state.currentPiece;
    const shape = piece.shape;
    const newBoard = [...state.board];
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          const boardY = piece.y + y;
          const boardX = piece.x + x;
          if (boardY >= 0) {
            newBoard[boardY][boardX] = piece.color;
          }
        }
      }
    }
    setGameState(prev => ({ ...prev, board: newBoard }));
  };

  const checkLineClearsForState = (state) => {
    if (!state) return;
    const board = state.board;
    const linesToClear = [];
    for (let y = board.length - 1; y >= 0; y--) {
      if (board[y].every(cell => cell !== 0)) {
        linesToClear.push(y);
      }
    }
    if (linesToClear.length > 0) {
      const newBoard = [...board];
      linesToClear.forEach(line => {
        newBoard.splice(line, 1);
        newBoard.unshift(Array(10).fill(0));
      });
      const scoreMap = { 1: 100, 2: 300, 3: 500, 4: 800 };
      const points = scoreMap[linesToClear.length] * state.level;
      setGameState(prev => ({
        ...prev,
        board: newBoard,
        lines: prev.lines + linesToClear.length,
        score: prev.score + points,
        level: Math.floor((prev.lines + linesToClear.length) / 10) + 1
      }));
    }
  };

  const holdPiece = () => {
    if (!gameState || gameOver || !canHold) return;
    if (heldPiece) {
      const heldPieceCopy = { ...heldPiece, x: gameState.currentPiece.x, y: gameState.currentPiece.y };
      setHeldPiece({ ...gameState.currentPiece, x: 3, y: 0 });
      if (isValidMove(heldPieceCopy.shape, heldPieceCopy.x, heldPieceCopy.y)) {
        setGameState(prev => ({ ...prev, currentPiece: heldPieceCopy }));
      }
    } else {
      setHeldPiece({ ...gameState.currentPiece, x: 3, y: 0 });
      setGameState(prev => ({
        ...prev,
        currentPiece: prev.nextPiece,
        nextPiece: getRandomPiece()
      }));
    }
    setCanHold(false);
  };

  const getGhostPiecePosition = () => {
    if (!gameState || !gameState.currentPiece) return null;
    const piece = gameState.currentPiece;
    let ghostY = piece.y;
    while (isValidMove(piece.shape, piece.x, ghostY + 1)) {
      ghostY++;
    }
    return { ...piece, y: ghostY };
  };

  const isValidMove = (shape, x, y) => {
    for (let py = 0; py < shape.length; py++) {
      for (let px = 0; px < shape[py].length; px++) {
        if (shape[py][px]) {
          const newX = x + px;
          const newY = y + py;
          if (newX < 0 || newX >= 10 || newY >= 20) return false;
          if (newY >= 0 && gameState.board[newY][newX] !== 0) return false;
        }
      }
    }
    return true;
  };

  const lockPiece = () => {
    if (!gameState) return;
    const piece = gameState.currentPiece;
    const shape = piece.shape;
    const newBoard = [...gameState.board];
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          const boardY = piece.y + y;
          const boardX = piece.x + x;
          if (boardY >= 0) {
            newBoard[boardY][boardX] = piece.color;
          }
        }
      }
    }
    setGameState(prev => ({ ...prev, board: newBoard }));
  };

  const checkLineClears = () => {
    if (!gameState) return;
    const board = gameState.board;
    const linesToClear = [];
    for (let y = board.length - 1; y >= 0; y--) {
      if (board[y].every(cell => cell !== 0)) {
        linesToClear.push(y);
      }
    }
    if (linesToClear.length > 0) {
      const newBoard = [...board];
      linesToClear.forEach(line => {
        newBoard.splice(line, 1);
        newBoard.unshift(Array(10).fill(0));
      });
      const scoreMap = { 1: 100, 2: 300, 3: 500, 4: 800 };
      const points = scoreMap[linesToClear.length] * gameState.level;
      setGameState(prev => ({
        ...prev,
        board: newBoard,
        lines: prev.lines + linesToClear.length,
        score: prev.score + points,
        level: Math.floor((prev.lines + linesToClear.length) / 10) + 1
      }));
    }
  };

  const spawnNewPiece = () => {
    if (!gameState) return;
    setGameState(prev => ({
      ...prev,
      currentPiece: prev.nextPiece,
      nextPiece: getRandomPiece()
    }));
  };

  const isGameOver = () => {
    if (!gameState || !gameState.currentPiece) return true;
    const piece = gameState.currentPiece;
    if (piece.y <= 1 && !isValidMove(piece.shape, piece.x, piece.y)) {
      return true;
    }
    if (!isValidMove(piece.shape, piece.x, piece.y + 1)) {
      for (let xOffset = -2; xOffset <= 2; xOffset++) {
        if (isValidMove(piece.shape, piece.x + xOffset, piece.y)) {
          return false;
        }
      }
      return piece.y <= 1;
    }
    return false;
  };

  const endGame = () => {
    setGameOver(true);
    setGameActive(false);
    setFinalScore(gameState.score);
    setShowNameInput(true);
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

  const submitScore = async () => {
    if (!playerName.trim()) return;
    try {
      const response = await fetch('http://localhost:5000/api/single-player/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName: playerName.trim(),
          score: finalScore,
          lines: gameState.lines,
          level: gameState.level,
          date: new Date().toISOString()
        }),
      });
      if (response.ok) {
        navigate('/leaderboard?mode=single-player');
      } else {
        alert('Failed to submit score. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting score:', error);
      alert('Failed to submit score. Please try again.');
    }
  };

  const renderBoard = useCallback(() => {
    if (!canvasRef.current || !gameState) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const cellSize = 30;
    canvas.width = 10 * cellSize;
    canvas.height = 20 * cellSize;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const board = gameState.board;
    for (let y = 0; y < 20; y++) {
      for (let x = 0; x < 10; x++) {
        ctx.fillStyle = board[y][x] || '#2d3748';
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        ctx.strokeStyle = '#4a5568';
        ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }
    const ghostPiece = getGhostPiecePosition();
    if (ghostPiece) {
      const shape = ghostPiece.shape;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
          if (shape[y][x]) {
            const boardX = ghostPiece.x + x;
            const boardY = ghostPiece.y + y;
            if (boardX >= 0 && boardX < 10 && boardY >= 0 && boardY < 20) {
              ctx.fillRect(boardX * cellSize, boardY * cellSize, cellSize, cellSize);
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
              ctx.strokeRect(boardX * cellSize, boardY * cellSize, cellSize, cellSize);
            }
          }
        }
      }
    }
    if (gameState.currentPiece) {
      const piece = gameState.currentPiece;
      const shape = piece.shape;
      ctx.fillStyle = piece.color;
      for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
          if (shape[y][x]) {
            const boardX = piece.x + x;
            const boardY = piece.y + y;
            if (boardX >= 0 && boardX < 10 && boardY >= 0 && boardY < 20) {
              ctx.fillRect(boardX * cellSize, boardY * cellSize, cellSize, cellSize);
              ctx.strokeStyle = '#ffffff';
              ctx.strokeRect(boardX * cellSize, boardY * cellSize, cellSize, cellSize);
            }
          }
        }
      }
    }
  }, [gameState]);

  useEffect(() => {
    renderBoard();
  }, [renderBoard]);

  const renderPiece = (piece, size = 20) => {
    if (!piece) return null;
    return (
      <div className="grid gap-0" style={{ gridTemplateColumns: `repeat(${piece.shape[0].length}, 1fr)` }}>
        {piece.shape.map((row, y) =>
          row.map((cell, x) => (
            <div
              key={`${y}-${x}`}
              className="w-5 h-5 border border-gray-600"
              style={{ backgroundColor: cell ? piece.color : 'transparent' }}
            />
          ))
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold mb-6">Single Player Tetris</h1>
      
      {showNameInput && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
            <h2 className="text-2xl font-bold mb-4">Game Over!</h2>
            <p className="text-xl mb-2">Final Score: {finalScore}</p>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Enter your name:</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Your name"
                maxLength={20}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={submitScore}
                disabled={!playerName.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                Submit Score
              </button>
              <button
                onClick={() => {
                  setShowNameInput(false);
                  initializeGame();
                  startGameCountdown();
                }}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                Play Again
              </button>
            </div>
          </div>
        </div>
      )}

      {countdown !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="text-6xl font-bold text-white">{countdown}</div>
        </div>
      )}

      <div className="flex gap-8 items-start">
        <div className="flex flex-col items-center">
          <canvas
            ref={canvasRef}
            className="border-2 border-gray-600 bg-gray-800"
          />
          <div className="mt-4 text-center">
            <p className="text-lg">Score: {gameState?.score || 0}</p>
            <p className="text-lg">Lines: {gameState?.lines || 0}</p>
            <p className="text-lg">Level: {gameState?.level || 1}</p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Next Piece</h3>
            {gameState?.nextPiece && renderPiece(gameState.nextPiece)}
          </div>

          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Hold</h3>
            {heldPiece ? renderPiece(heldPiece) : <div className="text-gray-500">Empty</div>}
          </div>

          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Controls</h3>
            <div className="text-sm space-y-1">
              <p>← → Move</p>
              <p>↓ Soft Drop</p>
              <p>↑ Rotate</p>
              <p>Space Hard Drop</p>
              <p>Shift Hold</p>
              <p>P Pause</p>
            </div>
          </div>

          <button
            onClick={() => {
              setGameActive(!gameActive);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            {gameActive ? 'Pause' : 'Resume'}
          </button>

          <button
            onClick={() => {
              setGameActive(false);
              initializeGame();
              startGameCountdown();
            }}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            Restart
          </button>

          <button
            onClick={() => navigate('/')}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
};

export default SinglePlayerGame;
