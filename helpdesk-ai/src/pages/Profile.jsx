import React, { useState } from 'react';
import PageWrapper from '../components/layout/PageWrapper';
import Breadcrumb from '../components/layout/Breadcrumb';
import Button from '../components/ui/Button';

const statItems = [
  { value: '8', label: 'Total Tickets', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', color: '#3b82f6' },
  { value: '3', label: 'Active Tickets', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', color: '#f59e0b' },
  { value: '5', label: 'Resolved', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', color: '#22c55e' },
];

const Profile = () => {
  const userEmail = localStorage.getItem('userEmail') || 'user@company.com';
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const fields = [
    { label: 'Full Name', type: 'text', value: 'John Doe', disabled: false, icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    { label: 'Email Address', type: 'email', value: userEmail, disabled: true, icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    { label: 'Department', type: 'text', value: 'Engineering', disabled: false, icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    { label: 'Phone', type: 'tel', value: '+1 (555) 123-4567', disabled: false, icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' },
    { label: 'Location', type: 'text', value: 'New York, USA', disabled: false, icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z' },
    { label: 'Job Title', type: 'text', value: 'Software Engineer', disabled: false, icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  ];

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Breadcrumb />

        {/* Header */}
        <div className="mt-6 mb-6">
          <h1 className="text-[22px] font-bold text-[#fafafa] mb-1">My Profile</h1>
          <p className="text-[13px] text-[#a1a1aa]">Manage your account information and preferences</p>
        </div>

        {/* Profile hero card */}
        <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-6 mb-5">
          <div className="flex items-start gap-5 mb-6">
            {/* Avatar */}
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-br from-[#3b82f6] to-[#2563eb] rounded-2xl flex items-center justify-center text-white text-[22px] font-bold shadow-lg shadow-[#3b82f6]/20 flex-shrink-0">
                {userEmail.slice(0, 2).toUpperCase()}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-[#22c55e] rounded-full border-2 border-[#18181b]" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-[17px] font-semibold text-[#fafafa] mb-0.5">{userEmail.split('@')[0]}</h2>
              <p className="text-[12px] text-[#52525b] font-mono mb-3">{userEmail}</p>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#3b82f6]/10 border border-[#3b82f6]/20 text-[#3b82f6] text-[11px] font-medium">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                  Verified
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#27272a] text-[#a1a1aa] text-[11px] font-medium">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5"/></svg>
                  Engineering
                </span>
              </div>
            </div>
          </div>

          {/* Fields grid */}
          <div className="grid md:grid-cols-2 gap-4 mb-5">
            {fields.map(({ label, type, value, disabled, icon }) => (
              <div key={label}>
                <label className="block text-[11px] font-semibold text-[#a1a1aa] mb-1.5 uppercase tracking-wider">{label}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <svg className="w-3.5 h-3.5 text-[#52525b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                    </svg>
                  </div>
                  <input
                    type={type}
                    defaultValue={value}
                    disabled={disabled}
                    className={`w-full h-9 pl-8 pr-3.5 rounded-lg bg-[#18181b] border border-[#27272a] text-[13.5px] focus:outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/20 transition-all ${disabled ? 'text-[#52525b] cursor-not-allowed' : 'text-[#fafafa]'}`}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-2 border-t border-[#27272a]">
            <Button variant="primary" onClick={handleSave} className="flex items-center gap-2">
              {isSaved
                ? <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>Saved!</>
                : <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>Save Changes</>
              }
            </Button>
            <Button variant="secondary" className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {statItems.map(({ value, label, icon, color }) => (
            <div key={label} className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color + '15' }}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} style={{ color }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                </svg>
              </div>
              <div>
                <div className="text-[22px] font-bold" style={{ color }}>{value}</div>
                <div className="text-[11.5px] text-[#52525b] mt-0.5">{label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
};

export default Profile;
