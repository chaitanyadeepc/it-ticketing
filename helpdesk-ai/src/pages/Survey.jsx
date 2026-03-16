import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LogoMark from '../components/ui/LogoMark';

// ── Confetti particle ──────────────────────────────────────────────────────
const COLORS = ['#3b82f6','#22c55e','#f59e0b','#a855f7','#ef4444','#06b6d4','#84cc16'];
function Confetti() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const particles = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * 200,
      r: 4 + Math.random() * 6,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      vx: (Math.random() - 0.5) * 3,
      vy: 2 + Math.random() * 4,
      rot: Math.random() * 360,
      rotV: (Math.random() - 0.5) * 6,
      shape: Math.random() > 0.5 ? 'rect' : 'circle',
    }));
    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.rot += p.rotV;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate((p.rot * Math.PI) / 180);
        ctx.fillStyle = p.color; ctx.globalAlpha = Math.max(0, 1 - p.y / canvas.height);
        if (p.shape === 'rect') ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
        else { ctx.beginPath(); ctx.arc(0, 0, p.r / 2, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-10" />;
}

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const STORAGE_KEY = 'hiticket_survey_draft';
const OPTIONAL_STEPS = ['name', 'suggestions'];

// ── Welcome / intro screen ─────────────────────────────────────────────────
function WelcomeScreen({ onStart }) {
  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col">
      <header className="flex items-center px-4 sm:px-6 py-4 border-b border-[#27272a]">
        <Link to="/"><LogoMark size="lg" /></Link>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-12">
        <div className="w-full max-w-xl">

          {/* Badge */}
          <div className="flex justify-center mb-7">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#3b82f6]/10 border border-[#3b82f6]/20 text-[#3b82f6] text-[11px] font-semibold uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] animate-pulse" />
              User Research Survey
            </span>
          </div>

          {/* Heading */}
          <h1 className="text-[28px] sm:text-[36px] font-black text-[#fafafa] text-center leading-tight mb-4">
            Help us build a better<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#3b82f6] to-[#06b6d4]">
              IT Support experience
            </span>
          </h1>
          <p className="text-[14px] text-[#71717a] text-center leading-relaxed mb-8 max-w-md mx-auto">
            We're developing <strong className="text-[#a1a1aa]">HiTicket</strong> — an AI-powered IT helpdesk platform
            that makes raising, tracking, and resolving support requests fast and effortless.
            Your feedback directly shapes what we build.
          </p>

          {/* Feature highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10">
            {[
              { icon: '🎫', title: 'Smart Ticketing',  desc: 'AI auto-categorises and prioritises your requests instantly' },
              { icon: '🤖', title: 'AI Chatbot',       desc: 'Resolve common issues without waiting for an agent' },
              { icon: '📊', title: 'Live Tracking',    desc: "Real-time status updates so you're never left in the dark" },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="flex flex-col items-center text-center p-4 rounded-xl bg-[#18181b] border border-[#27272a]">
                <span className="text-2xl mb-2">{icon}</span>
                <p className="text-[12px] font-semibold text-[#fafafa] mb-1">{title}</p>
                <p className="text-[11px] text-[#52525b] leading-snug">{desc}</p>
              </div>
            ))}
          </div>

          {/* Meta info */}
          <div className="flex items-center justify-center gap-6 mb-8 text-[12px] text-[#3f3f46]">
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              ~2 minutes
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Anonymous &amp; confidential
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              10 questions
            </span>
          </div>

          {/* CTA */}
          <div className="flex flex-col items-center gap-3">
            <button onClick={onStart}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-10 py-3.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[14px] font-bold rounded-xl transition-colors shadow-lg shadow-[#3b82f6]/20">
              Start Survey
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <p className="text-[11px] text-[#3f3f46]">No sign-in required · your answers are saved as you go</p>
          </div>

        </div>
      </div>
    </div>
  );
}

// ── Survey questions ───────────────────────────────────────────────────────
const STEPS = [
  {
    id: 'name',
    title: 'First, what should we call you?',
    subtitle: 'Optional — helps us personalise your experience',
    type: 'text',
    placeholder: 'Your first name or nickname…',
  },
  {
    id: 'role',
    title: 'What best describes your role?',
    subtitle: 'Helps us understand who HiTicket serves',
    type: 'single',
    options: [
      { value: 'student',   label: 'Student',           icon: '🎓', desc: 'Need IT help for coursework or labs' },
      { value: 'it_staff',  label: 'IT Staff / Agent',  icon: '🛠️', desc: 'I resolve support tickets for others' },
      { value: 'faculty',   label: 'Faculty / Lecturer',icon: '📚', desc: 'Use IT tools for teaching' },
      { value: 'developer', label: 'Developer',         icon: '💻', desc: 'Build or maintain systems' },
      { value: 'manager',   label: 'Team Lead / Manager',icon: '📊', desc: 'Oversee IT or a team' },
      { value: 'other',     label: 'Other',             icon: '👤', desc: 'None of the above' },
    ],
  },
  {
    id: 'currentProcess',
    title: 'How do you currently raise IT support requests?',
    subtitle: 'Select your most common method',
    type: 'single',
    options: [
      { value: 'email',  label: 'Send an email',       icon: '📧', desc: 'Email the IT team directly' },
      { value: 'phone',  label: 'Phone call',          icon: '📞', desc: 'Call the helpdesk number' },
      { value: 'walkin', label: 'Walk-in desk',        icon: '🚶', desc: 'Visit IT support in person' },
      { value: 'portal', label: 'Online portal',       icon: '🌐', desc: 'Use an existing ticket system' },
      { value: 'chat',   label: 'WhatsApp / Chat',     icon: '💬', desc: 'Message someone directly' },
      { value: 'none',   label: 'No formal process',  icon: '🤷', desc: 'I just wait for it to get fixed' },
    ],
  },
  {
    id: 'satisfaction',
    title: 'How satisfied are you with IT support today?',
    subtitle: 'Rate your current experience — 1 being very poor, 5 being excellent',
    type: 'rating',
    labels: ['Very Poor', 'Poor', 'Okay', 'Good', 'Excellent'],
  },
  {
    id: 'priorities',
    title: 'What matters most in a helpdesk system?',
    subtitle: 'Choose up to 3 that are most important to you',
    type: 'multi',
    maxSelect: 3,
    options: [
      { value: 'speed',        label: 'Fast response time',       icon: '⚡', desc: 'Quick acknowledgement under 1 hour' },
      { value: 'tracking',     label: 'Real-time ticket tracking', icon: '📍', desc: 'See ticket status anytime' },
      { value: 'ai',           label: 'AI-assisted submission',   icon: '🤖', desc: 'Chatbot guides me through the issue' },
      { value: 'mobile',       label: 'Mobile-friendly access',   icon: '📱', desc: 'Works great on phone' },
      { value: 'notes',        label: 'Detailed resolution notes',icon: '📋', desc: 'Know exactly what was done to fix it' },
      { value: 'availability', label: '24/7 availability',        icon: '🕐', desc: 'Submit issues any time of day' },
    ],
  },
  {
    id: 'wouldUseChatbot',
    title: 'Would you use an AI chatbot to submit IT tickets?',
    subtitle: 'Based on the demo flow you saw on the intro screen',
    type: 'single',
    options: [
      { value: 'definitely', label: 'Definitely yes', icon: '🙌', desc: 'Love the idea, would switch immediately' },
      { value: 'probably',   label: 'Probably yes',   icon: '👍', desc: 'Sounds very useful' },
      { value: 'maybe',      label: 'Maybe',          icon: '🤔', desc: 'I need to try it first' },
      { value: 'no',         label: 'Probably not',   icon: '👎', desc: 'I prefer traditional methods' },
    ],
  },
  {
    id: 'responseTime',
    title: 'How quickly do you expect an initial response to your IT ticket?',
    subtitle: 'Not the full resolution — just the first acknowledgement',
    type: 'single',
    options: [
      { value: 'under1hr', label: 'Within 1 hour',     icon: '⚡', desc: 'Critical — I need immediate acknowledgement' },
      { value: '1to4hrs',  label: '1–4 hours',         icon: '⏱️', desc: 'Same morning or afternoon' },
      { value: 'sameday',  label: 'Same working day',  icon: '📋', desc: 'Acknowledged before end of business day' },
      { value: 'nextday',  label: 'Next business day', icon: '📆', desc: 'Not urgently needed' },
      { value: 'flexible', label: 'No expectation',    icon: '😌', desc: 'Happy to wait however long it takes' },
    ],
  },
  {
    id: 'issueFrequency',
    title: 'How often do you encounter IT issues?',
    subtitle: 'Roughly how often do you need IT support',
    type: 'single',
    options: [
      { value: 'daily',   label: 'Daily',             icon: '📆', desc: 'Almost every working day' },
      { value: 'weekly',  label: 'A few times a week',icon: '🗓️', desc: 'Regularly throughout the week' },
      { value: 'monthly', label: 'About once a month',icon: '📅', desc: 'Occasional issues' },
      { value: 'rarely',  label: 'Rarely',            icon: '✅', desc: 'Only when something breaks' },
    ],
  },
  {
    id: 'notifPreference',
    title: 'How would you prefer to be notified about ticket updates?',
    subtitle: 'When your ticket status changes or receives a new response',
    type: 'single',
    options: [
      { value: 'email',  label: 'Email only',           icon: '📧', desc: 'Updates sent directly to my inbox' },
      { value: 'inapp',  label: 'In-app notification',  icon: '🔔', desc: 'Notification badge within the platform' },
      { value: 'sms',    label: 'SMS / WhatsApp',       icon: '💬', desc: 'Text message to my phone' },
      { value: 'portal', label: "I'll check the portal",icon: '🌐', desc: 'No push — I prefer logging in manually' },
      { value: 'any',    label: 'Any method works',     icon: '✅', desc: 'Whatever is fastest and easiest' },
    ],
  },
  {
    id: 'statusImportance',
    title: 'How important is real-time ticket status tracking?',
    subtitle: 'Knowing where your issue stands without needing to ask',
    type: 'single',
    options: [
      { value: 'critical',     label: 'Critical',       icon: '🔴', desc: 'I need to know status at all times' },
      { value: 'important',    label: 'Very important', icon: '🟠', desc: 'I want to know when it\'s resolved' },
      { value: 'somewhat',     label: 'Somewhat useful',icon: '🟡', desc: 'Nice to have, not essential' },
      { value: 'notimportant', label: 'Not important',  icon: '⚪', desc: 'I just wait until I hear back' },
    ],
  },
  {
    id: 'suggestions',
    title: 'Any thoughts or feature suggestions?',
    subtitle: 'What would make HiTicket even better for you? (optional)',
    type: 'text',
    placeholder: 'e.g. I\'d love integration with Microsoft Teams, or automatic escalation for critical issues…',
  },
];

const TOTAL = STEPS.length;

// ── Review step index (virtual last step before submit) ────────────────────
const REVIEW_STEP = TOTAL; // index after all real steps

// ── Done screen ─────────────────────────────────────────────────────────────
function DoneScreen() {
  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center px-4 text-center relative overflow-hidden">
      <Confetti />
      <div className="relative z-20">
        <div className="w-16 h-16 bg-[#22c55e]/15 border border-[#22c55e]/30 rounded-2xl flex items-center justify-center mb-5 mx-auto">
          <svg className="w-8 h-8 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-[28px] font-bold text-[#fafafa] mb-2">Thank you! 🎉</h2>
        <p className="text-[14px] text-[#a1a1aa] max-w-sm mb-2 leading-relaxed">
          Your feedback helps us build a better IT helpdesk for everyone.
        </p>
        <p className="text-[12px] text-[#52525b] mb-8">Responses are reviewed by the HiTicket team.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/" className="px-6 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[13px] font-medium rounded-lg transition-colors">
            Explore HiTicket
          </Link>
          <Link to="/login" className="px-6 py-2.5 bg-[#27272a] hover:bg-[#3f3f46] text-[#fafafa] text-[13px] font-medium rounded-lg transition-colors">
            Sign In / Register
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Review screen ───────────────────────────────────────────────────────────
const LABEL_MAPS = {
  role:           { student:'Student',it_staff:'IT Staff',faculty:'Faculty',developer:'Developer',manager:'Manager',other:'Other' },
  currentProcess: { email:'Email',phone:'Phone',walkin:'Walk-in',portal:'Online portal',chat:'Chat/WhatsApp',none:'No process' },
  wouldUseChatbot:{ definitely:'Definitely',probably:'Probably',maybe:'Maybe',no:'Probably not' },
  responseTime:   { under1hr:'Within 1 hour','1to4hrs':'1–4 hours',sameday:'Same day',nextday:'Next business day',flexible:'No expectation' },
  issueFrequency: { daily:'Daily',weekly:'A few times/week',monthly:'Once a month',rarely:'Rarely' },
  notifPreference:{ email:'Email',inapp:'In-app',sms:'SMS/WhatsApp',portal:'Check portal',any:'Any method' },
  statusImportance:{ critical:'Critical',important:'Very important',somewhat:'Somewhat useful',notimportant:'Not important' },
  priorities:     { speed:'Fast response',tracking:'Real-time tracking',ai:'AI-assisted',mobile:'Mobile-friendly',notes:'Resolution notes',availability:'24/7 availability' },
};

function ReviewScreen({ answers, onEdit, onSubmit, submitting, error }) {
  const rows = STEPS.map(s => {
    let val = answers[s.id];
    if (val === undefined || val === null || val === '') return null;
    let display = '';
    if (s.type === 'rating') display = `${'⭐'.repeat(val)} (${val}/5)`;
    else if (s.type === 'text') display = `"${val}"`;
    else if (s.type === 'multi') display = (Array.isArray(val) ? val : []).map(v => LABEL_MAPS.priorities?.[v] || v).join(', ');
    else display = LABEL_MAPS[s.id]?.[val] || val;
    return { id: s.id, title: s.title, display, stepIdx: STEPS.findIndex(x => x.id === s.id) };
  }).filter(Boolean);

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="mb-7">
        <p className="text-[11px] text-[#3b82f6] font-semibold mb-2 uppercase tracking-widest">Review</p>
        <h2 className="text-[20px] sm:text-[24px] font-bold text-[#fafafa] mb-2 leading-snug">Almost there — review your answers</h2>
        <p className="text-[13px] text-[#52525b]">Click any answer to edit it before submitting.</p>
      </div>
      <div className="space-y-2 mb-6">
        {rows.map(r => (
          <button key={r.id} onClick={() => onEdit(r.stepIdx)}
            className="w-full flex items-start gap-3 p-3.5 rounded-xl bg-[#18181b] border border-[#27272a] hover:border-[#3b82f6]/40 hover:bg-[#1c1c1f] text-left transition-all group">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-[#52525b] uppercase tracking-wider mb-0.5">{r.title}</p>
              <p className="text-[13px] text-[#fafafa] font-medium truncate">{r.display}</p>
            </div>
            <svg className="w-4 h-4 text-[#3f3f46] group-hover:text-[#3b82f6] flex-shrink-0 mt-0.5 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        ))}
      </div>
      {error && (
        <div className="mb-4 p-3 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-lg text-[#ef4444] text-[13px]">{error}</div>
      )}
      <button onClick={onSubmit} disabled={submitting}
        className="w-full flex items-center justify-center gap-2 px-7 py-3 bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-40 disabled:cursor-not-allowed text-white text-[14px] font-semibold rounded-xl transition-colors">
        {submitting ? (
          <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Submitting…</>
        ) : <>Submit Survey ✓</>}
      </button>
    </div>
  );
}

// ── Main Survey component ───────────────────────────────────────────────────
export default function Survey() {
  const navigate = useNavigate();
  const [started, setStarted]       = useState(false);
  const [done, setDone]             = useState(false);
  const [step, setStep]             = useState(0);
  const [answers, setAnswers]       = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');
  const [dir, setDir]               = useState(1);   // 1 = forward, -1 = back
  const [animKey, setAnimKey]       = useState(0);   // triggers re-mount animation

  // Persist to localStorage on every answer change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
  }, [answers]);

  const isReview = step === REVIEW_STEP;
  const current  = isReview ? null : STEPS[step];
  const answer   = current ? answers[current.id] : null;

  const canNext = isReview ? false : current
    ? current.type === 'rating'  ? typeof answer === 'number' && answer >= 1
    : current.type === 'multi'   ? Array.isArray(answer) && answer.length >= 1
    : current.type === 'text'    ? true
    : /* single */                 answer !== undefined
    : false;

  const isOptional = current ? OPTIONAL_STEPS.includes(current.id) : false;

  const setAnswer = useCallback((val) => {
    setAnswers(prev => ({ ...prev, [current.id]: val }));
  }, [current]);

  // Auto-advance on single-select pick
  const handleSinglePick = useCallback((val) => {
    setAnswers(prev => ({ ...prev, [current.id]: val }));
    setTimeout(() => {
      setDir(1); setAnimKey(k => k + 1);
      setStep(s => s + 1);
    }, 220);
  }, [current]);

  const goTo = (idx) => { setDir(idx > step ? 1 : -1); setAnimKey(k => k + 1); setStep(idx); };

  const handleNext = useCallback(() => {
    setDir(1); setAnimKey(k => k + 1);
    setStep(s => s + 1);
  }, []);

  const handleBack = useCallback(() => {
    if (step > 0) { setDir(-1); setAnimKey(k => k + 1); setStep(s => s - 1); }
    else navigate('/');
  }, [step, navigate]);

  const handleSubmit = async () => {
    setSubmitting(true); setError('');
    try {
      const resp = await fetch(`${BASE_URL}/feedback`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          ...answers,
          satisfaction: Number(answers.satisfaction),
          priorities:   answers.priorities || [],
          suggestions:  (answers.suggestions || '').trim(),
        }),
      });
      if (!resp.ok) { const d = await resp.json(); throw new Error(d.error || 'Submission failed'); }
      localStorage.removeItem(STORAGE_KEY);
      setDone(true);
    } catch (err) { setError(err.message); }
    finally { setSubmitting(false); }
  };

  // Keyboard navigation
  useEffect(() => {
    if (isReview || !current) return;
    const handler = (e) => {
      if (e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'Enter' && canNext) { handleNext(); return; }
      if (e.key === 'Escape') { handleBack(); return; }
      // Number keys for single/options
      if (current.type === 'single' && current.options) {
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= current.options.length) handleSinglePick(current.options[n - 1].value);
      }
      if (current.type === 'rating') {
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= 5) setAnswer(n);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [current, canNext, isReview, handleNext, handleBack, handleSinglePick, setAnswer]);

  // Estimated time
  const answeredCount = Object.keys(answers).length;
  const remaining = Math.max(0, TOTAL - answeredCount);
  const estMin = Math.max(0, Math.ceil(remaining * 0.18));

  if (done) return <DoneScreen />;
  if (!started) return <WelcomeScreen onStart={() => setStarted(true)} />;

  const progressPct = isReview ? 100 : ((step + 1) / (TOTAL + 1)) * 100;

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col">
      {/* ── Header ─────────────────────────────────── */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-[#27272a]">
        <Link to="/"><LogoMark size="lg" /></Link>
        <div className="flex items-center gap-3">
          {estMin > 0 && (
            <span className="text-[11px] text-[#3f3f46] hidden sm:block">~{estMin} min left</span>
          )}
          <span className="text-[12px] text-[#52525b]">
            {isReview ? 'Review' : `${step + 1} of ${TOTAL}`}
          </span>
        </div>
      </header>

      {/* ── Progress bar ───────────────────────────── */}
      <div className="w-full h-1 bg-[#27272a]">
        <div className="h-full bg-[#3b82f6] transition-all duration-500 ease-out" style={{ width: `${progressPct}%` }} />
      </div>

      {/* ── Step dots ──────────────────────────────── */}
      <div className="flex items-center justify-center gap-1.5 py-3 px-4 overflow-x-auto">
        {STEPS.map((s, i) => {
          const answered = answers[s.id] !== undefined && answers[s.id] !== '';
          const isCurrent = !isReview && i === step;
          return (
            <button key={s.id} onClick={() => i < step || (isReview) ? goTo(i) : undefined}
              title={s.title}
              className={`flex-shrink-0 rounded-full transition-all duration-300 ${
                isCurrent  ? 'w-5 h-2.5 bg-[#3b82f6]' :
                answered   ? 'w-2.5 h-2.5 bg-[#22c55e] hover:bg-[#22c55e]/70 cursor-pointer' :
                             'w-2.5 h-2.5 bg-[#27272a]'
              }`}
            />
          );
        })}
        {/* Review dot */}
        <div className={`flex-shrink-0 rounded-full transition-all duration-300 ${
          isReview ? 'w-5 h-2.5 bg-[#f59e0b]' : 'w-2.5 h-2.5 bg-[#27272a]'
        }`} />
      </div>

      {/* ── Question area ──────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-8 overflow-hidden">
        {/* Animated wrapper */}
        <div key={animKey}
          className="w-full max-w-xl"
          style={{ animation: `slideIn${dir > 0 ? 'Right' : 'Left'} 0.25s ease-out` }}>

          {/* ── Review step ── */}
          {isReview && (
            <ReviewScreen
              answers={answers}
              onEdit={goTo}
              onSubmit={handleSubmit}
              submitting={submitting}
              error={error}
            />
          )}

          {/* ── Normal question step ── */}
          {!isReview && current && (
            <>
              <div className="mb-7">
                <p className="text-[11px] text-[#3b82f6] font-semibold mb-2 uppercase tracking-widest">
                  {step + 1} / {TOTAL}
                  {isOptional && <span className="ml-2 text-[#52525b] normal-case tracking-normal">· optional</span>}
                </p>
                <h2 className="text-[20px] sm:text-[24px] font-bold text-[#fafafa] mb-2 leading-snug">
                  {current.title}
                </h2>
                <p className="text-[13px] text-[#52525b]">{current.subtitle}</p>
                {current.type === 'single' && (
                  <p className="text-[10px] text-[#3f3f46] mt-1.5">Tip: press 1–{current.options?.length} to pick instantly</p>
                )}
                {current.type === 'rating' && (
                  <p className="text-[10px] text-[#3f3f46] mt-1.5">Tip: press 1–5 on your keyboard</p>
                )}
              </div>

              {/* ── Single-select ── */}
              {current.type === 'single' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {current.options.map((opt, oi) => (
                    <button key={opt.value} onClick={() => handleSinglePick(opt.value)}
                      className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                        answer === opt.value
                          ? 'border-[#3b82f6] bg-[#3b82f6]/10 shadow-[0_0_0_1px_#3b82f630]'
                          : 'border-[#27272a] bg-[#18181b] hover:border-[#3f3f46] hover:bg-[#1c1c1f]'
                      }`}>
                      <span className="text-2xl flex-shrink-0 w-8">{opt.icon}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-[#fafafa]">{opt.label}</p>
                        <p className="text-[11px] text-[#52525b] mt-0.5 leading-snug">{opt.desc}</p>
                      </div>
                      <span className="text-[10px] text-[#3f3f46] flex-shrink-0">{oi + 1}</span>
                      {answer === opt.value && (
                        <svg className="w-4 h-4 text-[#3b82f6] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* ── Multi-select ── */}
              {current.type === 'multi' && (
                <>
                  <p className="text-[11px] text-[#f59e0b] mb-3">
                    Select up to {current.maxSelect} · {(answer || []).length}/{current.maxSelect} selected
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {current.options.map((opt) => {
                      const sel   = (answer || []).includes(opt.value);
                      const maxed = !sel && (answer || []).length >= current.maxSelect;
                      return (
                        <button key={opt.value} disabled={maxed}
                          onClick={() => {
                            const cur = answer || [];
                            if (sel) setAnswer(cur.filter(v => v !== opt.value));
                            else if (!maxed) setAnswer([...cur, opt.value]);
                          }}
                          className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                            sel    ? 'border-[#3b82f6] bg-[#3b82f6]/10' :
                            maxed  ? 'border-[#27272a] bg-[#18181b] opacity-35 cursor-not-allowed' :
                                     'border-[#27272a] bg-[#18181b] hover:border-[#3f3f46] hover:bg-[#1c1c1f]'
                          }`}>
                          <span className="text-2xl flex-shrink-0 w-8">{opt.icon}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-medium text-[#fafafa]">{opt.label}</p>
                            <p className="text-[11px] text-[#52525b] mt-0.5 leading-snug">{opt.desc}</p>
                          </div>
                          {sel && (
                            <div className="w-5 h-5 bg-[#3b82f6] rounded-full flex items-center justify-center flex-shrink-0">
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* ── Star rating ── */}
              {current.type === 'rating' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-center gap-2 sm:gap-4">
                    {[1,2,3,4,5].map(n => (
                      <button key={n} onClick={() => setAnswer(n)} className="group flex flex-col items-center gap-2">
                        <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center text-[22px] transition-all border ${
                          answer >= n
                            ? 'border-[#f59e0b] bg-[#f59e0b]/15 scale-110 shadow-[0_0_12px_#f59e0b30]'
                            : 'border-[#27272a] bg-[#18181b] group-hover:border-[#f59e0b]/40 group-hover:scale-105'
                        }`}>⭐</div>
                        <span className="text-[10px] text-[#52525b] group-hover:text-[#a1a1aa] transition-colors hidden sm:block w-14 text-center leading-tight">
                          {current.labels[n - 1]}
                        </span>
                      </button>
                    ))}
                  </div>
                  {answer && (
                    <p className="text-center text-[15px] text-[#f59e0b] font-semibold">{current.labels[answer - 1]}</p>
                  )}
                </div>
              )}

              {/* ── Free text ── */}
              {current.type === 'text' && (
                <div>
                  <textarea value={answer || ''} onChange={e => setAnswer(e.target.value)}
                    placeholder={current.placeholder} maxLength={1000} rows={5}
                    className="w-full px-4 py-3 bg-[#18181b] border border-[#27272a] rounded-xl text-[#fafafa] text-[13px] placeholder-[#3f3f46] focus:outline-none focus:border-[#3b82f6] resize-none transition-colors"
                  />
                  <p className="text-[11px] text-[#3f3f46] mt-1 text-right">{(answer || '').length}/1000</p>
                </div>
              )}

              {error && (
                <div className="mt-4 p-3 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-lg text-[#ef4444] text-[13px]">{error}</div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between mt-8 pt-4 border-t border-[#27272a]">
                <button onClick={handleBack}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-[13px] text-[#52525b] hover:text-[#a1a1aa] transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
                <div className="flex items-center gap-2">
                  {isOptional && (
                    <button onClick={handleNext}
                      className="px-4 py-2.5 text-[13px] text-[#52525b] hover:text-[#a1a1aa] transition-colors">
                      Skip
                    </button>
                  )}
                  <button onClick={handleNext} disabled={!canNext && !isOptional}
                    className="flex items-center gap-2 px-7 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-40 disabled:cursor-not-allowed text-white text-[13px] font-semibold rounded-lg transition-colors">
                    {step === TOTAL - 1 ? 'Review →' : <>Next <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></>}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Slide animation styles ── */}
      <style>{`
        @keyframes slideInRight { from { opacity:0; transform:translateX(40px); } to { opacity:1; transform:translateX(0); } }
        @keyframes slideInLeft  { from { opacity:0; transform:translateX(-40px); } to { opacity:1; transform:translateX(0); } }
      `}</style>
    </div>
  );
}
