'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/admin-api';
import { 
  Users,
  Search,
  Filter,
  Ban,
  Shield,
  DollarSign,
  Plus,
  Minus,
  RotateCcw,
  Edit,
  Eye,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface User {
  telegramId: string;
  firstName: string;
  lastName?: string;
  username?: string;
  balance: number;
  isBlocked: boolean;
  joinedAt: string;
  lastActive: string;
  totalSpent: number;
  gamesPlayed: number;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'blocked'>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [balanceOperation, setBalanceOperation] = useState<'add' | 'subtract' | 'set'>('add');
  const [balanceAmount, setBalanceAmount] = useState('');

  useEffect(() => {
    loadUsers();
  }, [searchTerm, filterStatus]);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      // Mock data for now
      const mockUsers: User[] = [
        {
          telegramId: '348453405',
          firstName: 'John',
          lastName: 'Doe',
          username: 'johndoe',
          balance: 150.50,
          isBlocked: false,
          joinedAt: '2024-01-10T08:30:00Z',
          lastActive: '2024-01-15T14:22:00Z',
          totalSpent: 450.00,
          gamesPlayed: 12
        },
        {
          telegramId: '987654321',
          firstName: 'Jane',
          lastName: 'Smith',
          username: 'janesmith',
          balance: 75.25,
          isBlocked: false,
          joinedAt: '2024-01-12T10:15:00Z',
          lastActive: '2024-01-15T16:45:00Z',
          totalSpent: 200.00,
          gamesPlayed: 8
        },
        {
          telegramId: '555666777',
          firstName: 'Bob',
          username: 'blocked_user',
          balance: 0,
          isBlocked: true,
          joinedAt: '2024-01-05T12:00:00Z',
          lastActive: '2024-01-10T09:30:00Z',
          totalSpent: 100.00,
          gamesPlayed: 3
        }
      ];

      let filteredUsers = mockUsers;

      // Apply search filter
      if (searchTerm) {
        filteredUsers = filteredUsers.filter(user =>
          user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.telegramId.includes(searchTerm)
        );
      }

      // Apply status filter
      if (filterStatus !== 'all') {
        filteredUsers = filteredUsers.filter(user => {
          if (filterStatus === 'blocked') return user.isBlocked;
          if (filterStatus === 'active') return !user.isBlocked;
          return true;
        });
      }

      setUsers(filteredUsers);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleBlock = async (user: User) => {
    try {
      await adminApi.toggleUserBlock(user.telegramId, !user.isBlocked);
      loadUsers(); // Reload users list
    } catch (error) {
      console.error('Failed to toggle user block:', error);
    }
  };

  const handleUpdateBalance = async () => {
    if (!selectedUser || !balanceAmount) return;

    try {
      await adminApi.updateUserBalance(selectedUser.telegramId, parseFloat(balanceAmount), balanceOperation);
      setSelectedUser(null);
      setBalanceAmount('');
      loadUsers(); // Reload users list
    } catch (error) {
      console.error('Failed to update balance:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
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
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">Manage players, balances, and account status</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={loadUsers}
            className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search users by name, username, or Telegram ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Users</option>
              <option value="active">Active</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Balance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Activity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stats
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.telegramId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                          <Users className="w-5 h-5 text-purple-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.firstName} {user.lastName || ''}
                        </div>
                        <div className="text-sm text-gray-500">
                          @{user.username || 'N/A'} • ID: {user.telegramId}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {user.balance.toFixed(2)} ETB
                    </div>
                    <div className="text-sm text-gray-500">
                      Spent: {user.totalSpent.toFixed(2)} ETB
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.isBlocked 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {user.isBlocked ? (
                        <>
                          <Ban className="w-3 h-3 mr-1" />
                          Blocked
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Active
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>Joined: {new Date(user.joinedAt).toLocaleDateString()}</div>
                    <div>Last: {new Date(user.lastActive).toLocaleDateString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>{user.gamesPlayed} games played</div>
                    <div>Avg: {user.gamesPlayed > 0 ? (user.totalSpent / user.gamesPlayed).toFixed(2) : '0'} ETB/game</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="text-purple-600 hover:text-purple-900 p-1 rounded transition-colors"
                        title="Update Balance"
                      >
                        <DollarSign className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleBlock(user)}
                        className={`p-1 rounded transition-colors ${
                          user.isBlocked
                            ? 'text-green-600 hover:text-green-900'
                            : 'text-red-600 hover:text-red-900'
                        }`}
                        title={user.isBlocked ? 'Unblock User' : 'Block User'}
                      >
                        {user.isBlocked ? <Shield className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
            <p className="text-gray-500">
              {searchTerm || filterStatus !== 'all' 
                ? 'Try adjusting your search or filters.' 
                : 'No users have joined the platform yet.'}
            </p>
          </div>
        )}
      </div>

      {/* Balance Update Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Update Balance - {selectedUser.firstName} {selectedUser.lastName}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Balance
                </label>
                <div className="text-2xl font-bold text-gray-900">
                  {selectedUser.balance.toFixed(2)} ETB
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Operation
                </label>
                <select
                  value={balanceOperation}
                  onChange={(e) => setBalanceOperation(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="add">Add to balance</option>
                  <option value="subtract">Subtract from balance</option>
                  <option value="set">Set balance to</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (ETB)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={balanceAmount}
                  onChange={(e) => setBalanceAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter amount"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateBalance}
                  disabled={!balanceAmount}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                >
                  Update Balance
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}