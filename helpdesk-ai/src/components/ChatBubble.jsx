import React, { useState, useEffect, useCallback } from 'react';

const BotAvatar = () => (
  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#2563eb] flex items-center justify-center shadow-lg shadow-[#3b82f6]/20">
    <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7H3a7 7 0 0 1 7-7h1V5.73A2 2 0 0 1 10 4a2 2 0 0 1 2-2m-4 9.5a1 1 0 0 0-1 1 1 1 0 0 0 1 1 1 1 0 0 0 1-1 1 1 0 0 0-1-1m8 0a1 1 0 0 0-1 1 1 1 0 0 0 1 1 1 1 0 0 0 1-1 1 1 0 0 0-1-1M3 15h18v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1Z" />
    </svg>
  </div>
);

const UserAvatar = () => {
  const raw = localStorage.getItem('userName') || localStorage.getItem('userEmail') || '';
  const initials = raw ? raw.trim().slice(0, 2).toUpperCase() : 'U';
  return (
    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#21262d] border border-[#30363d] flex items-center justify-center text-[11px] font-semibold text-[#e6edf3]">
      {initials}
    </div>
  );
};

// ── Inline renderer: **bold** and `code` ─────────────────────────────────────
const renderInline = (text) => {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*\n]+\*\*|`[^`\n]+`)/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part))
      return <strong key={i} className="font-semibold text-[#fafafa]">{part.slice(2, -2)}</strong>;
    if (/^`[^`]+`$/.test(part))
      return <code key={i} className="px-1 py-0.5 rounded bg-[#27272a] text-[#22c55e] font-mono text-[11.5px] align-middle">{part.slice(1, -1)}</code>;
    return part;
  });
};

// ── Block renderer: paragraphs + bullet lists ─────────────────────────────────
const BotContent = ({ text }) => {
  if (!text) return null;
  const blocks = text.split(/\n\n+/);
  return (
    <div className="space-y-1.5 text-[13.5px] leading-relaxed text-[#d4d4d8]">
      {blocks.map((block, bi) => {
        const lines = block.split('\n');
        const bulletLines = lines.filter(l => /^[•\-]\s/.test(l.trim()));
        // Render as bullet list if all non-empty lines are bullets
        if (bulletLines.length > 0 && bulletLines.length === lines.filter(l => l.trim()).length) {
          return (
            <ul key={bi} className="space-y-1">
              {lines.map((line, li) => {
                if (!line.trim()) return null;
                return (
                  <li key={li} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] flex-shrink-0 mt-[5px]" />
                    <span>{renderInline(line.replace(/^[•\-]\s+/, ''))}</span>
                  </li>
                );
              })}
            </ul>
          );
        }
        // Regular paragraph with line breaks within
        return (
          <p key={bi}>
            {lines.map((line, li) => (
              <React.Fragment key={li}>
                {li > 0 && <br />}
                {renderInline(line)}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
};

const ChatBubble = ({ message, sender = 'bot', timestamp, msgTime }) => {
  const isBot = sender === 'bot';
  const [copied, setCopied] = useState(false);
  const [displayTime, setDisplayTime] = useState('');

  // Live aging timestamp: "just now" → "2m ago" → "1h ago" etc.
  useEffect(() => {
    if (!msgTime) { setDisplayTime(timestamp || ''); return; }
    const update = () => {
      const diff = Date.now() - msgTime;
      const sec = Math.floor(diff / 1000);
      const min = Math.floor(sec / 60);
      const hr  = Math.floor(min / 60);
      if (sec < 10)  setDisplayTime('just now');
      else if (sec < 60)  setDisplayTime(`${sec}s ago`);
      else if (min < 60)  setDisplayTime(`${min}m ago`);
      else if (hr  < 24)  setDisplayTime(`${hr}h ago`);
      else setDisplayTime(new Date(msgTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }));
    };
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, [msgTime, timestamp]);

  const handleCopy = useCallback(() => {
    const plain = message.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1');
    navigator.clipboard.writeText(plain).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }, [message]);

  return (
    <div className={`flex items-end gap-2.5 group/msg ${!isBot ? 'flex-row-reverse' : ''}`}>
      {isBot ? <BotAvatar /> : <UserAvatar />}

      <div className={`flex flex-col gap-1 max-w-[85%] sm:max-w-[78%] ${!isBot ? 'items-end' : ''}`}>
        <div className={`relative px-4 py-2.5 rounded-2xl break-words ${
          isBot
            ? 'bg-[#1c1c1f] border border-[#27272a] rounded-bl-md'
            : 'bg-[#3b82f6] rounded-br-md text-white text-[13.5px] leading-relaxed whitespace-pre-wrap'
        }`}>
          {isBot ? <BotContent text={message} /> : message}
          {/* Copy button — appears on hover for bot messages */}
          {isBot && (
            <button
              onClick={handleCopy}
              title="Copy message"
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#27272a] border border-[#3f3f46] flex items-center justify-center opacity-0 group-hover/msg:opacity-100 transition-opacity hover:bg-[#3f3f46]"
            >
              {copied
                ? <svg className="w-3 h-3 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                : <svg className="w-3 h-3 text-[#71717a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
              }
            </button>
          )}
        </div>
        {(displayTime || timestamp) && (
          <span className="text-[10px] text-[#52525b] px-1 transition-all">
            {displayTime || timestamp}
          </span>
        )}
      </div>
    </div>
  );
};

export const TypingIndicator = () => (
  <div className="flex items-end gap-2.5">
    <BotAvatar />
    <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-[#1c1c1f] border border-[#27272a] flex items-center gap-1.5">
      <span className="w-2 h-2 bg-[#3b82f6]/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-2 h-2 bg-[#3b82f6]/60 rounded-full animate-bounce" style={{ animationDelay: '160ms' }} />
      <span className="w-2 h-2 bg-[#3b82f6]/60 rounded-full animate-bounce" style={{ animationDelay: '320ms' }} />
    </div>
  </div>
);

export default ChatBubble;
