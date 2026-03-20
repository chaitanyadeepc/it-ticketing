import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageWrapper from '../components/layout/PageWrapper';
import Breadcrumb from '../components/layout/Breadcrumb';
import { useTheme } from '../context/ThemeContext';
import OTPInput from '../components/OTPInput';
import api from '../api/api';
import { logActivity } from '../utils/activityLog';

const Toggle = ({ enabled, onChange }) => (
  <button
    onClick={() => onChange(!enabled)}
    className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${enabled ? 'bg-[#3b82f6]' : 'bg-[#27272a]'}`}
  >
    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-5' : 'translate-x-1'}`} />
  </button>
);

const SettingRow = ({ icon, title, desc, children }) => (
  <div className="flex items-start sm:items-center justify-between py-3.5 border-b border-[#27272a] last:border-none gap-3">
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <div className="w-8 h-8 rounded-lg bg-[#27272a] flex items-center justify-center text-[#a1a1aa] flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="font-medium text-[#fafafa] text-[13.5px]">{title}</div>
        <div className="text-[12px] text-[#52525b] mt-0.5">{desc}</div>
      </div>
    </div>
    <div className="flex-shrink-0">{children}</div>
  </div>
);

const SectionCard = ({ title, icon, children, accentColor = '#3b82f6' }) => (
  <div className="bg-[#18181b] border border-[#27272a] border-l-[3px] rounded-xl p-5" style={{ borderLeftColor: accentColor }}>
    <div className="flex items-center gap-2 mb-4">
      <span style={{ color: accentColor }}>{icon}</span>
      <h2 className="text-[14px] font-semibold text-[#fafafa]">{title}</h2>
    </div>
    {children}
  </div>
);

const Settings = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme, isDark } = useTheme();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [ticketUpdates, setTicketUpdates] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [twoFactor, setTwoFactor] = useState(false); // kept for backwards compat
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [twoFaMethod, setTwoFaMethod] = useState('email');
  // 2FA setup modal
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [modalStep, setModalStep] = useState('choose'); // 'choose' | 'email-otp' | 'totp-qr'
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [totpManualKey, setTotpManualKey] = useState('');
  const [twoFaOtpKey, setTwoFaOtpKey] = useState(0);
  const [keyCopied, setKeyCopied] = useState(false);
  // 2FA disable confirmation
  const [showDisable, setShowDisable] = useState(false);
  const [disablePwd, setDisablePwd] = useState('');
  const [disableError, setDisableError] = useState('');
  const [disableLoading, setDisableLoading] = useState(false);
  const [sessionAlerts, setSessionAlerts] = useState(true);
  const [loggingEnabled, setLoggingEnabled] = useState(() => localStorage.getItem('hd_log_enabled') !== 'false');
  const [logLevel, setLogLevel] = useState(() => localStorage.getItem('hd_log_level') || 'detailed');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [settingsLoading, setSettingsLoading] = useState(true);

  // Load notification prefs from backend on mount
  useEffect(() => {
    api.get('/users/profile').then(({ data }) => {
      const p = data.user?.notificationPrefs;
      if (!p) return;
      if (p.emailEnabled  !== undefined) setEmailNotifications(p.emailEnabled);
      if (p.ticketUpdates !== undefined) setTicketUpdates(p.ticketUpdates);
      if (p.weeklyDigest  !== undefined) setWeeklyDigest(p.weeklyDigest);
      const tf = data.user?.twoFactor;
      if (tf?.enabled !== undefined) setTwoFaEnabled(tf.enabled);
      if (tf?.method)  setTwoFaMethod(tf.method);
    }).catch(() => {}).finally(() => setSettingsLoading(false));
  }, []);

  const saveNotificationPrefs = async (patch) => {
    setSaving(true);
    setSaveMsg('');
    try {
      await api.put('/users/notifications', patch);
      logActivity('SETTINGS_SAVED', {
        category: 'SETTINGS', severity: 'info',
        detail: `Notification preferences updated`,
        metadata: { changes: patch },
      });
      setSaveMsg('Saved');
      setTimeout(() => setSaveMsg(''), 2000);
    } catch {
      setSaveMsg('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleEmailNotif = (v) => { setEmailNotifications(v); saveNotificationPrefs({ emailEnabled: v }); };
  const handleTicketUpdates = (v) => { setTicketUpdates(v); saveNotificationPrefs({ ticketUpdates: v }); };
  const handleWeeklyDigest = (v) => { setWeeklyDigest(v); saveNotificationPrefs({ weeklyDigest: v }); };

  const handleLoggingToggle = (v) => { setLoggingEnabled(v); localStorage.setItem('hd_log_enabled', String(v)); };
  const handleLogLevel = (level) => { setLogLevel(level); localStorage.setItem('hd_log_level', level); };

  // ── 2FA setup handlers ────────────────────────────────────────────────────
  const open2FASetup = () => { setModalStep('choose'); setModalError(''); setShow2FAModal(true); };

  const start2FAEmail = async () => {
    setModalLoading(true); setModalError('');
    try {
      await api.post('/auth/2fa/setup/email');
      setModalStep('email-otp'); setTwoFaOtpKey((k) => k + 1);
    } catch (err) { setModalError(err.response?.data?.error || 'Failed to send code'); }
    finally { setModalLoading(false); }
  };

  const confirm2FAEmail = async (code) => {
    setModalLoading(true); setModalError('');
    try {
      await api.post('/auth/2fa/setup/email/confirm', { code });
      setTwoFaEnabled(true); setTwoFaMethod('email'); setShow2FAModal(false);
      logActivity('2FA_ENABLED', {
        category: 'SETTINGS', severity: 'warning',
        detail: '2FA enabled via email OTP',
        metadata: { method: 'email' },
      });
      setSaveMsg('2FA enabled via email OTP'); setTimeout(() => setSaveMsg(''), 3000);
    } catch (err) { setModalError(err.response?.data?.error || 'Verification failed'); setTwoFaOtpKey((k) => k + 1); }
    finally { setModalLoading(false); }
  };

  const start2FATOTP = async () => {
    setModalLoading(true); setModalError('');
    try {
      const { data } = await api.post('/auth/2fa/setup/totp');
      setQrDataUrl(data.qrDataURL); setTotpManualKey(data.manualKey);
      setModalStep('totp-qr'); setTwoFaOtpKey((k) => k + 1);
    } catch (err) { setModalError(err.response?.data?.error || 'Failed to generate QR code'); }
    finally { setModalLoading(false); }
  };

  const confirm2FATOTP = async (code) => {
    setModalLoading(true); setModalError('');
    try {
      await api.post('/auth/2fa/setup/totp/confirm', { code });
      setTwoFaEnabled(true); setTwoFaMethod('totp'); setShow2FAModal(false);
      logActivity('2FA_ENABLED', {
        category: 'SETTINGS', severity: 'warning',
        detail: '2FA enabled via authenticator app (TOTP)',
        metadata: { method: 'totp' },
      });
      setSaveMsg('2FA enabled via authenticator app'); setTimeout(() => setSaveMsg(''), 3000);
    } catch (err) { setModalError(err.response?.data?.error || 'Verification failed'); setTwoFaOtpKey((k) => k + 1); }
    finally { setModalLoading(false); }
  };

  const handleDisable2FA = async () => {
    setDisableLoading(true); setDisableError('');
    try {
      await api.post('/auth/2fa/disable', { password: disablePwd });
      setTwoFaEnabled(false); setShowDisable(false); setDisablePwd('');
      logActivity('2FA_DISABLED', {
        category: 'SETTINGS', severity: 'critical',
        detail: '2FA has been disabled for this account',
        metadata: { previousMethod: twoFaMethod },
      });
      setSaveMsg('2FA has been disabled'); setTimeout(() => setSaveMsg(''), 3000);
    } catch (err) { setDisableError(err.response?.data?.error || 'Failed to disable 2FA'); }
    finally { setDisableLoading(false); }
  };

  if (settingsLoading) return (
    <PageWrapper>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-5">
        <div className="skeleton h-4 w-24 rounded mb-5" />
        {/* Header banner */}
        <div className="rounded-2xl border border-[#27272a] bg-[#18181b] p-5 mb-5 space-y-2">
          <div className="skeleton h-6 w-24 rounded" />
          <div className="skeleton h-3 w-72 rounded" />
        </div>
        {/* Section cards */}
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[#27272a] bg-[#18181b] p-5 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="skeleton w-5 h-5 rounded" />
              <div className="skeleton h-4 w-32 rounded" />
            </div>
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="flex items-center justify-between py-3.5 border-b border-[#27272a] last:border-0">
                <div className="flex items-center gap-3">
                  <div className="skeleton w-8 h-8 rounded-lg" />
                  <div className="space-y-1.5">
                    <div className="skeleton h-3.5 w-36 rounded" />
                    <div className="skeleton h-3 w-52 rounded" />
                  </div>
                </div>
                <div className="skeleton w-10 h-5 rounded-full" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </PageWrapper>
  );

  return (
    <>
    <PageWrapper>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-5">
        <Breadcrumb />

        <div className="flex flex-wrap items-center justify-between gap-3 p-5 mb-5 rounded-2xl bg-gradient-to-r from-[#8b5cf6]/8 via-[#3b82f6]/4 to-transparent border border-[#8b5cf6]/15">
          <div>
            <h1 className="text-[24px] font-bold text-[#fafafa] mb-0.5">Settings</h1>
            <p className="text-[13px] text-[#a1a1aa]">Manage your account preferences, notifications, and appearance</p>
          </div>
        </div>

        {/* Top two-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start mb-5">

          {/* Left column: Appearance + Security */}
          <div className="space-y-5">
            <SectionCard
              accentColor="#8b5cf6"
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

            <SectionCard
              accentColor="#22c55e"
              title="Security"
              icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>}
            >
              {/* 2FA Row — real implementation */}
              <div className="py-3.5 border-b border-[#27272a]">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#27272a] flex items-center justify-center text-[#a1a1aa] flex-shrink-0">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                    </div>
                    <div>
                      <div className="font-medium text-[#fafafa] text-[13.5px]">Two-Factor Authentication</div>
                      <div className="text-[12px] text-[#52525b] mt-0.5">
                        {twoFaEnabled
                          ? <span>Active — <span className="text-[#22c55e]">{twoFaMethod === 'email' ? 'Email OTP' : 'Authenticator App'}</span></span>
                          : 'Add an extra layer of security to your account'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    {twoFaEnabled ? (
                      <>
                        <span className="text-[10px] font-semibold text-[#22c55e] bg-[#22c55e]/10 px-2 py-0.5 rounded-full border border-[#22c55e]/20">ON</span>
                        <button onClick={() => { setShowDisable(true); setDisableError(''); setDisablePwd(''); }} className="text-[12px] text-[#ef4444] hover:text-[#f87171] transition-colors font-medium">Disable</button>
                      </>
                    ) : (
                      <button onClick={open2FASetup} className="text-[12px] text-[#3b82f6] hover:text-[#60a5fa] transition-colors font-medium">Enable</button>
                    )}
                  </div>
                </div>
                {/* Disable confirmation */}
                {showDisable && (
                  <div className="mt-3 p-3 bg-[#1a0a0a] border border-[#3d1515] rounded-lg">
                    <p className="text-[12px] text-[#f87171] mb-2 font-medium">Confirm your password to disable 2FA</p>
                    <input
                      type="password"
                      value={disablePwd}
                      onChange={(e) => setDisablePwd(e.target.value)}
                      placeholder="Current password"
                      className="w-full h-9 px-3 rounded-lg bg-[#09090b] border border-[#3f3f46] text-[#fafafa] text-[13px] placeholder-[#52525b] focus:outline-none focus:border-[#ef4444] mb-2"
                    />
                    {disableError && <p className="text-[12px] text-[#ef4444] mb-2">{disableError}</p>}
                    <div className="flex gap-2">
                      <button onClick={handleDisable2FA} disabled={disableLoading || !disablePwd} className="px-3 py-1.5 bg-[#ef4444] hover:bg-[#dc2626] disabled:opacity-50 rounded-lg text-white text-[12px] font-medium transition-colors">
                        {disableLoading ? 'Disabling…' : 'Confirm Disable'}
                      </button>
                      <button onClick={() => setShowDisable(false)} className="px-3 py-1.5 bg-[#27272a] hover:bg-[#3f3f46] rounded-lg text-[#a1a1aa] text-[12px] transition-colors">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
              <SettingRow
                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"/></svg>}
                title="Login Activity Alerts"
                desc="Get alerted on new sign-in attempts"
              >
                <Toggle enabled={sessionAlerts} onChange={setSessionAlerts} />
              </SettingRow>
            </SectionCard>
          </div>

          {/* Right column: Notifications */}
          <SectionCard
            accentColor="#3b82f6"
            title="Notifications"
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>}
          >
            {saveMsg && (
              <div className={`mb-3 px-3 py-2 rounded-lg text-[12px] font-medium ${saveMsg === 'Saved' ? 'bg-[#22c55e]/10 text-[#22c55e]' : 'bg-[#ef4444]/10 text-[#ef4444]'}`}>
                {saveMsg === 'Saved' ? '✓ Preferences saved' : '✗ ' + saveMsg}
              </div>
            )}
            <SettingRow
              icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>}
              title="Email Notifications"
              desc="Receive email updates about your tickets"
            >
              <Toggle enabled={emailNotifications} onChange={handleEmailNotif} />
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
              <Toggle enabled={ticketUpdates} onChange={handleTicketUpdates} />
            </SettingRow>
            <SettingRow
              icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>}
              title="Weekly Digest"
              desc="Receive a weekly summary of all ticket activity"
            >
              <Toggle enabled={weeklyDigest} onChange={handleWeeklyDigest} />
            </SettingRow>
          </SectionCard>
        </div>

        {/* Activity Logging */}
        <div className="mb-5">
        <SectionCard
          accentColor="#f59e0b"
          title="Activity Logging"
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"/></svg>}
        >
          <SettingRow
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z"/></svg>}
            title="Enable Activity Logging"
            desc="Track user actions, login events, and system changes across the application"
          >
            <Toggle enabled={loggingEnabled} onChange={handleLoggingToggle} />
          </SettingRow>

          {loggingEnabled && (
            <div className="pt-3 pb-1">
              <p className="text-[11px] font-semibold text-[#a1a1aa] uppercase tracking-wider mb-2.5">Log Level</p>
              <div className="flex gap-1.5 flex-wrap">
                {[
                  { value: 'detailed',    label: 'All Events',    desc: 'Logs everything: info, warnings and errors' },
                  { value: 'info_error',  label: 'Info & Errors', desc: 'Skips warning-level events' },
                  { value: 'errors_only', label: 'Errors Only',   desc: 'Only critical and error-level events' },
                ].map(({ value, label, desc }) => (
                  <button
                    key={value}
                    onClick={() => handleLogLevel(value)}
                    title={desc}
                    className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all ${
                      logLevel === value
                        ? 'bg-[#f59e0b]/15 border-[#f59e0b]/40 text-[#f59e0b]'
                        : 'bg-[#27272a] border-[#3f3f46] text-[#71717a] hover:text-[#a1a1aa] hover:border-[#52525b]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-[#52525b] mt-2">
                {logLevel === 'detailed'    && 'All actions are logged — ticket changes, logins, admin operations, and warnings.'}
                {logLevel === 'info_error'  && 'Logs informational events and errors; minor warnings are skipped.'}
                {logLevel === 'errors_only' && 'Only critical failures and error-level events are stored.'}
              </p>
              <div className="mt-3 px-3 py-2.5 bg-[#f59e0b]/5 border border-[#f59e0b]/15 rounded-lg">
                <p className="text-[11.5px] text-[#a1a1aa]">Activity logs are visible to admins via <span className="text-[#f59e0b]">Admin → Activity Log</span>. Stored for up to 30 days.</p>
              </div>
            </div>
          )}
          {!loggingEnabled && (
            <div className="mt-2 px-3 py-2.5 bg-[#27272a] border border-[#3f3f46] rounded-lg">
              <p className="text-[11.5px] text-[#71717a]">Logging is disabled — no new activity events will be recorded until re-enabled.</p>
            </div>
          )}
        </SectionCard>
        </div>

        {/* Account — full width bottom row */}
        <div className="bg-[#18181b] border border-[#27272a] border-l-[3px] rounded-xl p-5" style={{ borderLeftColor: '#ef4444' }}>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[#ef4444]">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </span>
            <h2 className="text-[14px] font-semibold text-[#fafafa]">Account</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              onClick={() => navigate('/profile')}
              className="flex items-center justify-center gap-2.5 px-4 py-3 rounded-lg bg-[#27272a] hover:bg-[#3f3f46] transition-colors text-[#a1a1aa] text-[13.5px] font-medium"
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              Change Password
            </button>
            <button
              onClick={() => {
                api.get('/tickets').then(r => {
                  const tickets = r.data.tickets || [];
                  const userEmail = localStorage.getItem('userEmail') || '';
                  const header = ['Ticket ID', 'Title', 'Category', 'Priority', 'Status', 'Created At'];
                  const rows = tickets.map(t => [
                    t.ticketId || t._id,
                    `"${(t.title || '').replace(/"/g, '""')}"`,
                    t.category || '', t.priority || '', t.status || '',
                    new Date(t.createdAt).toLocaleDateString(),
                  ]);
                  const csv = [header, ...rows].map(r => r.join(',')).join('\n');
                  const a = Object.assign(document.createElement('a'), {
                    href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
                    download: `my-tickets-${new Date().toISOString().slice(0,10)}.csv`,
                  });
                  a.click();
                  URL.revokeObjectURL(a.href);
                });
              }}
              className="flex items-center justify-center gap-2.5 px-4 py-3 rounded-lg bg-[#27272a] hover:bg-[#3f3f46] transition-colors text-[#a1a1aa] text-[13.5px] font-medium"
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export My Data
            </button>
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to delete your account? This action is irreversible.')) {
                  api.delete('/users/me').then(() => {
                    localStorage.clear();
                    window.location.href = '/login';
                  }).catch(() => window.alert('Failed to delete account. Please contact an administrator.'));
                }
              }}
              className="flex items-center justify-center gap-2.5 px-4 py-3 rounded-lg bg-[#1f0e0e] border border-[#3d1515] hover:bg-[#2a1010] transition-colors text-[#ef4444] text-[13.5px] font-medium"
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </PageWrapper>

      {/* ── 2FA Setup Modal ── */}
      {show2FAModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-6 w-full max-w-md shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/></svg>
                </div>
                <h3 className="text-[15px] font-semibold text-[#fafafa]">Enable Two-Factor Authentication</h3>
              </div>
              <button onClick={() => setShow2FAModal(false)} className="text-[#52525b] hover:text-[#a1a1aa] transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            {modalError && (
              <div className="mb-4 flex items-center gap-2 p-3 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-lg text-[13px] text-[#ef4444]">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                {modalError}
              </div>
            )}

            {/* Step 1: Choose method */}
            {modalStep === 'choose' && (
              <div className="space-y-3">
                <p className="text-[13px] text-[#71717a] mb-4">Choose how you'd like to receive your verification codes:</p>
                <button
                  onClick={start2FAEmail}
                  disabled={modalLoading}
                  className="w-full flex items-start gap-4 p-4 bg-[#09090b] hover:bg-[#27272a] border border-[#27272a] hover:border-[#3b82f6]/40 rounded-xl transition-all text-left group disabled:opacity-60"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#3b82f6]/10 border border-[#3b82f6]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-5 h-5 text-[#3b82f6]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                  </div>
                  <div>
                    <div className="font-semibold text-[#fafafa] text-[13.5px] mb-0.5">Email OTP</div>
                    <div className="text-[12px] text-[#52525b]">Receive a 6-digit code to your email each time you sign in.</div>
                  </div>
                </button>
                <button
                  onClick={start2FATOTP}
                  disabled={modalLoading}
                  className="w-full flex items-start gap-4 p-4 bg-[#09090b] hover:bg-[#27272a] border border-[#27272a] hover:border-[#8b5cf6]/40 rounded-xl transition-all text-left group disabled:opacity-60"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-5 h-5 text-[#8b5cf6]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                  </div>
                  <div>
                    <div className="font-semibold text-[#fafafa] text-[13.5px] mb-0.5">Authenticator App</div>
                    <div className="text-[12px] text-[#52525b]">Use Google Authenticator, Authy, or any TOTP app. Works offline.</div>
                  </div>
                </button>
                {modalLoading && <p className="text-center text-[12px] text-[#52525b] animate-pulse">Setting up…</p>}
              </div>
            )}

            {/* Step 2a: Email OTP verification */}
            {modalStep === 'email-otp' && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <button onClick={() => setModalStep('choose')} className="text-[#52525b] hover:text-[#a1a1aa] transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
                  </button>
                  <span className="text-[13px] text-[#a1a1aa]">Email OTP</span>
                </div>
                <p className="text-[13px] text-[#71717a] mb-5">A verification code was sent to your email. Enter it below to activate 2FA.</p>
                <OTPInput key={twoFaOtpKey} onComplete={confirm2FAEmail} error={!!modalError} />
                {modalLoading && <p className="text-center text-[12px] text-[#52525b] mt-4 animate-pulse">Verifying…</p>}
                <button onClick={start2FAEmail} disabled={modalLoading} className="mt-4 w-full text-center text-[12px] text-[#52525b] hover:text-[#a1a1aa] disabled:opacity-40 transition-colors">
                  Resend code
                </button>
              </div>
            )}

            {/* Step 2b: TOTP QR code + confirmation */}
            {modalStep === 'totp-qr' && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <button onClick={() => setModalStep('choose')} className="text-[#52525b] hover:text-[#a1a1aa] transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
                  </button>
                  <span className="text-[13px] text-[#a1a1aa]">Authenticator App</span>
                </div>
                <p className="text-[13px] text-[#71717a] mb-4">
                  Scan the QR code with <strong className="text-[#a1a1aa]">Google Authenticator</strong>, <strong className="text-[#a1a1aa]">Authy</strong>, or any TOTP app, then enter the 6-digit code.
                </p>
                {qrDataUrl && (
                  <div className="flex flex-col items-center mb-4">
                    <div className="bg-white p-3 rounded-xl">
                      <img src={qrDataUrl} alt="2FA QR Code" className="w-40 h-40" />
                    </div>
                    <div className="mt-3 w-full">
                      <p className="text-[11px] text-[#52525b] mb-1.5 text-center">Or enter manually:</p>
                      <div className="flex items-center gap-2 bg-[#09090b] border border-[#27272a] rounded-lg px-3 py-2">
                        <code className="flex-1 text-[11px] text-[#a1a1aa] font-mono break-all">
                          {totpManualKey.match(/.{1,4}/g)?.join(' ')}
                        </code>
                        <button
                          onClick={() => { navigator.clipboard.writeText(totpManualKey); setKeyCopied(true); setTimeout(() => setKeyCopied(false), 2000); }}
                          className="text-[#52525b] hover:text-[#a1a1aa] flex-shrink-0 transition-colors"
                          title="Copy key"
                        >
                          {keyCopied
                            ? <svg className="w-4 h-4 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                            : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                          }
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                <OTPInput key={twoFaOtpKey} onComplete={confirm2FATOTP} error={!!modalError} />
                {modalLoading && <p className="text-center text-[12px] text-[#52525b] mt-4 animate-pulse">Verifying…</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Settings;
