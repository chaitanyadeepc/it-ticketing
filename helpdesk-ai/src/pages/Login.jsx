import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Button from '../components/ui/Button';
import api from '../api/api';

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const payload = isRegister ? { name, email, password } : { email, password };
      const { data } = await api.post(endpoint, payload);
      localStorage.setItem('token', data.token);
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('userEmail', data.user.email);
      localStorage.setItem('userName', data.user.name);
      localStorage.setItem('userRole', data.user.role);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Is the server running?');
    } finally {
      setLoading(false);
    }
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
        <div className="relative flex items-center gap-3">
          <div className="w-9 h-9 bg-[#3b82f6] rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <span className="text-[17px] font-semibold text-[#fafafa]">TicketFlow</span>
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
          <div className="lg:hidden flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-[#3b82f6] rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <span className="text-[15px] font-semibold text-[#fafafa]">TicketFlow</span>
          </div>

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
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  required
                  minLength={6}
                  className="w-full h-10 px-3.5 rounded-lg bg-[#18181b] border border-[#27272a] text-[#fafafa] text-[14px] placeholder-[#52525b] focus:outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/20 transition-all"
                />
              </div>

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
        </div>
      </div>
    </div>
  );
};

export default Login;
