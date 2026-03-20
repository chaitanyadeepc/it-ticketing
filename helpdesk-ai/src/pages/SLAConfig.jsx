import { useEffect, useState } from 'react';
import PageWrapper from '../components/layout/PageWrapper';
import Breadcrumb from '../components/layout/Breadcrumb';
import api from '../api/api';

const PRIORITIES = ['low', 'medium', 'high', 'critical'];

const P_CFG = {
  critical: { color: '#ef4444', icon: 'M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z' },
  high:     { color: '#f59e0b', icon: 'M5 10l7-7 7 7M5 19l7-7 7 7' },
  medium:   { color: '#3b82f6', icon: 'M8 12h8M12 8v8' },
  low:      { color: '#22c55e', icon: 'M19 9l-7 7-7-7' },
};

const DEFAULTS = { low: 48, medium: 24, high: 8, critical: 4 };

export default function SLAConfig() {
  const [sla, setSla]           = useState({ low: 48, medium: 24, high: 8, critical: 4 });
  const [draft, setDraft]       = useState({ low: 48, medium: 24, high: 8, critical: 4 });
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/config/sla');
        if (data.sla) { setSla(data.sla); setDraft(data.sla); }
      } catch { /* use defaults */ } finally { setLoading(false); }
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch('/config/sla', { sla: draft });
      setSla(draft); setEditMode(false); setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) { alert(err.response?.data?.error || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const resetToDefaults = () => { setDraft({ ...DEFAULTS }); };

  const isDirty = PRIORITIES.some(p => draft[p] !== sla[p]);

  return (
    <PageWrapper>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-5">
        <Breadcrumb />

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 p-5 mb-6 rounded-2xl bg-gradient-to-r from-[#f59e0b]/8 via-[#3b82f6]/4 to-transparent border border-[#f59e0b]/15">
          <div>
            <h1 className="text-[24px] font-bold text-[#fafafa] mb-0.5">SLA Configuration</h1>
            <p className="text-[13px] text-[#a1a1aa]">Set response deadlines by ticket priority</p>
          </div>
          <div className="flex items-center gap-2">
            {saved && (
              <span className="flex items-center gap-1.5 text-[12px] text-[#22c55e] bg-[#22c55e]/10 border border-[#22c55e]/20 px-3 py-1.5 rounded-xl">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
                Saved
              </span>
            )}
            {editMode ? (
              <>
                <button onClick={resetToDefaults} className="px-4 py-2 bg-[#27272a] hover:bg-[#3f3f46] text-[#a1a1aa] text-[13px] rounded-xl transition-colors">Reset</button>
                <button onClick={() => { setDraft(sla); setEditMode(false); }} className="px-4 py-2 bg-[#27272a] hover:bg-[#3f3f46] text-[#a1a1aa] text-[13px] rounded-xl transition-colors">Cancel</button>
                <button onClick={save} disabled={saving || !isDirty} className="px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-40 text-white text-[13px] font-semibold rounded-xl transition-colors">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </>
            ) : (
              <button onClick={() => setEditMode(true)} className="px-4 py-2 bg-[#27272a] hover:bg-[#3f3f46] text-[#fafafa] text-[13px] font-medium rounded-xl border border-[#3f3f46] transition-colors">
                Edit SLA
              </button>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">

          {/* Left: Priority cards */}
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 bg-[#18181b] border border-[#27272a] rounded-2xl animate-pulse" />
              ))
            ) : PRIORITIES.map(p => {
              const cfg = P_CFG[p];
              const hrs = editMode ? draft[p] : sla[p];
              return (
                <div key={p} className="bg-[#18181b] border border-[#27272a] rounded-2xl p-5 hover:border-[#3f3f46] transition-colors"
                  style={{ borderLeft: `3px solid ${cfg.color}` }}>
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: cfg.color + '18' }}>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: cfg.color }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={cfg.icon} />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[14px] font-semibold text-[#fafafa] capitalize">{p}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full border font-medium"
                          style={{ background: cfg.color + '10', borderColor: cfg.color + '30', color: cfg.color }}>
                          {p.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#52525b]">
                        Must be resolved within{' '}
                        <span className="text-[#a1a1aa] font-medium">{hrs}h</span>
                        {hrs >= 24 && <span className="text-[#52525b]"> ({Math.round(hrs / 24 * 10) / 10} day{hrs >= 48 ? 's' : ''})</span>}
                      </p>
                    </div>
                    {editMode ? (
                      <div className="flex items-center gap-2">
                        <button onClick={() => setDraft(d => ({ ...d, [p]: Math.max(1, d[p] - (p === 'critical' ? 1 : p === 'high' ? 2 : 4)) }))}
                          className="w-8 h-8 rounded-lg bg-[#27272a] border border-[#3f3f46] text-[#a1a1aa] hover:bg-[#3f3f46] text-[16px] flex items-center justify-center transition-colors">−</button>
                        <input type="number" min="1" value={draft[p]}
                          onChange={e => setDraft(d => ({ ...d, [p]: parseInt(e.target.value) || 1 }))}
                          className="w-20 h-8 text-center bg-[#111113] border border-[#3b82f6]/40 rounded-lg text-[13px] text-[#fafafa] focus:outline-none focus:border-[#3b82f6] font-mono" />
                        <span className="text-[12px] text-[#52525b]">hrs</span>
                        <button onClick={() => setDraft(d => ({ ...d, [p]: d[p] + (p === 'critical' ? 1 : p === 'high' ? 2 : 4) }))}
                          className="w-8 h-8 rounded-lg bg-[#27272a] border border-[#3f3f46] text-[#a1a1aa] hover:bg-[#3f3f46] text-[16px] flex items-center justify-center transition-colors">+</button>
                      </div>
                    ) : (
                      <div className="text-right">
                        <span className="text-[22px] font-bold font-mono" style={{ color: cfg.color }}>{hrs}</span>
                        <span className="text-[11px] text-[#52525b] ml-1">hrs</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Info panel */}
          <div className="space-y-4">
            <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-5">
              <h3 className="text-[13px] font-semibold text-[#fafafa] mb-3">How SLA Works</h3>
              <div className="space-y-3 text-[12px] text-[#71717a] leading-relaxed">
                <p>SLA targets are tracked from ticket <span className="text-[#a1a1aa] font-medium">creation time</span>. A breach is recorded when the deadline passes without resolution.</p>
                <p>Breached tickets appear with a <span className="text-[#ef4444] font-medium">red overdue</span> badge across all dashboards and views.</p>
                <p>Agents receive breach warning notifications <span className="text-[#a1a1aa] font-medium">2 hours</span> before the deadline.</p>
              </div>
            </div>

            <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-5">
              <h3 className="text-[13px] font-semibold text-[#fafafa] mb-3">Factory Defaults</h3>
              <div className="space-y-2">
                {PRIORITIES.map(p => (
                  <div key={p} className="flex items-center justify-between py-1.5 border-b border-[#27272a] last:border-0">
                    <span className="text-[12px] text-[#a1a1aa] capitalize">{p}</span>
                    <span className="text-[12px] font-mono font-medium" style={{ color: P_CFG[p].color }}>{DEFAULTS[p]}h</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#f59e0b]/5 border border-[#f59e0b]/15 rounded-2xl p-4">
              <p className="text-[11px] text-[#f59e0b] leading-relaxed">
                <span className="font-semibold">Note:</span> SLA changes apply to <span className="font-medium">new tickets only</span>. Existing tickets retain their original deadlines.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
