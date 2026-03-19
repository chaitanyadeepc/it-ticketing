import React from 'react';

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

const ChatBubble = ({ message, sender = 'bot', timestamp }) => {
  const isBot = sender === 'bot';

  return (
    <div className={`flex items-end gap-2.5 ${!isBot ? 'flex-row-reverse' : ''}`}>
      {isBot ? <BotAvatar /> : <UserAvatar />}

      <div className={`flex flex-col gap-1 max-w-[85%] sm:max-w-[78%] ${!isBot ? 'items-end' : ''}`}>
        <div className={`px-4 py-2.5 rounded-2xl break-words ${
          isBot
            ? 'bg-[#1c1c1f] border border-[#27272a] rounded-bl-md'
            : 'bg-[#3b82f6] rounded-br-md text-white text-[13.5px] leading-relaxed whitespace-pre-wrap'
        }`}>
          {isBot ? <BotContent text={message} /> : message}
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
    <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-[#1c1c1f] border border-[#27272a] flex items-center gap-1.5">
      <span className="w-2 h-2 bg-[#3b82f6]/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-2 h-2 bg-[#3b82f6]/60 rounded-full animate-bounce" style={{ animationDelay: '160ms' }} />
      <span className="w-2 h-2 bg-[#3b82f6]/60 rounded-full animate-bounce" style={{ animationDelay: '320ms' }} />
    </div>
  </div>
);

export default ChatBubble;
