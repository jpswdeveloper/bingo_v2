'use client';

import { useState, useEffect, useCallback } from 'react';
import { cashoutApi } from '@/lib/api-client';
import type { CashoutRequest, CashoutStatus } from '@/lib/types';
import { CheckCircle2, XCircle, Loader2, AlertCircle, Phone, Clock, Filter } from 'lucide-react';

const STATUS_COLORS: Record<CashoutStatus, string> = {
  PENDING:  'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  APPROVED: 'bg-green-500/20 text-green-400 border-green-500/30',
  REJECTED: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export default function AdminCashoutPage() {
  const [requests, setRequests] = useState<CashoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<CashoutStatus | 'ALL'>('PENDING');
  const [actionNote, setActionNote] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  const showToast = (msg: string, type: 'ok' | 'err') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await cashoutApi.getAll(filter === 'ALL' ? undefined : filter);
      setRequests(data);
    } catch {
      showToast('Failed to load cashout requests', 'err');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id: string) => {
    setProcessing(id);
    try {
      await cashoutApi.approve(id, actionNote[id]);
      showToast('Cashout approved ✓', 'ok');
      load();
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? 'Failed to approve', 'err');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessing(id);
    try {
      await cashoutApi.reject(id, actionNote[id]);
      showToast('Cashout rejected — balance refunded', 'ok');
      load();
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? 'Failed to reject', 'err');
    } finally {
      setProcessing(null);
    }
  };

  const totalPending = requests.filter(r => r.status === 'PENDING').length;
  const totalAmount  = requests
    .filter(r => r.status === 'PENDING')
    .reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm font-semibold ${
          toast.type === 'ok'
            ? 'bg-green-500/20 border-green-500/30 text-green-400'
            : 'bg-red-500/20 border-red-500/30 text-red-400'
        }`}>
          {toast.type === 'ok' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Cashout Requests</h1>
          <p className="text-gray-400 text-sm mt-1">
            Review and process user withdrawal requests manually via Telebirr.
          </p>
        </div>
        {totalPending > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3 text-right">
            <div className="text-yellow-400 font-bold text-lg">{totalPending} pending</div>
            <div className="text-yellow-400/70 text-xs">{totalAmount.toFixed(2)} ETB total</div>
          </div>
        )}
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
              filter === s
                ? 'bg-purple-500 border-purple-500 text-white'
                : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
            }`}
          >
            {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
        <button onClick={load} className="ml-auto p-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white transition-all">
          <Filter className="w-4 h-4" />
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Clock className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No {filter === 'ALL' ? '' : filter.toLowerCase()} requests</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div
              key={req._id}
              className="bg-gray-900 border border-white/10 rounded-xl p-5 space-y-4"
            >
              {/* Top row */}
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold text-lg">{req.amount.toFixed(2)} ETB</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_COLORS[req.status]}`}>
                      {req.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Phone className="w-3.5 h-3.5" />
                    <span className="font-mono">{req.phoneNumber}</span>
                    <span className="text-gray-600">·</span>
                    <span>@{req.telegramId}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Requested: {new Date(req.createdAt).toLocaleString('en-ET', { timeZone: 'Africa/Nairobi' })}
                  </div>
                </div>

                {req.status === 'PENDING' && (
                  <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2 text-xs text-blue-300">
                    <span>Send <strong>{req.amount} ETB</strong> to</span>
                    <span className="font-mono font-bold text-blue-200">{req.phoneNumber}</span>
                    <span>via Telebirr, then approve below.</span>
                  </div>
                )}
              </div>

              {/* Admin note + actions — only for pending */}
              {req.status === 'PENDING' && (
                <div className="space-y-3 pt-2 border-t border-white/5">
                  <input
                    type="text"
                    placeholder="Admin note (optional)"
                    value={actionNote[req._id] ?? ''}
                    onChange={(e) => setActionNote((prev) => ({ ...prev, [req._id]: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApprove(req._id)}
                      disabled={processing === req._id}
                      className="flex items-center gap-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-lg text-sm transition-all"
                    >
                      {processing === req._id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <CheckCircle2 className="w-4 h-4" />
                      }
                      Approve — Telebirr sent
                    </button>
                    <button
                      onClick={() => handleReject(req._id)}
                      disabled={processing === req._id}
                      className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 font-bold px-5 py-2.5 rounded-lg text-sm transition-all"
                    >
                      {processing === req._id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <XCircle className="w-4 h-4" />
                      }
                      Reject &amp; Refund
                    </button>
                  </div>
                </div>
              )}

              {/* Reviewed info */}
              {req.status !== 'PENDING' && (
                <div className="pt-2 border-t border-white/5 text-xs text-gray-500 space-y-0.5">
                  {req.adminNote && <div>Note: {req.adminNote}</div>}
                  {req.reviewedAt && (
                    <div>
                      Reviewed: {new Date(req.reviewedAt).toLocaleString('en-ET', { timeZone: 'Africa/Nairobi' })}
                      {req.reviewedBy && ` by ${req.reviewedBy}`}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
