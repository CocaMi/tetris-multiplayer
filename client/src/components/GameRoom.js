import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const GameRoom = ({ socket, player, setCurrentRoom }) => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [isReady, setIsReady] = useState(false);
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    if (!socket || !player) return;

    // Listen for room events
    socket.on('room:joined', (data) => {
      setRoom(data.room);
      setCurrentRoom(data.room);
      setPlayers(Array.from(data.room.players.values()));
    });

    socket.on('player:joined_room', (data) => {
      setPlayers(prev => [...prev, { id: data.playerId, username: data.username, isReady: false }]);
    });

    socket.on('player:left', (data) => {
      setPlayers(prev => prev.filter(p => p.id !== data.playerId));
    });

    socket.on('game:start', (data) => {
      startCountdown(() => {
        navigate(`/play/${roomId}`);
      });
    });

    // Cleanup
    return () => {
      socket.off('room:joined');
      socket.off('player:joined_room');
      socket.off('player:left');
      socket.off('game:start');
    };
  }, [socket, player, roomId, navigate, setCurrentRoom]);

  const startCountdown = (callback) => {
    let timeLeft = 5;
    setCountdown(timeLeft);
    
    const interval = setInterval(() => {
      timeLeft -= 1;
      setCountdown(timeLeft);
      
      if (timeLeft <= 0) {
        clearInterval(interval);
        setCountdown(null);
        callback();
      }
    }, 1000);
  };

  const handleReadyToggle = () => {
    const newReadyState = !isReady;
    setIsReady(newReadyState);
    
    // Update local player status
    setPlayers(prev => prev.map(p => 
      p.id === player.id ? { ...p, isReady: newReadyState } : p
    ));
  };

  const handleLeaveRoom = () => {
    navigate('/');
  };

  if (!room) {
    return (
      <div className="text-center py-12">
        <div className="text-xl mb-4">Loading room...</div>
      </div>
    );
  }

  const allPlayersReady = players.length === room.maxPlayers && players.every(p => p.isReady);
  const canStartGame = players.length >= 2 && allPlayersReady;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-tetris-t game-text mb-2">{room.name}</h2>
        <div className="flex justify-center items-center space-x-6 text-sm">
          <span className={`px-3 py-1 rounded ${
            room.gameMode === 'battle' ? 'bg-red-600' : 
            room.gameMode === 'classic' ? 'bg-blue-600' : 'bg-purple-600'
          }`}>
            {room.gameMode.toUpperCase()} MODE
          </span>
          <span className="text-tetris-i">
            {players.length}/{room.maxPlayers} PLAYERS
          </span>
          {room.isPrivate && (
            <span className="text-yellow-400">🔒 PRIVATE</span>
          )}
        </div>
      </div>

      {countdown !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="text-8xl font-bold text-tetris-t game-text animate-pulse-fast">
              {countdown}
            </div>
            <div className="text-xl text-gray-300 mt-4 game-text">Game Starting...</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Players List */}
        <div className="bg-tetris-grid border border-tetris-border rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4 text-tetris-i">Players in Room</h3>
          <div className="space-y-3">
            {players.map((p) => (
              <div 
                key={p.id} 
                className={`flex justify-between items-center p-3 rounded ${
                  p.id === player.id ? 'bg-tetris-bg border border-tetris-t' : 'bg-tetris-bg'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    p.isReady ? 'bg-green-400' : 'bg-red-400'
                  }`}></div>
                  <span>
                    {p.username}
                    {p.id === player.id && (
                      <span className="text-tetris-s ml-2">(You)</span>
                    )}
                  </span>
                </div>
                <span className={`text-sm ${
                  p.isReady ? 'text-green-400' : 'text-red-400'
                }`}>
                  {p.isReady ? 'Ready' : 'Not Ready'}
                </span>
              </div>
            ))}
            
            {players.length < room.maxPlayers && (
              <div className="text-center text-gray-400 py-4">
                Waiting for more players to join...
              </div>
            )}
          </div>
        </div>

        {/* Game Settings */}
        <div className="space-y-6">
          {/* Room Info */}
          <div className="bg-tetris-grid border border-tetris-border rounded-lg p-6">
            <h3 className="text-xl font-bold mb-4 text-tetris-i">Room Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Room ID:</span>
                <span className="font-mono">{roomId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Game Mode:</span>
                <span className="capitalize">{room.gameMode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Max Players:</span>
                <span>{room.maxPlayers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Status:</span>
                <span className={canStartGame ? 'text-green-400' : 'text-yellow-400'}>
                  {canStartGame ? 'Ready to Start' : 'Waiting...'}
                </span>
              </div>
            </div>
          </div>

          {/* Game Mode Description */}
          <div className="bg-tetris-grid border border-tetris-border rounded-lg p-6">
            <h3 className="text-xl font-bold mb-4 text-tetris-i">Game Mode</h3>
            <div className="text-sm text-gray-300">
              {room.gameMode === 'battle' && (
                <div>
                  <p className="mb-2">
                    <strong>Battle Mode:</strong> Head-to-head competition where clearing lines sends garbage to opponents!
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Clear 2+ lines to send garbage lines to opponents</li>
                    <li>Use power-ups to gain advantages</li>
                    <li>Last player standing wins!</li>
                    <li>Earn power-ups by clearing multiple lines</li>
                  </ul>
                </div>
              )}
              {room.gameMode === 'classic' && (
                <div>
                  <p className="mb-2">
                    <strong>Classic Mode:</strong> Traditional Tetris gameplay with highest score wins.
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Standard line clearing scoring</li>
                    <li>Compete for the highest score</li>
                    <li>Progressive difficulty levels</li>
                    <li>No garbage lines or power-ups</li>
                  </ul>
                </div>
              )}
              {room.gameMode === 'tournament' && (
                <div>
                  <p className="mb-2">
                    <strong>Tournament Mode:</strong> Bracket-style competition with multiple rounds.
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Single elimination bracket</li>
                    <li>Winners advance to next round</li>
                    <li>Final champion crowned</li>
                    <li>Tournament rankings and rewards</li>
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleReadyToggle}
              disabled={countdown !== null}
              className={`w-full font-bold py-3 px-6 rounded transition-colors ${
                isReady 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-green-600 hover:bg-green-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isReady ? '❌ Not Ready' : '✅ Ready'}
            </button>
            
            <button
              onClick={handleLeaveRoom}
              disabled={countdown !== null}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Leave Room
            </button>
          </div>

          {canStartGame && (
            <div className="bg-green-900 bg-opacity-30 border border-green-600 rounded-lg p-4 text-center">
              <div className="text-green-400 font-bold game-text">
                All players ready! Waiting for host to start the game...
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameRoom;
