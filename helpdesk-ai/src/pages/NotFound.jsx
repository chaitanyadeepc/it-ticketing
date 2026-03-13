import React from 'react';
import { useNavigate } from 'react-router-dom';
import PageWrapper from '../components/layout/PageWrapper';
import Button from '../components/ui/Button';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <PageWrapper>
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4">
        <div className="text-center max-w-md">

          {/* Illustration */}
          <div className="mb-8 animate-fade-in flex flex-col items-center">
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-3xl bg-[#18181b] border border-[#27272a] flex items-center justify-center mx-auto">
                <svg className="w-10 h-10 text-[#3f3f46]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 rounded-xl bg-[#27272a] border border-[#3f3f46] flex items-center justify-center">
                <svg className="w-4 h-4 text-[#ef4444]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
            <div className="text-[72px] font-bold text-[#27272a] font-['JetBrains_Mono'] leading-none mb-2">404</div>
          </div>

          <h1 className="text-[24px] font-semibold text-[#fafafa] mb-3 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            Page not found
          </h1>
          <p className="text-[14px] text-[#a1a1aa] mb-8 leading-relaxed animate-fade-in" style={{ animationDelay: '0.15s' }}>
            The page you're looking for doesn't exist or may have been moved.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <Button variant="primary" size="lg" onClick={() => navigate('/')} className="flex items-center gap-2 justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Go Home
            </Button>
            <Button variant="secondary" size="lg" onClick={() => navigate(-1)} className="flex items-center gap-2 justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Go Back
            </Button>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
};

export default NotFound;
