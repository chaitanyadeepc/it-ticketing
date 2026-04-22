import { useState } from 'react';
import api from '../api/api';

const CATEGORIES = ['Bug Report', 'Feature Request', 'Complaint', 'Suggestion', 'Other'];
const SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];
const SEVERITY_COLOR = { Low: '#22c55e', Medium: '#f59e0b', High: '#f97316', Critical: '#ef4444' };

export default function AnonymousFeedback() {
  const [form, setForm] = useState({ category: 'Suggestion', description: '', severity: 'Medium' });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.description.trim().length < 10) { setError('Description must be at least 10 characters'); return; }
    setLoading(true);
    try {
      await api.post('/feedback/anonymous', form);
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (done) return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="text-6xl mb-4">🙏</div>
        <h1 className="text-2xl font-bold text-[#fafafa] mb-2">Thank You!</h1>
        <p className="text-[#a1a1aa] text-[14px] mb-6">Your anonymous feedback has been submitted. We appreciate you helping us improve.</p>
        <button onClick={() => { setDone(false); setForm({ category: 'Suggestion', description: '', severity: 'Medium' }); }}
          className="px-5 py-2 rounded-lg bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[13px] font-semibold transition-colors">
          Submit Another
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#18181b] border border-[#27272a] mb-4">
            <span className="text-2xl">🔒</span>
          </div>
          <h1 className="text-2xl font-bold text-[#fafafa] mb-1">Anonymous Feedback</h1>
          <p className="text-[13px] text-[#71717a]">Your identity is never recorded. Speak freely.</p>
        </div>

        {/* Form */}
        <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-6 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Category */}
            <div>
              <label className="block text-[12px] font-medium text-[#a1a1aa] mb-1.5">Category</label>
              <div className="grid grid-cols-5 gap-1.5">
                {CATEGORIES.map(c => (
                  <button key={c} type="button"
                    onClick={() => setForm(f => ({ ...f, category: c }))}
                    className={`py-1.5 px-1 rounded-lg text-[11px] font-medium border transition-all ${form.category === c ? 'bg-[#3b82f6]/15 border-[#3b82f6]/50 text-[#60a5fa]' : 'bg-[#09090b] border-[#27272a] text-[#71717a] hover:border-[#3f3f46]'}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Severity */}
            <div>
              <label className="block text-[12px] font-medium text-[#a1a1aa] mb-1.5">Severity</label>
              <div className="grid grid-cols-4 gap-1.5">
                {SEVERITIES.map(s => (
                  <button key={s} type="button"
                    onClick={() => setForm(f => ({ ...f, severity: s }))}
                    style={form.severity === s ? { borderColor: SEVERITY_COLOR[s] + '80', backgroundColor: SEVERITY_COLOR[s] + '15', color: SEVERITY_COLOR[s] } : {}}
                    className={`py-1.5 rounded-lg text-[11px] font-medium border transition-all ${form.severity === s ? '' : 'bg-[#09090b] border-[#27272a] text-[#71717a] hover:border-[#3f3f46]'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-[12px] font-medium text-[#a1a1aa] mb-1.5">Description <span className="text-[#ef4444]">*</span></label>
              <textarea
                rows={5}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Describe the issue, suggestion, or feedback in detail..."
                className="w-full bg-[#09090b] border border-[#27272a] focus:border-[#3b82f6]/60 rounded-xl px-3.5 py-2.5 text-[13px] text-[#e4e4e7] placeholder-[#52525b] outline-none resize-none transition-colors"
              />
              <p className="text-[11px] text-[#52525b] mt-1">{form.description.length}/1000 characters</p>
            </div>

            {error && <p className="text-[12px] text-[#ef4444] bg-[#ef4444]/8 border border-[#ef4444]/20 rounded-lg px-3 py-2">{error}</p>}

            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-50 text-white text-[13px] font-semibold transition-colors">
              {loading ? 'Submitting…' : 'Submit Anonymously'}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-[#3f3f46] mt-4">
          No cookies, no tracking, no login required.
        </p>
      </div>
    </div>
  );
}
