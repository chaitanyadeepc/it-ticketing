import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageWrapper from '../components/layout/PageWrapper';
import Breadcrumb from '../components/layout/Breadcrumb';
import Button from '../components/ui/Button';
import api from '../api/api';
import { useToast } from '../context/ToastContext';

// Password strength scoring
const getPasswordStrength = (pw) => {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const levels = [
    { label: 'Very Weak', color: '#ef4444' },
    { label: 'Weak',      color: '#f97316' },
    { label: 'Fair',      color: '#f59e0b' },
    { label: 'Good',      color: '#3b82f6' },
    { label: 'Strong',    color: '#22c55e' },
    { label: 'Very Strong', color: '#22c55e' },
  ];
  return { score, ...levels[Math.min(score, levels.length - 1)] };
};

const Profile = () => {
  const navigate = useNavigate();
  const userEmail = localStorage.getItem('userEmail') || '';
  const userRole  = localStorage.getItem('userRole') || 'user';

  const [form, setForm] = useState({ name: '', department: '', phone: '', location: '', jobTitle: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { addToast } = useToast();

  // Ticket stats from API
  const [stats, setStats] = useState({ total: 0, active: 0, resolved: 0 });
  const [userSince, setUserSince] = useState('');

  // Password change state
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });
  const strength = getPasswordStrength(pwForm.next);

  useEffect(() => {
    Promise.all([api.get('/users/profile'), api.get('/tickets')])
      .then(([profileRes, ticketsRes]) => {
        const u = profileRes.data.user;
        setForm({
          name: u.name || '',
          department: u.department || '',
          phone: u.phone || '',
          location: u.location || '',
          jobTitle: u.jobTitle || '',
        });
        if (u.createdAt) setUserSince(new Date(u.createdAt).toLocaleDateString([], { year: 'numeric', month: 'long' }));
        const tickets = ticketsRes.data.tickets || [];
        setStats({
          total: tickets.length,
          active: tickets.filter((t) => t.status === 'Open' || t.status === 'In Progress').length,
          resolved: tickets.filter((t) => t.status === 'Resolved' || t.status === 'Closed').length,
        });
      })
      .catch(() => setError('Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await api.put('/users/profile', form);
      localStorage.setItem('userName', form.name);
      addToast('Profile saved successfully');
    } catch {
      addToast('Failed to save changes', 'error');
      setError('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    if (pwForm.next !== pwForm.confirm) { setPwError('New passwords do not match'); return; }
    if (strength.score < 2) { setPwError('Password is too weak — use at least 8 characters with mixed case and numbers'); return; }
    setPwSaving(true);
    try {
      await api.post('/users/change-password', { currentPassword: pwForm.current, newPassword: pwForm.next });
      addToast('Password changed successfully');
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      setPwError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setPwSaving(false);
    }
  };

  const fields = [
    { key: 'name',       label: 'Full Name',     type: 'text', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    { key: 'email',      label: 'Email Address', type: 'email', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', disabled: true },
    { key: 'department', label: 'Department',    type: 'text', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5' },
    { key: 'phone',      label: 'Phone',         type: 'tel',  icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' },
    { key: 'location',   label: 'Location',      type: 'text', icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z' },
    { key: 'jobTitle',   label: 'Job Title',     type: 'text', icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  ];

  const statItems = [
    { value: stats.total,    label: 'Total Tickets', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', color: '#3b82f6' },
    { value: stats.active,   label: 'Active Tickets', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', color: '#f59e0b' },
    { value: stats.resolved, label: 'Resolved', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', color: '#22c55e' },
  ];

  if (loading) return (
    <PageWrapper>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-5">
        <div className="skeleton h-4 w-32 rounded mb-5" />
        {/* Header banner */}
        <div className="rounded-2xl border border-[#27272a] bg-[#18181b] p-5 mb-5 flex items-center justify-between">
          <div className="space-y-2">
            <div className="skeleton h-6 w-32 rounded" />
            <div className="skeleton h-3 w-56 rounded" />
          </div>
        </div>
        {/* Profile card */}
        <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-6 mb-5">
          <div className="flex items-start gap-5 mb-6">
            <div className="skeleton w-20 h-20 rounded-2xl flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-5 w-36 rounded" />
              <div className="skeleton h-3 w-44 rounded" />
              <div className="skeleton h-6 w-48 rounded-full" />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4 mb-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="skeleton h-3 w-24 rounded" />
                <div className="skeleton h-10 w-full rounded-lg" />
              </div>
            ))}
          </div>
          <div className="skeleton h-9 w-32 rounded-lg" />
        </div>
        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-[#27272a] bg-[#18181b] p-5 space-y-3">
              <div className="skeleton w-10 h-10 rounded-xl" />
              <div className="skeleton h-7 w-12 rounded" />
              <div className="skeleton h-3 w-20 rounded" />
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );

  return (
    <PageWrapper>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-5">
        <Breadcrumb />
        <div className="flex flex-wrap items-center justify-between gap-3 p-5 mb-5 rounded-2xl bg-gradient-to-r from-[#3b82f6]/8 via-[#6366f1]/4 to-transparent border border-[#3b82f6]/15">
          <div>
            <h1 className="text-[24px] font-bold text-[#fafafa] mb-0.5">My Profile</h1>
            <p className="text-[13px] text-[#a1a1aa]">Manage your account information and preferences</p>
            {userSince && <p className="text-[11px] text-[#52525b] mt-1">Member since {userSince}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            {['user', 'admin', 'agent'].includes(userRole) && (
              <button onClick={() => navigate(userRole === 'user' ? '/my-tickets' : '/admin')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#18181b] border border-[#27272a] hover:border-[#3f3f46] text-[12px] text-[#a1a1aa] hover:text-[#fafafa] transition-all">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                View Tickets
              </button>
            )}
            <button onClick={() => navigate('/chatbot')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[12px] font-semibold transition-all">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
              New Ticket
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-[13px]">{error}</div>
        )}

        <div className="bg-gradient-to-br from-[#3b82f6]/8 via-[#18181b] to-[#6366f1]/5 border border-[#3b82f6]/20 rounded-xl p-6 mb-5">
          <div className="flex items-start gap-5 mb-6">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-[#3b82f6] to-[#6366f1] rounded-2xl flex items-center justify-center text-white text-[26px] font-bold shadow-xl shadow-[#3b82f6]/25 flex-shrink-0">
                {(form.name || userEmail).slice(0, 2).toUpperCase()}
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#22c55e] rounded-full border-2 border-[#18181b] flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-[17px] font-semibold text-[#fafafa] mb-0.5">{form.name || userEmail.split('@')[0]}</h2>
              <p className="text-[12px] text-[#52525b] font-mono mb-3">{userEmail}</p>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#3b82f6]/10 border border-[#3b82f6]/20 text-[#3b82f6] text-[11px] font-medium">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                  Verified
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#27272a] text-[#a1a1aa] text-[11px] font-medium capitalize">
                  {userRole}
                </span>
                {form.department && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#27272a] text-[#a1a1aa] text-[11px] font-medium">
                    {form.department}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-5">
            {fields.map(({ key, label, type, icon, disabled }) => (
              <div key={key}>
                <label className="block text-[11px] font-semibold text-[#a1a1aa] mb-1.5 uppercase tracking-wider">{label}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <svg className="w-3.5 h-3.5 text-[#52525b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                    </svg>
                  </div>
                  <input
                    type={type}
                    value={disabled ? userEmail : (form[key] || '')}
                    disabled={disabled}
                    onChange={(e) => !disabled && setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className={`w-full h-10 pl-9 pr-3.5 rounded-lg bg-[#18181b] border border-[#27272a] text-[13.5px] focus:outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/20 transition-all ${disabled ? 'text-[#52525b] cursor-not-allowed' : 'text-[#fafafa]'}`}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-2 border-t border-[#27272a]">
            <Button variant="primary" onClick={handleSave} disabled={saving} className="flex items-center gap-2">
              {saving
                ? 'Saving…'
                : <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>Save Changes</>
              }
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {statItems.map(({ value, label, icon, color }) => (
            <div key={label} className="rounded-xl border p-3 sm:p-5 relative overflow-hidden" style={{ borderColor: `${color}30`, background: `linear-gradient(135deg, ${color}0d 0%, transparent 70%)` }}>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 mb-2 sm:mb-3" style={{ backgroundColor: color + '18' }}>
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} style={{ color }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                </svg>
              </div>
              <div className="text-[18px] sm:text-[28px] font-bold" style={{ color }}>{value}</div>
              <div className="text-[10px] sm:text-[12px] text-[#a1a1aa] mt-0.5 leading-tight">{label}</div>
              <div className="absolute -right-4 -bottom-4 w-14 h-14 rounded-full blur-2xl opacity-20" style={{ backgroundColor: color }} />
            </div>
          ))}
        </div>

        {/* Change Password */}
        <div className="mt-5 bg-[#18181b] border border-[#27272a] border-l-[3px] rounded-xl p-5" style={{ borderLeftColor: '#8b5cf6' }}>
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-4 h-4 text-[#8b5cf6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
            <h2 className="text-[14px] font-semibold text-[#fafafa]">Change Password</h2>
          </div>
          {pwError && <div className="mb-3 px-3 py-2 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#ef4444] text-[12px]">{pwError}</div>}
          <form onSubmit={handleChangePassword} className="space-y-3">
            {[
              { key: 'current', label: 'Current Password' },
              { key: 'next',    label: 'New Password' },
              { key: 'confirm', label: 'Confirm New Password' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="block text-[11px] font-semibold text-[#a1a1aa] mb-1.5 uppercase tracking-wider">{label}</label>
                <div className="relative">
                  <input
                    type={showPw[key] ? 'text' : 'password'}
                    value={pwForm[key]}
                    onChange={e => setPwForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={key === 'current' ? 'Enter current password' : key === 'next' ? 'Min 8 characters' : 'Repeat new password'}
                    required
                    className="w-full h-10 pl-3.5 pr-10 rounded-lg bg-[#111113] border border-[#27272a] text-[13.5px] text-[#fafafa] focus:outline-none focus:border-[#8b5cf6] focus:ring-2 focus:ring-[#8b5cf6]/20 transition-all placeholder-[#52525b]"
                  />
                  <button type="button" onClick={() => setShowPw(p => ({ ...p, [key]: !p[key] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#52525b] hover:text-[#a1a1aa] transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      {showPw[key]
                        ? <><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></>
                        : <><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></>
                      }
                    </svg>
                  </button>
                </div>
                {/* Password strength bar for new password field */}
                {key === 'next' && pwForm.next && (
                  <div className="mt-1.5">
                    <div className="flex gap-1 mb-1">
                      {[1,2,3,4,5].map(i => (
                        <div key={i} className="h-1 flex-1 rounded-full transition-all duration-200"
                          style={{ backgroundColor: i <= strength.score ? strength.color : '#27272a' }} />
                      ))}
                    </div>
                    <p className="text-[11px]" style={{ color: strength.color }}>{strength.label}</p>
                  </div>
                )}
              </div>
            ))}
            <button type="submit" disabled={pwSaving}
              className="px-5 py-2 bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-50 text-white text-[13px] font-semibold rounded-lg transition-colors mt-1">
              {pwSaving ? 'Changing…' : 'Change Password'}
            </button>
          </form>
        </div>

        {/* Achievement Badges */}
        {(() => {
          const resolvedCount = stats.resolved;
          const totalCount = stats.total;
          const accountDays = userSince ? Math.floor((Date.now() - new Date(userSince + ' 1').getTime()) / 86400000) : 0;
          const BADGES = [
            { key: 'first_ticket', icon: '🎫', label: 'First Ticket', desc: 'Submit your first ticket', earned: totalCount >= 1 },
            { key: 'resolved_1',   icon: '✅', label: 'Problem Solver', desc: 'First ticket resolved', earned: resolvedCount >= 1 },
            { key: 'resolved_10',  icon: '🔟', label: 'Experienced', desc: '10 tickets resolved', earned: resolvedCount >= 10 },
            { key: 'century',      icon: '💯', label: 'Century', desc: '100 tickets resolved', earned: resolvedCount >= 100 },
            { key: 'veteran',      icon: '🏅', label: 'Veteran', desc: 'Account active 90+ days', earned: accountDays >= 90 },
            { key: 'all_resolved', icon: '⭐', label: 'Clean Slate', desc: 'All tickets resolved', earned: totalCount > 0 && stats.active === 0 },
          ];
          const earnedCount = BADGES.filter(b => b.earned).length;
          return (
            <div className="mt-5 bg-[#18181b] border border-[#27272a] border-l-[3px] rounded-xl p-5" style={{ borderLeftColor: '#f59e0b' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-[16px]">🏆</span>
                  <h2 className="text-[14px] font-semibold text-[#fafafa]">Achievement Badges</h2>
                </div>
                <span className="text-[11px] text-[#a1a1aa] bg-[#27272a] px-2 py-0.5 rounded-full">{earnedCount}/{BADGES.length} earned</span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {BADGES.map(b => (
                  <div key={b.key} title={b.desc}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${b.earned ? 'border-[#f59e0b]/30 bg-[#f59e0b]/5' : 'border-[#27272a] opacity-40 grayscale'}`}>
                    <span className="text-2xl">{b.icon}</span>
                    <span className="text-[10px] font-medium text-[#e4e4e7] leading-tight">{b.label}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Quick Actions */}
        <div className="mt-5 bg-[#18181b] border border-[#27272a] border-l-[3px] rounded-xl p-5" style={{ borderLeftColor: '#3b82f6' }}>
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-4 h-4 text-[#3b82f6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
            <h2 className="text-[14px] font-semibold text-[#fafafa]">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
            {[
              { label: 'New Ticket',      desc: 'Raise a new IT support request',       color: '#3b82f6', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', onClick: () => navigate('/raise-ticket') },
              { label: 'My Tickets',      desc: 'View and manage your open tickets',    color: '#f59e0b', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', onClick: () => navigate(userRole === 'user' ? '/my-tickets' : '/admin') },
              { label: 'Knowledge Base',  desc: 'Browse IT guides and how-to articles', color: '#22c55e', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253', onClick: () => navigate('/knowledge-base') },
              { label: 'Notifications',   desc: 'View your recent notification history', color: '#06b6d4', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', onClick: () => navigate('/notifications') },
              { label: 'Export Data',     desc: 'Download your ticket history as CSV',  color: '#8b5cf6', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4', onClick: () => {
                  api.get('/tickets').then(r => {
                    const tix = r.data.tickets || [];
                    const csv = [['Ticket ID','Title','Category','Priority','Status','Created At'],
                      ...tix.map(t => [t.ticketId||t._id, `"${(t.title||'').replace(/"/g,'""')}"`, t.category||'', t.priority||'', t.status||'', new Date(t.createdAt).toLocaleDateString()])
                    ].map(row => row.join(',')).join('\n');
                    const a = Object.assign(document.createElement('a'), {
                      href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
                      download: `tickets-${new Date().toISOString().slice(0,10)}.csv`,
                    });
                    a.click(); URL.revokeObjectURL(a.href);
                  });
                }
              },
              { label: 'Settings',        desc: 'Notifications, security & preferences', color: '#a1a1aa', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', onClick: () => navigate('/settings') },
            ].map(({ label, desc, color, icon, onClick }) => (
              <button
                key={label}
                onClick={onClick}
                className="flex flex-col gap-2.5 p-3.5 sm:p-4 rounded-xl border text-left hover:scale-[1.02] active:scale-[0.98] transition-all group"
                style={{ borderColor: `${color}28`, background: `linear-gradient(135deg, ${color}0a 0%, transparent 70%)` }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} style={{ color }}>
                    {icon.split(' M').map((d, i) => (
                      <path key={i} strokeLinecap="round" strokeLinejoin="round" d={(i === 0 ? '' : 'M') + d} />
                    ))}
                  </svg>
                </div>
                <div>
                  <p className="text-[12.5px] font-semibold text-[#e4e4e7] mb-0.5 group-hover:text-[#fafafa]">{label}</p>
                  <p className="text-[11px] text-[#52525b] leading-tight">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
};

export default Profile;
