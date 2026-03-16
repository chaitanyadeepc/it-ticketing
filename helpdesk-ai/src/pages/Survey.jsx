import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ── Survey questions ───────────────────────────────────────────────────────
const STEPS = [
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

// ── Logo ────────────────────────────────────────────────────────────────────
const Logo = () => (
  <div className="w-7 h-7 bg-[#3b82f6] rounded-lg flex items-center justify-center flex-shrink-0">
    <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7H3a7 7 0 0 1 7-7h1V5.73A2 2 0 0 1 10 4a2 2 0 0 1 2-2m-4 9.5a1 1 0 0 0-1 1 1 1 0 0 0 1 1 1 1 0 0 0 1-1 1 1 0 0 0-1-1m8 0a1 1 0 0 0-1 1 1 1 0 0 0 1 1 1 1 0 0 0 1-1 1 1 0 0 0-1-1M3 15h18v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1Z" />
    </svg>
  </div>
);

// ── Intro screen ────────────────────────────────────────────────────────────
function IntroScreen({ onStart }) {
  const DEMO_FLOW = [
    { icon: '💬', label: 'Describe your issue', desc: 'Chat with the AI in plain English — no forms, no categories to pick', color: '#3b82f6', step: 1 },
    { icon: '🤖', label: 'AI routes it',         desc: 'HiTicket auto-categorises, prioritises, and assigns to the right team', color: '#8b5cf6', step: 2 },
    { icon: '🛠️', label: 'Agent resolves',       desc: 'Your IT agent is notified instantly and investigates the issue',          color: '#f59e0b', step: 3 },
    { icon: '✅', label: 'You\'re notified',     desc: 'Receive a notification when resolved — and rate your experience',         color: '#22c55e', step: 4 },
  ];

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-[#27272a]">
        <Link to="/" className="flex items-center gap-2">
          <Logo />
          <span className="text-[15px] font-semibold text-[#fafafa]">HiTicket</span>
        </Link>
        <Link to="/login" className="text-[12px] text-[#52525b] hover:text-[#a1a1aa] transition-colors">
          Sign in →
        </Link>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-12">
        <div className="w-full max-w-2xl text-center">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-[#18181b] border border-[#27272a] rounded-full px-3 py-1.5 mb-6">
            <span className="w-1.5 h-1.5 bg-[#22c55e] rounded-full animate-pulse" />
            <span className="text-[12px] text-[#a1a1aa]">2 minutes · Anonymous · No login required</span>
          </div>

          <h1 className="text-[28px] sm:text-[36px] font-bold text-[#fafafa] mb-3 leading-tight">
            Help shape a better<br />
            <span className="text-[#3b82f6]">IT helpdesk</span>
          </h1>
          <p className="text-[14px] text-[#52525b] max-w-md mx-auto mb-10 leading-relaxed">
            Before the survey, here's a quick look at how HiTicket works — from issue to resolution.
          </p>

          {/* Demo flow */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
            {DEMO_FLOW.map((s, i) => (
              <div key={i} className="relative flex flex-col items-center text-center">
                {i < DEMO_FLOW.length - 1 && (
                  <div className="hidden sm:block absolute top-6 left-[calc(50%+28px)] right-[-4px] h-px border-t border-dashed border-[#27272a] z-0" />
                )}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-[22px] mb-3 relative z-10 border"
                  style={{ backgroundColor: `${s.color}18`, borderColor: `${s.color}35` }}
                >
                  {s.icon}
                </div>
                <p className="text-[12px] font-semibold text-[#fafafa] mb-1">{s.label}</p>
                <p className="text-[11px] text-[#52525b] leading-snug">{s.desc}</p>
                <div
                  className="mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ color: s.color, backgroundColor: `${s.color}18` }}
                >
                  Step {s.step}
                </div>
              </div>
            ))}
          </div>

          {/* Mini chat demo preview */}
          <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-4 sm:p-5 mb-8 text-left max-w-sm mx-auto">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#27272a]">
              <div className="w-7 h-7 bg-[#3b82f6] rounded-lg flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <p className="text-[12px] font-semibold text-[#fafafa]">HiTicket AI</p>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-[#22c55e] rounded-full" />
                  <span className="text-[10px] text-[#22c55e]">Online</span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-start">
                <div className="bg-[#27272a] rounded-2xl rounded-tl-sm px-3 py-2 max-w-[85%]">
                  <p className="text-[12px] text-[#fafafa]">Hi! What IT issue can I help you with today?</p>
                </div>
              </div>
              <div className="flex justify-end">
                <div className="bg-[#3b82f6] rounded-2xl rounded-tr-sm px-3 py-2 max-w-[85%]">
                  <p className="text-[12px] text-white">My laptop can't connect to campus WiFi</p>
                </div>
              </div>
              <div className="flex justify-start">
                <div className="bg-[#27272a] rounded-2xl rounded-tl-sm px-3 py-2 max-w-[85%]">
                  <p className="text-[12px] text-[#fafafa]">
                    Got it — I've raised ticket <span className="text-[#3b82f6] font-mono font-bold">#HT-2048</span>
                  </p>
                  <p className="text-[10px] text-[#22c55e] mt-1">✓ Network Support · Priority: High · Assigned</p>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={onStart}
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[15px] font-semibold rounded-xl transition-colors shadow-lg shadow-[#3b82f6]/20"
          >
            Start the Survey
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <p className="mt-3 text-[11px] text-[#3f3f46]">
            8 questions · No account needed · Responses help improve HiTicket
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Done screen ─────────────────────────────────────────────────────────────
function DoneScreen() {
  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center px-4 text-center">
      <div className="w-16 h-16 bg-[#22c55e]/15 border border-[#22c55e]/30 rounded-2xl flex items-center justify-center mb-5">
        <svg className="w-8 h-8 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="text-[28px] font-bold text-[#fafafa] mb-2">Thank you! 🎉</h2>
      <p className="text-[14px] text-[#a1a1aa] max-w-sm mb-2 leading-relaxed">
        Your feedback helps us build a better IT helpdesk for everyone.
      </p>
      <p className="text-[12px] text-[#52525b] mb-8">Responses are reviewed by the HiTicket team.</p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link to="/" className="px-6 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[13px] font-medium rounded-lg transition-colors">
          Explore HiTicket
        </Link>
        <Link to="/login" className="px-6 py-2.5 bg-[#27272a] hover:bg-[#3f3f46] text-[#fafafa] text-[13px] font-medium rounded-lg transition-colors">
          Sign In / Register
        </Link>
      </div>
    </div>
  );
}

// ── Main Survey component ───────────────────────────────────────────────────
export default function Survey() {
  const [phase, setPhase]       = useState('intro'); // 'intro' | 'quiz' | 'done'
  const [step, setStep]         = useState(0);
  const [answers, setAnswers]   = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState('');

  const current = STEPS[step];
  const answer  = answers[current?.id];

  const canNext = current
    ? current.type === 'rating'  ? typeof answer === 'number' && answer >= 1
    : current.type === 'multi'   ? Array.isArray(answer) && answer.length >= 1
    : current.type === 'text'    ? true
    : /* single */                 answer !== undefined
    : false;

  const setAnswer = (val) => setAnswers((prev) => ({ ...prev, [current.id]: val }));

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
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
      if (!resp.ok) {
        const d = await resp.json();
        throw new Error(d.error || 'Submission failed');
      }
      setPhase('done');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    if (step < TOTAL - 1) {
      setStep((s) => s + 1);
    } else {
      handleSubmit();
    }
  };

  if (phase === 'intro') return <IntroScreen onStart={() => setPhase('quiz')} />;
  if (phase === 'done')  return <DoneScreen />;

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-[#27272a]">
        <Link to="/" className="flex items-center gap-2">
          <Logo />
          <span className="text-[15px] font-semibold text-[#fafafa]">HiTicket</span>
        </Link>
        <span className="text-[12px] text-[#52525b]">
          Question {step + 1} of {TOTAL}
        </span>
      </header>

      {/* Progress bar */}
      <div className="w-full h-1 bg-[#27272a]">
        <div
          className="h-full bg-[#3b82f6] transition-all duration-500 ease-out"
          style={{ width: `${((step + 1) / TOTAL) * 100}%` }}
        />
      </div>

      {/* Question area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-10">
        <div className="w-full max-w-xl">
          {/* Question header */}
          <div className="mb-7">
            <p className="text-[11px] text-[#3b82f6] font-semibold mb-2 uppercase tracking-widest">
              {step + 1} / {TOTAL}
            </p>
            <h2 className="text-[20px] sm:text-[24px] font-bold text-[#fafafa] mb-2 leading-snug">
              {current.title}
            </h2>
            <p className="text-[13px] text-[#52525b]">{current.subtitle}</p>
          </div>

          {/* ── Single-select options ── */}
          {current.type === 'single' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {current.options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setAnswer(opt.value)}
                  className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                    answer === opt.value
                      ? 'border-[#3b82f6] bg-[#3b82f6]/10 shadow-[0_0_0_1px_#3b82f630]'
                      : 'border-[#27272a] bg-[#18181b] hover:border-[#3f3f46] hover:bg-[#1c1c1f]'
                  }`}
                >
                  <span className="text-2xl flex-shrink-0 w-8">{opt.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-[#fafafa]">{opt.label}</p>
                    <p className="text-[11px] text-[#52525b] mt-0.5 leading-snug">{opt.desc}</p>
                  </div>
                  {answer === opt.value && (
                    <svg className="w-4 h-4 text-[#3b82f6] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* ── Multi-select options ── */}
          {current.type === 'multi' && (
            <>
              <p className="text-[11px] text-[#f59e0b] mb-3">
                Select up to {current.maxSelect} · {(answer || []).length}/{current.maxSelect} selected
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {current.options.map((opt) => {
                  const selected = (answer || []).includes(opt.value);
                  const maxed    = !selected && (answer || []).length >= current.maxSelect;
                  return (
                    <button
                      key={opt.value}
                      disabled={maxed}
                      onClick={() => {
                        const cur = answer || [];
                        if (selected) setAnswer(cur.filter((v) => v !== opt.value));
                        else if (!maxed) setAnswer([...cur, opt.value]);
                      }}
                      className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                        selected
                          ? 'border-[#3b82f6] bg-[#3b82f6]/10'
                          : maxed
                          ? 'border-[#27272a] bg-[#18181b] opacity-35 cursor-not-allowed'
                          : 'border-[#27272a] bg-[#18181b] hover:border-[#3f3f46] hover:bg-[#1c1c1f]'
                      }`}
                    >
                      <span className="text-2xl flex-shrink-0 w-8">{opt.icon}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-[#fafafa]">{opt.label}</p>
                        <p className="text-[11px] text-[#52525b] mt-0.5 leading-snug">{opt.desc}</p>
                      </div>
                      {selected && (
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
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setAnswer(n)}
                    className="group flex flex-col items-center gap-2"
                  >
                    <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center text-[22px] transition-all border ${
                      answer >= n
                        ? 'border-[#f59e0b] bg-[#f59e0b]/15 scale-110 shadow-[0_0_12px_#f59e0b30]'
                        : 'border-[#27272a] bg-[#18181b] group-hover:border-[#f59e0b]/40 group-hover:scale-105'
                    }`}>
                      ⭐
                    </div>
                    <span className="text-[10px] text-[#52525b] group-hover:text-[#a1a1aa] transition-colors hidden sm:block w-14 text-center leading-tight">
                      {current.labels[n - 1]}
                    </span>
                  </button>
                ))}
              </div>
              {answer && (
                <p className="text-center text-[15px] text-[#f59e0b] font-semibold">
                  {current.labels[answer - 1]}
                </p>
              )}
            </div>
          )}

          {/* ── Free text ── */}
          {current.type === 'text' && (
            <div>
              <textarea
                value={answer || ''}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder={current.placeholder}
                maxLength={1000}
                rows={5}
                className="w-full px-4 py-3 bg-[#18181b] border border-[#27272a] rounded-xl text-[#fafafa] text-[13px] placeholder-[#3f3f46] focus:outline-none focus:border-[#3b82f6] resize-none transition-colors"
              />
              <p className="text-[11px] text-[#3f3f46] mt-1 text-right">
                {(answer || '').length}/1000
              </p>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-lg text-[#ef4444] text-[13px]">
              {error}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-4 border-t border-[#27272a]">
            <button
              onClick={() => (step > 0 ? setStep((s) => s - 1) : setPhase('intro'))}
              className="flex items-center gap-1.5 px-4 py-2.5 text-[13px] text-[#52525b] hover:text-[#a1a1aa] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <button
              onClick={handleNext}
              disabled={!canNext || submitting}
              className="flex items-center gap-2 px-7 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-40 disabled:cursor-not-allowed text-white text-[13px] font-semibold rounded-lg transition-colors"
            >
              {submitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Submitting…
                </>
              ) : step === TOTAL - 1 ? (
                'Submit Survey ✓'
              ) : (
                <>
                  Next
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
