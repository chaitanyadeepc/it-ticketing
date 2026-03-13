import React, { useState } from 'react';
import PageWrapper from '../components/layout/PageWrapper';
import Breadcrumb from '../components/layout/Breadcrumb';
import { useTheme } from '../context/ThemeContext';

const Toggle = ({ enabled, onChange }) => (
  <button
    onClick={() => onChange(!enabled)}
    className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${enabled ? 'bg-[#3b82f6]' : 'bg-[#27272a]'}`}
  >
    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-5' : 'translate-x-1'}`} />
  </button>
);

const SettingRow = ({ icon, title, desc, children }) => (
  <div className="flex items-center justify-between py-3.5 border-b border-[#27272a] last:border-none">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-[#27272a] flex items-center justify-center text-[#a1a1aa] flex-shrink-0">
        {icon}
      </div>
      <div>
        <div className="font-medium text-[#fafafa] text-[13.5px]">{title}</div>
        <div className="text-[12px] text-[#52525b] mt-0.5">{desc}</div>
      </div>
    </div>
    {children}
  </div>
);

const SectionCard = ({ title, icon, children }) => (
  <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 mb-5">
    <div className="flex items-center gap-2 mb-4">
      <span className="text-[#3b82f6]">{icon}</span>
      <h2 className="text-[14px] font-semibold text-[#fafafa]">{title}</h2>
    </div>
    {children}
  </div>
);

const Settings = () => {
  const { theme, toggleTheme, isDark } = useTheme();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [ticketUpdates, setTicketUpdates] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [twoFactor, setTwoFactor] = useState(false);
  const [sessionAlerts, setSessionAlerts] = useState(true);

  return (
    <PageWrapper>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <Breadcrumb />

        <div className="mt-6 mb-8">
          <h1 className="text-[22px] font-bold text-[#fafafa] mb-1">Settings</h1>
          <p className="text-[13px] text-[#a1a1aa]">Manage your account preferences, notifications, and appearance</p>
        </div>

        {/* Appearance */}
        <SectionCard
          title="Appearance"
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>}
        >
          <SettingRow
            icon={isDark
              ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><circle cx="12" cy="12" r="5"/><path strokeLinecap="round" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
            }
            title={isDark ? 'Dark Mode' : 'Light Mode'}
            desc={isDark ? 'Currently using the dark theme' : 'Currently using the light theme'}
          >
            <Toggle enabled={isDark} onChange={toggleTheme} />
          </SettingRow>
        </SectionCard>

        {/* Notifications */}
        <SectionCard
          title="Notifications"
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>}
        >
          <SettingRow
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>}
            title="Email Notifications"
            desc="Receive email updates about your tickets"
          >
            <Toggle enabled={emailNotifications} onChange={setEmailNotifications} />
          </SettingRow>
          <SettingRow
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 01-6-6v-5.25A6 6 0 0112 1.5a6 6 0 016 6v5.25a6 6 0 01-6 6zm0 0v2.25m0 0H9.75m2.25 0H14.25"/></svg>}
            title="Push Notifications"
            desc="Get browser notifications for real-time updates"
          >
            <Toggle enabled={pushNotifications} onChange={setPushNotifications} />
          </SettingRow>
          <SettingRow
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>}
            title="Ticket Status Updates"
            desc="Notify me when my ticket status changes"
          >
            <Toggle enabled={ticketUpdates} onChange={setTicketUpdates} />
          </SettingRow>
          <SettingRow
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>}
            title="Weekly Digest"
            desc="Receive a weekly summary of all ticket activity"
          >
            <Toggle enabled={weeklyDigest} onChange={setWeeklyDigest} />
          </SettingRow>
        </SectionCard>

        {/* Security */}
        <SectionCard
          title="Security"
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>}
        >
          <SettingRow
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>}
            title="Two-Factor Authentication"
            desc="Add an extra layer of security to your account"
          >
            <Toggle enabled={twoFactor} onChange={setTwoFactor} />
          </SettingRow>
          <SettingRow
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"/></svg>}
            title="Login Activity Alerts"
            desc="Get alerted on new sign-in attempts"
          >
            <Toggle enabled={sessionAlerts} onChange={setSessionAlerts} />
          </SettingRow>
        </SectionCard>

        {/* Account */}
        <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[#3b82f6]">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </span>
            <h2 className="text-[14px] font-semibold text-[#fafafa]">Account</h2>
          </div>
          <div className="space-y-2">
            {[
              { label: 'Change Password', icon: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z', color: 'text-[#a1a1aa]', bg: 'bg-[#27272a]', hover: 'hover:bg-[#3f3f46]' },
              { label: 'Export My Data', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4', color: 'text-[#a1a1aa]', bg: 'bg-[#27272a]', hover: 'hover:bg-[#3f3f46]' },
              { label: 'Delete Account', icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16', color: 'text-[#ef4444]', bg: 'bg-[#1f0e0e]', hover: 'hover:bg-[#2a1010]', border: 'border border-[#3d1515]' },
            ].map(({ label, icon, color, bg, hover, border }) => (
              <button key={label} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${bg} ${border || ''} ${hover} transition-colors ${color} text-[13.5px] font-medium`}>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                </svg>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
};

export default Settings;
