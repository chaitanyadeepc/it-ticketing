import React, { useState, useEffect, useRef } from 'react';
import PageWrapper from '../components/layout/PageWrapper';
import Breadcrumb from '../components/layout/Breadcrumb';
import api from '../api/api';

const LANGUAGES = [
  'text', 'javascript', 'typescript', 'jsx', 'tsx', 'python', 'bash', 'shell',
  'sql', 'json', 'yaml', 'html', 'css', 'java', 'cpp', 'csharp', 'go', 'rust',
  'php', 'ruby', 'swift', 'kotlin', 'markdown', 'dockerfile', 'nginx', 'xml',
];

const LANG_COLORS = {
  javascript: '#f0db4f', typescript: '#3178c6', jsx: '#61dafb', tsx: '#61dafb',
  python: '#3572A5', bash: '#89e051', shell: '#89e051', sql: '#e38c00',
  json: '#8bc34a', yaml: '#cb171e', html: '#e34c26', css: '#563d7c',
  java: '#b07219', cpp: '#f34b7d', csharp: '#178600', go: '#00add8',
  rust: '#dea584', php: '#4f5d95', ruby: '#701516', swift: '#f05138',
  kotlin: '#A97BFF', markdown: '#083fa1', dockerfile: '#384d54',
  nginx: '#009639', xml: '#0060ac', text: '#71717a',
};

const getLangColor = (lang) => LANG_COLORS[lang?.toLowerCase()] || LANG_COLORS.text;

// ── File block parser ─────────────────────────────────────────────────────────
// Detects lines like:  // path/to/File.cs   or   // src/app/service.ts
// Pattern: line starts with // (or # or --) followed by any file path
// (with or without folders) ending with a file extension. No spaces allowed.
const FILE_PATH_RE = /^(?:\/\/|#|--)\s*((?:[\w.\-/\\]*\/)?[\w.\-]+\.\w+)\s*$/;

// Returns array of { filePath, code, startLine } blocks.
// If no file-path markers are found → single block with filePath = null.
const parseFileBlocks = (content) => {
  const lines = content.split('\n');
  const blocks = [];
  let current = null;

  lines.forEach((line, idx) => {
    const m = line.match(FILE_PATH_RE);
    if (m) {
      if (current) blocks.push(current);
      current = { filePath: m[1], lines: [], startLine: idx + 1 };
    } else if (current) {
      current.lines.push(line);
    } else {
      // Before first marker — put into a "header" block
      if (!blocks[0] || blocks[0].filePath !== null) {
        blocks.unshift({ filePath: null, lines: [], startLine: 1, isHeader: true });
      }
      blocks[0].lines.push(line);
    }
  });
  if (current) blocks.push(current);

  // If we never hit any markers, return the whole content as one block
  if (blocks.length === 0 || (blocks.length === 1 && blocks[0].filePath === null)) {
    return [{ filePath: null, code: content, startLine: 1 }];
  }

  return blocks.map(b => ({ ...b, code: b.lines.join('\n').replace(/^\n+/, '') }));
};

// Derive display language colour from file extension
const EXT_LANG = {
  cs: 'csharp', ts: 'typescript', tsx: 'tsx', jsx: 'jsx', js: 'javascript',
  py: 'python', rb: 'ruby', go: 'go', rs: 'rust', java: 'java',
  php: 'php', swift: 'swift', kt: 'kotlin', cpp: 'cpp', c: 'cpp',
  html: 'html', css: 'css', scss: 'css', json: 'json', yaml: 'yaml',
  yml: 'yaml', sh: 'bash', bash: 'bash', sql: 'sql', md: 'markdown',
  xml: 'xml', dockerfile: 'dockerfile',
};
const extColor = (filePath) => {
  if (!filePath) return null;
  const ext = filePath.split('.').pop()?.toLowerCase();
  return getLangColor(EXT_LANG[ext] || ext);
};

// File icon — shows folder path + filename styled differently
function FilePathBadge({ filePath }) {
  const parts = filePath.split('/');
  const filename = parts.pop();
  const folder = parts.join('/');
  const color = extColor(filePath);
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-t"
      style={{ backgroundColor: '#0e0e11', borderColor: 'rgba(255,255,255,0.06)' }}>
      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} style={{ color: color || 'rgba(255,255,255,0.35)' }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <span className="text-[11px] font-mono">
        {folder && <span style={{ color: 'rgba(255,255,255,0.35)' }}>{folder}/</span>}
        <span className="font-semibold" style={{ color: color || 'rgba(255,255,255,0.75)' }}>{filename}</span>
      </span>
    </div>
  );
}

const CopyIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" strokeLinejoin="round" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);

const EditIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.293-6.293a1 1 0 011.414 0l1.586 1.586a1 1 0 010 1.414L12 16H9v-3z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const LockIcon = () => (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const GlobeIcon = () => (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CopyAllIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const FolderUploadIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 11v6m-3-3l3-3 3 3" />
  </svg>
);

const EMPTY_FORM = { title: '', content: '', language: 'text', description: '', visibility: 'all', allowedUsers: [] };

// ── Visibility config ────────────────────────────────────────────────────────
const VISIBILITY_OPTIONS = [
  {
    key: 'all',
    label: 'Everyone',
    desc: 'All authenticated users',
    color: '#3b82f6',
    icon: (cls) => (
      <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    key: 'staff',
    label: 'Staff',
    desc: 'Agents & Admins',
    color: '#f59e0b',
    icon: (cls) => (
      <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    key: 'admins',
    label: 'Admins only',
    desc: 'Only admin accounts',
    color: '#ef4444',
    icon: (cls) => (
      <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
  {
    key: 'custom',
    label: 'Custom',
    desc: 'Specific people',
    color: '#a78bfa',
    icon: (cls) => (
      <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

const getVisibilityConfig = (key) => VISIBILITY_OPTIONS.find(v => v.key === key) || VISIBILITY_OPTIONS[0];

function VisibilityBadge({ visibility, allowedUsers = [] }) {
  const cfg = getVisibilityConfig(visibility);
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium"
      style={{ backgroundColor: `${cfg.color}18`, color: cfg.color, border: `1px solid ${cfg.color}30` }}
    >
      {cfg.icon('w-2.5 h-2.5')}
      {visibility === 'custom' && allowedUsers.length > 0
        ? `${allowedUsers.length} user${allowedUsers.length !== 1 ? 's' : ''}`
        : cfg.label}
    </span>
  );
}

function useCopyState() {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef(null);
  const copy = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    });
  };
  return [copied, copy];
}

// ── Individual snippet copy button ──────────────────────────────────────────
function CopyButton({ text, label = 'Copy', size = 'sm' }) {
  const [copied, copy] = useCopyState();
  const base = size === 'sm'
    ? 'flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-lg border transition-all'
    : 'flex items-center gap-2 px-4 py-2 text-[13px] font-semibold rounded-xl border transition-all';

  return (
    <button
      onClick={() => copy(text)}
      className={`${base} ${copied
        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
        : 'border-white/10 bg-white/5 text-[rgba(255,255,255,0.6)] hover:bg-white/10 hover:text-white hover:border-white/20'
      }`}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
      {copied ? 'Copied!' : label}
    </button>
  );
}

// ── File tree builder ────────────────────────────────────────────────────────
const buildFileTree = (blocks) => {
  const root = { path: '__root__', name: 'root', type: 'folder', children: [] };
  blocks.forEach((block, idx) => {
    if (!block.filePath) return;
    const parts = block.filePath.replace(/\\/g, '/').split('/');
    let node = root;
    parts.forEach((part, partIdx) => {
      const isLast = partIdx === parts.length - 1;
      const curPath = parts.slice(0, partIdx + 1).join('/');
      let child = node.children.find(c => c.name === part && (isLast ? c.type === 'file' : c.type === 'folder'));
      if (!child) {
        child = isLast
          ? { path: curPath, name: part, type: 'file', blockIdx: idx, filePath: block.filePath }
          : { path: curPath, name: part, type: 'folder', children: [] };
        node.children.push(child);
      }
      if (!isLast) node = child;
    });
  });
  const sortNode = (n) => {
    if (n.children) {
      n.children.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      n.children.forEach(sortNode);
    }
    return n;
  };
  return sortNode(root);
};

const collectFolderPaths = (node, acc = new Set()) => {
  if (node.type === 'folder' && node.path !== '__root__') acc.add(node.path);
  node.children?.forEach(c => collectFolderPaths(c, acc));
  return acc;
};

// ── File tree node (recursive) ───────────────────────────────────────────────
function FileTreeNode({ node, depth, selectedIdx, onSelect, expanded, onToggle }) {
  const isOpen = expanded.has(node.path);
  const isSelected = node.type === 'file' && node.blockIdx === selectedIdx;
  const color = node.type === 'file' ? extColor(node.filePath) : null;

  if (node.type === 'folder') {
    return (
      <div>
        <button
          onClick={() => onToggle(node.path)}
          className="w-full flex items-center gap-1 py-[3px] rounded-sm text-left hover:bg-white/5 transition-colors"
          style={{ paddingLeft: `${6 + depth * 12}px`, paddingRight: '8px' }}
        >
          <svg
            className={`w-2.5 h-2.5 flex-shrink-0 transition-transform duration-150 ${isOpen ? 'rotate-90' : ''}`}
            fill="none" viewBox="0 0 24 24" strokeWidth={2.5}
            stroke="rgba(255,255,255,0.3)"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} style={{ color: '#f59e0b' }}>
            {isOpen
              ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
              : <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
            }
          </svg>
          <span className="text-[11.5px] font-medium text-[rgba(255,255,255,0.65)] truncate select-none">{node.name}</span>
        </button>
        {isOpen && node.children.map(child => (
          <FileTreeNode
            key={child.path}
            node={child}
            depth={depth + 1}
            selectedIdx={selectedIdx}
            onSelect={onSelect}
            expanded={expanded}
            onToggle={onToggle}
          />
        ))}
      </div>
    );
  }

  return (
    <button
      onClick={() => onSelect(node.blockIdx)}
      className="w-full flex items-center gap-1.5 py-[3px] rounded-sm text-left transition-colors hover:bg-white/5"
      style={{
        paddingLeft: `${6 + depth * 12 + 14}px`,
        paddingRight: '8px',
        backgroundColor: isSelected ? 'rgba(255,99,74,0.13)' : undefined,
      }}
    >
      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}
        style={{ color: color || 'rgba(255,255,255,0.3)' }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <span className="text-[11.5px] truncate select-none" style={{ color: isSelected ? '#fff' : (color || 'rgba(255,255,255,0.6)') }}>
        {node.name}
      </span>
    </button>
  );
}

// ── Right-side code panel ─────────────────────────────────────────────────────
function CodePanel({ block }) {
  const [copied, copy] = useCopyState();
  if (!block) return (
    <div className="flex-1 flex items-center justify-center text-[13px] text-[rgba(255,255,255,0.2)]">
      Select a file from the explorer
    </div>
  );
  const lines = (block.code || '').split('\n');
  const displayLines = lines[lines.length - 1] === '' ? lines.slice(0, -1) : lines;

  return (
    <div className="flex flex-col h-full min-h-0">
      {block.filePath && (
        <div className="flex items-center justify-between pl-1 pr-3 flex-shrink-0 border-b"
          style={{ backgroundColor: '#0e0e11', borderColor: 'rgba(255,255,255,0.06)' }}>
          <FilePathBadge filePath={block.filePath} />
          <button
            onClick={() => copy(block.code)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
              copied
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                : 'border-white/8 bg-white/4 text-[rgba(255,255,255,0.45)] hover:bg-white/10 hover:text-white hover:border-white/20'
            }`}
            title={`Copy ${block.filePath}`}
          >
            {copied
              ? <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              : <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><rect x="9" y="9" width="13" height="13" rx="2" ry="2" strokeLinejoin="round" /><path strokeLinecap="round" strokeLinejoin="round" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
            }
            {copied ? 'Copied' : 'Copy file'}
          </button>
        </div>
      )}
      <div className="flex flex-1 overflow-auto" style={{ backgroundColor: '#080809' }}>
        <div
          className="select-none flex-shrink-0 text-right px-3 py-4 text-[11.5px] leading-6 font-mono"
          style={{ color: 'rgba(255,255,255,0.15)', userSelect: 'none', borderRight: '1px solid rgba(255,255,255,0.04)', minWidth: '46px', backgroundColor: '#0a0a0c' }}
        >
          {displayLines.map((_, i) => <div key={i}>{i + 1}</div>)}
        </div>
        <pre className="flex-1 px-5 py-4 text-[12.5px] leading-6 font-mono overflow-x-auto m-0"
          style={{ color: 'rgba(255,255,255,0.85)', background: 'transparent', whiteSpace: 'pre' }}>
          <code>{displayLines.join('\n')}</code>
        </pre>
      </div>
    </div>
  );
}

// ── Snippet modal (view) ─────────────────────────────────────────────────────
function SnippetModal({ snippet, onClose, isAdmin, onEdit, onDelete }) {
  const [copiedAll, copyAll] = useCopyState();
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const response = await api.get(`/codeshare/${snippet._id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${snippet.title.replace(/[^a-zA-Z0-9_\-]/g, '_')}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // silently ignore
    } finally {
      setDownloading(false);
    }
  };

  const blocks = parseFileBlocks(snippet.content);
  const isMultiFile = blocks.some(b => b.filePath !== null);
  const tree = buildFileTree(blocks);

  const [expanded, setExpanded] = useState(() => collectFolderPaths(tree));
  const [selectedIdx, setSelectedIdx] = useState(() => {
    const first = blocks.findIndex(b => b.filePath !== null);
    return first >= 0 ? first : 0;
  });

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!snippet) return null;
  const langColor = getLangColor(snippet.language);
  const fileCount = blocks.filter(b => b.filePath).length;

  const toggleFolder = (path) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(path) ? next.delete(path) : next.add(path);
    return next;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`w-full flex flex-col rounded-2xl border overflow-hidden shadow-2xl ${isMultiFile ? 'max-w-6xl' : 'max-w-4xl'}`}
        style={{ backgroundColor: '#0d0d0f', borderColor: 'rgba(255,255,255,0.08)', maxHeight: '92vh' }}
      >
        {/* ── Header ── */}
        <div className="flex items-start justify-between px-5 py-4 border-b flex-shrink-0"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-widest uppercase"
                style={{ backgroundColor: `${langColor}18`, color: langColor, border: `1px solid ${langColor}30` }}
              >
                {snippet.language || 'text'}
              </span>
              <VisibilityBadge visibility={snippet.visibility} allowedUsers={snippet.allowedUsers} />
              {isMultiFile && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-white/5 text-[rgba(255,255,255,0.4)] border border-white/8">
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {fileCount} file{fileCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <h2 className="text-[16px] font-bold text-white leading-tight truncate">{snippet.title}</h2>
            {snippet.description && (
              <p className="text-[12px] text-[rgba(255,255,255,0.4)] mt-0.5 line-clamp-1">{snippet.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {isAdmin && (
              <>
                <button onClick={() => onEdit(snippet)} className="p-2 rounded-lg border border-white/10 bg-white/5 text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-white/10 transition-all" title="Edit">
                  <EditIcon />
                </button>
                <button onClick={() => onDelete(snippet)} className="p-2 rounded-lg border border-red-500/20 bg-red-500/8 text-red-400/70 hover:text-red-400 hover:bg-red-500/15 transition-all" title="Delete">
                  <TrashIcon />
                </button>
              </>
            )}
            <button
              onClick={() => copyAll(snippet.content)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[12px] font-semibold transition-all ${
                copiedAll
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                  : 'border-[#FF634A]/30 bg-[#FF634A]/10 text-[#FF634A] hover:bg-[#FF634A]/20'
              }`}
            >
              {copiedAll ? <CheckIcon /> : <CopyAllIcon />}
              {copiedAll ? 'Copied!' : 'Copy All'}
            </button>
            {/* Download button — visible to all who can view */}
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[12px] font-semibold transition-all disabled:opacity-50 border-white/10 bg-white/5 text-[rgba(255,255,255,0.6)] hover:bg-white/10 hover:text-white"
              title="Download as zip (preserves folder structure)"
            >
              <DownloadIcon />
              {downloading ? 'Downloading…' : 'Download'}
            </button>
            <button onClick={onClose} className="p-2 rounded-lg text-[rgba(255,255,255,0.4)] hover:text-white hover:bg-white/8 transition-all">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        {isMultiFile ? (
          /* Explorer layout */
          <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
            {/* Left: file tree */}
            <div className="w-52 flex-shrink-0 overflow-y-auto border-r py-2"
              style={{ backgroundColor: '#0b0b0d', borderColor: 'rgba(255,255,255,0.06)' }}>
              <p className="px-3 pb-2 text-[9px] font-bold uppercase tracking-[0.12em] text-[rgba(255,255,255,0.22)]">
                Explorer
              </p>
              {tree.children.map(child => (
                <FileTreeNode
                  key={child.path}
                  node={child}
                  depth={0}
                  selectedIdx={selectedIdx}
                  onSelect={setSelectedIdx}
                  expanded={expanded}
                  onToggle={toggleFolder}
                />
              ))}
            </div>
            {/* Right: code panel */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <CodePanel block={blocks[selectedIdx]} />
            </div>
          </div>
        ) : (
          /* Single flat view */
          <div className="flex-1 overflow-auto" style={{ backgroundColor: '#080809' }}>
            <div className="flex">
              <div
                className="select-none flex-shrink-0 text-right px-4 py-5 text-[12px] leading-6 font-mono"
                style={{ color: 'rgba(255,255,255,0.18)', userSelect: 'none', borderRight: '1px solid rgba(255,255,255,0.05)', minWidth: '52px', backgroundColor: '#0a0a0c' }}
              >
                {snippet.content.split('\n').map((_, i) => <div key={i}>{i + 1}</div>)}
              </div>
              <pre className="flex-1 px-5 py-5 text-[13px] leading-6 font-mono overflow-x-auto m-0"
                style={{ color: 'rgba(255,255,255,0.88)', background: 'transparent', whiteSpace: 'pre' }}>
                <code>{snippet.content}</code>
              </pre>
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <div className="px-5 py-2.5 border-t flex items-center justify-between flex-wrap gap-2 flex-shrink-0"
          style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: '#0d0d0f' }}>
          <span className="text-[11px] text-[rgba(255,255,255,0.28)]">
            {snippet.authorName && `By ${snippet.authorName} · `}
            {snippet.content.split('\n').length} lines · {new Blob([snippet.content]).size} bytes
          </span>
          {isAdmin && snippet.visibility === 'custom' && snippet.allowedUsers?.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[10px] text-[rgba(255,255,255,0.3)] mr-1">Visible to:</span>
              {snippet.allowedUsers.map(u => (
                <span key={u._id || u} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/8 text-[rgba(255,255,255,0.5)]">
                  {u.name || u.email}
                </span>
              ))}
            </div>
          )}
          <span className="text-[11px] text-[rgba(255,255,255,0.28)]">
            Updated {new Date(snippet.updatedAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
}


// ── Create / Edit modal ──────────────────────────────────────────────────────
function EditorModal({ initial, onSave, onClose, saving }) {
  const isEdit = !!initial?._id;

  // Seed allowedUsers from populated objects if editing
  const seedForm = () => {
    if (!initial) return EMPTY_FORM;
    return {
      title:        initial.title        || '',
      content:      initial.content      || '',
      language:     initial.language     || 'text',
      description:  initial.description  || '',
      visibility:   initial.visibility   || 'all',
      allowedUsers: Array.isArray(initial.allowedUsers) ? initial.allowedUsers : [],
    };
  };

  const [form, setForm] = useState(seedForm);
  const [allUsers, setAllUsers]         = useState([]);
  const [userSearch, setUserSearch]     = useState('');
  const [userDropOpen, setUserDropOpen] = useState(false);
  const [uploadingFolder, setUploadingFolder] = useState(false);
  const userSearchRef = useRef(null);
  const dropRef = useRef(null);
  const folderInputRef = useRef(null);

  // ── Folder upload handler ─────────────────────────────────────────────────
  const handleFolderUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploadingFolder(true);
    try {
      // Sort by webkitRelativePath so folders are grouped naturally
      files.sort((a, b) => a.webkitRelativePath.localeCompare(b.webkitRelativePath));

      const blocks = await Promise.all(
        files.map(async (file) => {
          const text = await file.text();
          // webkitRelativePath starts with the root folder name: "myproject/src/App.tsx"
          // We strip the top-level folder name so the tree starts from its children
          const parts = file.webkitRelativePath.split('/');
          const relativePath = parts.slice(1).join('/') || parts[0];
          return `// ${relativePath}\n${text}`;
        })
      );

      // Auto-set title to folder name if title is empty
      const folderName = files[0].webkitRelativePath.split('/')[0];
      const builtContent = blocks.join('\n\n');
      setForm(f => ({
        ...f,
        content: builtContent,
        title: f.title || folderName,
      }));
    } catch (err) {
      console.error('Folder read error', err);
    } finally {
      setUploadingFolder(false);
      // Reset so the same folder can be re-uploaded
      e.target.value = '';
    }
  };

  // Fetch all users for the custom picker
  useEffect(() => {
    api.get('/users').then(({ data }) => setAllUsers(data.users || [])).catch(() => {});
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setUserDropOpen(false);
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', handler);
    };
  }, [onClose]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;
    // Send only IDs for allowedUsers
    onSave({
      ...form,
      allowedUsers: form.allowedUsers.map(u => u._id || u),
    });
  };

  const addUser = (user) => {
    if (form.allowedUsers.find(u => (u._id || u) === user._id)) return;
    setForm(f => ({ ...f, allowedUsers: [...f.allowedUsers, user] }));
    setUserSearch('');
  };

  const removeUser = (userId) => {
    setForm(f => ({ ...f, allowedUsers: f.allowedUsers.filter(u => (u._id || u) !== userId) }));
  };

  const selectedIds = new Set(form.allowedUsers.map(u => u._id || u));
  const filteredUsers = allUsers.filter(u =>
    !selectedIds.has(u._id) &&
    (u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
     u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
     u.role?.toLowerCase().includes(userSearch.toLowerCase()))
  );

  const ROLE_COLORS = { admin: '#ef4444', agent: '#f59e0b', user: '#3b82f6' };
  const inputClass = "w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3.5 py-2.5 text-[13px] text-white placeholder-[rgba(255,255,255,0.25)] focus:outline-none focus:border-[#FF634A]/50 focus:bg-[rgba(255,99,74,0.04)] transition-all";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl border overflow-hidden shadow-2xl"
        style={{ backgroundColor: 'var(--bg)', borderColor: 'rgba(255,255,255,0.1)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <h2 className="text-[15px] font-bold text-white">{isEdit ? 'Edit Snippet' : 'New Snippet'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[rgba(255,255,255,0.4)] hover:text-white hover:bg-white/8 transition-all">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">

            {/* Title */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[rgba(255,255,255,0.4)] mb-1.5">Title *</label>
              <input
                className={inputClass}
                placeholder="e.g. Database connection script"
                value={form.title}
                onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                maxLength={200}
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[rgba(255,255,255,0.4)] mb-1.5">Description</label>
              <input
                className={inputClass}
                placeholder="Brief description of what this snippet does"
                value={form.description}
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                maxLength={500}
              />
            </div>

            {/* Language */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[rgba(255,255,255,0.4)] mb-1.5">Language</label>
              <select
                className={inputClass}
                value={form.language}
                onChange={(e) => setForm(f => ({ ...f, language: e.target.value }))}
                style={{ appearance: 'none' }}
              >
                {LANGUAGES.map(l => (
                  <option key={l} value={l} style={{ background: '#1a1a1f' }}>{l}</option>
                ))}
              </select>
            </div>

            {/* ── Visibility picker ── */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[rgba(255,255,255,0.4)] mb-2">Who can view this snippet</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {VISIBILITY_OPTIONS.map(opt => {
                  const active = form.visibility === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, visibility: opt.key, allowedUsers: opt.key !== 'custom' ? [] : f.allowedUsers }))}
                      className="flex flex-col items-start gap-1.5 p-3 rounded-xl border transition-all text-left"
                      style={{
                        borderColor: active ? `${opt.color}50` : 'rgba(255,255,255,0.07)',
                        backgroundColor: active ? `${opt.color}12` : 'rgba(255,255,255,0.03)',
                      }}
                    >
                      <div className="flex items-center justify-between w-full">
                        {opt.icon('w-3.5 h-3.5')}
                        {active && (
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} />
                        )}
                      </div>
                      <span className="text-[12px] font-semibold leading-none" style={{ color: active ? opt.color : 'rgba(255,255,255,0.7)' }}>
                        {opt.label}
                      </span>
                      <span className="text-[10px] leading-tight" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        {opt.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Custom user picker (only when visibility === 'custom') ── */}
            {form.visibility === 'custom' && (
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[rgba(255,255,255,0.4)] mb-2">
                  Select users
                  <span className="ml-2 text-[rgba(255,255,255,0.25)] normal-case font-normal">(admins always have access)</span>
                </label>

                {/* Selected pills */}
                {form.allowedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {form.allowedUsers.map(u => (
                      <span
                        key={u._id || u}
                        className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg text-[11px] font-medium border"
                        style={{ backgroundColor: `${ROLE_COLORS[u.role] || '#3b82f6'}15`, borderColor: `${ROLE_COLORS[u.role] || '#3b82f6'}30`, color: ROLE_COLORS[u.role] || '#3b82f6' }}
                      >
                        <span className="text-white/80">{u.name || u.email}</span>
                        <span className="text-[9px] uppercase tracking-wider opacity-70">{u.role}</span>
                        <button
                          type="button"
                          onClick={() => removeUser(u._id || u)}
                          className="ml-0.5 w-3.5 h-3.5 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/50 hover:text-white transition-all"
                        >
                          <svg className="w-2 h-2" viewBox="0 0 8 8" fill="currentColor">
                            <path d="M6.5 1.5l-5 5M1.5 1.5l5 5" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Search input + dropdown */}
                <div className="relative" ref={dropRef}>
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[rgba(255,255,255,0.3)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
                    </svg>
                    <input
                      ref={userSearchRef}
                      className="w-full pl-8 pr-4 py-2 text-[12px] rounded-xl border bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)] text-white placeholder-[rgba(255,255,255,0.3)] focus:outline-none focus:border-[#a78bfa]/40 transition-all"
                      placeholder="Search by name, email or role…"
                      value={userSearch}
                      onChange={(e) => { setUserSearch(e.target.value); setUserDropOpen(true); }}
                      onFocus={() => setUserDropOpen(true)}
                    />
                  </div>
                  {userDropOpen && filteredUsers.length > 0 && (
                    <div
                      className="absolute z-10 top-full mt-1 w-full rounded-xl border shadow-2xl overflow-hidden"
                      style={{ backgroundColor: '#18181b', borderColor: 'rgba(255,255,255,0.1)' }}
                    >
                      <div className="max-h-[200px] overflow-y-auto">
                        {filteredUsers.slice(0, 30).map(u => (
                          <button
                            key={u._id}
                            type="button"
                            onClick={() => { addUser(u); setUserDropOpen(false); }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/6 transition-colors text-left"
                          >
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                              style={{ backgroundColor: `${ROLE_COLORS[u.role] || '#3b82f6'}25`, color: ROLE_COLORS[u.role] || '#3b82f6' }}
                            >
                              {(u.name || u.email || '?').slice(0, 1).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[12px] font-medium text-white leading-none truncate">{u.name || '—'}</p>
                              <p className="text-[11px] text-[rgba(255,255,255,0.38)] truncate mt-0.5">{u.email}</p>
                            </div>
                            <span
                              className="flex-shrink-0 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: `${ROLE_COLORS[u.role] || '#3b82f6'}20`, color: ROLE_COLORS[u.role] || '#3b82f6' }}
                            >
                              {u.role}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {userDropOpen && userSearch && filteredUsers.length === 0 && (
                    <div className="absolute z-10 top-full mt-1 w-full rounded-xl border px-4 py-3 text-[12px] text-[rgba(255,255,255,0.35)]" style={{ backgroundColor: '#18181b', borderColor: 'rgba(255,255,255,0.08)' }}>
                      No users found
                    </div>
                  )}
                </div>

                {form.allowedUsers.length === 0 && (
                  <p className="text-[11px] text-[rgba(255,255,255,0.3)] mt-1.5">No users selected — nobody except admins will see this snippet.</p>
                )}
              </div>
            )}

            {/* Content */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[rgba(255,255,255,0.4)]">Content *</label>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-[rgba(255,255,255,0.25)]">
                    {form.content.split('\n').length} lines
                  </span>
                  {/* Hidden folder input */}
                  <input
                    ref={folderInputRef}
                    type="file"
                    webkitdirectory="true"
                    directory="true"
                    multiple
                    className="hidden"
                    onChange={handleFolderUpload}
                  />
                  <button
                    type="button"
                    onClick={() => folderInputRef.current?.click()}
                    disabled={uploadingFolder}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-all disabled:opacity-50"
                    style={{ borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)' }}
                    title="Upload a folder — all files will be added as separate blocks"
                  >
                    <FolderUploadIcon />
                    {uploadingFolder ? 'Reading…' : 'Upload Folder'}
                  </button>
                </div>
              </div>
              <textarea
                className="w-full bg-[#080809] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-3.5 text-[12.5px] leading-6 font-mono text-[rgba(255,255,255,0.85)] placeholder-[rgba(255,255,255,0.2)] focus:outline-none focus:border-[#FF634A]/40 resize-none transition-all"
                placeholder="Paste your code or text here…"
                value={form.content}
                onChange={(e) => setForm(f => ({ ...f, content: e.target.value }))}
                rows={12}
                required
                spellCheck={false}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 flex items-center justify-end gap-3 flex-shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2 text-[13px] font-medium text-[rgba(255,255,255,0.5)] hover:text-white transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !form.title.trim() || !form.content.trim()}
              className="px-5 py-2 text-[13px] font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg,#FF634A,#e0532d)', color: '#fff' }}
            >
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Snippet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Snippet card ─────────────────────────────────────────────────────────────
function SnippetCard({ snippet, isAdmin, onClick, onEdit, onDelete }) {
  const langColor = getLangColor(snippet.language);
  const lineCount = snippet.content.split('\n').length;
  const preview = snippet.content.slice(0, 300);

  return (
    <div
      className="group relative flex flex-col rounded-2xl border overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/40"
      style={{ backgroundColor: 'var(--color-canvas-overlay)', borderColor: 'rgba(255,255,255,0.07)' }}
      onClick={onClick}
    >
      {/* Top accent */}
      <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${langColor}60, transparent)` }} />

      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold tracking-widest uppercase"
                style={{ backgroundColor: `${langColor}18`, color: langColor, border: `1px solid ${langColor}28` }}
              >
                {snippet.language || 'text'}
              </span>
              <VisibilityBadge visibility={snippet.visibility} allowedUsers={snippet.allowedUsers} />
            </div>
            <h3 className="text-[14px] font-semibold text-white leading-tight line-clamp-1">{snippet.title}</h3>
            {snippet.description && (
              <p className="text-[12px] text-[rgba(255,255,255,0.38)] mt-0.5 line-clamp-1">{snippet.description}</p>
            )}
          </div>
          {/* Admin actions */}
          {isAdmin && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => onEdit(snippet)}
                className="p-1.5 rounded-lg border border-white/10 bg-white/5 text-[rgba(255,255,255,0.4)] hover:text-white hover:bg-white/12 transition-all"
                title="Edit"
              >
                <EditIcon />
              </button>
              <button
                onClick={() => onDelete(snippet)}
                className="p-1.5 rounded-lg border border-red-500/15 bg-red-500/5 text-red-400/50 hover:text-red-400 hover:bg-red-500/12 transition-all"
                title="Delete"
              >
                <TrashIcon />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Code preview */}
      <div className="mx-4 mb-4 rounded-xl overflow-hidden border" style={{ borderColor: 'rgba(255,255,255,0.05)', backgroundColor: '#080809' }}>
        <pre className="px-4 py-3 text-[11px] leading-5 font-mono text-[rgba(255,255,255,0.55)] overflow-hidden m-0 line-clamp-4"
          style={{ maxHeight: '80px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' }}>
          {preview}
        </pre>
        {snippet.content.length > 300 && (
          <div className="px-4 py-1.5 border-t text-[10px] text-[rgba(255,255,255,0.25)] font-medium" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            + more…
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 pb-3.5 mt-auto flex items-center justify-between">
        <span className="text-[11px] text-[rgba(255,255,255,0.28)]">
          {lineCount} line{lineCount !== 1 ? 's' : ''} · {new Blob([snippet.content]).size}B
        </span>
        <div onClick={(e) => e.stopPropagation()}>
          <CopyButton text={snippet.content} />
        </div>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function CodeShare() {
  const userRole = localStorage.getItem('userRole');
  const isAdmin = userRole === 'admin';
  const isStaff = ['admin', 'agent'].includes(userRole);

  const [snippets, setSnippets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterLang, setFilterLang] = useState('All');

  const [viewSnippet, setViewSnippet] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [copiedAll, copyAll] = useCopyState();

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  };

  useEffect(() => {
    api.get('/codeshare')
      .then(({ data }) => setSnippets(data.snippets || []))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load snippets'))
      .finally(() => setLoading(false));
  }, []);

  const availableLangs = ['All', ...new Set(snippets.map(s => s.language).filter(Boolean))];

  const filtered = snippets
    .filter(s => filterLang === 'All' || s.language === filterLang)
    .filter(s => !search || s.title.toLowerCase().includes(search.toLowerCase()) || s.description?.toLowerCase().includes(search.toLowerCase()) || s.language?.toLowerCase().includes(search.toLowerCase()));

  const handleSave = async (form) => {
    setSaving(true);
    try {
      if (editTarget?._id) {
        const { data } = await api.put(`/codeshare/${editTarget._id}`, form);
        setSnippets(prev => prev.map(s => s._id === editTarget._id ? data.snippet : s));
        if (viewSnippet?._id === editTarget._id) setViewSnippet(data.snippet);
        showToast('Snippet updated');
      } else {
        const { data } = await api.post('/codeshare', form);
        setSnippets(prev => [data.snippet, ...prev]);
        showToast('Snippet created');
      }
      setShowEditor(false);
      setEditTarget(null);
    } catch (err) {
      showToast(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (snippet) => {
    if (!window.confirm(`Delete "${snippet.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/codeshare/${snippet._id}`);
      setSnippets(prev => prev.filter(s => s._id !== snippet._id));
      if (viewSnippet?._id === snippet._id) setViewSnippet(null);
      showToast('Snippet deleted');
    } catch (err) {
      showToast(err.response?.data?.error || 'Delete failed');
    }
    setDeleteTarget(null);
  };

  const openCreate = () => { setEditTarget(null); setShowEditor(true); };
  const openEdit = (snippet) => {
    setEditTarget(snippet);
    setShowEditor(true);
    setViewSnippet(null);
  };

  const allContent = filtered.map(s => `// ── ${s.title} ──\n${s.content}`).join('\n\n');

  return (
    <PageWrapper>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <Breadcrumb items={[{ label: 'Home', path: '/' }, { label: 'Script Vault' }]} />

        {/* ── Page header ── */}
        <div className="flex items-start justify-between gap-4 mt-4 mb-6 flex-wrap">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              {/* Terminal / Code Icon */}
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,#FF634A22,#FF634A08)', border: '1px solid #FF634A30' }}>
                <svg className="w-5 h-5 text-[#FF634A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 className="text-[22px] font-bold text-white tracking-tight">Script Vault</h1>
            </div>
            <p className="text-[13px] text-[rgba(255,255,255,0.4)]">
              {isAdmin ? 'Manage and distribute scripts, configs & code snippets.' : 'Scripts and code shared with you.'}
              {' '}<span className="text-[rgba(255,255,255,0.25)]">{filtered.length} script{filtered.length !== 1 ? 's' : ''}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Copy all visible */}
            {filtered.length > 0 && (
              <button
                onClick={() => copyAll(allContent)}
                className={`flex items-center gap-2 px-4 py-2 text-[13px] font-semibold rounded-xl border transition-all ${
                  copiedAll
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                    : 'border-white/10 bg-white/5 text-[rgba(255,255,255,0.65)] hover:bg-white/10 hover:text-white hover:border-white/20'
                }`}
                title="Copy all visible snippets to clipboard"
              >
                {copiedAll ? <CheckIcon /> : <CopyAllIcon />}
                {copiedAll ? 'Copied!' : 'Copy All'}
              </button>
            )}
            {/* New snippet — admin only */}
            {isAdmin && (
              <button
                onClick={openCreate}
                className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold rounded-xl text-white transition-all hover:opacity-90 active:scale-95"
                style={{ background: 'linear-gradient(135deg,#FF634A,#e0532d)' }}
              >
                <PlusIcon />
                New Snippet
              </button>
            )}
          </div>
        </div>

        {/* ── Search + filter bar ── */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgba(255,255,255,0.3)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
            </svg>
            <input
              className="w-full pl-9 pr-4 py-2.5 text-[13px] rounded-xl border bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)] text-white placeholder-[rgba(255,255,255,0.3)] focus:outline-none focus:border-[#FF634A]/40 transition-all"
              placeholder="Search snippets…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Language filter pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {availableLangs.slice(0, 8).map(lang => (
              <button
                key={lang}
                onClick={() => setFilterLang(lang)}
                className={`flex-shrink-0 px-3 py-1.5 text-[12px] font-medium rounded-lg border transition-all ${
                  filterLang === lang
                    ? 'border-[#FF634A]/40 bg-[#FF634A]/12 text-[#FF634A]'
                    : 'border-white/8 bg-white/4 text-[rgba(255,255,255,0.5)] hover:bg-white/8 hover:text-white'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        {/* ── States ── */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-6 h-6 border-2 border-[#FF634A]/30 border-t-[#FF634A] rounded-full animate-spin" />
            <p className="text-[13px] text-[rgba(255,255,255,0.35)]">Loading snippets…</p>
          </div>
        )}

        {!loading && error && (
          <div className="text-center py-16 text-red-400 text-[13px]">{error}</div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-1"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <svg className="w-7 h-7 text-[rgba(255,255,255,0.2)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-[15px] font-semibold text-[rgba(255,255,255,0.6)]">
              {search || filterLang !== 'All' ? 'No scripts match your search' : 'No scripts yet'}
            </p>
            <p className="text-[12px] text-[rgba(255,255,255,0.3)] max-w-xs">
              {isAdmin && !search ? 'Create your first script to share with your team.' : 'Try a different search or filter.'}
            </p>
            {isAdmin && !search && (
              <button onClick={openCreate} className="mt-3 flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold rounded-xl text-white"
                style={{ background: 'linear-gradient(135deg,#FF634A,#e0532d)' }}>
                <PlusIcon /> Create Script
              </button>
            )}
          </div>
        )}

        {/* ── Grid ── */}
        {!loading && !error && filtered.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(snippet => (
              <SnippetCard
                key={snippet._id}
                snippet={snippet}
                isAdmin={isAdmin}
                onClick={() => setViewSnippet(snippet)}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[100] px-5 py-2.5 rounded-xl text-[13px] font-medium text-white shadow-xl animate-fade-in"
          style={{ background: 'rgba(30,30,35,0.96)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)' }}>
          {toast}
        </div>
      )}

      {/* ── View modal ── */}
      {viewSnippet && (
        <SnippetModal
          snippet={viewSnippet}
          onClose={() => setViewSnippet(null)}
          isAdmin={isAdmin}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      )}

      {/* ── Create / Edit modal ── */}
      {showEditor && (
        <EditorModal
          initial={editTarget}
          onSave={handleSave}
          onClose={() => { setShowEditor(false); setEditTarget(null); }}
          saving={saving}
        />
      )}
    </PageWrapper>
  );
}
