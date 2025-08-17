import React, { useState, useEffect } from 'react';

const Tournament = ({ socket, player }) => {
  const [tournaments, setTournaments] = useState([]);
  const [activeTournament, setActiveTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRegistration, setShowRegistration] = useState(false);

  useEffect(() => {
    fetchTournaments();
    
    if (socket) {
      socket.on('tournament:created', (data) => {
        setTournaments(prev => [data.tournament, ...prev]);
      });

      socket.on('tournament:started', (data) => {
        setActiveTournament(data.tournament);
      });

      socket.on('tournament:updated', (data) => {
        if (activeTournament && activeTournament.id === data.tournament.id) {
          setActiveTournament(data.tournament);
        }
        setTournaments(prev => 
          prev.map(t => t.id === data.tournament.id ? data.tournament : t)
        );
      });
    }

    return () => {
      if (socket) {
        socket.off('tournament:created');
        socket.off('tournament:started');
        socket.off('tournament:updated');
      }
    };
  }, [socket, activeTournament]);

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      // Mock data for development
      const mockTournaments = [
        {
          id: '1',
          name: 'Summer Championship 2024',
          status: 'registration',
          maxPlayers: 16,
          currentPlayers: 12,
          startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          prizePool: 1000,
          entryFee: 10,
          bracket: null
        },
        {
          id: '2',
          name: 'Weekly Battle #45',
          status: 'ongoing',
          maxPlayers: 8,
          currentPlayers: 8,
          startDate: new Date(Date.now() - 1 * 60 * 60 * 1000),
          prizePool: 200,
          entryFee: 5,
          bracket: generateMockBracket()
        },
        {
          id: '3',
          name: 'Beginner Friendly Cup',
          status: 'completed',
          maxPlayers: 12,
          currentPlayers: 12,
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          prizePool: 150,
          entryFee: 0,
          bracket: generateCompletedBracket(),
          winner: 'TetrisNewbie'
        }
      ];
      setTournaments(mockTournaments);
    } catch (error) {
      console.error('Failed to fetch tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMockBracket = () => {
    return {
      rounds: [
        {
          name: 'Quarter Finals',
          matches: [
            { player1: 'ProGamer', player2: 'SpeedRunner', winner: 'ProGamer', score1: 2, score2: 1 },
            { player1: 'LineClearer', player2: 'BlockDropper', winner: 'LineClearer', score1: 2, score2: 0 },
            { player1: 'TetrisMaster', player2: 'CasualPlayer', winner: 'TetrisMaster', score1: 2, score2: 0 },
            { player1: 'RisingStar', player2: 'Newbie', winner: 'RisingStar', score1: 2, score2: 1 }
          ]
        },
        {
          name: 'Semi Finals',
          matches: [
            { player1: 'ProGamer', player2: 'LineClearer', winner: null, score1: 0, score2: 0 },
            { player1: 'TetrisMaster', player2: 'RisingStar', winner: null, score1: 0, score2: 0 }
          ]
        },
        {
          name: 'Final',
          matches: [
            { player1: null, player2: null, winner: null, score1: 0, score2: 0 }
          ]
        }
      ]
    };
  };

  const generateCompletedBracket = () => {
    return {
      rounds: [
        {
          name: 'Quarter Finals',
          matches: [
            { player1: 'Player1', player2: 'Player2', winner: 'Player1', score1: 2, score2: 1 },
            { player1: 'Player3', player2: 'Player4', winner: 'Player3', score1: 2, score2: 0 },
            { player1: 'Player5', player2: 'Player6', winner: 'Player5', score1: 2, score2: 0 },
            { player1: 'Player7', player2: 'Player8', winner: 'Player7', score1: 2, score2: 1 }
          ]
        },
        {
          name: 'Semi Finals',
          matches: [
            { player1: 'Player1', player2: 'Player3', winner: 'Player1', score1: 2, score2: 1 },
            { player1: 'Player5', player2: 'Player7', winner: 'Player5', score1: 2, score2: 0 }
          ]
        },
        {
          name: 'Final',
          matches: [
            { player1: 'Player1', player2: 'Player5', winner: 'TetrisNewbie', score1: 1, score2: 2 }
          ]
        }
      ]
    };
  };

  const handleRegister = (tournamentId) => {
    if (socket) {
      socket.emit('tournament:register', { tournamentId });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'registration': return 'text-green-400';
      case 'ongoing': return 'text-yellow-400';
      case 'completed': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const renderBracket = (bracket) => {
    if (!bracket || !bracket.rounds) return null;

    return (
      <div className="bg-tetris-bg border border-tetris-border rounded-lg p-6">
        <h3 className="text-xl font-bold text-tetris-i mb-4">Tournament Bracket</h3>
        <div className="space-y-8">
          {bracket.rounds.map((round, roundIndex) => (
            <div key={roundIndex}>
              <h4 className="text-lg font-bold text-tetris-t mb-3">{round.name}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {round.matches.map((match, matchIndex) => (
                  <div key={matchIndex} className="bg-tetris-grid border border-tetris-border rounded-lg p-3">
                    <div className="space-y-2">
                      <div className={`text-sm ${match.winner === match.player1 ? 'text-green-400 font-bold' : 'text-white'}`}>
                        {match.player1 || 'TBD'} {match.score1 !== undefined && `(${match.score1})`}
                      </div>
                      <div className="text-xs text-gray-400 text-center">vs</div>
                      <div className={`text-sm ${match.winner === match.player2 ? 'text-green-400 font-bold' : 'text-white'}`}>
                        {match.player2 || 'TBD'} {match.score2 !== undefined && `(${match.score2})`}
                      </div>
                      {match.winner && (
                        <div className="text-xs text-tetris-i text-center">
                          Winner: {match.winner}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (activeTournament) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-tetris-t game-text mb-2">{activeTournament.name}</h2>
          <div className="flex justify-center items-center space-x-6 text-sm">
            <span className={`px-3 py-1 rounded ${getStatusColor(activeTournament.status)}`}>
              {activeTournament.status.toUpperCase()}
            </span>
            <span className="text-tetris-i">
              {activeTournament.currentPlayers}/{activeTournament.maxPlayers} PLAYERS
            </span>
            <span className="text-tetris-s">Prize Pool: ${activeTournament.prizePool}</span>
          </div>
        </div>

        {renderBracket(activeTournament.bracket)}

        <div className="text-center mt-6">
          <button
            onClick={() => setActiveTournament(null)}
            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            Back to Tournaments
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-tetris-t game-text mb-4">Tournaments</h2>
        <p className="text-gray-400">Compete in organized tournaments and win prizes!</p>
      </div>

      {/* Tournament Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-tetris-grid border border-tetris-border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-tetris-i">{tournaments.length}</div>
          <div className="text-sm text-gray-400">Total Tournaments</div>
        </div>
        <div className="bg-tetris-grid border border-tetris-border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-tetris-s">
            {tournaments.filter(t => t.status === 'registration').length}
          </div>
          <div className="text-sm text-gray-400">Open for Registration</div>
        </div>
        <div className="bg-tetris-grid border border-tetris-border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-tetris-t">
            ${tournaments.reduce((sum, t) => sum + t.prizePool, 0)}
          </div>
          <div className="text-sm text-gray-400">Total Prize Pool</div>
        </div>
        <div className="bg-tetris-grid border border-tetris-border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-tetris-o">
            {tournaments.filter(t => t.status === 'ongoing').length}
          </div>
          <div className="text-sm text-gray-400">Live Tournaments</div>
        </div>
      </div>

      {/* Tournaments List */}
      <div className="space-y-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="text-xl mb-4">Loading tournaments...</div>
          </div>
        ) : tournaments.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">No tournaments available</div>
            <button className="bg-tetris-t hover:bg-tetris-s text-white font-bold py-2 px-4 rounded transition-colors">
              Create Tournament
            </button>
          </div>
        ) : (
          tournaments.map((tournament) => (
            <div key={tournament.id} className="bg-tetris-grid border border-tetris-border rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-tetris-t mb-2">{tournament.name}</h3>
                  <div className="flex items-center space-x-4 text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(tournament.status)}`}>
                      {tournament.status.toUpperCase()}
                    </span>
                    <span className="text-gray-400">
                      {tournament.currentPlayers}/{tournament.maxPlayers} players
                    </span>
                    <span className="text-tetris-s">Prize: ${tournament.prizePool}</span>
                    {tournament.entryFee > 0 && (
                      <span className="text-yellow-400">Entry: ${tournament.entryFee}</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-400 mb-1">
                    {tournament.startDate.toLocaleDateString()}
                  </div>
                  <div className="text-xs text-gray-500">
                    {tournament.startDate.toLocaleTimeString()}
                  </div>
                </div>
              </div>

              {tournament.winner && (
                <div className="bg-green-900 bg-opacity-30 border border-green-600 rounded-lg p-3 mb-4">
                  <div className="text-green-400 text-sm">
                    🏆 Winner: {tournament.winner}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-400">
                  {tournament.status === 'registration' && 'Registration open'}
                  {tournament.status === 'ongoing' && 'Tournament in progress'}
                  {tournament.status === 'completed' && 'Tournament completed'}
                </div>
                <div className="space-x-2">
                  {tournament.status === 'registration' && (
                    <button
                      onClick={() => handleRegister(tournament.id)}
                      disabled={tournament.currentPlayers >= tournament.maxPlayers}
                      className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {tournament.currentPlayers >= tournament.maxPlayers ? 'Full' : 'Register'}
                    </button>
                  )}
                  {tournament.bracket && (
                    <button
                      onClick={() => setActiveTournament(tournament)}
                      className="bg-tetris-t hover:bg-tetris-s text-white font-bold py-2 px-4 rounded text-sm transition-colors"
                    >
                      View Bracket
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Tournament Button */}
      <div className="text-center mt-8">
        <button className="bg-tetris-t hover:bg-tetris-s text-white font-bold py-3 px-6 rounded transition-colors">
          Create New Tournament
        </button>
      </div>
    </div>
  );
};

export default Tournament;
