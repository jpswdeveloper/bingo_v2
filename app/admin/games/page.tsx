'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/admin-api';
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  Users, 
  Trophy,
  Clock,
  Plus,
  Eye,
  Settings,
  GamepadIcon
} from 'lucide-react';
import Link from 'next/link';

interface Game {
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
}

export default function GamesManagement() {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed'>('active');

  useEffect(() => {
    loadGames();
  }, [activeTab]);

  const loadGames = async () => {
    setIsLoading(true);
    try {
      const phase = activeTab === 'active' ? 'CARD_SELECTION,COUNTDOWN,DRAWING' : 
                   activeTab === 'completed' ? 'GAME_OVER' : undefined;
      
      // Mock data for now
      const mockGames: Game[] = [
        {
          id: '1',
          code: 'BG001',
          phase: 'DRAWING',
          ticketPrice: 50,
          maxPlayers: 100,
          soldCount: 89,
          drawnNumbers: [12, 45, 67, 23, 8],
          nextDrawAt: new Date(Date.now() + 30000).toISOString(),
          createdAt: '2024-01-15T10:30:00Z'
        },
        {
          id: '2',
          code: 'BG002',
          phase: 'COUNTDOWN',
          ticketPrice: 25,
          maxPlayers: 50,
          soldCount: 34,
          drawnNumbers: [],
          nextDrawAt: new Date(Date.now() + 120000).toISOString(),
          createdAt: '2024-01-15T11:00:00Z'
        },
        {
          id: '3',
          code: 'BG003',
          phase: 'GAME_OVER',
          ticketPrice: 100,
          maxPlayers: 200,
          soldCount: 156,
          drawnNumbers: [12, 45, 67, 23, 8, 91, 34, 78, 55, 16],
          createdAt: '2024-01-15T09:15:00Z',
          winner: {
            userId: 'user123',
            username: 'john_doe',
            cardNumber: 12345
          }
        }
      ];

      const filteredGames = mockGames.filter(game => {
        if (activeTab === 'active') return ['CARD_SELECTION', 'COUNTDOWN', 'DRAWING'].includes(game.phase);
        if (activeTab === 'completed') return game.phase === 'GAME_OVER';
        return true;
      });

      setGames(filteredGames);
    } catch (error) {
      console.error('Failed to load games:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhaseChange = async (gameId: string, newPhase: string) => {
    try {
      await adminApi.changeGamePhase(gameId, newPhase);
      loadGames(); // Reload to get updated data
    } catch (error) {
      console.error('Failed to change game phase:', error);
    }
  };

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'CARD_SELECTION': return 'bg-blue-100 text-blue-800';
      case 'COUNTDOWN': return 'bg-yellow-100 text-yellow-800';
      case 'DRAWING': return 'bg-green-100 text-green-800';
      case 'GAME_OVER': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case 'CARD_SELECTION': return Users;
      case 'COUNTDOWN': return Clock;
      case 'DRAWING': return Play;
      case 'GAME_OVER': return Trophy;
      default: return Square;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Game Management</h1>
          <p className="text-gray-600 mt-1">Monitor and control active bingo games</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={loadGames}
            className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Refresh
          </button>
          <Link 
            href="/admin/games/create"
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Game
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'active', name: 'Active Games', count: games.filter(g => ['CARD_SELECTION', 'COUNTDOWN', 'DRAWING'].includes(g.phase)).length },
            { id: 'completed', name: 'Completed', count: games.filter(g => g.phase === 'GAME_OVER').length },
            { id: 'all', name: 'All Games', count: games.length }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.name}
              <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Games List */}
      <div className="space-y-4">
        {games.map((game) => {
          const PhaseIcon = getPhaseIcon(game.phase);
          return (
            <div key={game.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                {/* Game Info */}
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <PhaseIcon className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900">{game.code}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPhaseColor(game.phase)}`}>
                        {game.phase.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                      <span>{game.ticketPrice} ETB per ticket</span>
                      <span>•</span>
                      <span>{game.soldCount}/{game.maxPlayers} players</span>
                      <span>•</span>
                      <span>Created {new Date(game.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/games/${game.id}`}
                    className="inline-flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-2 rounded-lg font-medium transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </Link>
                  
                  {game.phase === 'CARD_SELECTION' && (
                    <button
                      onClick={() => handlePhaseChange(game.id, 'COUNTDOWN')}
                      className="inline-flex items-center gap-2 bg-green-50 hover:bg-green-100 text-green-600 px-3 py-2 rounded-lg font-medium transition-colors"
                    >
                      <Play className="w-4 h-4" />
                      Start Countdown
                    </button>
                  )}
                  
                  {game.phase === 'COUNTDOWN' && (
                    <button
                      onClick={() => handlePhaseChange(game.id, 'DRAWING')}
                      className="inline-flex items-center gap-2 bg-purple-50 hover:bg-purple-100 text-purple-600 px-3 py-2 rounded-lg font-medium transition-colors"
                    >
                      <Play className="w-4 h-4" />
                      Start Drawing
                    </button>
                  )}
                  
                  {game.phase === 'DRAWING' && (
                    <button
                      onClick={() => handlePhaseChange(game.id, 'GAME_OVER')}
                      className="inline-flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded-lg font-medium transition-colors"
                    >
                      <Square className="w-4 h-4" />
                      End Game
                    </button>
                  )}
                </div>
              </div>

              {/* Game Details */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Drawn Numbers */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Drawn Numbers ({game.drawnNumbers.length})
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {game.drawnNumbers.slice(0, 10).map((number, idx) => (
                        <span key={idx} className="w-8 h-8 bg-purple-100 text-purple-800 rounded-full flex items-center justify-center text-xs font-medium">
                          {number}
                        </span>
                      ))}
                      {game.drawnNumbers.length > 10 && (
                        <span className="text-sm text-gray-500 ml-2">+{game.drawnNumbers.length - 10} more</span>
                      )}
                      {game.drawnNumbers.length === 0 && (
                        <span className="text-sm text-gray-400 italic">No numbers drawn yet</span>
                      )}
                    </div>
                  </div>

                  {/* Next Draw */}
                  {game.nextDrawAt && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Next Draw</p>
                      <p className="text-sm text-gray-600">
                        {new Date(game.nextDrawAt).toLocaleTimeString()}
                      </p>
                    </div>
                  )}

                  {/* Winner */}
                  {game.winner && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Winner</p>
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm text-gray-600">
                          {game.winner.username} (Card #{game.winner.cardNumber})
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {games.length === 0 && (
          <div className="text-center py-12">
            <GamepadIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No games found</h3>
            <p className="text-gray-500 mb-6">
              {activeTab === 'active' ? 'No active games at the moment.' : 'No games in this category.'}
            </p>
            <Link
              href="/admin/games/create"
              className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create New Game
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}