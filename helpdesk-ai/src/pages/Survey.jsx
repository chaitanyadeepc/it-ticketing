import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LogoMark from '../components/ui/LogoMark';

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
  const navigate = useNavigate();
  const [done, setDone]             = useState(false);
  const [step, setStep]             = useState(0);
  const [answers, setAnswers]       = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');

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
      setDone(true);
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

  if (done) return <DoneScreen />

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-[#27272a]">
        <Link to="/">
          <LogoMark size="sm" />
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
              onClick={() => (step > 0 ? setStep((s) => s - 1) : navigate('/'))}
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
