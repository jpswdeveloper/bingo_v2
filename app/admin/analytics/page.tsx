'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/admin-api';
import { 
  BarChart3,
  TrendingUp,
  Users,
  GamepadIcon,
  DollarSign,
  Calendar,
  RefreshCw,
  Download,
  Filter
} from 'lucide-react';

interface AnalyticsData {
  overview: {
    totalRevenue: number;
    totalUsers: number;
    totalGames: number;
    averageTicketPrice: number;
    revenueGrowth: number;
    userGrowth: number;
  };
  revenueChart: Array<{
    date: string;
    revenue: number;
    games: number;
  }>;
  gameStats: Array<{
    gameCode: string;
    revenue: number;
    playersCount: number;
    ticketsCount: number;
    duration: number;
    createdAt: string;
  }>;
  userActivity: Array<{
    date: string;
    newUsers: number;
    activeUsers: number;
    totalSpent: number;
  }>;
}

export default function Analytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('week');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadAnalytics();
  }, [selectedPeriod, dateRange]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      // Mock analytics data for now
      const mockAnalytics: AnalyticsData = {
        overview: {
          totalRevenue: 45680.50,
          totalUsers: 1247,
          totalGames: 156,
          averageTicketPrice: 58.25,
          revenueGrowth: 12.5,
          userGrowth: 8.3
        },
        revenueChart: [
          { date: '2024-01-10', revenue: 1450.00, games: 3 },
          { date: '2024-01-11', revenue: 2100.50, games: 4 },
          { date: '2024-01-12', revenue: 1780.25, games: 3 },
          { date: '2024-01-13', revenue: 2300.75, games: 5 },
          { date: '2024-01-14', revenue: 1950.00, games: 4 },
          { date: '2024-01-15', revenue: 2850.30, games: 6 }
        ],
        gameStats: [
          {
            gameCode: 'BG001',
            revenue: 4450.00,
            playersCount: 89,
            ticketsCount: 89,
            duration: 45,
            createdAt: '2024-01-15T10:30:00Z'
          },
          {
            gameCode: 'BG002',
            revenue: 1125.00,
            playersCount: 45,
            ticketsCount: 45,
            duration: 38,
            createdAt: '2024-01-15T11:00:00Z'
          }
        ],
        userActivity: [
          { date: '2024-01-10', newUsers: 25, activeUsers: 89, totalSpent: 1450.00 },
          { date: '2024-01-11', newUsers: 32, activeUsers: 124, totalSpent: 2100.50 },
          { date: '2024-01-12', newUsers: 18, activeUsers: 95, totalSpent: 1780.25 },
          { date: '2024-01-13', newUsers: 28, activeUsers: 134, totalSpent: 2300.75 },
          { date: '2024-01-14', newUsers: 22, activeUsers: 108, totalSpent: 1950.00 },
          { date: '2024-01-15', newUsers: 35, activeUsers: 167, totalSpent: 2850.30 }
        ]
      };

      setAnalytics(mockAnalytics);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Failed to Load Analytics</h1>
        <button 
          onClick={loadAnalytics}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-1">Performance metrics and insights for Melkam Bingo</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={loadAnalytics}
            className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Period</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as any)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
            </select>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.overview.totalRevenue.toFixed(2)} ETB</p>
              <p className={`text-sm ${analytics.overview.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {analytics.overview.revenueGrowth >= 0 ? '+' : ''}{analytics.overview.revenueGrowth}% from last period
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.overview.totalUsers.toLocaleString()}</p>
              <p className={`text-sm ${analytics.overview.userGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {analytics.overview.userGrowth >= 0 ? '+' : ''}{analytics.overview.userGrowth}% from last period
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Games</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.overview.totalGames}</p>
              <p className="text-sm text-gray-500">
                Avg revenue: {(analytics.overview.totalRevenue / analytics.overview.totalGames).toFixed(2)} ETB
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <GamepadIcon className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Ticket Price</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.overview.averageTicketPrice.toFixed(2)} ETB</p>
              <p className="text-sm text-gray-500">Per ticket across all games</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Revenue Trend</h2>
          <BarChart3 className="w-5 h-5 text-gray-400" />
        </div>
        
        <div className="space-y-4">
          {analytics.revenueChart.map((data, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-4">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">
                    {new Date(data.date).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-500">{data.games} games played</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900">{data.revenue.toFixed(2)} ETB</p>
                <p className="text-sm text-gray-500">
                  {(data.revenue / data.games).toFixed(2)} ETB per game
                </p>
              </div>
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full" 
                  style={{ 
                    width: `${(data.revenue / Math.max(...analytics.revenueChart.map(d => d.revenue))) * 100}%` 
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Game Performance & User Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performing Games */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Games</h2>
          
          <div className="space-y-4">
            {analytics.gameStats.map((game, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <GamepadIcon className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{game.gameCode}</p>
                    <p className="text-sm text-gray-500">
                      {game.playersCount} players • {game.duration}min duration
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">{game.revenue.toFixed(2)} ETB</p>
                  <p className="text-sm text-gray-500">{game.ticketsCount} tickets</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* User Activity */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">User Activity</h2>
          
          <div className="space-y-4">
            {analytics.userActivity.slice(-5).map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {new Date(activity.date).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-500">
                      {activity.newUsers} new • {activity.activeUsers} active
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">{activity.totalSpent.toFixed(2)} ETB</p>
                  <p className="text-sm text-gray-500">
                    {activity.activeUsers > 0 ? (activity.totalSpent / activity.activeUsers).toFixed(2) : '0'} ETB per user
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Key Insights */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Key Insights</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-green-800">Revenue Growth</p>
            <p className="text-2xl font-bold text-green-900">+{analytics.overview.revenueGrowth}%</p>
            <p className="text-xs text-green-700">Compared to last period</p>
          </div>
          
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-blue-800">User Retention</p>
            <p className="text-2xl font-bold text-blue-900">
              {((analytics.userActivity.reduce((sum, d) => sum + d.activeUsers, 0) / analytics.userActivity.length) / analytics.overview.totalUsers * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-blue-700">Average daily active rate</p>
          </div>
          
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <DollarSign className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-purple-800">Average Revenue per User</p>
            <p className="text-2xl font-bold text-purple-900">
              {(analytics.overview.totalRevenue / analytics.overview.totalUsers).toFixed(2)}
            </p>
            <p className="text-xs text-purple-700">ETB per registered user</p>
          </div>
        </div>
      </div>
    </div>
  );
}