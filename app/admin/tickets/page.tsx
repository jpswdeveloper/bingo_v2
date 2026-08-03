'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/admin-api';
import { 
  TicketIcon,
  Search,
  Filter,
  RefreshCw,
  Trash2,
  AlertTriangle,
  CheckCircle,
  GamepadIcon,
  User,
  Calendar,
  DollarSign
} from 'lucide-react';

interface Ticket {
  id: string;
  cardNumber: number;
  gameId: string;
  gameCode: string;
  userId: string;
  username: string;
  ticketPrice: number;
  purchasedAt: string;
  gamePhase: string;
  isRefunded: boolean;
}

export default function TicketManagement() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGame, setFilterGame] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [refundingTicket, setRefundingTicket] = useState<string | null>(null);

  useEffect(() => {
    loadTickets();
  }, [searchTerm, filterGame, filterUser]);

  const loadTickets = async () => {
    setIsLoading(true);
    try {
      // Mock data for now
      const mockTickets: Ticket[] = [
        {
          id: 'ticket1',
          cardNumber: 12345,
          gameId: 'game1',
          gameCode: 'BG001',
          userId: '348453405',
          username: 'johndoe',
          ticketPrice: 50.00,
          purchasedAt: '2024-01-15T10:32:00Z',
          gamePhase: 'DRAWING',
          isRefunded: false
        },
        {
          id: 'ticket2',
          cardNumber: 12346,
          gameId: 'game1',
          gameCode: 'BG001',
          userId: '348453405',
          username: 'johndoe',
          ticketPrice: 50.00,
          purchasedAt: '2024-01-15T10:32:30Z',
          gamePhase: 'DRAWING',
          isRefunded: false
        },
        {
          id: 'ticket3',
          cardNumber: 12347,
          gameId: 'game2',
          gameCode: 'BG002',
          userId: '987654321',
          username: 'janesmith',
          ticketPrice: 25.00,
          purchasedAt: '2024-01-15T11:05:00Z',
          gamePhase: 'COUNTDOWN',
          isRefunded: false
        },
        {
          id: 'ticket4',
          cardNumber: 11111,
          gameId: 'game3',
          gameCode: 'BG003',
          userId: '555666777',
          username: 'refunded_user',
          ticketPrice: 100.00,
          purchasedAt: '2024-01-14T15:20:00Z',
          gamePhase: 'GAME_OVER',
          isRefunded: true
        }
      ];

      let filteredTickets = mockTickets;

      // Apply search filter
      if (searchTerm) {
        filteredTickets = filteredTickets.filter(ticket =>
          ticket.cardNumber.toString().includes(searchTerm) ||
          ticket.gameCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
          ticket.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          ticket.userId.includes(searchTerm)
        );
      }

      // Apply game filter
      if (filterGame) {
        filteredTickets = filteredTickets.filter(ticket =>
          ticket.gameCode === filterGame
        );
      }

      // Apply user filter
      if (filterUser) {
        filteredTickets = filteredTickets.filter(ticket =>
          ticket.username === filterUser
        );
      }

      setTickets(filteredTickets);
    } catch (error) {
      console.error('Failed to load tickets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefundTicket = async (ticket: Ticket) => {
    if (!confirm(`Are you sure you want to refund ticket #${ticket.cardNumber}? This will return ${ticket.ticketPrice} ETB to ${ticket.username}'s balance.`)) {
      return;
    }

    setRefundingTicket(ticket.id);
    try {
      await adminApi.refundTicket(ticket.id);
      loadTickets(); // Reload tickets list
    } catch (error) {
      console.error('Failed to refund ticket:', error);
    } finally {
      setRefundingTicket(null);
    }
  };

  const uniqueGames = [...new Set(tickets.map(t => t.gameCode))];
  const uniqueUsers = [...new Set(tickets.map(t => t.username))];

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
          <h1 className="text-3xl font-bold text-gray-900">Ticket Management</h1>
          <p className="text-gray-600 mt-1">View and manage all bingo tickets and refunds</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={loadTickets}
            className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by card number, game code, or user..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Game Filter */}
          <div>
            <select
              value={filterGame}
              onChange={(e) => setFilterGame(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">All Games</option>
              {uniqueGames.map(game => (
                <option key={game} value={game}>{game}</option>
              ))}
            </select>
          </div>

          {/* User Filter */}
          <div>
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">All Users</option>
              {uniqueUsers.map(user => (
                <option key={user} value={user}>{user}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Tickets</p>
              <p className="text-2xl font-bold text-gray-900">{tickets.length}</p>
            </div>
            <TicketIcon className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Tickets</p>
              <p className="text-2xl font-bold text-gray-900">
                {tickets.filter(t => !t.isRefunded).length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Refunded</p>
              <p className="text-2xl font-bold text-gray-900">
                {tickets.filter(t => t.isRefunded).length}
              </p>
            </div>
            <Trash2 className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                {tickets.filter(t => !t.isRefunded).reduce((sum, t) => sum + t.ticketPrice, 0).toFixed(2)} ETB
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Tickets List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ticket
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Game
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Player
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Purchased
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                          <TicketIcon className="w-5 h-5 text-purple-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          Card #{ticket.cardNumber}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {ticket.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <GamepadIcon className="w-4 h-4 text-gray-400 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{ticket.gameCode}</div>
                        <div className="text-sm text-gray-500 capitalize">
                          {ticket.gamePhase.replace('_', ' ').toLowerCase()}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <User className="w-4 h-4 text-gray-400 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{ticket.username}</div>
                        <div className="text-sm text-gray-500">ID: {ticket.userId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {ticket.ticketPrice.toFixed(2)} ETB
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      ticket.isRefunded 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {ticket.isRefunded ? (
                        <>
                          <Trash2 className="w-3 h-3 mr-1" />
                          Refunded
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Active
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="w-4 h-4 mr-2" />
                      {new Date(ticket.purchasedAt).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {!ticket.isRefunded && ticket.gamePhase !== 'GAME_OVER' && (
                      <button
                        onClick={() => handleRefundTicket(ticket)}
                        disabled={refundingTicket === ticket.id}
                        className="inline-flex items-center gap-1 text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed p-2 rounded transition-colors"
                        title="Refund Ticket"
                      >
                        {refundingTicket === ticket.id ? (
                          <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    
                    {ticket.isRefunded && (
                      <span className="text-gray-400 text-sm">Refunded</span>
                    )}
                    
                    {!ticket.isRefunded && ticket.gamePhase === 'GAME_OVER' && (
                      <span className="text-gray-400 text-sm">Game Ended</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {tickets.length === 0 && (
          <div className="text-center py-12">
            <TicketIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tickets found</h3>
            <p className="text-gray-500">
              {searchTerm || filterGame || filterUser
                ? 'Try adjusting your search or filters.' 
                : 'No tickets have been purchased yet.'}
            </p>
          </div>
        )}
      </div>

      {/* Refund Warning */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-yellow-800">Refund Policy</h3>
            <p className="text-sm text-yellow-700 mt-1">
              Tickets can only be refunded before the game ends. Refunding a ticket will immediately return the ticket price to the player's balance and remove the ticket from the active game.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}