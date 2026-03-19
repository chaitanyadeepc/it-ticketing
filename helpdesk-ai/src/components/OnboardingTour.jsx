import React, { useState, useEffect } from 'react';

const STEPS = [
  {
    title: '👋 Welcome to HiTicket!',
    body: "This quick tour shows you the key areas of the platform. You can dismiss this anytime and it won't appear again.",
    icon: '🎉',
    color: '#7c3aed',
  },
  {
    title: '🤖 Raise a Ticket via Chatbot',
    body: 'Click "New Chat" or press ⌘N to open the AI assistant. Describe your issue and it will guide you through — with helpful KB suggestions before you submit.',
    icon: '💬',
    color: '#2563eb',
  },
  {
    title: '🎫 Track Your Tickets',
    body: 'Use "My Tickets" in the navigation to see all your open, in-progress, and resolved tickets. You can filter, search, and add comments directly.',
    icon: '📋',
    color: '#0891b2',
  },
  {
    title: '📚 Knowledge Base',
    body: 'Many common issues are already answered in the Knowledge Base. Try searching there first — it might save you from raising a ticket at all!',
    icon: '🔍',
    color: '#059669',
  },
  {
    title: '⌨️ Keyboard Shortcuts',
    body: 'Press ? anywhere in the app to see all available keyboard shortcuts. Pro tip: ⌘K opens the Command Palette.',
    icon: '⚡',
    color: '#d97706',
  },
];

const STORAGE_KEY = 'hd_onboarded';

const OnboardingTour = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      // Small delay so page content has rendered first
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
    onComplete?.();
  };

  if (!visible) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}>
      <div
        className="relative w-full max-w-md mx-4 rounded-2xl shadow-2xl animate-fade-in"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        {/* Accent top bar */}
        <div className="h-1 rounded-t-2xl" style={{ background: `linear-gradient(90deg, ${current.color}, ${current.color}99)` }} />

        {/* Close button */}
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-xl leading-none"
          aria-label="Close tour"
        >
          ×
        </button>

        <div className="p-7 pb-5">
          {/* Step icon */}
          <div className="text-5xl mb-4 text-center">{current.icon}</div>

          {/* Title */}
          <h2 className="text-xl font-bold text-center mb-2" style={{ color: 'var(--text-primary)' }}>
            {current.title}
          </h2>

          {/* Body */}
          <p className="text-sm text-center leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {current.body}
          </p>

          {/* Step dots */}
          <div className="flex justify-center gap-2 mt-5 mb-4">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className="rounded-full transition-all"
                style={{
                  width: i === step ? 20 : 8,
                  height: 8,
                  backgroundColor: i === step ? current.color : 'var(--border)',
                }}
                aria-label={`Step ${i + 1}`}
              />
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 mt-2">
            <button
              onClick={dismiss}
              className="flex-1 py-2 rounded-xl text-sm font-medium"
              style={{ backgroundColor: 'var(--border)', color: 'var(--text-secondary)' }}
            >
              Skip tour
            </button>

            <button
              onClick={() => {
                if (isLast) dismiss();
                else setStep(s => s + 1);
              }}
              className="flex-1 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ backgroundColor: current.color }}
            >
              {isLast ? '🚀 Get Started' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTour;
