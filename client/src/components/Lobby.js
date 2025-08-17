import React, { useState, useEffect } from 'react';

const Lobby = ({ socket, player, onRoomCreate, onRoomJoin }) => {
  const [rooms, setRooms] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRoomData, setNewRoomData] = useState({
    name: '',
    maxPlayers: 2,
    isPrivate: false,
    gameMode: 'battle'
  });

  useEffect(() => {
    // Fetch available rooms
    fetchRooms();

    // Listen for room updates
    if (socket) {
      socket.on('room:created', (data) => {
        console.log('Room created:', data);
        fetchRooms();
      });

      socket.on('room:joined', (data) => {
        console.log('Joined room:', data);
        // Use React Router navigation instead of window.location
        window.location.pathname = `/game/${data.roomId}`;
      });

      socket.on('room:full', (data) => {
        alert('Room is full!');
      });

      socket.on('room:not_found', (data) => {
        alert('Room not found!');
      });
    }
  }, [socket]);

  const fetchRooms = async () => {
    try {
      const response = await fetch(`${window.location.origin}/api/rooms`);
      const data = await response.json();
      setRooms(data.rooms);
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
    }
  };

  const handleCreateRoom = () => {
    if (newRoomData.name.trim()) {
      onRoomCreate(newRoomData);
      setShowCreateForm(false);
      setNewRoomData({
        name: '',
        maxPlayers: 2,
        isPrivate: false,
        gameMode: 'battle'
      });
    }
  };

  const handleJoinRoom = (roomId) => {
    onRoomJoin(roomId);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-tetris-t game-text">Game Lobby</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-tetris-t hover:bg-tetris-s text-white font-bold py-3 px-6 rounded transition-colors"
        >
          Create Room
        </button>
      </div>

      {/* Create Room Form */}
      {showCreateForm && (
        <div className="bg-tetris-grid border border-tetris-border rounded-lg p-6 mb-8">
          <h3 className="text-xl font-bold mb-4 text-tetris-i">Create New Room</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Room Name</label>
              <input
                type="text"
                value={newRoomData.name}
                onChange={(e) => setNewRoomData({ ...newRoomData, name: e.target.value })}
                placeholder="Enter room name..."
                className="w-full p-2 bg-tetris-bg border border-tetris-border rounded text-white placeholder-gray-400 focus:outline-none focus:border-tetris-t"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Max Players</label>
              <select
                value={newRoomData.maxPlayers}
                onChange={(e) => setNewRoomData({ ...newRoomData, maxPlayers: parseInt(e.target.value) })}
                className="w-full p-2 bg-tetris-bg border border-tetris-border rounded text-white focus:outline-none focus:border-tetris-t"
              >
                <option value={2}>2 Players</option>
                <option value={4}>4 Players</option>
                <option value={6}>6 Players</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Game Mode</label>
              <select
                value={newRoomData.gameMode}
                onChange={(e) => setNewRoomData({ ...newRoomData, gameMode: e.target.value })}
                className="w-full p-2 bg-tetris-bg border border-tetris-border rounded text-white focus:outline-none focus:border-tetris-t"
              >
                <option value="battle">Battle Mode</option>
                <option value="classic">Classic Mode</option>
                <option value="tournament">Tournament</option>
              </select>
            </div>
            <div className="flex items-end space-x-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={newRoomData.isPrivate}
                  onChange={(e) => setNewRoomData({ ...newRoomData, isPrivate: e.target.checked })}
                  className="mr-2"
                />
                Private Room
              </label>
            </div>
          </div>
          <div className="flex justify-end mt-4 space-x-2">
            <button
              onClick={() => setShowCreateForm(false)}
              className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateRoom}
              disabled={!newRoomData.name.trim()}
              className="bg-tetris-t hover:bg-tetris-s text-white font-bold py-2 px-4 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Room
            </button>
          </div>
        </div>
      )}

      {/* Game Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-tetris-grid border border-tetris-border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-tetris-i">{rooms.length}</div>
          <div className="text-sm text-gray-400">Active Rooms</div>
        </div>
        <div className="bg-tetris-grid border border-tetris-border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-tetris-s">Battle</div>
          <div className="text-sm text-gray-400">Popular Mode</div>
        </div>
        <div className="bg-tetris-grid border border-tetris-border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-tetris-t">24/7</div>
          <div className="text-sm text-gray-400">Online Gaming</div>
        </div>
      </div>

      {/* Available Rooms */}
      <div>
        <h3 className="text-xl font-bold mb-4 text-tetris-i">Available Rooms</h3>
        {rooms.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">No active rooms found</div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-tetris-t hover:bg-tetris-s text-white font-bold py-2 px-4 rounded transition-colors"
            >
              Create the first room!
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map((room) => (
              <div key={room.id} className="room-card">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="text-lg font-bold text-tetris-t">{room.name}</h4>
                  <span className={`px-2 py-1 rounded text-xs ${
                    room.gameMode === 'battle' ? 'bg-red-600' : 
                    room.gameMode === 'classic' ? 'bg-blue-600' : 'bg-purple-600'
                  }`}>
                    {room.gameMode.toUpperCase()}
                  </span>
                </div>
                <div className="text-sm text-gray-400 mb-2">
                  Players: {room.players.size}/{room.maxPlayers}
                </div>
                <div className="text-sm text-gray-400 mb-4">
                  Status: <span className={`${
                    room.gameState === 'waiting' ? 'text-tetris-i' : 
                    room.gameState === 'playing' ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {room.gameState}
                  </span>
                </div>
                {room.isPrivate && (
                  <div className="text-sm text-yellow-400 mb-3">
                    🔒 Private Room
                  </div>
                )}
                <button
                  onClick={() => handleJoinRoom(room.id)}
                  disabled={room.players.size >= room.maxPlayers || room.gameState === 'playing'}
                  className="w-full bg-tetris-t hover:bg-tetris-s text-white font-bold py-2 px-4 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {room.gameState === 'playing' ? 'Game in Progress' : 
                   room.players.size >= room.maxPlayers ? 'Room Full' : 'Join Room'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Lobby;
