import React, { useState } from 'react';

const CATEGORIES = [
  'Hardware', 'Software & Apps', 'Network & Connectivity', 'Access & Identity',
  'Email & Collaboration', 'Data & Storage', 'Audio & Video',
  'Mobile & Devices', 'Printing & Scanning', 'Security & Compliance',
];

const KIOSK_API = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '/tickets/kiosk';

export default function Kiosk() {
  const [form, setForm] = useState({ name: '', email: '', category: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState({});

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const touch = (k) => () => setTouched((t) => ({ ...t, [k]: true }));

  const errors = {
    name:        !form.name.trim()        ? 'Name is required' : '',
    email:       !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) ? 'Valid email required' : '',
    category:    !form.category           ? 'Please select a category' : '',
    description: form.description.trim().length < 10 ? 'Please describe the issue (min 10 chars)' : '',
  };
  const isValid = !Object.values(errors).some(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ name: true, email: true, category: true, description: true });
    if (!isValid) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(KIOSK_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:        form.name.trim(),
          email:       form.email.trim().toLowerCase(),
          category:    form.category,
          description: form.description.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');
      setConfirmation(data.ticket);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setForm({ name: '', email: '', category: '', description: '' });
    setTouched({});
    setConfirmation(null);
    setError('');
  };

  // ── Confirmation screen ──────────────────────────────────────────────────
  if (confirmation) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: '#09090b' }}>
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-[#22c55e]/15 border border-[#22c55e]/30 flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-[28px] font-bold text-[#fafafa] mb-2">Ticket Submitted!</h1>
          <p className="text-[14px] text-[#a1a1aa] mb-6">
            Your support request has been received. Our team will contact you shortly.
          </p>
          <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-6 mb-6 text-left">
            <p className="text-[11px] uppercase font-semibold tracking-wider text-[#52525b] mb-1">Ticket Reference</p>
            <p className="text-[28px] font-bold font-mono text-[#3b82f6] mb-4">{confirmation.ticketId}</p>
            <div className="grid grid-cols-2 gap-3 text-[13px]">
              <div>
                <span className="text-[11px] text-[#52525b] block">Category</span>
                <span className="text-[#fafafa]">{confirmation.category}</span>
              </div>
              <div>
                <span className="text-[11px] text-[#52525b] block">Status</span>
                <span className="text-[#22c55e] font-medium">{confirmation.status}</span>
              </div>
            </div>
          </div>
          <p className="text-[12px] text-[#52525b] mb-6">
            You can track this ticket at <span className="text-[#3b82f6]">helpdesk/status</span> using your reference number.
          </p>
          <button
            onClick={handleReset}
            className="w-full py-3 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-semibold rounded-xl transition-colors text-[15px]"
          >
            Submit Another Request
          </button>
        </div>
      </div>
    );
  }

  // ── Submission form ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#09090b' }}>
      {/* Header */}
      <div className="bg-[#18181b] border-b border-[#27272a] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#3b82f6]/15 flex items-center justify-center">
            <svg className="w-4.5 h-4.5 text-[#3b82f6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <span className="text-[16px] font-bold text-[#fafafa]">IT Help Desk</span>
        </div>
        <span className="text-[12px] text-[#52525b]">Walk-in Request Terminal</span>
      </div>

      {/* Form */}
      <div className="flex-1 flex items-start justify-center px-6 py-10">
        <div className="w-full max-w-lg">
          <div className="mb-8 text-center">
            <h1 className="text-[30px] font-bold text-[#fafafa] mb-2">Submit a Support Request</h1>
            <p className="text-[14px] text-[#71717a]">Fill in the details below and our team will assist you</p>
          </div>

          {error && (
            <div className="mb-5 px-4 py-3 bg-[#ef4444]/10 border border-[#ef4444]/25 rounded-xl text-[13px] text-[#ef4444] flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Name */}
            <div>
              <label className="block text-[12px] font-semibold text-[#a1a1aa] uppercase tracking-wider mb-2">
                Full Name <span className="text-[#ef4444]">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={set('name')}
                onBlur={touch('name')}
                placeholder="John Smith"
                className="w-full bg-[#18181b] border border-[#27272a] focus:border-[#3b82f6] rounded-xl px-4 py-3 text-[15px] text-[#fafafa] placeholder-[#3f3f46] outline-none transition-colors"
              />
              {touched.name && errors.name && <p className="mt-1.5 text-[12px] text-[#ef4444]">{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-[12px] font-semibold text-[#a1a1aa] uppercase tracking-wider mb-2">
                Email Address <span className="text-[#ef4444]">*</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={set('email')}
                onBlur={touch('email')}
                placeholder="john@company.com"
                className="w-full bg-[#18181b] border border-[#27272a] focus:border-[#3b82f6] rounded-xl px-4 py-3 text-[15px] text-[#fafafa] placeholder-[#3f3f46] outline-none transition-colors"
              />
              {touched.email && errors.email && <p className="mt-1.5 text-[12px] text-[#ef4444]">{errors.email}</p>}
            </div>

            {/* Category */}
            <div>
              <label className="block text-[12px] font-semibold text-[#a1a1aa] uppercase tracking-wider mb-2">
                Issue Category <span className="text-[#ef4444]">*</span>
              </label>
              <select
                value={form.category}
                onChange={set('category')}
                onBlur={touch('category')}
                className="w-full bg-[#18181b] border border-[#27272a] focus:border-[#3b82f6] rounded-xl px-4 py-3 text-[15px] text-[#fafafa] outline-none transition-colors"
              >
                <option value="" disabled>Select a category…</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {touched.category && errors.category && <p className="mt-1.5 text-[12px] text-[#ef4444]">{errors.category}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="block text-[12px] font-semibold text-[#a1a1aa] uppercase tracking-wider mb-2">
                Describe Your Issue <span className="text-[#ef4444]">*</span>
              </label>
              <textarea
                value={form.description}
                onChange={set('description')}
                onBlur={touch('description')}
                placeholder="Please describe the problem in as much detail as possible — what happened, when it started, what you've already tried…"
                rows={5}
                className="w-full bg-[#18181b] border border-[#27272a] focus:border-[#3b82f6] rounded-xl px-4 py-3 text-[15px] text-[#fafafa] placeholder-[#3f3f46] outline-none resize-none transition-colors leading-relaxed"
              />
              <div className="flex items-center justify-between mt-1.5">
                {touched.description && errors.description ? (
                  <p className="text-[12px] text-[#ef4444]">{errors.description}</p>
                ) : <span />}
                <span className={`text-[11px] ${form.description.length > 450 ? 'text-[#ef4444]' : 'text-[#52525b]'}`}>
                  {form.description.length}/500
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 rounded-xl font-bold text-[16px] transition-all active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#3b82f6', color: '#fff' }}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Submitting…
                </span>
              ) : 'Submit Request'}
            </button>
          </form>

          <p className="text-center text-[11px] text-[#3f3f46] mt-6">
            By submitting, you agree to your request being handled by the IT support team.
          </p>
        </div>
      </div>
    </div>
  );
}
