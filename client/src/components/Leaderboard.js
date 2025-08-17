import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const Leaderboard = () => {
  const [searchParams] = useSearchParams();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gameMode, setGameMode] = useState(searchParams.get('mode') || 'multiplayer');
  const [timeFilter, setTimeFilter] = useState('all');

  useEffect(() => {
    fetchLeaderboard();
  }, [gameMode, timeFilter]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      let url;
      
      if (gameMode === 'single-player') {
        url = `http://localhost:5000/api/single-player/leaderboard?period=${timeFilter}`;
      } else {
        url = `http://localhost:5000/api/leaderboard?mode=multiplayer&period=${timeFilter}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      setLeaderboard(data.leaderboard || []);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
      
      // Mock data based on game mode
      if (gameMode === 'single-player') {
        setLeaderboard([
          { rank: 1, playerName: 'TetrisMaster', score: 45800, lines: 125, level: 15, date: new Date().toISOString() },
          { rank: 2, playerName: 'SpeedRunner', score: 42100, lines: 118, level: 14, date: new Date().toISOString() },
          { rank: 3, playerName: 'LineClearer', score: 38900, lines: 109, level: 13, date: new Date().toISOString() },
          { rank: 4, playerName: 'ProGamer', score: 35600, lines: 98, level: 12, date: new Date().toISOString() },
          { rank: 5, playerName: 'BlockDropper', score: 32400, lines: 91, level: 11, date: new Date().toISOString() },
          { rank: 6, playerName: 'CasualPlayer', score: 28900, lines: 82, level: 10, date: new Date().toISOString() },
          { rank: 7, playerName: 'RisingStar', score: 25100, lines: 74, level: 9, date: new Date().toISOString() },
          { rank: 8, playerName: 'Newbie', score: 19800, lines: 65, level: 8, date: new Date().toISOString() },
        ]);
      } else {
        setLeaderboard([
          { rank: 1, username: 'TetrisMaster', score: 15420, wins: 89, losses: 12, winRate: 88 },
          { rank: 2, username: 'BlockDropper', score: 14850, wins: 76, losses: 18, winRate: 81 },
          { rank: 3, username: 'LineClearer', score: 13980, wins: 65, losses: 22, winRate: 75 },
          { rank: 4, username: 'SpeedRunner', score: 13200, wins: 58, losses: 25, winRate: 70 },
          { rank: 5, username: 'ProGamer', score: 12800, wins: 52, losses: 28, winRate: 65 },
          { rank: 6, username: 'CasualPlayer', score: 11500, wins: 45, losses: 35, winRate: 56 },
          { rank: 7, username: 'RisingStar', score: 10200, wins: 38, losses: 42, winRate: 48 },
          { rank: 8, username: 'Newbie', score: 8900, wins: 25, losses: 55, winRate: 31 },
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  const getWinRateColor = (winRate) => {
    if (winRate >= 80) return 'text-green-400';
    if (winRate >= 60) return 'text-yellow-400';
    if (winRate >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-tetris-t game-text mb-4">Leaderboard</h2>
        <p className="text-gray-400">
          {gameMode === 'single-player' 
            ? 'Top single player scores and achievements' 
            : 'Top players competing in Multiplayer Tetris Battle'
          }
        </p>
      </div>

      {/* Game Mode Tabs */}
      <div className="flex justify-center mb-6">
        <div className="bg-tetris-grid border border-tetris-border rounded-lg p-1 flex">
          {[
            { key: 'multiplayer', label: 'Multiplayer' },
            { key: 'single-player', label: 'Single Player' }
          ].map((mode) => (
            <button
              key={mode.key}
              onClick={() => setGameMode(mode.key)}
              className={`px-6 py-2 rounded text-sm font-medium transition-colors ${
                gameMode === mode.key
                  ? 'bg-tetris-t text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Time Filter */}
      <div className="flex justify-center mb-6">
        <div className="bg-tetris-grid border border-tetris-border rounded-lg p-1 flex">
          {['all', 'monthly', 'weekly'].map((period) => (
            <button
              key={period}
              onClick={() => setTimeFilter(period)}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                timeFilter === period
                  ? 'bg-tetris-t text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-tetris-grid border border-tetris-border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-tetris-i">{leaderboard.length}</div>
          <div className="text-sm text-gray-400">
            {gameMode === 'single-player' ? 'High Scores' : 'Active Players'}
          </div>
        </div>
        {gameMode === 'multiplayer' ? (
          <>
            <div className="bg-tetris-grid border border-tetris-border rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-tetris-s">
                {leaderboard.length > 0 ? Math.round(leaderboard.reduce((sum, p) => sum + p.winRate, 0) / leaderboard.length) : 0}%
              </div>
              <div className="text-sm text-gray-400">Avg Win Rate</div>
            </div>
            <div className="bg-tetris-grid border border-tetris-border rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-tetris-t">
                {leaderboard.length > 0 ? leaderboard.reduce((sum, p) => sum + p.wins, 0) : 0}
              </div>
              <div className="text-sm text-gray-400">Total Wins</div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-tetris-grid border border-tetris-border rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-tetris-s">
                {leaderboard.length > 0 ? Math.round(leaderboard.reduce((sum, p) => sum + p.level, 0) / leaderboard.length) : 0}
              </div>
              <div className="text-sm text-gray-400">Avg Level</div>
            </div>
            <div className="bg-tetris-grid border border-tetris-border rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-tetris-t">
                {leaderboard.length > 0 ? Math.round(leaderboard.reduce((sum, p) => sum + p.lines, 0) / leaderboard.length) : 0}
              </div>
              <div className="text-sm text-gray-400">Avg Lines</div>
            </div>
          </>
        )}
        <div className="bg-tetris-grid border border-tetris-border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-tetris-o">
            {leaderboard.length > 0 ? Math.round(leaderboard.reduce((sum, p) => sum + p.score, 0) / leaderboard.length) : 0}
          </div>
          <div className="text-sm text-gray-400">Avg Score</div>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-tetris-grid border border-tetris-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="text-xl mb-4">Loading leaderboard...</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-tetris-bg border-b border-tetris-border">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Rank</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Player</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Score</th>
                  {gameMode === 'multiplayer' ? (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Wins</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Losses</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Win Rate</th>
                    </>
                  ) : (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Level</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Lines</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-tetris-border">
                {leaderboard.map((entry) => (
                  <tr key={entry.rank} className="hover:bg-tetris-bg transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-lg font-bold">{getRankIcon(entry.rank)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">
                        {gameMode === 'single-player' ? entry.playerName : entry.username}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-tetris-s font-bold">{entry.score.toLocaleString()}</div>
                    </td>
                    {gameMode === 'multiplayer' ? (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-green-400">{entry.wins}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-red-400">{entry.losses}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm font-bold ${getWinRateColor(entry.winRate)}`}>
                            {entry.winRate}%
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-yellow-400">{entry.level}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-blue-400">{entry.lines}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-400">
                            {new Date(entry.date).toLocaleDateString()}
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Call to Action */}
      <div className="mt-8 text-center">
        <div className="bg-tetris-grid border border-tetris-border rounded-lg p-6">
          <h3 className="text-xl font-bold text-tetris-i mb-2">
            {gameMode === 'single-player' ? 'Ready to Beat Your Score?' : 'Ready to Compete?'}
          </h3>
          <p className="text-gray-400 mb-4">
            {gameMode === 'single-player' 
              ? 'Challenge yourself and climb the single player leaderboard!'
              : 'Join the leaderboard and show off your Tetris skills!'
            }
          </p>
          <a
            href={gameMode === 'single-player' ? '/single-player' : '/'}
            className="inline-block bg-tetris-t hover:bg-tetris-s text-white font-bold py-3 px-6 rounded transition-colors"
          >
            {gameMode === 'single-player' ? 'Play Single Player' : 'Play Multiplayer'}
          </a>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
