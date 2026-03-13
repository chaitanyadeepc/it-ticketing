import React, { useState, useEffect } from 'react';
import PageWrapper from '../components/layout/PageWrapper';
import Breadcrumb from '../components/layout/Breadcrumb';
import Button from '../components/ui/Button';
import api from '../api/api';
import { useToast } from '../context/ToastContext';

const Profile = () => {
  const userEmail = localStorage.getItem('userEmail') || '';
  const userRole  = localStorage.getItem('userRole') || 'user';

  const [form, setForm] = useState({ name: '', department: '', phone: '', location: '', jobTitle: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { addToast } = useToast();

  // Ticket stats from API
  const [stats, setStats] = useState({ total: 0, active: 0, resolved: 0 });

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
      <div className="flex items-center justify-center min-h-[60vh]">
        <svg className="w-6 h-6 text-[#3b82f6] animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
        </svg>
      </div>
    </PageWrapper>
  );

  return (
    <PageWrapper>
      <div className="w-full max-w-screen-2xl mx-auto px-6 xl:px-10 py-5">
        <Breadcrumb />
        <div className="flex flex-wrap items-center justify-between gap-3 p-5 mb-5 rounded-2xl bg-gradient-to-r from-[#3b82f6]/8 via-[#6366f1]/4 to-transparent border border-[#3b82f6]/15">
          <div>
            <h1 className="text-[24px] font-bold text-[#fafafa] mb-0.5">My Profile</h1>
            <p className="text-[13px] text-[#a1a1aa]">Manage your account information and preferences</p>
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

        <div className="grid grid-cols-3 gap-4">
          {statItems.map(({ value, label, icon, color }) => (
            <div key={label} className="rounded-xl border p-5 relative overflow-hidden" style={{ borderColor: `${color}30`, background: `linear-gradient(135deg, ${color}0d 0%, transparent 70%)` }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mb-3" style={{ backgroundColor: color + '18' }}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} style={{ color }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                </svg>
              </div>
              <div className="text-[28px] font-bold" style={{ color }}>{value}</div>
              <div className="text-[12px] text-[#a1a1aa] mt-0.5">{label}</div>
              <div className="absolute -right-4 -bottom-4 w-14 h-14 rounded-full blur-2xl opacity-20" style={{ backgroundColor: color }} />
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
};

export default Profile;
