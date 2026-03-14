// Reusable HiTicket logo component
// Props:
//   size: 'sm' | 'md' | 'lg' | 'xl'  (default 'md')
//   showWordmark: bool (default true)
//   className: extra classes on the wrapper

const SIZES = {
  sm:  { box: 28, svg: 14, text: 14 },
  md:  { box: 36, svg: 18, text: 17 },
  lg:  { box: 44, svg: 22, text: 21 },
  xl:  { box: 56, svg: 28, text: 26 },
};

export default function LogoMark({ size = 'md', showWordmark = true, className = '' }) {
  const s = SIZES[size] ?? SIZES.md;

  return (
    <div className={`flex items-center gap-2 flex-shrink-0 ${className}`}>
      {/* Icon box */}
      <div
        className="rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ width: s.box, height: s.box, backgroundColor: '#FF634A' }}
      >
        <svg
          style={{ width: s.svg, height: s.svg }}
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Ticket outline */}
          <rect x="1" y="4" width="18" height="12" rx="2" stroke="white" strokeWidth="1.6" fill="none"/>
          {/* Perforation notches */}
          <circle cx="1"  cy="10" r="2" fill="#FF634A"/>
          <circle cx="19" cy="10" r="2" fill="#FF634A"/>
          <line x1="1"  y1="10" x2="3"  y2="10" stroke="white" strokeWidth="1.6"/>
          <line x1="17" y1="10" x2="19" y2="10" stroke="white" strokeWidth="1.6"/>
          {/* Center dashed perforation */}
          <line x1="3" y1="10" x2="17" y2="10" stroke="white" strokeWidth="1" strokeDasharray="2 2" opacity="0.5"/>
          {/* Hi text mark */}
          <text x="5.5" y="9" fontSize="5" fontWeight="700" fill="white" fontFamily="system-ui">Hi</text>
        </svg>
      </div>

      {/* Wordmark */}
      {showWordmark && (
        <span
          className="font-bold tracking-tight select-none"
          style={{ fontSize: s.text, color: '#ffffff', letterSpacing: '-0.3px' }}
        >
          Hi<span style={{ color: '#FF634A' }}>Ticket</span>
        </span>
      )}
    </div>
  );
}
