import { useEffect, useState } from 'react';
import api from '../api/api';

const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];
const P_COLORS   = { Critical: '#ef4444', High: '#f97316', Medium: '#3b82f6', Low: '#22c55e' };
const DEFAULT    = { Critical: 4, High: 8, Medium: 24, Low: 72 };

const fmtHours = (h) => {
  if (!h || h <= 0) return '—';
  if (h < 1)  return `${Math.round(h * 60)}m`;
  if (h < 24) return `${h}h`;
  return `${(h / 24).toFixed(h % 24 === 0 ? 0 : 1)}d`;
};

export default function SLAConfig() {
  const [sla, setSla]         = useState({ ...DEFAULT });
  const [original, setOrig]   = useState({ ...DEFAULT });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  useEffect(() => {
    api.get('/config/sla')
      .then(({ data }) => { setSla(data.sla); setOrig(data.sla); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const isDirty = PRIORITIES.some(p => sla[p] !== original[p]);

  const handleSave = async () => {
    for (const p of PRIORITIES) {
      if (!sla[p] || sla[p] <= 0) { alert(`Invalid SLA value for ${p} — must be > 0`); return; }
    }
    setSaving(true);
    try {
      const { data } = await api.patch('/config/sla', { sla });
      setSla(data.sla);
      setOrig(data.sla);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-2xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">⏱ SLA Configuration</h1>
          <p className="text-zinc-400 text-sm mt-1">Set maximum response time targets (hours) per priority level</p>
        </div>

        {/* Config card */}
        {loading ? (
          <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-[68px] bg-zinc-800/50 rounded-xl animate-pulse" />)}</div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800">
              <p className="text-sm text-zinc-400">Tickets that exceed 150% of their SLA threshold are auto-escalated to the next priority level by the hourly cron.</p>
            </div>

            <div className="divide-y divide-zinc-800">
              {PRIORITIES.map(p => (
                <div key={p} className="flex items-center gap-6 px-6 py-5">
                  <div className="w-20 shrink-0">
                    <span className="text-sm font-bold" style={{ color: P_COLORS[p] }}>{p}</span>
                  </div>

                  <div className="flex items-center gap-3 flex-1">
                    <input
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={sla[p] ?? ''}
                      onChange={e => setSla(prev => ({ ...prev, [p]: parseFloat(e.target.value) || '' }))}
                      className="w-28 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-[#FF634A] [appearance:textfield]"
                    />
                    <span className="text-sm text-zinc-500">hours</span>
                    {sla[p] > 0 && (
                      <span className="text-xs px-2 py-1 rounded-lg bg-zinc-800 border border-zinc-700 font-mono" style={{ color: P_COLORS[p] }}>
                        = {fmtHours(sla[p])}
                      </span>
                    )}
                  </div>

                  {/* Bar visual */}
                  <div className="w-32 shrink-0 hidden sm:block">
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, ((sla[p] || 0) / 72) * 100)}%`, backgroundColor: P_COLORS[p] }}
                      />
                    </div>
                    <p className="text-[10px] text-zinc-600 mt-1">
                      Default: {DEFAULT[p]}h
                      {sla[p] !== original[p] ? <span className="text-amber-500 ml-1">changed</span> : null}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-between flex-wrap gap-3">
              <div className="text-xs">
                {saved && <span className="text-green-400">✓ Configuration saved</span>}
                {isDirty && !saved && <span className="text-amber-400">Unsaved changes</span>}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setSla({ ...original })}
                  disabled={!isDirty || saving}
                  className="px-4 py-2 text-sm bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-xl hover:bg-zinc-700 transition-colors disabled:opacity-40"
                >
                  Reset
                </button>
                <button
                  onClick={handleSave}
                  disabled={!isDirty || saving}
                  className="px-5 py-2 text-sm bg-[#FF634A] hover:bg-[#e0552e] text-white font-semibold rounded-xl transition-colors disabled:opacity-40"
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* How SLA works */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-zinc-300">How SLA works in HiTicket</h2>
          <ul className="space-y-2 text-sm text-zinc-400">
            {[
              'Ticket cards and detail pages show a real-time SLA countdown bar.',
              'When a ticket exceeds 150% of its SLA threshold, the hourly cron auto-escalates priority by one level.',
              'A notification and email is sent to the ticket creator when escalated.',
              'Resolved and Closed tickets are excluded from SLA tracking.',
              'Changes here take effect immediately — no server restart needed.',
            ].map(t => (
              <li key={t} className="flex items-start gap-2">
                <span className="text-[#FF634A] mt-0.5 shrink-0">•</span>{t}
              </li>
            ))}
          </ul>
        </div>

        {/* Factory defaults reference */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4">Factory Defaults</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PRIORITIES.map(p => (
              <div key={p} className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-3 text-center">
                <div className="text-xs text-zinc-500 mb-1">{p}</div>
                <div className="text-base font-bold" style={{ color: P_COLORS[p] }}>{DEFAULT[p]}h</div>
                <div className="text-[11px] text-zinc-600 mt-0.5">{fmtHours(DEFAULT[p])}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
