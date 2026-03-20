const fs = require('fs');
const path = require('path');

function walk(dir) {
  const files = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) files.push(...walk(full));
    else if (f.endsWith('.jsx') || f.endsWith('.js')) files.push(full);
  }
  return files;
}

const hookNames = ['useState','useEffect','useRef','useCallback','useMemo','useReducer',
  'useContext','useNavigate','useLocation','useParams','useSearchParams',
  'useScrollTop','useInactivityLogout','useTheme','useToast'];
const hookRe = new RegExp(`\\b(${hookNames.join('|')})\\s*\\(`);

const issues = [];
const baseDir = '/Users/chaitanya/IT Ticketing/helpdesk-ai/src';

for (const file of walk(baseDir)) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  
  // Track function boundaries naively by looking at early returns then hooks
  // We need to track per-function, so reset when we see a new export default / function
  let inFunction = false;
  let earlyReturns = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // New top-level function/component
    if (/^(export\s+default\s+function|export\s+const\s+\w+\s*=|const\s+\w+\s*=\s*(\(|React\.))/.test(line)) {
      inFunction = true;
      earlyReturns = [];
    }
    
    // Early conditional return INSIDE a component body
    if (inFunction && /^\s*if\s*\(.+\)\s*(return null|return;)/.test(lines[i])) {
      earlyReturns.push(i + 1);
    }
    
    // Hook call after an early return
    if (inFunction && earlyReturns.length > 0 && hookRe.test(line)) {
      issues.push(`${file.replace(baseDir + '/', '')}:L${i+1} — hook '${line.match(hookRe)[1]}' after early return(s) at L${earlyReturns.join(',')}`);
    }
  }
}

if (issues.length) {
  console.log('HOOKS AFTER EARLY RETURNS:\n' + issues.join('\n'));
} else {
  console.log('No hooks-after-return found');
}
