'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { adminApi } from '@/lib/admin-api';
import { 
  ArrowLeft,
  Play,
  Pause,
  Square,
  RotateCcw,
  Users,
  Trophy,
  Clock,
  DollarSign,
  Zap,
  Target,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';

interface GameDetails {
  id: string;
  code: string;
  phase: 'CARD_SELECTION' | 'COUNTDOWN' | 'DRAWING' | 'GAME_OVER';
  ticketPrice: number;
  maxPlayers: number;
  soldCount: number;
  drawnNumbers: number[];
  nextDrawAt?: string;
  createdAt: string;
  winner?: {
    userId: string;
    username: string;
    cardNumber: number;
  };
  players: Array<{
    userId: string;
    username: string;
    cardNumbers: number[];
    joinedAt: string;
  }>;
}

export default function GameManagement() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.id as string;
  
  const [game, setGame] = useState<GameDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDrawing, setIsDrawing] = useState(false);
  const [manualNumber, setManualNumber] = useState('');
  const [winningCard, setWinningCard] = useState('');

  useEffect(() => {
    loadGameDetails();
  }, [gameId]);

  const loadGameDetails = async () => {
    try {
      // Mock data for now
      const mockGame: GameDetails = {
        id: gameId,
        code: 'BG001',
        phase: 'DRAWING',
        ticketPrice: 50,
        maxPlayers: 100,
        soldCount: 89,
        drawnNumbers: [12, 45, 67, 23, 8, 91, 34, 78, 55, 16, 29, 88],
        nextDrawAt: new Date(Date.now() + 30000).toISOString(),
        createdAt: '2024-01-15T10:30:00Z',
        players: [
          {
            userId: 'user1',
            username: 'john_doe',
            cardNumbers: [12345, 12346],
            joinedAt: '2024-01-15T10:32:00Z'
          },
          {
            userId: 'user2',
            username: 'jane_smith',
            cardNumbers: [12347],
            joinedAt: '2024-01-15T10:33:00Z'
          }
        ]
      };
      
      setGame(mockGame);
    } catch (error) {
      console.error('Failed to load game details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualDraw = async () => {
    if (!game || isDrawing) return;

    setIsDrawing(true);
    try {
      const number = manualNumber ? parseInt(manualNumber) : undefined;
      await adminApi.manualDraw(game.id, number);
      setManualNumber('');
      loadGameDetails(); // Reload to get updated numbers
    } catch (error) {
      console.error('Failed to draw number:', error);
    } finally {
      setIsDrawing(false);
    }
  };

  const handleDeclareWinner = async () => {
    if (!game || !winningCard) return;

    try {
      await adminApi.declareWinner(game.id, parseInt(winningCard));
      setWinningCard('');
      loadGameDetails(); // Reload to get updated game state
    } catch (error) {
      console.error('Failed to declare winner:', error);
    }
  };

  const handlePhaseChange = async (newPhase: string) => {
    if (!game) return;

    try {
      await adminApi.changeGamePhase(game.id, newPhase);
      loadGameDetails(); // Reload to get updated phase
    } catch (error) {
      console.error('Failed to change phase:', error);
    }
  };

  const availableNumbers = Array.from({ length: 75 }, (_, i) => i + 1)
    .filter(n => !game?.drawnNumbers.includes(n));

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="h-96 bg-gray-200 rounded-lg"></div>
            <div className="h-96 bg-gray-200 rounded-lg"></div>
            <div className="h-96 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Game Not Found</h1>
        <Link href="/admin/games" className="text-purple-600 hover:text-purple-700">
          ← Back to Games
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/games"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{game.code}</h1>
            <p className="text-gray-600 mt-1">
              {game.phase.replace('_', ' ')} • {game.soldCount}/{game.maxPlayers} players
            </p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={loadGameDetails}
            className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Manual Draw Controls */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            <Zap className="w-5 h-5 inline mr-2" />
            Manual Draw Controls
          </h2>

          {game.phase === 'DRAWING' ? (
            <div className="space-y-4">
              {/* Random Draw */}
              <div>
                <button
                  onClick={handleManualDraw}
                  disabled={isDrawing || availableNumbers.length === 0}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isDrawing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Drawing...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Draw Random Number
                    </>
                  )}
                </button>
              </div>

              {/* Manual Number Input */}
              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Draw Specific Number
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    max="75"
                    value={manualNumber}
                    onChange={(e) => setManualNumber(e.target.value)}
                    placeholder="1-75"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleManualDraw}
                    disabled={isDrawing || !manualNumber || game.drawnNumbers.includes(parseInt(manualNumber))}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Draw
                  </button>
                </div>
                {manualNumber && game.drawnNumbers.includes(parseInt(manualNumber)) && (
                  <p className="text-red-600 text-sm mt-1">Number already drawn</p>
                )}
              </div>

              {/* Declare Winner */}
              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Trophy className="w-4 h-4 inline mr-1" />
                  Declare Winner
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={winningCard}
                    onChange={(e) => setWinningCard(e.target.value)}
                    placeholder="Card number"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleDeclareWinner}
                    disabled={!winningCard}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Declare
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Manual draw controls are only available during the drawing phase.</p>
              
              {game.phase === 'CARD_SELECTION' && (
                <button
                  onClick={() => handlePhaseChange('COUNTDOWN')}
                  className="mt-4 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Start Countdown
                </button>
              )}
              
              {game.phase === 'COUNTDOWN' && (
                <button
                  onClick={() => handlePhaseChange('DRAWING')}
                  className="mt-4 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Start Drawing
                </button>
              )}
            </div>
          )}
        </div>

        {/* Game Status & Stats */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Game Status</h2>

          <div className="space-y-4">
            {/* Phase Status */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Current Phase</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  game.phase === 'CARD_SELECTION' ? 'bg-blue-100 text-blue-800' :
                  game.phase === 'COUNTDOWN' ? 'bg-yellow-100 text-yellow-800' :
                  game.phase === 'DRAWING' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {game.phase.replace('_', ' ')}
                </span>
              </div>
            </div>

            {/* Player Stats */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Players</span>
                <span className="text-lg font-bold">{game.soldCount}/{game.maxPlayers}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full" 
                  style={{ width: `${(game.soldCount / game.maxPlayers) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Revenue */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Revenue</span>
                <span className="text-lg font-bold text-green-600">
                  {(game.soldCount * game.ticketPrice).toFixed(2)} ETB
                </span>
              </div>
            </div>

            {/* Numbers Drawn */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Numbers Drawn</span>
                <span className="text-lg font-bold">{game.drawnNumbers.length}/75</span>
              </div>
            </div>
          </div>
        </div>

        {/* Drawn Numbers */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Drawn Numbers ({game.drawnNumbers.length})
          </h2>

          <div className="space-y-4">
            {/* Latest Numbers */}
            {game.drawnNumbers.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Latest Draws</p>
                <div className="grid grid-cols-5 gap-2">
                  {game.drawnNumbers.slice(-10).map((number, idx) => (
                    <div key={idx} className="w-12 h-12 bg-purple-100 text-purple-800 rounded-lg flex items-center justify-center font-bold">
                      {number}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All Numbers */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">All Drawn Numbers</p>
              <div className="grid grid-cols-10 gap-1 text-xs">
                {Array.from({ length: 75 }, (_, i) => i + 1).map((number) => (
                  <div
                    key={number}
                    className={`w-6 h-6 rounded flex items-center justify-center font-medium ${
                      game.drawnNumbers.includes(number)
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {number}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Players List */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          <Users className="w-5 h-5 inline mr-2" />
          Active Players ({game.players.length})
        </h2>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Player
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cards
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Paid
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {game.players.map((player) => (
                <tr key={player.userId}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{player.username}</div>
                    <div className="text-sm text-gray-500">ID: {player.userId}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {player.cardNumbers.map((cardNum) => (
                        <span key={cardNum} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                          #{cardNum}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(player.joinedAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {(player.cardNumbers.length * game.ticketPrice).toFixed(2)} ETB
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {game.players.length === 0 && (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No players have joined this game yet</p>
          </div>
        )}
      </div>
    </div>
  );
}