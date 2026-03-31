import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Button from '../components/ui/Button';
import OTPInput from '../components/OTPInput';
import api from '../api/api';
import LogoMark from '../components/ui/LogoMark';
import { logActivity } from '../utils/activityLog';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const from = location.state?.from || '/';

  // 2FA state
  const [step, setStep] = useState('credentials'); // 'credentials' | '2fa' | 'forgot-email' | 'forgot-otp' | 'forgot-newpw'
  const [twoFaToken, setTwoFaToken] = useState('');
  const [twoFaMethod, setTwoFaMethod] = useState('email');
  const [twoFaError, setTwoFaError] = useState('');
  const [twoFaLoading, setTwoFaLoading] = useState(false);
  const [otpKey, setOtpKey] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showPw, setShowPw] = useState(false);

  // Forgot-password state
  const [fpEmail, setFpEmail]         = useState('');
  const [fpOtp, setFpOtp]             = useState('');
  const [fpNewPw, setFpNewPw]         = useState('');
  const [fpConfirmPw, setFpConfirmPw] = useState('');
  const [fpLoading, setFpLoading]     = useState(false);
  const [fpError, setFpError]         = useState('');
  const [fpSuccess, setFpSuccess]     = useState('');
  const [fpResend, setFpResend]       = useState(0);
  const [fpShowPw, setFpShowPw]       = useState(false);

  const inactivity = new URLSearchParams(location.search).get('reason') === 'inactivity';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const payload = isRegister ? { name, email, password } : { email, password };
      const { data } = await api.post(endpoint, payload);

      // 2FA required — go to verification step
      if (data.requires2FA) {
        logActivity('2FA_INITIATED', {
          category: 'AUTH', severity: 'info',
          detail: `2FA step triggered for ${email}`,
          metadata: { email, method: data.method },
          actor: { id: null, name: email, email, role: 'unknown' },
        });
        setTwoFaToken(data.tempToken);
        setTwoFaMethod(data.method);
        setStep('2fa');
        if (data.method === 'email') startResendCooldown(60);
        return;
      }
      localStorage.setItem('token', data.token);
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('userEmail', data.user.email);
      localStorage.setItem('userName', data.user.name);
      localStorage.setItem('userRole', data.user.role);
      if (data.user._id) localStorage.setItem('userId', data.user._id);
      if (isRegister) {
        logActivity('USER_REGISTERED', {
          category: 'AUTH', severity: 'info',
          detail: `New account created for ${data.user.email}`,
          metadata: { name: data.user.name, email: data.user.email, role: data.user.role },
          actor: { id: data.user._id || null, name: data.user.name, email: data.user.email, role: data.user.role },
        });
      } else {
        logActivity('USER_LOGIN', {
          category: 'AUTH', severity: 'info',
          detail: `${data.user.email} signed in (password)`,
          metadata: { email: data.user.email, role: data.user.role, method: 'password' },
          actor: { id: data.user._id || null, name: data.user.name, email: data.user.email, role: data.user.role },
        });
      }
      navigate(from, { replace: true });
    } catch (err) {
      logActivity('LOGIN_FAILED', {
        category: 'AUTH', severity: 'warning',
        detail: `Failed login attempt for ${email}`,
        metadata: { email, isRegister, reason: err.response?.data?.error || 'Unknown error' },
        actor: { id: null, name: email, email, role: 'unknown' },
      });
      setError(err.response?.data?.error || 'Something went wrong. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  const storeAuth = (data) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('userEmail', data.user.email);
    localStorage.setItem('userName', data.user.name);
    localStorage.setItem('userRole', data.user.role);
    if (data.user._id) localStorage.setItem('userId', data.user._id);
  };

  const startResendCooldown = (secs) => {
    setResendCooldown(secs);
    const iv = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) { clearInterval(iv); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleVerify2FA = async (code) => {
    if (twoFaLoading) return;
    setTwoFaError('');
    setTwoFaLoading(true);
    try {
      const { data } = await api.post('/auth/2fa/verify', { tempToken: twoFaToken, code });
      storeAuth(data);
      logActivity('USER_LOGIN_2FA', {
        category: 'AUTH', severity: 'info',
        detail: `${data.user.email} signed in via 2FA (${twoFaMethod})`,
        metadata: { email: data.user.email, role: data.user.role, method: twoFaMethod },
        actor: { id: data.user._id || null, name: data.user.name, email: data.user.email, role: data.user.role },
      });
      navigate(from, { replace: true });
    } catch (err) {
      setTwoFaError(err.response?.data?.error || 'Verification failed');
      setOtpKey((k) => k + 1);
    } finally {
      setTwoFaLoading(false);
    }
  };

  const handleResend2FA = async () => {
    try {
      await api.post('/auth/2fa/resend', { tempToken: twoFaToken });
      startResendCooldown(60);
    } catch (err) {
      setTwoFaError(err.response?.data?.error || 'Failed to resend code');
    }
  };

  const startFpResend = (secs) => {
    setFpResend(secs);
    const iv = setInterval(() => {
      setFpResend(prev => { if (prev <= 1) { clearInterval(iv); return 0; } return prev - 1; });
    }, 1000);
  };

  const handleFpSendOtp = async (e) => {
    e?.preventDefault();
    if (!fpEmail.trim()) { setFpError('Enter your email address'); return; }
    setFpLoading(true); setFpError('');
    try {
      await api.post('/auth/forgot-password', { email: fpEmail.trim() });
      setStep('forgot-otp');
      startFpResend(60);
    } catch (err) {
      setFpError(err.response?.data?.error || 'Failed to send code. Try again.');
    } finally { setFpLoading(false); }
  };

  const handleFpVerifyOtp = async () => {
    if (fpOtp.length !== 6) { setFpError('Enter the 6-digit code'); return; }
    setFpLoading(true); setFpError('');
    // We just move to the new-password step; the OTP is verified server-side on submit
    setFpLoading(false);
    setStep('forgot-newpw');
  };

  const handleFpReset = async (e) => {
    e.preventDefault();
    if (fpNewPw.length < 6) { setFpError('Password must be at least 6 characters'); return; }
    if (fpNewPw !== fpConfirmPw) { setFpError('Passwords do not match'); return; }
    setFpLoading(true); setFpError(''); setFpSuccess('');
    try {
      await api.post('/auth/reset-password', { email: fpEmail.trim(), otp: fpOtp, newPassword: fpNewPw });
      setFpSuccess('Password updated! You can now sign in.');
      setTimeout(() => {
        setStep('credentials');
        setFpEmail(''); setFpOtp(''); setFpNewPw(''); setFpConfirmPw('');
        setFpSuccess(''); setFpError('');
      }, 2500);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to reset password';
      // If OTP is wrong/expired, go back to OTP step
      if (msg.toLowerCase().includes('code') || msg.toLowerCase().includes('expired')) {
        setStep('forgot-otp');
        setFpOtp('');
      }
      setFpError(msg);
    } finally { setFpLoading(false); }
  };

  const features = [
    { icon: 'M13 10V3L4 14h7v7l9-11h-7z', title: 'AI-Powered Triage', desc: 'Tickets auto-classified and routed instantly' },
    { icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', title: 'Enterprise Security', desc: 'SOC 2 compliant with end-to-end encryption' },
    { icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', title: 'Real-time Analytics', desc: 'Live dashboards with SLA tracking' },
  ];

  return (
    <div className="h-screen bg-[#09090b] flex overflow-hidden">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[55%] flex-col justify-between p-8 xl:p-10 border-r border-[#27272a] relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: 'linear-gradient(#fafafa 1px, transparent 1px), linear-gradient(90deg, #fafafa 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
        <div className="relative">
          <LogoMark size="lg" />
        </div>
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#3b82f6]/10 border border-[#3b82f6]/20 rounded-full text-[12px] font-medium text-[#3b82f6] mb-4">
            <span className="w-1.5 h-1.5 bg-[#3b82f6] rounded-full animate-pulse" />
            Enterprise IT Support
          </div>
          <h1 className="text-[34px] font-bold text-[#fafafa] leading-[1.15] tracking-tight mb-3">
            Resolve IT issues<br /><span className="text-[#3b82f6]">10x faster</span> with AI
          </h1>
          <p className="text-[15px] text-[#71717a] leading-relaxed mb-5 max-w-md">
            Intelligent ticket routing, automated triage, and real-time collaboration — all in one place.
          </p>
          <div className="space-y-3">
            {features.map((f, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-lg bg-[#18181b] border border-[#27272a] flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-[#3b82f6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={f.icon} />
                  </svg>
                </div>
                <div>
                  <p className="text-[14px] font-medium text-[#fafafa] mb-0.5">{f.title}</p>
                  <p className="text-[13px] text-[#52525b]">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative flex items-center gap-8">
          {[['2,400+', 'Tickets resolved'], ['99.9%', 'Uptime SLA'], ['< 2 min', 'Avg response']].map(([val, lbl]) => (
            <div key={lbl}>
              <p className="text-[20px] font-bold text-[#fafafa]">{val}</p>
              <p className="text-[12px] text-[#52525b]">{lbl}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-[380px]">
          <div className="lg:hidden mb-6">
            <LogoMark size="md" />
          </div>

          {/* ── Inactivity banner ── */}
          {inactivity && (
            <div className="mb-5 flex items-center gap-2 p-3 bg-[#f59e0b]/10 border border-[#f59e0b]/20 rounded-lg text-[13px] text-[#f59e0b]">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              Session expired due to inactivity. Please sign in again.
            </div>
          )}

          {step === 'forgot-email' ? (
            /* ── Forgot password: enter email ── */
            <div className="animate-fade-in">
              <button onClick={() => { setStep('credentials'); setFpError(''); }}
                className="flex items-center gap-1.5 text-[12px] text-[#71717a] hover:text-[#a1a1aa] mb-5 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
                Back to sign in
              </button>
              <div className="w-11 h-11 rounded-xl bg-[#FF634A]/10 border border-[#FF634A]/20 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-[#FF634A]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
              </div>
              <h2 className="text-[26px] font-bold text-[#fafafa] mb-1 tracking-tight">Forgot password?</h2>
              <p className="text-[14px] text-[#71717a] mb-6">Enter your email and we'll send a reset code.</p>
              <form onSubmit={handleFpSendOtp} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-[#a1a1aa] mb-1.5 uppercase tracking-wider">Email address</label>
                  <input type="email" value={fpEmail} onChange={(e) => setFpEmail(e.target.value)} placeholder="you@company.com" required autoFocus
                    className="w-full h-10 px-3.5 rounded-lg bg-[#18181b] border border-[#27272a] text-[#fafafa] text-[14px] placeholder-[#52525b] focus:outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/20 transition-all"/>
                </div>
                {fpError && (
                  <div className="flex items-center gap-2 p-3 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-lg text-[13px] text-[#ef4444]">
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    {fpError}
                  </div>
                )}
                <Button type="submit" variant="primary" size="md" className="w-full flex items-center justify-center gap-2" disabled={fpLoading}>
                  {fpLoading ? (<><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg> Sending…</>) : 'Send Reset Code'}
                </Button>
              </form>
            </div>
          ) : step === 'forgot-otp' ? (
            /* ── Forgot password: verify OTP ── */
            <div className="animate-fade-in">
              <button onClick={() => { setStep('forgot-email'); setFpError(''); }}
                className="flex items-center gap-1.5 text-[12px] text-[#71717a] hover:text-[#a1a1aa] mb-5 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
                Back
              </button>
              <div className="w-11 h-11 rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
              </div>
              <h2 className="text-[26px] font-bold text-[#fafafa] mb-1 tracking-tight">Check your email</h2>
              <p className="text-[14px] text-[#71717a] mb-6">
                We sent a 6-digit code to <strong className="text-[#a1a1aa]">{fpEmail}</strong>
              </p>
              <OTPInput key={`fp-${otpKey}`} onComplete={(code) => { setFpOtp(code); }} error={!!fpError} />
              {fpError && (
                <div className="flex items-center gap-2 mt-4 p-3 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-lg text-[13px] text-[#ef4444]">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  {fpError}
                </div>
              )}
              <Button variant="primary" size="md" className="w-full flex items-center justify-center gap-2 mt-4"
                disabled={fpOtp.length !== 6 || fpLoading}
                onClick={handleFpVerifyOtp}>
                Continue
              </Button>
              <p className="mt-5 text-center text-[13px] text-[#52525b]">
                Didn't receive it?{' '}
                {fpResend > 0 ? (
                  <span className="text-[#3f3f46]">Resend in {fpResend}s</span>
                ) : (
                  <button onClick={(e) => { setFpOtp(''); setOtpKey(k => k + 1); handleFpSendOtp(e); }}
                    className="text-[#3b82f6] hover:text-[#2563eb] font-medium transition-colors">
                    Resend code
                  </button>
                )}
              </p>
            </div>
          ) : step === 'forgot-newpw' ? (
            /* ── Forgot password: set new password ── */
            <div className="animate-fade-in">
              <button onClick={() => { setStep('forgot-otp'); setFpError(''); }}
                className="flex items-center gap-1.5 text-[12px] text-[#71717a] hover:text-[#a1a1aa] mb-5 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
                Back
              </button>
              <div className="w-11 h-11 rounded-xl bg-[#3b82f6]/10 border border-[#3b82f6]/20 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-[#3b82f6]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
              </div>
              <h2 className="text-[26px] font-bold text-[#fafafa] mb-1 tracking-tight">Set new password</h2>
              <p className="text-[14px] text-[#71717a] mb-6">Choose a strong password for your account.</p>
              <form onSubmit={handleFpReset} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-[#a1a1aa] mb-1.5 uppercase tracking-wider">New password</label>
                  <div className="relative">
                    <input type={fpShowPw ? 'text' : 'password'} value={fpNewPw} onChange={(e) => setFpNewPw(e.target.value)}
                      placeholder="Min 6 characters" required minLength={6} autoFocus
                      className="w-full h-10 pl-3.5 pr-10 rounded-lg bg-[#18181b] border border-[#27272a] text-[#fafafa] text-[14px] placeholder-[#52525b] focus:outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/20 transition-all"/>
                    <button type="button" onClick={() => setFpShowPw(v => !v)} tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#52525b] hover:text-[#a1a1aa] transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        {fpShowPw
                          ? <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                          : <><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></>
                        }
                      </svg>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#a1a1aa] mb-1.5 uppercase tracking-wider">Confirm password</label>
                  <input type={fpShowPw ? 'text' : 'password'} value={fpConfirmPw} onChange={(e) => setFpConfirmPw(e.target.value)}
                    placeholder="Repeat password" required
                    className="w-full h-10 px-3.5 rounded-lg bg-[#18181b] border border-[#27272a] text-[#fafafa] text-[14px] placeholder-[#52525b] focus:outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/20 transition-all"/>
                </div>
                {fpError && (
                  <div className="flex items-center gap-2 p-3 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-lg text-[13px] text-[#ef4444]">
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    {fpError}
                  </div>
                )}
                {fpSuccess && (
                  <div className="flex items-center gap-2 p-3 bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-lg text-[13px] text-[#22c55e]">
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                    {fpSuccess}
                  </div>
                )}
                <Button type="submit" variant="primary" size="md" className="w-full flex items-center justify-center gap-2" disabled={fpLoading}>
                  {fpLoading ? (<><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg> Resetting…</>) : 'Reset Password'}
                </Button>
              </form>
            </div>
          ) : step === '2fa' ? (
            <div className="animate-fade-in">
              <button
                onClick={() => { setStep('credentials'); setTwoFaError(''); }}
                className="flex items-center gap-1.5 text-[12px] text-[#71717a] hover:text-[#a1a1aa] mb-5 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
                Back to sign in
              </button>

              <div className="w-11 h-11 rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/></svg>
              </div>
              <h2 className="text-[26px] font-bold text-[#fafafa] mb-1 tracking-tight">2-Step Verification</h2>
              <p className="text-[14px] text-[#71717a] mb-6">
                {twoFaMethod === 'email'
                  ? <>A 6-digit code was sent to <strong className="text-[#a1a1aa]">{email}</strong></>
                  : 'Enter the 6-digit code from your authenticator app.'}
              </p>

              <OTPInput key={otpKey} onComplete={handleVerify2FA} error={!!twoFaError} />

              {twoFaLoading && (
                <div className="flex justify-center mt-4">
                  <svg className="w-5 h-5 animate-spin text-[#3b82f6]" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                </div>
              )}

              {twoFaError && (
                <div className="flex items-center gap-2 mt-4 p-3 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-lg text-[13px] text-[#ef4444]">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  {twoFaError}
                </div>
              )}

              {twoFaMethod === 'email' && (
                <p className="mt-5 text-center text-[13px] text-[#52525b]">
                  Didn't receive it?{' '}
                  {resendCooldown > 0 ? (
                    <span className="text-[#3f3f46]">Resend in {resendCooldown}s</span>
                  ) : (
                    <button onClick={handleResend2FA} className="text-[#3b82f6] hover:text-[#2563eb] font-medium transition-colors">
                      Resend code
                    </button>
                  )}
                </p>
              )}
            </div>
          ) : (
            /* ── Credentials screen ── */
            <div className="animate-fade-in">
              <h2 className="text-[28px] font-bold text-[#fafafa] mb-1 tracking-tight">
                {isRegister ? 'Create account' : 'Welcome back'}
              </h2>
              <p className="text-[14px] text-[#71717a] mb-5">
                {isRegister ? 'Register with your work email.' : 'Sign in with your work email to continue.'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegister && (
                <div>
                  <label className="block text-[11px] font-semibold text-[#a1a1aa] mb-1.5 uppercase tracking-wider">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    required
                    className="w-full h-10 px-3.5 rounded-lg bg-[#18181b] border border-[#27272a] text-[#fafafa] text-[14px] placeholder-[#52525b] focus:outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/20 transition-all"
                  />
                </div>
              )}
              <div>
                <label className="block text-[11px] font-semibold text-[#a1a1aa] mb-1.5 uppercase tracking-wider">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  autoFocus
                  className="w-full h-10 px-3.5 rounded-lg bg-[#18181b] border border-[#27272a] text-[#fafafa] text-[14px] placeholder-[#52525b] focus:outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#a1a1aa] mb-1.5 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    required
                    minLength={6}
                    className="w-full h-10 pl-3.5 pr-10 rounded-lg bg-[#18181b] border border-[#27272a] text-[#fafafa] text-[14px] placeholder-[#52525b] focus:outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#52525b] hover:text-[#a1a1aa] transition-colors"
                    tabIndex={-1}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {!isRegister && (
                <div className="flex justify-end -mt-1">
                  <button
                    type="button"
                    onClick={() => { setStep('forgot-email'); setFpEmail(email); setFpError(''); }}
                    className="text-[12px] text-[#3b82f6] hover:text-[#2563eb] transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 p-3 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-lg text-[13px] text-[#ef4444]">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}

              <Button type="submit" variant="primary" size="md" className="w-full flex items-center justify-center gap-2" disabled={loading}>
                {loading ? (
                  <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg> {isRegister ? 'Creating...' : 'Signing in...'}</>
                ) : (
                  isRegister ? 'Create Account' : 'Sign In'
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-[13px] text-[#52525b]">
              {isRegister ? 'Already have an account? ' : "Don't have an account? "}
              <button onClick={() => { setIsRegister(!isRegister); setError(''); }} className="text-[#3b82f6] hover:text-[#2563eb] font-medium transition-colors">
                {isRegister ? 'Sign in' : 'Register'}
              </button>
            </p>
          </div>
          )} {/* end step === '2fa' ? ... : ... */}
        </div>
      </div>
    </div>
  );
};

export default Login;
