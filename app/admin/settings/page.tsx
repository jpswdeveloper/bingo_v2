'use client';

import { useState, useEffect } from 'react';
import { settingsApi } from '@/lib/api-client';
import type { RakeTier } from '@/lib/types';
import { Plus, Trash2, Save, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function AdminSettingsPage() {
  const [tiers, setTiers] = useState<RakeTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    settingsApi.getRakeTiers()
      .then(({ rakeTiers }) => setTiers(rakeTiers))
      .catch(() => setError('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const updateTier = (i: number, field: keyof RakeTier, value: number) => {
    setTiers((prev) => prev.map((t, idx) => idx === i ? { ...t, [field]: value } : t));
    setError(null);
    setSuccess(false);
  };

  const addTier = () => {
    const last = tiers[tiers.length - 1];
    setTiers((prev) => [
      ...prev,
      { minCards: (last?.maxCards ?? 0) + 1, maxCards: (last?.maxCards ?? 0) + 100, rakePct: 15 },
    ]);
  };

  const removeTier = (i: number) => setTiers((prev) => prev.filter((_, idx) => idx !== i));

  const validate = (): string | null => {
    for (let i = 0; i < tiers.length; i++) {
      const t = tiers[i];
      if (t.minCards < 1) return `Tier ${i + 1}: minCards must be ≥ 1`;
      if (t.maxCards < t.minCards) return `Tier ${i + 1}: maxCards must be ≥ minCards`;
      if (t.rakePct < 0 || t.rakePct > 99) return `Tier ${i + 1}: rake must be 0–99%`;
      if (i > 0 && tiers[i].minCards <= tiers[i - 1].maxCards) {
        return `Tier ${i + 1}: minCards must be greater than previous tier maxCards`;
      }
    }
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setSaving(true);
    setError(null);
    try {
      const { rakeTiers } = await settingsApi.updateRakeTiers(tiers);
      setTiers(rakeTiers);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Game Settings</h1>
        <p className="text-gray-400 text-sm mt-1">
          Configure the rake percentage based on cards sold per game.
          The system picks the tier whose range contains the final sold count.
        </p>
      </div>

      {/* How it works */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-sm text-blue-300">
        <p className="font-semibold mb-1">How dynamic rake works</p>
        <p>If 80 cards are sold and a tier covers 51–100 cards at 15%, admin keeps 15% of the total pot and the winner(s) share the remaining 85%.</p>
      </div>

      {/* Tiers table */}
      <div className="bg-gray-900 border border-white/10 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_1fr_40px] gap-0 text-xs text-gray-400 uppercase tracking-wider px-4 py-3 border-b border-white/5 bg-white/5">
          <span>Min Cards</span>
          <span>Max Cards</span>
          <span>Rake %</span>
          <span />
        </div>

        {tiers.length === 0 && (
          <div className="text-center text-gray-500 py-8 text-sm">No tiers configured. Add one below.</div>
        )}

        {tiers.map((tier, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_1fr_40px] gap-3 px-4 py-3 border-b border-white/5 last:border-0 items-center">
            <input
              type="number"
              value={tier.minCards}
              min={1}
              onChange={(e) => updateTier(i, 'minCards', parseInt(e.target.value) || 1)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
            />
            <input
              type="number"
              value={tier.maxCards}
              min={tier.minCards}
              onChange={(e) => updateTier(i, 'maxCards', parseInt(e.target.value) || tier.minCards)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
            />
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={tier.rakePct}
                min={0}
                max={99}
                onChange={(e) => updateTier(i, 'rakePct', parseFloat(e.target.value) || 0)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
              />
              <span className="text-gray-400 text-sm shrink-0">%</span>
            </div>
            <button
              onClick={() => removeTier(i)}
              className="text-red-400 hover:text-red-300 transition-colors p-1"
              title="Remove tier"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Preview */}
      {tiers.length > 0 && (
        <div className="bg-gray-900/50 border border-white/5 rounded-xl p-4">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-3">Preview</p>
          <div className="space-y-1.5">
            {tiers.map((t, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-300">{t.minCards}–{t.maxCards} cards sold</span>
                <span className="text-yellow-400 font-bold">{t.rakePct}% admin rake → {(100 - t.rakePct)}% to winner(s)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-xl p-4">
          <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
          <p className="text-green-400 text-sm">Settings saved successfully.</p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={addTier}
          className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all"
        >
          <Plus className="w-4 h-4" /> Add Tier
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-all ml-auto"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
