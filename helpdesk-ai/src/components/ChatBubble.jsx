import React from 'react';

const BotAvatar = () => (
  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#2563eb] flex items-center justify-center shadow-lg shadow-[#3b82f6]/20">
    <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7H3a7 7 0 0 1 7-7h1V5.73A2 2 0 0 1 10 4a2 2 0 0 1 2-2m-4 9.5a1 1 0 0 0-1 1 1 1 0 0 0 1 1 1 1 0 0 0 1-1 1 1 0 0 0-1-1m8 0a1 1 0 0 0-1 1 1 1 0 0 0 1 1 1 1 0 0 0 1-1 1 1 0 0 0-1-1M3 15h18v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1Z" />
    </svg>
  </div>
);

const UserAvatar = () => {
  const email = localStorage.getItem('userEmail') || '';
  const initials = email ? email.slice(0, 2).toUpperCase() : 'U';
  return (
    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#3f3f46] border border-[#52525b] flex items-center justify-center text-[11px] font-semibold text-[#fafafa]">
      {initials}
    </div>
  );
};

const ChatBubble = ({ message, sender = 'bot', timestamp }) => {
  const isBot = sender === 'bot';

  return (
    <div className={`flex items-end gap-2.5 ${!isBot ? 'flex-row-reverse' : ''}`}>
      {isBot ? <BotAvatar /> : <UserAvatar />}

      <div className={`flex flex-col gap-1 max-w-[75%] ${!isBot ? 'items-end' : ''}`}>
        <div className={`px-4 py-2.5 rounded-2xl text-[13.5px] leading-relaxed whitespace-pre-wrap break-words ${
          isBot
            ? 'bg-[#1c1c1f] border border-[#27272a] rounded-bl-md text-[#e4e4e7]'
            : 'bg-[#3b82f6] rounded-br-md text-white'
        }`}>
          {message}
        </div>
        {timestamp && (
          <span className="text-[10px] text-[#52525b] px-1">{timestamp}</span>
        )}
      </div>
    </div>
  );
};

export const TypingIndicator = () => (
  <div className="flex items-end gap-2.5">
    <BotAvatar />
    <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-[#1c1c1f] border border-[#27272a] flex items-center gap-1">
      <span className="w-1.5 h-1.5 bg-[#52525b] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-1.5 h-1.5 bg-[#52525b] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="w-1.5 h-1.5 bg-[#52525b] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  </div>
);

export default ChatBubble;
