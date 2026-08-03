'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/admin-api';
import { 
  Users, 
  GamepadIcon, 
  DollarSign, 
  Activity, 
  TrendingUp,
  Eye,
  Play,
  Pause,
  RotateCcw,
  BarChart3
} from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  totalUsers: number;
  activeGames: number;
  totalRevenue: number;
  todayRevenue: number;
  recentGames: Array<{
    id: string;
    code: string;
    phase: string;
    soldCount: number;
    createdAt: string;
  }>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      const [overview, games] = await Promise.all([
        adminApi.getAnalyticsOverview(),
        adminApi.getGames({ limit: 5 })
      ]);
      
      // Mock data for now since backend endpoints aren't fully implemented
      setStats({
        totalUsers: 1247,
        activeGames: 2,
        totalRevenue: 45680.50,
        todayRevenue: 1240.00,
        recentGames: [
          { id: '1', code: 'BG001', phase: 'DRAWING', soldCount: 89, createdAt: '2024-01-15T10:30:00Z' },
          { id: '2', code: 'BG002', phase: 'COUNTDOWN', soldCount: 45, createdAt: '2024-01-15T11:00:00Z' },
          { id: '3', code: 'BG003', phase: 'GAME_OVER', soldCount: 120, createdAt: '2024-01-15T09:15:00Z' },
        ]
      });
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats?.totalUsers.toLocaleString() ?? '0',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      change: '+12%',
      changeType: 'increase'
    },
    {
      title: 'Active Games',
      value: stats?.activeGames.toString() ?? '0',
      icon: GamepadIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      change: '+2',
      changeType: 'increase'
    },
    {
      title: 'Total Revenue',
      value: `${stats?.totalRevenue.toFixed(2) ?? '0'} ETB`,
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      change: '+8.2%',
      changeType: 'increase'
    },
    {
      title: 'Today Revenue',
      value: `${stats?.todayRevenue.toFixed(2) ?? '0'} ETB`,
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      change: '+24%',
      changeType: 'increase'
    }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's what's happening with Melkam Bingo.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={loadDashboardStats}
            className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Refresh
          </button>
          <Link 
            href="/admin/games/create"
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Play className="w-4 h-4" />
            Create Game
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <span className={`text-sm font-medium ${
                  stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.change}
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                  {stat.title}
                </h3>
                <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Games & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Games */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Recent Games</h2>
            <Link 
              href="/admin/games"
              className="text-purple-600 hover:text-purple-700 text-sm font-medium"
            >
              View All
            </Link>
          </div>
          
          <div className="space-y-4">
            {stats?.recentGames?.map((game) => (
              <div key={game.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${
                    game.phase === 'DRAWING' ? 'bg-green-400' :
                    game.phase === 'COUNTDOWN' ? 'bg-yellow-400' :
                    'bg-gray-400'
                  }`}></div>
                  <div>
                    <p className="font-medium text-gray-900">{game.code}</p>
                    <p className="text-sm text-gray-500 capitalize">{game.phase.replace('_', ' ').toLowerCase()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{game.soldCount} tickets</p>
                  <p className="text-xs text-gray-500">
                    {new Date(game.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
            
            {(!stats?.recentGames || stats.recentGames.length === 0) && (
              <p className="text-gray-500 text-center py-8">No recent games found</p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h2>
          
          <div className="space-y-3">
            <Link 
              href="/admin/games/create"
              className="flex items-center gap-3 p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors group"
            >
              <div className="w-10 h-10 bg-purple-100 group-hover:bg-purple-200 rounded-lg flex items-center justify-center">
                <Play className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Create New Game</p>
                <p className="text-sm text-gray-500">Start a new bingo game session</p>
              </div>
            </Link>

            <Link 
              href="/admin/games"
              className="flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group"
            >
              <div className="w-10 h-10 bg-blue-100 group-hover:bg-blue-200 rounded-lg flex items-center justify-center">
                <Eye className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Monitor Active Games</p>
                <p className="text-sm text-gray-500">View and control live games</p>
              </div>
            </Link>

            <Link 
              href="/admin/users"
              className="flex items-center gap-3 p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors group"
            >
              <div className="w-10 h-10 bg-green-100 group-hover:bg-green-200 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Manage Players</p>
                <p className="text-sm text-gray-500">View users and manage accounts</p>
              </div>
            </Link>

            <Link 
              href="/admin/analytics"
              className="flex items-center gap-3 p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors group"
            >
              <div className="w-10 h-10 bg-orange-100 group-hover:bg-orange-200 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">View Analytics</p>
                <p className="text-sm text-gray-500">Check performance metrics</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}