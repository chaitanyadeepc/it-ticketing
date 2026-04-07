import React, { useState, useEffect, useRef, useCallback } from 'react';
import JSZip from 'jszip';
import PageWrapper from '../components/layout/PageWrapper';
import Breadcrumb from '../components/layout/Breadcrumb';
import api from '../api/api';

// ── Word / PDF extraction helpers ─────────────────────────────────────────────
// Extracts raw text from a .docx file using mammoth (browser bundle)
const extractDocx = async (file) => {
  const mammoth = (await import('mammoth/mammoth.browser')).default;
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value || '';
};

// Extracts text from a .pdf file using pdfjs-dist (lazy loaded)
const extractPdf = async (file) => {
  const pdfjsLib = await import('pdfjs-dist');
  // Use CDN worker to avoid bundling the large worker file
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  }
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(item => item.str).join(' ') + '\n';
  }
  return text.trim();
};

// Returns true if a file is a binary type we can handle (Word/PDF)
const isBinaryDoc = (filename) =>
  /\.(docx|pdf)$/i.test(filename);

// Extract content from any supported file type
const extractFileContent = async (file) => {
  const name = file.name || '';
  if (/\.docx$/i.test(name)) return extractDocx(file);
  if (/\.pdf$/i.test(name)) return extractPdf(file);
  return file.text();
};

// ── Zip extraction helper (browser-side) ─────────────────────────────────────
// Returns array of { filePath, code } blocks from a zip File/Blob.
// Skips __MACOSX, .DS_Store and binary files (non-UTF-8).
const extractZip = async (file) => {
  const zip = await JSZip.loadAsync(file);
  const SKIP_RE = /^(__MACOSX|\.DS_Store|\._)/;
  const results = [];

  await Promise.all(
    Object.keys(zip.files).map(async (name) => {
      const entry = zip.files[name];
      if (entry.dir) return;
      if (SKIP_RE.test(name) || name.includes('/__MACOSX/')) return;
      try {
        const text = await entry.async('string');
        // Basic binary detection: reject strings with too many replacement chars
        const nullCount = (text.match(/\0/g) || []).length;
        if (nullCount > text.length * 0.01) return; // likely binary
        // Strip leading root folder if all files share it
        results.push({ filePath: name, code: text });
      } catch {
        // silently skip unreadable entries
      }
    })
  );

  // Strip common root prefix (e.g. "myproject/src/..." → "src/...")
  if (results.length > 1) {
    const parts = results[0].filePath.split('/');
    const rootPrefix = parts[0] + '/';
    if (results.every(r => r.filePath.startsWith(rootPrefix))) {
      results.forEach(r => { r.filePath = r.filePath.slice(rootPrefix.length); });
    }
  }

  return results.sort((a, b) => a.filePath.localeCompare(b.filePath));
};

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

const AddFileIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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
function CodePanel({ block, isAdmin, onEdit, editIdx }) {
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
          <div className="flex items-center gap-1.5">
            {isAdmin && onEdit && (
              <button
                onClick={() => onEdit(editIdx)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium border border-white/10 bg-white/4 text-[rgba(255,255,255,0.45)] hover:bg-white/10 hover:text-white hover:border-white/20 transition-all"
                title="Edit this file inline"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.293-6.293a1 1 0 011.414 0l1.586 1.586a1 1 0 010 1.414L12 16H9v-3z" />
                </svg>
                Edit
              </button>
            )}
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
function SnippetModal({ snippet, onClose, isAdmin, onEdit, onDelete, onContribute, onSaveInline }) {
  const [copiedAll, copyAll] = useCopyState();
  const [downloading, setDownloading] = useState(false);
  const [showContribute, setShowContribute] = useState(false);
  const [contribSaving, setContribSaving] = useState(false);

  // ── Inline edit state ────────────────────────────────────────────────────
  const [editingIdx, setEditingIdx] = useState(null);
  const [editValue, setEditValue]   = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const startInlineEdit = (idx) => {
    setEditingIdx(idx);
    setEditValue(blocks[idx]?.code || '');
  };

  const discardEdit = () => { setEditingIdx(null); setEditValue(''); };

  const saveEdit = async () => {
    if (editingIdx === null) return;
    setEditSaving(true);
    try {
      const newContent = blocks.map((b, i) => {
        const code = i === editingIdx ? editValue : b.code;
        return b.filePath ? `// ${b.filePath}\n${code}` : code;
      }).join('\n\n');
      await onSaveInline?.(snippet._id, newContent);
      setEditingIdx(null);
    } catch { /* error handled by parent */ } finally { setEditSaving(false); }
  };

  const handleContribSave = async (newContent) => {
    setContribSaving(true);
    try {
      await onContribute(snippet._id, newContent);
      setShowContribute(false);
    } catch {
      // error toast shown by parent
    } finally {
      setContribSaving(false);
    }
  };

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const response = await api.get(`/script-vault/${snippet._id}/download`, {
        responseType: 'blob',
        timeout: 0, // no timeout for large zip files
      });
      const url = URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = snippet.zipName || `${snippet.title.replace(/[^a-zA-Z0-9_\-]/g, '_')}.zip`;
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
  const isZipSnippet = !!snippet.isZip;
  const langColor = isZipSnippet ? '#f59e0b' : getLangColor(snippet.language);
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
              {isZipSnippet ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-widest uppercase"
                  style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7H8a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7V5a2 2 0 00-2-2h-2a2 2 0 00-2 2v2" />
                  </svg>
                  ZIP Archive
                </span>
              ) : (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-widest uppercase"
                  style={{ backgroundColor: `${langColor}18`, color: langColor, border: `1px solid ${langColor}30` }}
                >
                  {snippet.language || 'text'}
                </span>
              )}
              <VisibilityBadge visibility={snippet.visibility} allowedUsers={snippet.allowedUsers} />
              {!isZipSnippet && isMultiFile && (
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
            {!isZipSnippet && (
              <>
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
                <button
                  onClick={() => setShowContribute(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[12px] font-semibold transition-all border-emerald-500/30 bg-emerald-500/8 text-emerald-400 hover:bg-emerald-500/18"
                  title="Add files or content to this snippet"
                >
                  <AddFileIcon />
                  Add Files
                </button>
              </>
            )}
            {/* Download button — always visible */}
            <button
              onClick={handleDownload}
              disabled={downloading}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[12px] font-semibold transition-all disabled:opacity-50 ${
                isZipSnippet
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                  : 'border-white/10 bg-white/5 text-[rgba(255,255,255,0.6)] hover:bg-white/10 hover:text-white'
              }`}
              title={isZipSnippet ? 'Download zip file' : 'Download as zip (preserves folder structure)'}
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
        {isZipSnippet ? (
          /* ZIP file view */
          <div className="flex-1 flex flex-col items-center justify-center gap-5 py-14" style={{ backgroundColor: '#080809' }}>
            <div className="p-5 rounded-2xl border" style={{ borderColor: 'rgba(245,158,11,0.2)', backgroundColor: 'rgba(245,158,11,0.06)' }}>
              <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2} style={{ color: '#f59e0b' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7H8a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7V5a2 2 0 00-2-2h-2a2 2 0 00-2 2v2" />
                <line x1="12" y1="11" x2="12" y2="17" strokeLinecap="round" />
                <line x1="9" y1="14" x2="15" y2="14" strokeLinecap="round" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-[17px] font-bold text-white">{snippet.zipName || snippet.title + '.zip'}</p>
              <p className="text-[13px] text-[rgba(255,255,255,0.4)] mt-1">
                {fmtBytes(snippet.zipSize)}
                {snippet.authorName && ` · uploaded by ${snippet.authorName}`}
              </p>
            </div>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-2 px-6 py-3 rounded-xl border text-[14px] font-semibold transition-all disabled:opacity-50 border-amber-500/40 bg-amber-500/12 text-amber-400 hover:bg-amber-500/22"
            >
              <DownloadIcon />
              {downloading ? 'Downloading…' : `Download ${snippet.zipName || snippet.title + '.zip'}`}
            </button>
          </div>
        ) : isMultiFile ? (
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
              {editingIdx === selectedIdx ? (
                /* Inline editor */
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b flex-shrink-0"
                    style={{ backgroundColor: '#0e0e11', borderColor: 'rgba(255,255,255,0.06)' }}>
                    {blocks[selectedIdx]?.filePath
                      ? <FilePathBadge filePath={blocks[selectedIdx].filePath} />
                      : <span className="text-[12px] font-mono text-[rgba(255,255,255,0.4)] px-4 py-2.5">Editing content</span>
                    }
                    <div className="flex items-center gap-2">
                      <button onClick={discardEdit}
                        className="px-3 py-1 text-[11px] font-medium rounded-lg border border-white/10 text-[rgba(255,255,255,0.5)] hover:text-white transition-all">
                        Discard
                      </button>
                      <button onClick={saveEdit} disabled={editSaving}
                        className="px-3 py-1 text-[11px] font-semibold rounded-lg transition-all disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg,#FF634A,#e0532d)', color: '#fff' }}>
                        {editSaving ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  </div>
                  <textarea
                    className="flex-1 w-full px-5 py-4 text-[12.5px] leading-6 font-mono resize-none focus:outline-none"
                    style={{ backgroundColor: '#080809', color: 'rgba(255,255,255,0.85)', caretColor: '#FF634A' }}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    spellCheck={false}
                    autoFocus
                  />
                </div>
              ) : (
                <CodePanel block={blocks[selectedIdx]} isAdmin={isAdmin} onEdit={startInlineEdit} editIdx={selectedIdx} />
              )}
            </div>
          </div>
        ) : (
          /* Single flat view */
          <div className="flex-1 overflow-auto" style={{ backgroundColor: '#080809' }}>
            {editingIdx === 0 ? (
              <div className="flex flex-col h-full min-h-0">
                <div className="flex items-center justify-between px-5 py-2.5 border-b flex-shrink-0"
                  style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <span className="text-[12px] font-mono text-[rgba(255,255,255,0.4)]">Editing content</span>
                  <div className="flex items-center gap-2">
                    <button onClick={discardEdit}
                      className="px-3 py-1 text-[11px] font-medium rounded-lg border border-white/10 text-[rgba(255,255,255,0.5)] hover:text-white transition-all">
                      Discard
                    </button>
                    <button onClick={saveEdit} disabled={editSaving}
                      className="px-3 py-1 text-[11px] font-semibold rounded-lg transition-all disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg,#FF634A,#e0532d)', color: '#fff' }}>
                      {editSaving ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
                <textarea
                  className="flex-1 w-full px-5 py-5 text-[13px] leading-6 font-mono resize-none focus:outline-none"
                  style={{ backgroundColor: '#080809', color: 'rgba(255,255,255,0.88)', caretColor: '#FF634A' }}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  spellCheck={false}
                  autoFocus
                />
              </div>
            ) : (
              <>
                {isAdmin && onSaveInline && (
                  <div className="flex justify-end px-5 pt-3">
                    <button onClick={() => startInlineEdit(0)}
                      className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-lg border border-white/10 bg-white/4 text-[rgba(255,255,255,0.4)] hover:text-white hover:bg-white/8 transition-all">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.293-6.293a1 1 0 011.414 0l1.586 1.586a1 1 0 010 1.414L12 16H9v-3z" />
                      </svg>
                      Edit
                    </button>
                  </div>
                )}
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
              </>
            )}
          </div>
        )}

        {/* ── Footer ── */}
        <div className="px-5 py-2.5 border-t flex items-center justify-between flex-wrap gap-2 flex-shrink-0"
          style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: '#0d0d0f' }}>
          <span className="text-[11px] text-[rgba(255,255,255,0.28)]">
            {isZipSnippet
              ? `${snippet.zipName || snippet.title + '.zip'} · ${fmtBytes(snippet.zipSize)}${snippet.authorName ? ` · uploaded by ${snippet.authorName}` : ''}`
              : `${snippet.authorName ? `By ${snippet.authorName} · ` : ''}${snippet.content.split('\n').length} lines · ${new Blob([snippet.content]).size} bytes`
            }
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
      {showContribute && (
        <ContributeModal
          snippet={snippet}
          onSave={handleContribSave}
          onClose={() => setShowContribute(false)}
          saving={contribSaving}
        />
      )}
    </div>
  );
}


// ── Contribute modal (add files/content to an existing snippet) ───────────────
function ContributeModal({ snippet, onSave, onClose, saving }) {
  const [mode, setMode] = useState('write'); // 'write' | 'files' | 'folder' | 'zip'
  const [filePath, setFilePath] = useState('');
  const [code, setCode] = useState('');
  const [pendingBlocks, setPendingBlocks] = useState([]);
  const [fileLoading, setFileLoading] = useState(false);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const zipInputRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const switchMode = (m) => {
    setMode(m);
    setPendingBlocks([]);
    setFilePath('');
    setCode('');
  };

  const readFileList = async (files, getPath) => {
    setFileLoading(true);
    try {
      const sorted = [...files].sort((a, b) => getPath(a).localeCompare(getPath(b)));
      const blocks = await Promise.all(sorted.map(async (f) => {
        const text = await extractFileContent(f);
        return { filePath: getPath(f), code: text };
      }));
      setPendingBlocks(blocks);
    } catch (err) {
      console.error('File read error', err);
    } finally {
      setFileLoading(false);
    }
  };

  const handleZip = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setFileLoading(true);
    try {
      const blocks = await extractZip(file);
      setPendingBlocks(blocks);
    } catch (err) {
      console.error('Zip read error', err);
    } finally {
      setFileLoading(false);
    }
  };

  const handleFiles = (e) => {
    const files = Array.from(e.target.files);
    if (files.length) readFileList(files, (f) => f.name);
    e.target.value = '';
  };

  const handleFolder = (e) => {
    const files = Array.from(e.target.files);
    if (files.length) {
      readFileList(files, (f) => {
        const parts = f.webkitRelativePath.split('/');
        return parts.slice(1).join('/') || parts[0];
      });
    }
    e.target.value = '';
  };

  const removeBlock = (idx) => setPendingBlocks(b => b.filter((_, i) => i !== idx));

  const buildNewContent = () => {
    if (mode === 'write') {
      if (!code.trim()) return '';
      return filePath.trim() ? `// ${filePath.trim()}\n${code}` : code;
    }
    return pendingBlocks.map(b => `// ${b.filePath}\n${b.code}`).join('\n\n');
  };

  const newContent = buildNewContent();
  const canSubmit = newContent.trim().length > 0;

  const inputCls = 'w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3.5 py-2.5 text-[13px] text-white placeholder-[rgba(255,255,255,0.25)] focus:outline-none focus:border-[#FF634A]/50 transition-all';

  const TABS = [
    { key: 'write', label: 'Write' },
    { key: 'files', label: 'Upload Files' },
    { key: 'folder', label: 'Upload Folder' },
    { key: 'zip',   label: '🗜 Upload Zip' },
  ];

  // Shared pending-blocks list used in both 'files' and 'folder' modes
  const PendingList = ({ onChangeClick }) => (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[12px] font-semibold text-[rgba(255,255,255,0.5)]">
          {pendingBlocks.length} file{pendingBlocks.length !== 1 ? 's' : ''} ready to add
        </p>
        <button onClick={onChangeClick} className="text-[11px] text-[#FF634A] hover:underline">Change</button>
      </div>
      <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
        {pendingBlocks.map((b, i) => (
          <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
            <span className="text-[11px]" style={{ color: extColor(b.filePath) || 'rgba(255,255,255,0.4)' }}>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </span>
            <span className="text-[12px] font-mono text-[rgba(255,255,255,0.7)] truncate flex-1">{b.filePath}</span>
            <span className="text-[10px] text-[rgba(255,255,255,0.3)] flex-shrink-0">{b.code.split('\n').length}L</span>
            <button
              onClick={() => removeBlock(i)}
              className="ml-1 flex-shrink-0 p-0.5 rounded text-[rgba(255,255,255,0.3)] hover:text-red-400 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const DropZone = ({ onClick, label, sublabel }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={fileLoading}
      className="w-full flex flex-col items-center justify-center gap-3 py-12 rounded-xl border-2 border-dashed transition-all hover:border-[rgba(255,255,255,0.25)] disabled:opacity-50"
      style={{ borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.02)' }}
    >
      <svg className="w-9 h-9 text-[rgba(255,255,255,0.18)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
      <span className="text-[13px] text-[rgba(255,255,255,0.45)]">{fileLoading ? 'Reading\u2026' : label}</span>
      <span className="text-[11px] text-[rgba(255,255,255,0.25)]">{sublabel}</span>
    </button>
  );

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-xl max-h-[88vh] flex flex-col rounded-2xl border overflow-hidden shadow-2xl"
        style={{ backgroundColor: 'var(--bg)', borderColor: 'rgba(255,255,255,0.1)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <div>
            <h2 className="text-[15px] font-bold text-white">Add to Snippet</h2>
            <p className="text-[11px] text-[rgba(255,255,255,0.35)] mt-0.5 truncate max-w-xs">{snippet.title}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[rgba(255,255,255,0.4)] hover:text-white hover:bg-white/8 transition-all">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex px-6 pt-4 flex-shrink-0 gap-1">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => switchMode(tab.key)}
              className="px-4 py-2 text-[12px] font-semibold border-b-2 transition-all"
              style={{
                borderColor: mode === tab.key ? '#FF634A' : 'transparent',
                color: mode === tab.key ? '#FF634A' : 'rgba(255,255,255,0.4)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="border-b flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.07)' }} />

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* Write mode */}
          {mode === 'write' && (
            <>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[rgba(255,255,255,0.4)] mb-1.5">
                  File path
                  <span className="ml-2 normal-case font-normal text-[rgba(255,255,255,0.25)]">(optional — e.g. src/utils/helper.ts)</span>
                </label>
                <input
                  className={inputCls}
                  placeholder="src/utils/helper.ts"
                  value={filePath}
                  onChange={(e) => setFilePath(e.target.value)}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[rgba(255,255,255,0.4)]">Content *</label>
                  <span className="text-[11px] text-[rgba(255,255,255,0.25)]">{code.split('\n').length} lines</span>
                </div>
                <textarea
                  className="w-full bg-[#080809] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-3.5 text-[12.5px] leading-6 font-mono text-[rgba(255,255,255,0.85)] placeholder-[rgba(255,255,255,0.2)] focus:outline-none focus:border-[#FF634A]/40 resize-none transition-all"
                  placeholder="Paste your code or text here\u2026"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  rows={10}
                  spellCheck={false}
                />
              </div>
            </>
          )}

          {/* Upload Files mode */}
          {mode === 'files' && (
            <>
              <input ref={fileInputRef} type="file" multiple accept="*/*,.docx,.pdf" className="hidden" onChange={handleFiles} />
              {pendingBlocks.length === 0
                ? <DropZone onClick={() => fileInputRef.current?.click()} label="Click to select files" sublabel="Code, .docx, .pdf or any text file" />
                : <PendingList onChangeClick={() => fileInputRef.current?.click()} />
              }
            </>
          )}

          {/* Upload Folder mode */}
          {mode === 'folder' && (
            <>
              <input ref={folderInputRef} type="file" webkitdirectory="true" directory="true" multiple className="hidden" onChange={handleFolder} />
              {pendingBlocks.length === 0
                ? <DropZone onClick={() => folderInputRef.current?.click()} label="Click to select a folder" sublabel="All files inside will be added" />
                : <PendingList onChangeClick={() => folderInputRef.current?.click()} />
              }
            </>
          )}

          {/* Upload Zip mode */}
          {mode === 'zip' && (
            <>
              <input ref={zipInputRef} type="file" accept=".zip,application/zip" className="hidden" onChange={handleZip} />
              {pendingBlocks.length === 0
                ? (
                  <button
                    type="button"
                    onClick={() => zipInputRef.current?.click()}
                    disabled={fileLoading}
                    className="w-full flex flex-col items-center justify-center gap-3 py-12 rounded-xl border-2 border-dashed transition-all hover:border-[rgba(255,255,255,0.25)] disabled:opacity-50"
                    style={{ borderColor: 'rgba(255,99,74,0.25)', backgroundColor: 'rgba(255,99,74,0.03)' }}
                  >
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.4} style={{ color: 'rgba(255,99,74,0.5)' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7H8a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7V5a2 2 0 00-2-2h-2a2 2 0 00-2 2v2" />
                      <line x1="12" y1="11" x2="12" y2="17" strokeLinecap="round" />
                      <line x1="9" y1="14" x2="15" y2="14" strokeLinecap="round" />
                    </svg>
                    <span className="text-[13px]" style={{ color: 'rgba(255,99,74,0.7)' }}>
                      {fileLoading ? 'Extracting zip\u2026' : 'Click to select a .zip file'}
                    </span>
                    <span className="text-[11px] text-[rgba(255,255,255,0.25)]">Files will be extracted automatically</span>
                  </button>
                )
                : <PendingList onChangeClick={() => zipInputRef.current?.click()} />
              }
            </>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-4 border-t flex items-center justify-between flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <span className="text-[11px] text-[rgba(255,255,255,0.3)]">
            {canSubmit
              ? mode === 'write'
                ? `Will append ${code.split('\n').length} line${code.split('\n').length !== 1 ? 's' : ''}`
                : `Will append ${pendingBlocks.length} file${pendingBlocks.length !== 1 ? 's' : ''}`
              : 'Add content above to continue'
            }
          </span>
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-[13px] font-medium text-[rgba(255,255,255,0.5)] hover:text-white transition-colors">
              Cancel
            </button>
            <button
              onClick={() => onSave(newContent)}
              disabled={saving || !canSubmit}
              className="px-5 py-2 text-[13px] font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg,#FF634A,#e0532d)', color: '#fff' }}
            >
              {saving ? 'Adding\u2026' : 'Add to Snippet'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


// ── Create / Edit modal (split-pane) ─────────────────────────────────────────
function EditorModal({ initial, onSave, onClose, saving }) {
  const isEdit = !!initial?._id;

  // ── Metadata state ────────────────────────────────────────────────────────
  const [meta, setMeta] = useState(() => ({
    title:        initial?.title        || '',
    language:     initial?.language     || 'text',
    description:  initial?.description  || '',
    visibility:   initial?.visibility   || 'all',
    allowedUsers: Array.isArray(initial?.allowedUsers) ? initial.allowedUsers : [],
  }));

  // ── File list state ───────────────────────────────────────────────────────
  const [files, setFiles] = useState(() => {
    const raw = initial?.content || '';
    const blks = parseFileBlocks(raw);
    if (blks.length === 0) return [{ id: 1, filePath: null, code: '' }];
    if (blks.length === 1 && !blks[0].filePath) return [{ id: 1, filePath: null, code: blks[0].code }];
    return blks.map((b, i) => ({ id: i + 1, filePath: b.filePath, code: b.code }));
  });
  const [selectedId, setSelectedId]   = useState(() => 1);
  const [renaming, setRenaming]       = useState(null);
  const [renameVal, setRenameVal]     = useState('');
  const [dragging, setDragging]       = useState(false);
  const [uploading, setUploading]     = useState(false);
  const [showMeta, setShowMeta]       = useState(false);
  const [allUsers, setAllUsers]       = useState([]);
  const [userSearch, setUserSearch]   = useState('');
  const [userDropOpen, setUserDropOpen] = useState(false);

  const nextId        = useRef(100);
  const fileInputRef  = useRef(null);
  const folderInputRef = useRef(null);
  const dropRef       = useRef(null);
  const renameRef     = useRef(null);
  const textareaRef   = useRef(null);

  const selectedFile = files.find(f => f.id === selectedId) ?? files[0];

  useEffect(() => { if (renaming && renameRef.current) renameRef.current.focus(); }, [renaming]);

  useEffect(() => {
    api.get('/users').then(({ data }) => setAllUsers(data.users || [])).catch(() => {});
  }, []);

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

  // ── File CRUD ─────────────────────────────────────────────────────────────
  const addFile = (filePath = null, code = '') => {
    const id = (++nextId.current) * 10000 + (Date.now() % 10000);
    setFiles(prev => [...prev, { id, filePath, code }]);
    setSelectedId(id);
    setTimeout(() => textareaRef.current?.focus(), 40);
  };

  const deleteFile = (id) => {
    setFiles(prev => {
      if (prev.length <= 1) return prev;
      const next = prev.filter(f => f.id !== id);
      if (selectedId === id) setSelectedId(next[0]?.id);
      return next;
    });
  };

  const startRename = (file) => {
    setRenaming(file.id);
    setRenameVal(file.filePath || '');
  };

  const commitRename = () => {
    if (!renaming) return;
    const val = renameVal.trim();
    setFiles(prev => prev.map(f => f.id === renaming ? { ...f, filePath: val || null } : f));
    setRenaming(null);
  };

  const updateCode = (id, code) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, code } : f));
  };

  // ── Drag-drop ─────────────────────────────────────────────────────────────
  const handleDrop = async (e) => {
    e.preventDefault();
    setDragging(false);
    const items = Array.from(e.dataTransfer.files);
    if (!items.length) return;
    setUploading(true);
    try {
      const allAdded = [];
      for (const f of items) {
        if (f.name.toLowerCase().endsWith('.zip')) {
          const extracted = await extractZip(f);
          for (const b of extracted) {
            const id = (++nextId.current) * 10000 + (Date.now() % 10000);
            allAdded.push({ id, filePath: b.filePath, code: b.code });
          }
          // Auto-title from zip name if title is empty
          if (!meta.title) {
            setMeta(m => ({ ...m, title: f.name.replace(/\.zip$/i, '') }));
          }
        } else {
          // Handles .docx, .pdf, and plain text files
          const code = await extractFileContent(f);
          const id = (++nextId.current) * 10000 + (Date.now() % 10000);
          allAdded.push({ id, filePath: f.name, code });
        }
      }
      if (allAdded.length) {
        setFiles(prev => [...prev, ...allAdded]);
        setSelectedId(allAdded[allAdded.length - 1].id);
      }
    } finally { setUploading(false); }
  };

  // ── File input upload ─────────────────────────────────────────────────────
  const readAndAdd = async (rawFiles, getName) => {
    if (!rawFiles.length) return;
    setUploading(true);
    try {
      const allAdded = [];
      for (const f of rawFiles) {
        const lname = f.name.toLowerCase();
        if (lname.endsWith('.zip')) {
          const extracted = await extractZip(f);
          for (const b of extracted) {
            const id = (++nextId.current) * 10000 + (Date.now() % 10000);
            allAdded.push({ id, filePath: b.filePath, code: b.code });
          }
          if (!meta.title) {
            setMeta(m => ({ ...m, title: f.name.replace(/\.zip$/i, '') }));
          }
        } else {
          // Handles .docx, .pdf, and plain text files
          const code = await extractFileContent(f);
          const id = (++nextId.current) * 10000 + (Date.now() % 10000);
          allAdded.push({ id, filePath: getName(f), code });
        }
      }
      if (allAdded.length) {
        setFiles(prev => [...prev, ...allAdded]);
        setSelectedId(allAdded[allAdded.length - 1].id);
      }
    } finally { setUploading(false); }
  };

  const handleFileInput = (e) => {
    readAndAdd(Array.from(e.target.files), (f) => f.name);
    e.target.value = '';
  };

  const handleFolderInput = (e) => {
    const sorted = Array.from(e.target.files).sort((a, b) =>
      a.webkitRelativePath.localeCompare(b.webkitRelativePath));
    if (sorted.length) {
      const folderName = sorted[0].webkitRelativePath.split('/')[0];
      if (!meta.title) setMeta(m => ({ ...m, title: folderName }));
    }
    readAndAdd(sorted, (f) => {
      const parts = f.webkitRelativePath.split('/');
      return parts.slice(1).join('/') || parts[0];
    });
    e.target.value = '';
  };

  // ── Build content for save ────────────────────────────────────────────────
  const buildContent = () =>
    files
      .filter(f => f.code.trim() || f.filePath)
      .map(f => f.filePath ? `// ${f.filePath}\n${f.code}` : f.code)
      .join('\n\n');

  const handleSubmit = (e) => {
    e?.preventDefault();
    const content = buildContent();
    if (!meta.title.trim() || !content.trim()) return;
    onSave({ ...meta, content, allowedUsers: meta.allowedUsers.map(u => u._id || u) });
  };

  // ── User picker helpers ───────────────────────────────────────────────────
  const addUser = (user) => {
    if (meta.allowedUsers.find(u => (u._id || u) === user._id)) return;
    setMeta(m => ({ ...m, allowedUsers: [...m.allowedUsers, user] }));
    setUserSearch('');
  };
  const removeUser = (userId) => {
    setMeta(m => ({ ...m, allowedUsers: m.allowedUsers.filter(u => (u._id || u) !== userId) }));
  };
  const selectedIds = new Set(meta.allowedUsers.map(u => u._id || u));
  const filteredUsers = allUsers.filter(u =>
    !selectedIds.has(u._id) &&
    (u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
     u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
     u.role?.toLowerCase().includes(userSearch.toLowerCase()))
  );

  const ROLE_COLORS = { admin: '#ef4444', agent: '#f59e0b', user: '#3b82f6' };
  const inputClass = "w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3.5 py-2.5 text-[13px] text-white placeholder-[rgba(255,255,255,0.25)] focus:outline-none focus:border-[#FF634A]/50 focus:bg-[rgba(255,99,74,0.04)] transition-all";
  const canSave = meta.title.trim() && buildContent().trim();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-5xl flex flex-col rounded-2xl border overflow-hidden shadow-2xl"
        style={{ backgroundColor: 'var(--bg)', borderColor: 'rgba(255,255,255,0.1)', height: '90vh', maxHeight: '90vh' }}
      >
        {/* ── Modal header ── */}
        <div className="flex items-center justify-between px-5 py-3 border-b flex-shrink-0"
          style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-3">
            <h2 className="text-[14px] font-bold text-white">{isEdit ? 'Edit Snippet' : 'New Snippet'}</h2>
            <button
              type="button"
              onClick={() => setShowMeta(v => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-all"
              style={{
                borderColor: showMeta ? 'rgba(255,99,74,0.4)' : 'rgba(255,255,255,0.1)',
                backgroundColor: showMeta ? 'rgba(255,99,74,0.1)' : 'rgba(255,255,255,0.04)',
                color: showMeta ? '#FF634A' : 'rgba(255,255,255,0.5)',
              }}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              {showMeta ? 'Hide details' : 'Details'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose}
              className="px-3 py-1.5 text-[12px] font-medium text-[rgba(255,255,255,0.5)] hover:text-white transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || !canSave}
              className="px-4 py-1.5 text-[12px] font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg,#FF634A,#e0532d)', color: '#fff' }}
            >
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Snippet'}
            </button>
            <button onClick={onClose}
              className="p-1.5 rounded-lg text-[rgba(255,255,255,0.4)] hover:text-white hover:bg-white/8 transition-all ml-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Collapsible metadata panel ── */}
        {showMeta && (
          <div className="px-5 py-4 border-b flex-shrink-0 overflow-y-auto"
            style={{ borderColor: 'rgba(255,255,255,0.07)', maxHeight: '52vh' }}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[rgba(255,255,255,0.4)] mb-1">Title *</label>
                <input className={inputClass} placeholder="e.g. Database connection script"
                  value={meta.title} onChange={(e) => setMeta(m => ({ ...m, title: e.target.value }))} maxLength={200} />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[rgba(255,255,255,0.4)] mb-1">Language</label>
                <select className={inputClass} value={meta.language}
                  onChange={(e) => setMeta(m => ({ ...m, language: e.target.value }))} style={{ appearance: 'none' }}>
                  {LANGUAGES.map(l => <option key={l} value={l} style={{ background: '#1a1a1f' }}>{l}</option>)}
                </select>
              </div>
              <div className="sm:col-span-3">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[rgba(255,255,255,0.4)] mb-1">Description</label>
                <input className={inputClass} placeholder="Brief description"
                  value={meta.description} onChange={(e) => setMeta(m => ({ ...m, description: e.target.value }))} maxLength={500} />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-[rgba(255,255,255,0.4)] mb-2">Visibility</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {VISIBILITY_OPTIONS.map(opt => {
                  const active = meta.visibility === opt.key;
                  return (
                    <button key={opt.key} type="button"
                      onClick={() => setMeta(m => ({ ...m, visibility: opt.key, allowedUsers: opt.key !== 'custom' ? [] : m.allowedUsers }))}
                      className="flex flex-col items-start gap-1 p-2.5 rounded-xl border transition-all text-left"
                      style={{ borderColor: active ? `${opt.color}50` : 'rgba(255,255,255,0.07)', backgroundColor: active ? `${opt.color}12` : 'rgba(255,255,255,0.03)' }}>
                      <div className="flex items-center justify-between w-full">
                        {opt.icon('w-3 h-3')}
                        {active && <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: opt.color }} />}
                      </div>
                      <span className="text-[11px] font-semibold" style={{ color: active ? opt.color : 'rgba(255,255,255,0.7)' }}>
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            {meta.visibility === 'custom' && (
              <div className="mt-4">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[rgba(255,255,255,0.4)] mb-2">Select users</label>
                {meta.allowedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {meta.allowedUsers.map(u => (
                      <span key={u._id || u} className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg text-[11px] font-medium border"
                        style={{ backgroundColor: `${ROLE_COLORS[u.role] || '#3b82f6'}15`, borderColor: `${ROLE_COLORS[u.role] || '#3b82f6'}30`, color: ROLE_COLORS[u.role] || '#3b82f6' }}>
                        <span className="text-white/80">{u.name || u.email}</span>
                        <button type="button" onClick={() => removeUser(u._id || u)}
                          className="ml-0.5 w-3.5 h-3.5 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/50 hover:text-white transition-all">
                          <svg className="w-2 h-2" viewBox="0 0 8 8" fill="currentColor">
                            <path d="M6.5 1.5l-5 5M1.5 1.5l5 5" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="relative" ref={dropRef}>
                  <input
                    className="w-full pl-3 pr-4 py-2 text-[12px] rounded-xl border bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)] text-white placeholder-[rgba(255,255,255,0.3)] focus:outline-none focus:border-[#a78bfa]/40 transition-all"
                    placeholder="Search users…" value={userSearch}
                    onChange={(e) => { setUserSearch(e.target.value); setUserDropOpen(true); }}
                    onFocus={() => setUserDropOpen(true)}
                  />
                  {userDropOpen && filteredUsers.length > 0 && (
                    <div className="absolute z-10 top-full mt-1 w-full rounded-xl border shadow-2xl overflow-hidden"
                      style={{ backgroundColor: '#18181b', borderColor: 'rgba(255,255,255,0.1)' }}>
                      <div className="max-h-[180px] overflow-y-auto">
                        {filteredUsers.slice(0, 20).map(u => (
                          <button key={u._id} type="button" onClick={() => { addUser(u); setUserDropOpen(false); }}
                            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/6 transition-colors text-left">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                              style={{ backgroundColor: `${ROLE_COLORS[u.role] || '#3b82f6'}25`, color: ROLE_COLORS[u.role] || '#3b82f6' }}>
                              {(u.name || u.email || '?').slice(0, 1).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[12px] font-medium text-white leading-none truncate">{u.name || '—'}</p>
                              <p className="text-[10px] text-[rgba(255,255,255,0.38)] truncate mt-0.5">{u.email}</p>
                            </div>
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
                {meta.allowedUsers.length === 0 && (
                  <p className="text-[11px] text-[rgba(255,255,255,0.3)] mt-1.5">No users selected — nobody except admins will see this snippet.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Inline title bar (when metadata panel is collapsed) ── */}
        {!showMeta && (
          <div className="flex items-center gap-3 px-5 py-2 border-b flex-shrink-0"
            style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            <input
              className="flex-1 bg-transparent text-[13px] font-semibold text-white placeholder-[rgba(255,255,255,0.3)] focus:outline-none"
              placeholder="Snippet title…"
              value={meta.title}
              onChange={(e) => setMeta(m => ({ ...m, title: e.target.value }))}
              maxLength={200}
            />
            <span className="text-[11px] px-2 py-0.5 rounded flex-shrink-0"
              style={{ backgroundColor: `${getLangColor(meta.language)}18`, color: getLangColor(meta.language) }}>
              {meta.language}
            </span>
          </div>
        )}

        {/* ── Split-pane file editor ── */}
        <div className="flex flex-1 overflow-hidden min-h-0">

          {/* ── Left: file explorer ── */}
          <div className="w-52 flex-shrink-0 flex flex-col border-r"
            style={{ backgroundColor: '#0b0b0d', borderColor: 'rgba(255,255,255,0.06)' }}>

            {/* Explorer toolbar */}
            <div className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0"
              style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-[rgba(255,255,255,0.22)]">
                Files ({files.length})
              </span>
              <div className="flex items-center gap-0.5">
                <input ref={fileInputRef} type="file" multiple accept="*/*,.zip,.docx,.pdf" className="hidden" onChange={handleFileInput} />
                <input ref={folderInputRef} type="file" webkitdirectory="true" directory="true" multiple className="hidden" onChange={handleFolderInput} />
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="p-1 rounded text-[rgba(255,255,255,0.3)] hover:text-white hover:bg-white/8 transition-all" title="Upload files (zip supported)">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </button>
                <button type="button" onClick={() => folderInputRef.current?.click()}
                  className="p-1 rounded text-[rgba(255,255,255,0.3)] hover:text-white hover:bg-white/8 transition-all" title="Upload folder">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 11v6m-3-3l3-3 3 3" />
                  </svg>
                </button>
                <button type="button" onClick={() => addFile()}
                  className="p-1 rounded text-[rgba(255,255,255,0.3)] hover:text-[#FF634A] hover:bg-[rgba(255,99,74,0.1)] transition-all" title="New file">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
            </div>

            {/* File list */}
            <div className="flex-1 overflow-y-auto py-1">
              {files.map(file => {
                const isSelected = file.id === selectedId;
                const color = extColor(file.filePath);
                return (
                  <div
                    key={file.id}
                    className="group flex items-center gap-1.5 mx-1 px-2 py-1.5 rounded-md cursor-pointer transition-colors hover:bg-white/5"
                    style={{ backgroundColor: isSelected ? 'rgba(255,99,74,0.13)' : undefined }}
                    onClick={() => { if (renaming !== file.id) setSelectedId(file.id); }}
                  >
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}
                      style={{ color: color || 'rgba(255,255,255,0.3)' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {renaming === file.id ? (
                      <input
                        ref={renameRef}
                        className="flex-1 bg-[rgba(255,255,255,0.1)] text-white text-[11px] font-mono px-1.5 py-0.5 rounded border border-[#FF634A]/50 focus:outline-none min-w-0"
                        value={renameVal}
                        onChange={(e) => setRenameVal(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
                          if (e.key === 'Escape') setRenaming(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="file-name.ext"
                      />
                    ) : (
                      <span className="flex-1 text-[11.5px] font-mono truncate select-none"
                        style={{ color: isSelected ? '#fff' : (color || 'rgba(255,255,255,0.6)') }}>
                        {file.filePath
                          ? file.filePath.split('/').pop()
                          : <span className="italic text-[rgba(255,255,255,0.28)]">untitled</span>
                        }
                      </span>
                    )}
                    {renaming !== file.id && (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button type="button" onClick={(e) => { e.stopPropagation(); startRename(file); }}
                          className="p-0.5 rounded text-[rgba(255,255,255,0.3)] hover:text-white transition-colors" title="Rename">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.293-6.293a1 1 0 011.414 0l1.586 1.586a1 1 0 010 1.414L12 16H9v-3z" />
                          </svg>
                        </button>
                        {files.length > 1 && (
                          <button type="button" onClick={(e) => { e.stopPropagation(); deleteFile(file.id); }}
                            className="p-0.5 rounded text-[rgba(255,255,255,0.3)] hover:text-red-400 transition-colors" title="Delete file">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="px-3 py-2 border-t flex-shrink-0 text-center"
              style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              <p className="text-[10px] text-[rgba(255,255,255,0.18)]">Drop files to upload</p>
            </div>
          </div>

          {/* ── Right: code editor ── */}
          <div
            className="flex-1 flex flex-col relative overflow-hidden"
            onDragEnter={() => setDragging(true)}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false); }}
            onDrop={handleDrop}
          >
            {/* File path bar */}
            <div className="flex items-center gap-2 px-4 py-2 border-b flex-shrink-0"
              style={{ backgroundColor: '#0e0e11', borderColor: 'rgba(255,255,255,0.06)' }}>
              {selectedFile && (
                <>
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}
                    style={{ color: extColor(selectedFile.filePath) || 'rgba(255,255,255,0.3)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <input
                    className="flex-1 bg-transparent text-[12px] font-mono text-[rgba(255,255,255,0.65)] placeholder-[rgba(255,255,255,0.2)] focus:outline-none focus:text-white transition-colors"
                    placeholder="path/to/file.ext (optional)"
                    value={selectedFile.filePath || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFiles(prev => prev.map(f => f.id === selectedFile.id ? { ...f, filePath: val || null } : f));
                    }}
                  />
                  <span className="text-[11px] text-[rgba(255,255,255,0.2)] flex-shrink-0">
                    {selectedFile.code.split('\n').length}L
                  </span>
                </>
              )}
              {uploading && <span className="text-[11px] text-[rgba(255,255,255,0.4)] animate-pulse ml-auto">Uploading…</span>}
            </div>

            {/* Textarea editor */}
            <textarea
              ref={textareaRef}
              className="flex-1 w-full px-5 pt-4 pb-4 text-[12.5px] leading-6 font-mono resize-none focus:outline-none"
              style={{ backgroundColor: '#080809', color: 'rgba(255,255,255,0.85)', caretColor: '#FF634A' }}
              placeholder="// Start typing, paste code, or drop files here…"
              value={selectedFile?.code || ''}
              onChange={(e) => selectedFile && updateCode(selectedFile.id, e.target.value)}
              spellCheck={false}
            />

            {/* Drag-drop overlay */}
            {dragging && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 pointer-events-none"
                style={{ backgroundColor: 'rgba(8,8,9,0.88)', border: '2px dashed rgba(255,99,74,0.5)' }}>
                <svg className="w-10 h-10 text-[#FF634A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <p className="text-[14px] font-semibold text-[#FF634A]">Drop files, .zip, .docx or .pdf to add them</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Snippet card ─────────────────────────────────────────────────────────────
// ── Format bytes helper ──────────────────────────────────────────────────────
const fmtBytes = (bytes) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// ── Zip file card preview ────────────────────────────────────────────────────
function ZipPreview({ snippet }) {
  return (
    <div className="mx-4 mb-4 rounded-xl overflow-hidden border flex items-center gap-3 px-4 py-4"
      style={{ borderColor: 'rgba(255,165,0,0.15)', backgroundColor: 'rgba(255,165,0,0.04)' }}>
      <svg className="w-9 h-9 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.4}
        style={{ color: '#f59e0b' }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7H8a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7V5a2 2 0 00-2-2h-2a2 2 0 00-2 2v2" />
        <line x1="12" y1="11" x2="12" y2="17" strokeLinecap="round" />
        <line x1="9" y1="14" x2="15" y2="14" strokeLinecap="round" />
      </svg>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-mono font-semibold text-[rgba(255,255,255,0.8)] truncate">
          {snippet.zipName || snippet.title + '.zip'}
        </p>
        <p className="text-[11px] text-[rgba(255,255,255,0.35)] mt-0.5">{fmtBytes(snippet.zipSize)}</p>
      </div>
    </div>
  );
}

function SnippetCard({ snippet, isAdmin, onClick, onEdit, onDelete, relativeTime: relTime, isSelected, onToggleSelect }) {
  const isZip = !!snippet.isZip;
  const accentColor = isZip ? '#f59e0b' : getLangColor(snippet.language);
  const lineCount = isZip ? null : snippet.content.split('\n').length;
  const blocks = isZip ? [] : parseFileBlocks(snippet.content);
  const fileBlocks = blocks.filter(b => b.filePath);
  const isMultiFile = fileBlocks.length > 0;
  const preview = isZip ? '' : snippet.content.slice(0, 300);

  const [cardDownloading, setCardDownloading] = useState(false);
  const handleCardDownload = async (e) => {
    e.stopPropagation();
    if (cardDownloading) return;
    setCardDownloading(true);
    try {
      const res = await api.get(`/script-vault/${snippet._id}/download`, {
        responseType: 'blob',
        timeout: 0,
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = snippet.zipName || `${snippet.title.replace(/[^a-zA-Z0-9_\-]/g, '_')}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ } finally {
      setCardDownloading(false);
    }
  };

  return (
    <div
      className="group relative flex flex-col rounded-2xl border overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/40"
      style={{
        backgroundColor: 'var(--color-canvas-overlay)',
        borderColor: isSelected ? `${accentColor}60` : 'rgba(255,255,255,0.07)',
        boxShadow: isSelected ? `0 0 0 2px ${accentColor}30` : undefined,
      }}
      onClick={(e) => {
        if (e.ctrlKey || e.metaKey) { e.preventDefault(); onToggleSelect?.(snippet._id); }
        else onClick(e);
      }}
    >
      {/* Select checkbox */}
      {onToggleSelect && (
        <div
          className={`absolute top-2.5 left-2.5 z-10 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-70'}`}
          onClick={(e) => { e.stopPropagation(); onToggleSelect(snippet._id); }}
        >
          <div className="w-4 h-4 rounded border flex items-center justify-center transition-all"
            style={{
              borderColor: isSelected ? accentColor : 'rgba(255,255,255,0.3)',
              backgroundColor: isSelected ? `${accentColor}30` : 'rgba(0,0,0,0.5)',
            }}>
            {isSelected && (
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}
                style={{ color: accentColor }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>
      )}
      {/* Top accent */}
      <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${accentColor}60, transparent)` }} />

      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              {isZip ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-widest uppercase"
                  style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7H8a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7V5a2 2 0 00-2-2h-2a2 2 0 00-2 2v2" />
                  </svg>
                  ZIP
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold tracking-widest uppercase"
                  style={{ backgroundColor: `${accentColor}18`, color: accentColor, border: `1px solid ${accentColor}28` }}>
                  {snippet.language || 'text'}
                </span>
              )}
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
              {!isZip && (
                <button onClick={() => onEdit(snippet)}
                  className="p-1.5 rounded-lg border border-white/10 bg-white/5 text-[rgba(255,255,255,0.4)] hover:text-white hover:bg-white/12 transition-all" title="Edit">
                  <EditIcon />
                </button>
              )}
              <button onClick={() => onDelete(snippet)}
                className="p-1.5 rounded-lg border border-red-500/15 bg-red-500/5 text-red-400/50 hover:text-red-400 hover:bg-red-500/12 transition-all" title="Delete">
                <TrashIcon />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Preview area */}
      {isZip ? (
        <ZipPreview snippet={snippet} />
      ) : (
        <div className="mx-4 mb-4 rounded-xl overflow-hidden border" style={{ borderColor: 'rgba(255,255,255,0.05)', backgroundColor: '#080809' }}>
          {isMultiFile ? (
            <div className="px-3 py-2.5 space-y-0.5">
              {fileBlocks.slice(0, 5).map((b, i) => {
                const color = extColor(b.filePath);
                const parts = b.filePath.split('/');
                const fname = parts.pop();
                const folder = parts.join('/');
                return (
                  <div key={i} className="flex items-center gap-1.5 py-0.5">
                    <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}
                      style={{ color: color || 'rgba(255,255,255,0.3)' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-[11px] font-mono truncate flex-1" style={{ color: color || 'rgba(255,255,255,0.5)' }}>
                      {folder && <span style={{ color: 'rgba(255,255,255,0.25)' }}>{folder}/</span>}
                      {fname}
                    </span>
                    <span className="text-[10px] flex-shrink-0" style={{ color: 'rgba(255,255,255,0.2)' }}>
                      {b.code.split('\n').length}L
                    </span>
                  </div>
                );
              })}
              {fileBlocks.length > 5 && (
                <div className="text-[10px] text-[rgba(255,255,255,0.25)] pt-0.5 pl-4">+{fileBlocks.length - 5} more files</div>
              )}
            </div>
          ) : (
            <>
              <pre className="px-4 py-3 text-[11px] leading-5 font-mono text-[rgba(255,255,255,0.55)] overflow-hidden m-0"
                style={{ maxHeight: '80px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' }}>
                {preview}
              </pre>
              {snippet.content.length > 300 && (
                <div className="px-4 py-1.5 border-t text-[10px] text-[rgba(255,255,255,0.25)] font-medium" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                  + more…
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="px-4 pb-3.5 mt-auto flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {isZip ? (
            <span className="text-[11px] text-[rgba(255,255,255,0.28)]">{fmtBytes(snippet.zipSize)}</span>
          ) : (
            <span className="text-[11px] text-[rgba(255,255,255,0.28)]">
              {lineCount} line{lineCount !== 1 ? 's' : ''}
            </span>
          )}
          {!isZip && fileBlocks.length > 0 && (
            <span className="text-[10px] text-[rgba(255,255,255,0.22)] flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
              {fileBlocks.length}
            </span>
          )}
          {relTime && snippet.updatedAt && (
            <span className="text-[10px] text-[rgba(255,255,255,0.22)]" title={new Date(snippet.updatedAt).toLocaleString()}>
              · {relTime(snippet.updatedAt)}
            </span>
          )}
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          {isZip
            ? (
              <button
                onClick={handleCardDownload}
                disabled={cardDownloading}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-lg border transition-all border-amber-500/30 bg-amber-500/8 text-amber-400 hover:bg-amber-500/18 disabled:opacity-50"
              >
                <DownloadIcon /> {cardDownloading ? 'Downloading…' : 'Download'}
              </button>
            )
            : <CopyButton text={snippet.content} />
          }
        </div>
      </div>
    </div>
  );
}

// ── Relative time helper ─────────────────────────────────────────────────────
const relativeTime = (dateStr) => {
  const diff = Date.now() - new Date(dateStr);
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString();
};

// ── Sidebar script list item ─────────────────────────────────────────────────
function ScriptSidebarItem({ snippet, isSelected, isAdmin, onClick, onEdit, onDelete }) {
  const isZip = !!snippet.isZip;
  const color = isZip ? '#f59e0b' : getLangColor(snippet.language);
  const blocks = isZip ? [] : parseFileBlocks(snippet.content || '');
  const fileCount = blocks.filter(b => b.filePath).length;

  return (
    <div
      className="group relative flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors select-none"
      style={{
        backgroundColor: isSelected ? 'rgba(255,99,74,0.12)' : undefined,
        borderLeft: `2px solid ${isSelected ? '#FF634A' : 'transparent'}`,
      }}
      onClick={onClick}
    >
      {/* Language / type dot */}
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />

      {/* Title + meta */}
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] truncate leading-snug"
          style={{ color: isSelected ? '#fff' : 'rgba(255,255,255,0.72)' }}>
          {snippet.title}
        </p>
        <p className="text-[10.5px] text-[rgba(255,255,255,0.3)] leading-none mt-0.5 truncate">
          {isZip ? 'zip' : snippet.language}
          {fileCount > 0 && ` · ${fileCount} files`}
          {snippet.updatedAt && ` · ${relativeTime(snippet.updatedAt)}`}
        </p>
      </div>

      {/* Hover admin actions */}
      {isAdmin && (
        <div
          className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 flex-shrink-0 transition-opacity"
          onClick={e => e.stopPropagation()}
        >
          {!isZip && (
            <button
              onClick={() => onEdit(snippet)}
              className="p-1 rounded text-[rgba(255,255,255,0.3)] hover:text-white hover:bg-white/10 transition-colors"
              title="Edit"
            >
              <EditIcon />
            </button>
          )}
          <button
            onClick={() => onDelete(snippet)}
            className="p-1 rounded text-[rgba(255,255,255,0.3)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Delete"
          >
            <TrashIcon />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Inline script view (VS Code right panel) ─────────────────────────────────
// Same content as SnippetModal but rendered inline (no modal overlay)
function InlineScriptView({ snippet, isAdmin, onEdit, onDelete, onContribute, onSaveInline }) {
  const [copiedAll, copyAll] = useCopyState();
  const [downloading, setDownloading] = useState(false);
  const [showContribute, setShowContribute] = useState(false);
  const [contribSaving, setContribSaving] = useState(false);

  const [editingIdx, setEditingIdx] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const startInlineEdit = (idx) => { setEditingIdx(idx); setEditValue(blocks[idx]?.code || ''); };
  const discardEdit = () => { setEditingIdx(null); setEditValue(''); };

  const saveEdit = async () => {
    if (editingIdx === null) return;
    setEditSaving(true);
    try {
      const newContent = blocks.map((b, i) => {
        const code = i === editingIdx ? editValue : b.code;
        return b.filePath ? `// ${b.filePath}\n${code}` : code;
      }).join('\n\n');
      await onSaveInline?.(snippet._id, newContent);
      setEditingIdx(null);
    } catch { /* toast shown by parent */ } finally { setEditSaving(false); }
  };

  const handleContribSave = async (newContent) => {
    setContribSaving(true);
    try {
      await onContribute(snippet._id, newContent);
      setShowContribute(false);
    } catch { /* toast shown by parent */ } finally { setContribSaving(false); }
  };

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const res = await api.get(`/script-vault/${snippet._id}/download`, { responseType: 'blob', timeout: 0 });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = snippet.zipName || `${snippet.title.replace(/[^a-zA-Z0-9_\-]/g, '_')}.zip`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ } finally { setDownloading(false); }
  };

  const blocks = parseFileBlocks(snippet.content || '');
  const isMultiFile = blocks.some(b => b.filePath !== null);
  const isZipSnippet = !!snippet.isZip;
  const langColor = isZipSnippet ? '#f59e0b' : getLangColor(snippet.language);
  const fileCount = blocks.filter(b => b.filePath).length;
  const tree = buildFileTree(blocks);

  const [expanded, setExpanded] = useState(() => collectFolderPaths(tree));
  const [selectedIdx, setSelectedIdx] = useState(() => {
    const first = blocks.findIndex(b => b.filePath !== null);
    return first >= 0 ? first : 0;
  });

  // Reset view when snippet changes
  useEffect(() => {
    const t = buildFileTree(parseFileBlocks(snippet.content || ''));
    setExpanded(collectFolderPaths(t));
    const blks = parseFileBlocks(snippet.content || '');
    const first = blks.findIndex(b => b.filePath !== null);
    setSelectedIdx(first >= 0 ? first : 0);
    setEditingIdx(null);
    setEditValue('');
  }, [snippet._id]);

  const toggleFolder = (path) => setExpanded(prev => {
    const next = new Set(prev); next.has(path) ? next.delete(path) : next.add(path); return next;
  });

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b flex-shrink-0"
        style={{ backgroundColor: '#0d0d0f', borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {isZipSnippet ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-widest uppercase flex-shrink-0"
              style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
              ZIP
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold tracking-widest uppercase flex-shrink-0"
              style={{ backgroundColor: `${langColor}18`, color: langColor, border: `1px solid ${langColor}30` }}>
              {snippet.language || 'text'}
            </span>
          )}
          <VisibilityBadge visibility={snippet.visibility} allowedUsers={snippet.allowedUsers} />
          {!isZipSnippet && isMultiFile && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-white/5 text-[rgba(255,255,255,0.4)] border border-white/8 flex-shrink-0">
              {fileCount} file{fileCount !== 1 ? 's' : ''}
            </span>
          )}
          <h2 className="text-[13px] font-semibold text-white leading-tight truncate">{snippet.title}</h2>
          {snippet.description && (
            <span className="text-[11.5px] text-[rgba(255,255,255,0.35)] truncate hidden sm:block">{snippet.description}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
          {isAdmin && (
            <>
              <button onClick={() => onEdit(snippet)}
                className="p-1.5 rounded-lg border border-white/10 bg-white/5 text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-white/10 transition-all" title="Edit">
                <EditIcon />
              </button>
              <button onClick={() => onDelete(snippet)}
                className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/8 text-red-400/70 hover:text-red-400 hover:bg-red-500/15 transition-all" title="Delete">
                <TrashIcon />
              </button>
            </>
          )}
          {!isZipSnippet && (
            <>
              <button onClick={() => copyAll(snippet.content)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${copiedAll ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' : 'border-[#FF634A]/30 bg-[#FF634A]/10 text-[#FF634A] hover:bg-[#FF634A]/20'}`}>
                {copiedAll ? <CheckIcon /> : <CopyAllIcon />}
                {copiedAll ? 'Copied!' : 'Copy All'}
              </button>
              <button onClick={() => setShowContribute(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all border-emerald-500/30 bg-emerald-500/8 text-emerald-400 hover:bg-emerald-500/18"
                title="Add files or content">
                <AddFileIcon />
                <span className="hidden sm:inline">Add Files</span>
              </button>
            </>
          )}
          <button onClick={handleDownload} disabled={downloading}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all disabled:opacity-50 ${isZipSnippet ? 'border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' : 'border-white/10 bg-white/5 text-[rgba(255,255,255,0.6)] hover:bg-white/10 hover:text-white'}`}
            title="Download">
            <DownloadIcon />
            <span className="hidden sm:inline">{downloading ? 'Downloading…' : 'Download'}</span>
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {isZipSnippet ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-5 py-12">
            <div className="p-5 rounded-2xl border" style={{ borderColor: 'rgba(245,158,11,0.2)', backgroundColor: 'rgba(245,158,11,0.06)' }}>
              <svg className="w-14 h-14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2} style={{ color: '#f59e0b' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7H8a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7V5a2 2 0 00-2-2h-2a2 2 0 00-2 2v2" />
                <line x1="12" y1="11" x2="12" y2="17" strokeLinecap="round" />
                <line x1="9" y1="14" x2="15" y2="14" strokeLinecap="round" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-[16px] font-bold text-white">{snippet.zipName || snippet.title + '.zip'}</p>
              <p className="text-[12px] text-[rgba(255,255,255,0.4)] mt-1">{fmtBytes(snippet.zipSize)}
                {snippet.authorName && ` · by ${snippet.authorName}`}</p>
            </div>
            <button onClick={handleDownload} disabled={downloading}
              className="flex items-center gap-2 px-6 py-3 rounded-xl border text-[13px] font-semibold transition-all disabled:opacity-50 border-amber-500/40 bg-amber-500/12 text-amber-400 hover:bg-amber-500/22">
              <DownloadIcon />
              {downloading ? 'Downloading…' : `Download ${snippet.zipName || snippet.title + '.zip'}`}
            </button>
          </div>
        ) : isMultiFile ? (
          /* Multi-file: explorer + code panel */
          <div className="flex flex-1 overflow-hidden min-h-0">
            {/* Left file tree */}
            <div className="w-44 flex-shrink-0 overflow-y-auto border-r py-2"
              style={{ backgroundColor: '#0b0b0d', borderColor: 'rgba(255,255,255,0.06)' }}>
              <p className="px-3 pb-2 text-[9px] font-bold uppercase tracking-[0.12em] text-[rgba(255,255,255,0.22)]">Explorer</p>
              {tree.children.map(child => (
                <FileTreeNode key={child.path} node={child} depth={0} selectedIdx={selectedIdx}
                  onSelect={setSelectedIdx} expanded={expanded} onToggle={toggleFolder} />
              ))}
            </div>
            {/* Code panel */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {editingIdx === selectedIdx ? (
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b flex-shrink-0"
                    style={{ backgroundColor: '#0e0e11', borderColor: 'rgba(255,255,255,0.06)' }}>
                    {blocks[selectedIdx]?.filePath
                      ? <FilePathBadge filePath={blocks[selectedIdx].filePath} />
                      : <span className="text-[12px] font-mono text-[rgba(255,255,255,0.4)]">Editing content</span>}
                    <div className="flex gap-2">
                      <button onClick={discardEdit}
                        className="px-3 py-1 text-[11px] font-medium rounded-lg border border-white/10 text-[rgba(255,255,255,0.5)] hover:text-white transition-all">Discard</button>
                      <button onClick={saveEdit} disabled={editSaving}
                        className="px-3 py-1 text-[11px] font-semibold rounded-lg disabled:opacity-50 transition-all"
                        style={{ background: 'linear-gradient(135deg,#FF634A,#e0532d)', color: '#fff' }}>
                        {editSaving ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  </div>
                  <textarea className="flex-1 w-full px-5 py-4 text-[12.5px] leading-6 font-mono resize-none focus:outline-none"
                    style={{ backgroundColor: '#080809', color: 'rgba(255,255,255,0.85)', caretColor: '#FF634A' }}
                    value={editValue} onChange={e => setEditValue(e.target.value)} spellCheck={false} autoFocus />
                </div>
              ) : (
                <CodePanel block={blocks[selectedIdx]} isAdmin={isAdmin} onEdit={startInlineEdit} editIdx={selectedIdx} />
              )}
            </div>
          </div>
        ) : (
          /* Single file */
          <div className="flex-1 overflow-auto" style={{ backgroundColor: '#080809' }}>
            {editingIdx === 0 ? (
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between px-5 py-2.5 border-b flex-shrink-0"
                  style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <span className="text-[12px] font-mono text-[rgba(255,255,255,0.4)]">Editing content</span>
                  <div className="flex gap-2">
                    <button onClick={discardEdit}
                      className="px-3 py-1 text-[11px] font-medium rounded-lg border border-white/10 text-[rgba(255,255,255,0.5)] hover:text-white transition-all">Discard</button>
                    <button onClick={saveEdit} disabled={editSaving}
                      className="px-3 py-1 text-[11px] font-semibold rounded-lg disabled:opacity-50 transition-all"
                      style={{ background: 'linear-gradient(135deg,#FF634A,#e0532d)', color: '#fff' }}>
                      {editSaving ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
                <textarea className="flex-1 w-full px-5 py-5 text-[13px] leading-6 font-mono resize-none focus:outline-none"
                  style={{ backgroundColor: '#080809', color: 'rgba(255,255,255,0.88)', caretColor: '#FF634A' }}
                  value={editValue} onChange={e => setEditValue(e.target.value)} spellCheck={false} autoFocus />
              </div>
            ) : (
              <>
                {isAdmin && onSaveInline && (
                  <div className="flex justify-end px-5 pt-3">
                    <button onClick={() => startInlineEdit(0)}
                      className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-lg border border-white/10 bg-white/4 text-[rgba(255,255,255,0.4)] hover:text-white hover:bg-white/8 transition-all">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.293-6.293a1 1 0 011.414 0l1.586 1.586a1 1 0 010 1.414L12 16H9v-3z" />
                      </svg>
                      Edit
                    </button>
                  </div>
                )}
                <div className="flex">
                  <div className="select-none flex-shrink-0 text-right px-4 py-5 text-[12px] leading-6 font-mono"
                    style={{ color: 'rgba(255,255,255,0.18)', userSelect: 'none', borderRight: '1px solid rgba(255,255,255,0.05)', minWidth: '52px', backgroundColor: '#0a0a0c' }}>
                    {snippet.content.split('\n').map((_, i) => <div key={i}>{i + 1}</div>)}
                  </div>
                  <pre className="flex-1 px-5 py-5 text-[13px] leading-6 font-mono overflow-x-auto m-0"
                    style={{ color: 'rgba(255,255,255,0.88)', background: 'transparent', whiteSpace: 'pre' }}>
                    <code>{snippet.content}</code>
                  </pre>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Status bar ── */}
      <div className="px-4 py-1.5 border-t flex items-center justify-between flex-wrap gap-2 flex-shrink-0"
        style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: '#0d0d0f' }}>
        <span className="text-[10.5px] text-[rgba(255,255,255,0.28)]">
          {isZipSnippet
            ? `${snippet.zipName || snippet.title + '.zip'} · ${fmtBytes(snippet.zipSize)}${snippet.authorName ? ` · by ${snippet.authorName}` : ''}`
            : `${snippet.authorName ? `By ${snippet.authorName} · ` : ''}${snippet.content.split('\n').length} lines · ${new Blob([snippet.content]).size} bytes`}
        </span>
        <span className="text-[10.5px] text-[rgba(255,255,255,0.28)]">
          Updated {new Date(snippet.updatedAt).toLocaleDateString()}
        </span>
      </div>

      {showContribute && (
        <ContributeModal snippet={snippet} onSave={handleContribSave}
          onClose={() => setShowContribute(false)} saving={contribSaving} />
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function ScriptVault() {
  const userRole = localStorage.getItem('userRole');
  const isAdmin = userRole === 'admin';

  const [snippets, setSnippets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterLang, setFilterLang] = useState('All');
  const [filterVis, setFilterVis] = useState('All');
  const [sortBy, setSortBy] = useState('updated'); // 'updated' | 'created' | 'title' | 'size'

  const [viewSnippet, setViewSnippet] = useState(null);
  const [panelScript, setPanelScript] = useState(null);   // selected script in split-pane
  const [sidebarOpen, setSidebarOpen] = useState(true);   // desktop sidebar toggle
  const [showEditor, setShowEditor] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ msg: '', type: 'info' });
  const [copiedAll, copyAll] = useCopyState();
  const [selectedSnippetIds, setSelectedSnippetIds] = useState(new Set());

  const searchInputRef = useRef(null);

  // ── Data fetching ─────────────────────────────────────────────────────────
  const fetchSnippets = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await api.get('/script-vault');
      setSnippets(data.snippets || []);
      setError('');
    } catch (err) {
      if (!silent) setError(err.response?.data?.error || 'Failed to load scripts');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Initial load + re-sync when tab becomes visible
  useEffect(() => { fetchSnippets(); }, [fetchSnippets]);
  useEffect(() => {
    const onVisible = () => { if (!document.hidden) fetchSnippets(true); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [fetchSnippets]);

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: 'info' }), 2800);
  };

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      const inInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName) ||
                      document.activeElement?.isContentEditable;
      // N → new snippet (admin only, no modal open)
      if (e.key === 'n' && !inInput && !showEditor && isAdmin) {
        e.preventDefault();
        openCreate();
        return;
      }
      // / → focus search
      if (e.key === '/' && !inInput && !showEditor) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      // Escape → clear search (only when no modal is open)
      if (e.key === 'Escape' && !showEditor && !viewSnippet && search) {
        setSearch('');
        searchInputRef.current?.blur();
        return;
      }
      // Escape → clear selection
      if (e.key === 'Escape' && !showEditor && !viewSnippet && selectedSnippetIds.size > 0) {
        setSelectedSnippetIds(new Set());
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showEditor, viewSnippet, search, isAdmin, selectedSnippetIds]);

  const availableLangs = ['All', ...new Set(snippets.map(s => s.language).filter(Boolean))];

  const filtered = snippets
    .filter(s => filterLang === 'All' || s.language === filterLang)
    .filter(s => filterVis === 'All' || s.visibility === filterVis)
    .filter(s => !search
      || s.title.toLowerCase().includes(search.toLowerCase())
      || s.description?.toLowerCase().includes(search.toLowerCase())
      || s.language?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'created') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'size') return (b.content?.length || 0) - (a.content?.length || 0);
      return new Date(b.updatedAt) - new Date(a.updatedAt); // default: updated
    });

  // Stats
  const totalLines = snippets.reduce((acc, s) => acc + (s.content?.split('\n').length || 0), 0);
  const totalFiles = snippets.reduce((acc, s) => {
    const b = parseFileBlocks(s.content || '');
    return acc + b.filter(x => x.filePath).length;
  }, 0);
  const langCounts = snippets.reduce((acc, s) => {
    acc[s.language] = (acc[s.language] || 0) + 1; return acc;
  }, {});
  const topLang = Object.entries(langCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

  const handleSave = async (form) => {
    setSaving(true);
    try {
      if (editTarget?._id) {
        const { data } = await api.put(`/script-vault/${editTarget._id}`, form);
        setSnippets(prev => prev.map(s => s._id === editTarget._id ? data.snippet : s));
        if (viewSnippet?._id === editTarget._id) setViewSnippet(data.snippet);
        if (panelScript?._id === editTarget._id) setPanelScript(data.snippet);
        showToast('Script updated', 'success');
      } else {
        const { data } = await api.post('/script-vault', form);
        setSnippets(prev => [data.snippet, ...prev]);
        setPanelScript(data.snippet);          // auto-select newly created
        showToast('Script created', 'success');
      }
      setShowEditor(false);
      setEditTarget(null);
      // Background sync to guarantee freshness
      fetchSnippets(true);
    } catch (err) {
      showToast(err.response?.data?.error || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (snippet) => {
    if (!window.confirm(`Delete "${snippet.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/script-vault/${snippet._id}`);
      setSnippets(prev => prev.filter(s => s._id !== snippet._id));
      if (viewSnippet?._id === snippet._id) setViewSnippet(null);
      if (panelScript?._id === snippet._id) setPanelScript(null);
      showToast('Script deleted', 'success');
      fetchSnippets(true);
    } catch (err) {
      showToast(err.response?.data?.error || 'Delete failed', 'error');
    }
  };

  const handleContribute = async (snippetId, newContent) => {
    try {
      const { data } = await api.patch(`/script-vault/${snippetId}/contribute`, { newContent });
      setSnippets(prev => prev.map(s => s._id === snippetId ? data.snippet : s));
      setViewSnippet(data.snippet);
      if (panelScript?._id === snippetId) setPanelScript(data.snippet);
      showToast('Content added successfully', 'success');
      fetchSnippets(true);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to add content', 'error');
      throw err;
    }
  };

  const openCreate = () => { setEditTarget(null); setShowEditor(true); };
  const openEdit = (snippet) => { setEditTarget(snippet); setShowEditor(true); setViewSnippet(null); };
  // ── Quick "Upload Zip → Create Snippet" (main page) ───────────────────────
  const zipInputRef = useRef(null);
  const [zipUploading, setZipUploading] = useState(false);

  const handleQuickZip = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setZipUploading(true);
    try {
      // Use multipart upload-zip endpoint — server handles extraction
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/script-vault/upload-zip', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSnippets(prev => [data.snippet, ...prev]);
      setPanelScript(data.snippet);          // auto-select in split pane
      const zipName = data.snippet.title;
      showToast(`"${zipName}" uploaded`, 'success');
      // Open in editor so user can fine-tune
      setEditTarget(data.snippet);
      setShowEditor(true);
      fetchSnippets(true);
    } catch (err) {
      showToast(err.response?.data?.error || 'Zip upload failed', 'error');
    } finally {
      setZipUploading(false);
    }
  }, [fetchSnippets]);

  const handleSaveInline = async (snippetId, newContent) => {
    const snippet = snippets.find(s => s._id === snippetId);
    if (!snippet) return;
    try {
      const { data } = await api.put(`/script-vault/${snippetId}`, {
        ...snippet,
        content: newContent,
        allowedUsers: snippet.allowedUsers?.map(u => u._id || u),
      });
      setSnippets(prev => prev.map(s => s._id === snippetId ? data.snippet : s));
      setViewSnippet(data.snippet);
      if (panelScript?._id === snippetId) setPanelScript(data.snippet);
      showToast('Changes saved', 'success');
      fetchSnippets(true);
    } catch (err) {
      showToast(err.response?.data?.error || 'Save failed', 'error');
      throw err;
    }
  };

  const toggleSelect = (id) => {
    setSelectedSnippetIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const [copiedSelected, copySelected] = useCopyState();
  const bulkCopyContent = filtered
    .filter(s => selectedSnippetIds.has(s._id))
    .map(s => `// ── ${s.title} ──\n${s.content}`)
    .join('\n\n');

  const allContent = filtered.map(s => `// ── ${s.title} ──\n${s.content}`).join('\n\n');

  const SORT_OPTIONS = [
    { val: 'updated', label: 'Last updated' },
    { val: 'created', label: 'Newest first' },
    { val: 'title',   label: 'A → Z' },
    { val: 'size',    label: 'Largest' },
  ];

  // When the panelScript changes (e.g. due to external update), keep it in sync
  const syncedPanel = panelScript ? (snippets.find(s => s._id === panelScript._id) || panelScript) : null;

  return (
    <PageWrapper>
      {/* ─────────────────────────────────────────────────────────────────────
          VS Code-style full-height layout
          ─────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col" style={{ height: 'calc(100dvh - 64px)' }}>

        {/* ── Top title bar ── */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b flex-shrink-0"
          style={{ backgroundColor: '#0d0d0f', borderColor: 'rgba(255,255,255,0.07)' }}>
          {/* Breadcrumb + title */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button
              onClick={() => setSidebarOpen(v => !v)}
              className="p-1.5 rounded text-[rgba(255,255,255,0.35)] hover:text-white hover:bg-white/8 transition-all flex-shrink-0"
              title={sidebarOpen ? 'Collapse explorer' : 'Expand explorer'}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#FF634A,#c94230)' }}>
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-[14px] font-bold text-white">Script Vault</h1>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest flex-shrink-0"
                style={{ background: 'rgba(255,99,74,0.15)', color: '#FF634A', border: '1px solid rgba(255,99,74,0.3)' }}>
                {isAdmin ? 'Admin' : 'Viewer'}
              </span>
              {!loading && snippets.length > 0 && (
                <div className="hidden sm:flex items-center gap-3 ml-2">
                  {[
                    { label: 'Scripts', value: snippets.length },
                    { label: 'Lines', value: totalLines.toLocaleString() },
                    { label: 'Top', value: topLang || '—', color: topLang ? getLangColor(topLang) : undefined },
                  ].map(stat => (
                    <span key={stat.label} className="text-[11px] text-[rgba(255,255,255,0.35)]">
                      <span className="font-semibold" style={{ color: stat.color || 'rgba(255,255,255,0.7)' }}>{stat.value}</span>
                      {' '}{stat.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => fetchSnippets()}
              disabled={loading}
              className="p-1.5 rounded text-[rgba(255,255,255,0.4)] hover:text-white hover:bg-white/8 transition-all disabled:opacity-40"
              title="Refresh"
            >
              <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            {isAdmin && (
              <>
                <input ref={zipInputRef} type="file" accept=".zip,application/zip" className="hidden" onChange={handleQuickZip} />
                <button
                  onClick={() => zipInputRef.current?.click()}
                  disabled={zipUploading}
                  className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold rounded-lg border transition-all disabled:opacity-60 hover:bg-white/10 hover:text-white"
                  style={{ borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.65)' }}
                  title="Upload a .zip file"
                >
                  {zipUploading ? (
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7H8a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7V5a2 2 0 00-2-2h-2a2 2 0 00-2 2v2" />
                    </svg>
                  )}
                  <span className="hidden md:inline">{zipUploading ? 'Uploading…' : 'Upload ZIP'}</span>
                </button>
                <button
                  onClick={openCreate}
                  className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold rounded-lg text-white transition-all hover:opacity-90 active:scale-95"
                  style={{ background: 'linear-gradient(135deg,#FF634A,#e0532d)', boxShadow: '0 2px 8px rgba(255,99,74,0.35)' }}
                  title="New snippet (N)"
                >
                  <PlusIcon />
                  <span className="hidden md:inline">New Script</span>
                  <kbd className="ml-0.5 px-1 py-0.5 text-[8px] rounded font-mono opacity-70 hidden md:inline"
                    style={{ backgroundColor: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}>N</kbd>
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Main split pane ── */}
        <div className="flex flex-1 overflow-hidden min-h-0">

          {/* ── Left: Explorer sidebar ── */}
          {sidebarOpen && (
            <div className="flex flex-col border-r flex-shrink-0 overflow-hidden"
              style={{ width: '260px', backgroundColor: '#0b0b0d', borderColor: 'rgba(255,255,255,0.06)' }}>

              {/* Sidebar header */}
              <div className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0"
                style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-[rgba(255,255,255,0.25)]">
                  Scripts ({filtered.length})
                </span>
                <div className="flex items-center gap-1">
                  {/* Sort select */}
                  <select
                    value={sortBy} onChange={e => setSortBy(e.target.value)}
                    className="text-[10px] rounded px-1 py-0.5 border bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.4)] focus:outline-none appearance-none cursor-pointer"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' fill='none' viewBox='0 0 24 24' stroke='rgba(255,255,255,0.3)' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 4px center', paddingRight: '16px' }}
                    title="Sort order"
                  >
                    {SORT_OPTIONS.map(o => <option key={o.val} value={o.val} style={{ background: '#18181b' }}>{o.label}</option>)}
                  </select>
                  {isAdmin && (
                    <select
                      value={filterVis} onChange={e => setFilterVis(e.target.value)}
                      className="text-[10px] rounded px-1 py-0.5 border bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.4)] focus:outline-none appearance-none cursor-pointer ml-0.5"
                      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' fill='none' viewBox='0 0 24 24' stroke='rgba(255,255,255,0.3)' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 4px center', paddingRight: '16px' }}
                      title="Visibility filter"
                    >
                      <option value="All" style={{ background: '#18181b' }}>All</option>
                      <option value="all" style={{ background: '#18181b' }}>Everyone</option>
                      <option value="staff" style={{ background: '#18181b' }}>Staff</option>
                      <option value="admins" style={{ background: '#18181b' }}>Admins</option>
                      <option value="custom" style={{ background: '#18181b' }}>Custom</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Search */}
              <div className="px-2 py-2 flex-shrink-0">
                <div className="relative">
                  <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[rgba(255,255,255,0.25)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
                  </svg>
                  <input
                    ref={searchInputRef}
                    className="w-full pl-6 pr-6 py-1.5 text-[12px] rounded-lg border bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.07)] text-white placeholder-[rgba(255,255,255,0.25)] focus:outline-none focus:border-[#FF634A]/40 transition-all"
                    placeholder="Filter scripts…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                  {search && (
                    <button onClick={() => setSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.3)] hover:text-white">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Language filter pills */}
              {availableLangs.length > 1 && (
                <div className="flex gap-1 px-2 pb-2 flex-wrap flex-shrink-0">
                  {availableLangs.map(lang => {
                    const color = lang !== 'All' ? getLangColor(lang) : null;
                    const active = filterLang === lang;
                    return (
                      <button key={lang} onClick={() => setFilterLang(lang)}
                        className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded border transition-all flex-shrink-0"
                        style={active
                          ? { borderColor: color || '#FF634A', backgroundColor: `${color || '#FF634A'}18`, color: color || '#FF634A' }
                          : { borderColor: 'rgba(255,255,255,0.07)', backgroundColor: 'rgba(255,255,255,0.02)', color: 'rgba(255,255,255,0.35)' }
                        }>
                        {lang !== 'All' && color && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />}
                        {lang}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Script list */}
              <div className="flex-1 overflow-y-auto">
                {loading && (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-5 h-5 border-2 border-[#FF634A]/30 border-t-[#FF634A] rounded-full animate-spin" />
                  </div>
                )}
                {!loading && error && (
                  <p className="text-[11px] text-red-400 px-3 py-4">{error}</p>
                )}
                {!loading && !error && filtered.length === 0 && (
                  <div className="px-3 py-8 text-center">
                    <p className="text-[12px] text-[rgba(255,255,255,0.3)]">
                      {search || filterLang !== 'All' || filterVis !== 'All'
                        ? 'No scripts match filters' : 'No scripts yet'}
                    </p>
                    {isAdmin && !search && filterLang === 'All' && filterVis === 'All' && (
                      <button onClick={openCreate} className="mt-3 text-[11px] text-[#FF634A] hover:underline">
                        Create the first script
                      </button>
                    )}
                  </div>
                )}
                {!loading && !error && filtered.map(snippet => (
                  <ScriptSidebarItem
                    key={snippet._id}
                    snippet={snippet}
                    isSelected={syncedPanel?._id === snippet._id}
                    isAdmin={isAdmin}
                    onClick={() => setPanelScript(snippet)}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>

              {/* Footer */}
              <div className="flex-shrink-0 px-3 py-2 border-t"
                style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                <p className="text-[10px] text-[rgba(255,255,255,0.2)]">
                  {snippets.length} script{snippets.length !== 1 ? 's' : ''}
                  {totalLines > 0 && ` · ${totalLines.toLocaleString()} lines`}
                </p>
              </div>
            </div>
          )}

          {/* ── Right: Content pane ── */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-0"
            style={{ backgroundColor: '#080809' }}>
            {syncedPanel ? (
              <InlineScriptView
                key={syncedPanel._id}
                snippet={syncedPanel}
                isAdmin={isAdmin}
                onEdit={openEdit}
                onDelete={handleDelete}
                onContribute={handleContribute}
                onSaveInline={isAdmin ? handleSaveInline : undefined}
              />
            ) : (
              /* Welcome state */
              <div className="flex-1 flex flex-col items-center justify-center gap-5 px-8 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(255,99,74,0.06)', border: '1px solid rgba(255,99,74,0.12)' }}>
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.4}
                    style={{ color: 'rgba(255,99,74,0.4)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-[rgba(255,255,255,0.5)]">
                    {loading ? 'Loading Script Vault…' : snippets.length === 0 ? 'Vault is empty' : 'Select a script'}
                  </p>
                  <p className="text-[12px] text-[rgba(255,255,255,0.25)] mt-1.5 max-w-xs">
                    {loading
                      ? 'Fetching your scripts from the server…'
                      : snippets.length === 0 && isAdmin
                        ? 'Create and share your first script with the team.'
                        : 'Choose a script from the explorer on the left to view it here.'}
                  </p>
                </div>
                {isAdmin && !loading && snippets.length === 0 && (
                  <button onClick={openCreate}
                    className="flex items-center gap-1.5 px-5 py-2.5 text-[13px] font-semibold rounded-xl text-white shadow-lg"
                    style={{ background: 'linear-gradient(135deg,#FF634A,#e0532d)', boxShadow: '0 4px 14px rgba(255,99,74,0.4)' }}>
                    <PlusIcon /> Create First Script
                  </button>
                )}
                {loading && (
                  <div className="w-6 h-6 border-2 border-[#FF634A]/30 border-t-[#FF634A] rounded-full animate-spin" />
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── VS Code-style status bar ── */}
        <div className="flex items-center justify-between px-4 py-1 flex-shrink-0"
          style={{ backgroundColor: '#FF634A', color: 'rgba(255,255,255,0.9)' }}>
          <div className="flex items-center gap-4 text-[10.5px] font-medium">
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Script Vault
            </span>
            {topLang && <span>{topLang.charAt(0).toUpperCase() + topLang.slice(1)}</span>}
            {syncedPanel && !syncedPanel.isZip && (
              <span>{syncedPanel.language}</span>
            )}
          </div>
          <div className="flex items-center gap-4 text-[10.5px]">
            {syncedPanel && !syncedPanel.isZip && (
              <span>{syncedPanel.content?.split('\n').length || 0} lines</span>
            )}
            <span>{snippets.length} scripts</span>
            {isAdmin && <span className="opacity-70">Admin</span>}
          </div>
        </div>
      </div>

      {/* ── Toast ── */}
      {toast.msg && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-[13px] font-medium text-white shadow-xl"
          style={{ background: 'rgba(24,24,27,0.97)', border: `1px solid ${toast.type === 'error' ? 'rgba(239,68,68,0.3)' : toast.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.12)'}`, backdropFilter: 'blur(12px)' }}>
          {toast.type === 'success' && <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
          {toast.type === 'error' && <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>}
          {toast.msg}
        </div>
      )}

      {/* ── View modal (for mobile / full-screen view) ── */}
      {viewSnippet && (
        <SnippetModal
          snippet={viewSnippet}
          onClose={() => setViewSnippet(null)}
          isAdmin={isAdmin}
          onEdit={openEdit}
          onDelete={handleDelete}
          onContribute={handleContribute}
          onSaveInline={isAdmin ? handleSaveInline : undefined}
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
