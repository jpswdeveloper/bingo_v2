'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/admin-api';
import { 
  ArrowLeft,
  DollarSign,
  Users,
  Clock,
  Play,
  Settings
} from 'lucide-react';
import Link from 'next/link';

interface GameSettings {
  ticketPrice: number;
  maxPlayers: number;
  drawIntervalSeconds: number;
}

export default function CreateGame() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [settings, setSettings] = useState<GameSettings>({
    ticketPrice: 50,
    maxPlayers: 100,
    drawIntervalSeconds: 30
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      await adminApi.createGame(settings);
      router.push('/admin/games');
    } catch (error) {
      console.error('Failed to create game:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const presetConfigs = [
    {
      name: 'Quick Game',
      description: 'Fast-paced game for small groups',
      settings: { ticketPrice: 25, maxPlayers: 50, drawIntervalSeconds: 20 }
    },
    {
      name: 'Standard Game',
      description: 'Regular game with balanced settings',
      settings: { ticketPrice: 50, maxPlayers: 100, drawIntervalSeconds: 30 }
    },
    {
      name: 'Premium Game',
      description: 'High-stakes game for large groups',
      settings: { ticketPrice: 100, maxPlayers: 200, drawIntervalSeconds: 45 }
    }
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/games"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create New Game</h1>
          <p className="text-gray-600 mt-1">Configure and start a new bingo game session</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Game Settings Form */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Game Configuration</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Ticket Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <DollarSign className="w-4 h-4 inline mr-2" />
                Ticket Price (ETB)
              </label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={settings.ticketPrice}
                onChange={(e) => setSettings(prev => ({ ...prev, ticketPrice: parseFloat(e.target.value) || 0 }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter ticket price"
                required
              />
              <p className="text-sm text-gray-500 mt-1">Price players pay for each bingo card</p>
            </div>

            {/* Max Players */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Users className="w-4 h-4 inline mr-2" />
                Maximum Players
              </label>
              <input
                type="number"
                min="1"
                max="1000"
                value={settings.maxPlayers}
                onChange={(e) => setSettings(prev => ({ ...prev, maxPlayers: parseInt(e.target.value) || 0 }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter maximum players"
                required
              />
              <p className="text-sm text-gray-500 mt-1">Maximum number of players allowed in this game</p>
            </div>

            {/* Draw Interval */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4 inline mr-2" />
                Draw Interval (seconds)
              </label>
              <input
                type="number"
                min="5"
                max="300"
                value={settings.drawIntervalSeconds}
                onChange={(e) => setSettings(prev => ({ ...prev, drawIntervalSeconds: parseInt(e.target.value) || 0 }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter draw interval"
                required
              />
              <p className="text-sm text-gray-500 mt-1">Time between automatic number draws during the game</p>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isCreating}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
              >
                {isCreating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Creating Game...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Create Game
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Quick Presets & Preview */}
        <div className="space-y-6">
          {/* Quick Presets */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Presets</h2>
            
            <div className="space-y-3">
              {presetConfigs.map((preset, index) => (
                <div
                  key={index}
                  onClick={() => setSettings(preset.settings)}
                  className="p-4 border border-gray-200 rounded-lg cursor-pointer hover:border-purple-300 hover:bg-purple-50 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{preset.name}</h3>
                      <p className="text-sm text-gray-500">{preset.description}</p>
                    </div>
                    <Settings className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                    <span>{preset.settings.ticketPrice} ETB</span>
                    <span>•</span>
                    <span>{preset.settings.maxPlayers} players</span>
                    <span>•</span>
                    <span>{preset.settings.drawIntervalSeconds}s draws</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Game Preview */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Game Preview</h2>
            
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Revenue Calculation</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ticket Price:</span>
                    <span className="font-medium">{settings.ticketPrice.toFixed(2)} ETB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Max Players:</span>
                    <span className="font-medium">{settings.maxPlayers}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-2">
                    <span className="text-gray-900 font-medium">Max Revenue:</span>
                    <span className="font-bold text-purple-600">
                      {(settings.ticketPrice * settings.maxPlayers).toFixed(2)} ETB
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Game Timing</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Draw Interval:</span>
                    <span className="font-medium">{settings.drawIntervalSeconds}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Estimated Duration:</span>
                    <span className="font-medium">
                      ~{Math.ceil((75 * settings.drawIntervalSeconds) / 60)} minutes
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Based on average 75 numbers drawn per game
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}