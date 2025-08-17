import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { io } from 'socket.io-client';
import Lobby from './components/Lobby';
import GameRoom from './components/GameRoom';
import TetrisGame from './components/TetrisGame';
import SinglePlayerGame from './components/SinglePlayerGame';
import Leaderboard from './components/Leaderboard';
import Tournament from './components/Tournament';

function App() {
  const [socket, setSocket] = useState(null);
  const [player, setPlayer] = useState(null);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [username, setUsername] = useState('');

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io(process.env.REACT_APP_SERVER_URL || window.location.origin);
    setSocket(newSocket);

    // Cleanup on unmount
    return () => newSocket.close();
  }, []);

  const handlePlayerJoin = (username) => {
    if (socket) {
      socket.emit('player:join', { username });
      setPlayer({ id: socket.id, username, socketId: socket.id });
      setUsername(username);
    }
  };

  const handleRoomCreate = (roomData) => {
    if (socket) {
      socket.emit('room:create', roomData);
    }
  };

  const handleRoomJoin = (roomId) => {
    if (socket) {
      socket.emit('room:join', { roomId });
    }
  };

  return (
    <Router>
      <div className="min-h-screen bg-tetris-bg">
        <header className="bg-tetris-grid border-b border-tetris-border p-4">
          <div className="container mx-auto flex justify-between items-center">
            <h1 className="text-3xl font-bold text-tetris-t glow game-text">
              MULTIPLAYER TETRIS BATTLE
            </h1>
            <div className="flex items-center space-x-4">
              {player && (
                <span className="text-tetris-s">Welcome, {player.username}!</span>
              )}
              <nav className="flex space-x-4">
                <a href="/" className="text-tetris-i hover:text-tetris-t transition-colors">
                  Lobby
                </a>
                <a href="/single-player" className="text-tetris-i hover:text-tetris-t transition-colors">
                  Single Player
                </a>
                <a href="/leaderboard" className="text-tetris-i hover:text-tetris-t transition-colors">
                  Leaderboard
                </a>
                <a href="/tournaments" className="text-tetris-i hover:text-tetris-t transition-colors">
                  Tournaments
                </a>
              </nav>
            </div>
          </div>
        </header>

        <main className="container mx-auto p-4">
          <Routes>
            <Route 
              path="/" 
              element={
                !player ? (
                  <div className="text-center">
                    <h2 className="text-2xl mb-4 game-text">Enter Your Username</h2>
                    <div className="max-w-md mx-auto">
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter username..."
                        className="w-full p-3 bg-tetris-grid border border-tetris-border rounded text-white placeholder-gray-400 focus:outline-none focus:border-tetris-t"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && username.trim()) {
                            handlePlayerJoin(username.trim());
                          }
                        }}
                      />
                      <button
                        onClick={() => handlePlayerJoin(username.trim())}
                        disabled={!username.trim()}
                        className="mt-4 w-full bg-tetris-t hover:bg-tetris-s text-white font-bold py-3 px-6 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Join Game
                      </button>
                    </div>
                  </div>
                ) : (
                  <Lobby 
                    socket={socket} 
                    player={player}
                    onRoomCreate={handleRoomCreate}
                    onRoomJoin={handleRoomJoin}
                  />
                )
              } 
            />
            <Route 
              path="/game/:roomId" 
              element={
                <GameRoom 
                  socket={socket} 
                  player={player}
                  setCurrentRoom={setCurrentRoom}
                />
              } 
            />
            <Route 
              path="/play/:roomId" 
              element={
                <TetrisGame 
                  socket={socket} 
                  player={player}
                  room={currentRoom}
                />
              } 
            />
            <Route path="/single-player" element={<SinglePlayerGame />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/tournaments" element={<Tournament socket={socket} player={player} />} />
          </Routes>
        </main>

        <footer className="bg-tetris-grid border-t border-tetris-border p-4 mt-8">
          <div className="container mx-auto text-center text-gray-400">
            <p>Multiplayer Tetris Battle - Real-time competitive gaming with friends</p>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
