import { useState, useRef } from 'react';
import PageWrapper from '../components/layout/PageWrapper';
import Breadcrumb from '../components/layout/Breadcrumb';
import api from '../api/api';
import { useToast } from '../context/ToastContext';

const REQUIRED_COLS = ['title', 'description', 'category', 'priority'];
const VALID_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const VALID_CATEGORIES = [
  'Hardware', 'Software', 'Network', 'Account Access', 'Email',
  'Printer', 'Phone/Mobile', 'Security', 'Other',
];

function parseCSV(text) {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return { error: 'CSV must have a header row and at least one data row', rows: [] };
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
  const missing = REQUIRED_COLS.filter(c => !headers.includes(c));
  if (missing.length) return { error: `Missing required columns: ${missing.join(', ')}`, rows: [] };
  const rows = lines.slice(1).map((line, i) => {
    const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const row = {};
    headers.forEach((h, idx) => { row[h] = vals[idx] || ''; });
    return { ...row, _row: i + 2 };
  });
  return { error: null, rows };
}

export default function TicketImport() {
  const { addToast } = useToast();
  const fileRef = useRef();
  const [preview, setPreview] = useState(null);
  const [parseError, setParseError] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) { setParseError('Please upload a .csv file'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const { error, rows } = parseCSV(ev.target.result);
      if (error) { setParseError(error); setPreview(null); return; }
      setParseError('');
      setPreview(rows);
      setResult(null);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!preview?.length) return;
    setImporting(true);
    try {
      const tickets = preview.map(r => ({
        title: r.title,
        description: r.description,
        category: VALID_CATEGORIES.includes(r.category) ? r.category : 'Other',
        priority: VALID_PRIORITIES.includes(r.priority) ? r.priority : 'Medium',
        email: r.email || '',
      }));
      const res = await api.post('/tickets/bulk-import', { tickets });
      setResult(res.data);
      setPreview(null);
      addToast(`Imported ${res.data.created} tickets successfully`);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      addToast(err.response?.data?.error || 'Import failed', 'error');
    } finally {
      setImporting(false);
    }
  };

  const priorityColor = (p) => ({ Low: '#22c55e', Medium: '#f59e0b', High: '#f97316', Critical: '#ef4444' }[p] || '#a1a1aa');

  return (
    <PageWrapper>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-5 max-w-5xl mx-auto">
        <Breadcrumb />
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">📥</span>
          <div>
            <h1 className="text-[22px] font-bold text-[#fafafa]">Ticket Import</h1>
            <p className="text-[13px] text-[#71717a]">Bulk import tickets from a CSV file</p>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 mb-5">
          <h2 className="text-[13px] font-semibold text-[#fafafa] mb-2">CSV Format</h2>
          <p className="text-[12px] text-[#a1a1aa] mb-2">Required columns: <code className="text-[#60a5fa]">title, description, category, priority</code> — Optional: <code className="text-[#60a5fa]">email</code></p>
          <div className="bg-[#09090b] rounded-lg p-3 font-mono text-[11px] text-[#71717a] overflow-x-auto">
            title,description,category,priority,email<br />
            "Screen flickering","Monitor flickers after login","Hardware","High","user@company.com"<br />
            "VPN not connecting","Cannot connect to VPN","Network","Medium",""
          </div>
        </div>

        {/* Upload */}
        <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 mb-5">
          <label className="flex flex-col items-center gap-3 cursor-pointer border-2 border-dashed border-[#3f3f46] hover:border-[#3b82f6]/50 rounded-xl p-8 transition-colors"
            htmlFor="csv-upload">
            <span className="text-3xl">📂</span>
            <span className="text-[13px] text-[#a1a1aa]">Click to upload a <strong className="text-[#fafafa]">.csv</strong> file</span>
            <input id="csv-upload" ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
          </label>
          {parseError && <p className="mt-3 text-[12px] text-[#ef4444] bg-[#ef4444]/8 border border-[#ef4444]/20 rounded-lg px-3 py-2">{parseError}</p>}
        </div>

        {/* Preview */}
        {preview && (
          <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 mb-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[14px] font-semibold text-[#fafafa]">Preview — {preview.length} rows</h2>
              <button onClick={handleImport} disabled={importing}
                className="px-4 py-2 rounded-lg bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-50 text-white text-[12px] font-semibold transition-colors">
                {importing ? 'Importing…' : `Import ${preview.length} Tickets`}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-[#27272a] text-[#71717a]">
                    <th className="text-left py-2 pr-4">#</th>
                    <th className="text-left py-2 pr-4">Title</th>
                    <th className="text-left py-2 pr-4">Category</th>
                    <th className="text-left py-2 pr-4">Priority</th>
                    <th className="text-left py-2">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 20).map((r, i) => (
                    <tr key={i} className="border-b border-[#27272a]/50 hover:bg-[#27272a]/30">
                      <td className="py-2 pr-4 text-[#52525b]">{r._row}</td>
                      <td className="py-2 pr-4 text-[#e4e4e7] max-w-[200px] truncate">{r.title || <span className="text-[#ef4444]">missing</span>}</td>
                      <td className="py-2 pr-4 text-[#a1a1aa]">{r.category || '–'}</td>
                      <td className="py-2 pr-4">
                        <span className="font-medium" style={{ color: priorityColor(r.priority) }}>{r.priority || '–'}</span>
                      </td>
                      <td className="py-2 text-[#71717a]">{r.email || '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.length > 20 && <p className="text-[11px] text-[#52525b] mt-2">…and {preview.length - 20} more rows</p>}
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="bg-[#18181b] border border-[#22c55e]/30 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">✅</span>
              <h2 className="text-[14px] font-semibold text-[#22c55e]">Import Complete</h2>
            </div>
            <p className="text-[13px] text-[#a1a1aa]">{result.created} ticket{result.created !== 1 ? 's' : ''} created successfully.
              {result.skipped > 0 && ` ${result.skipped} row${result.skipped !== 1 ? 's' : ''} skipped (missing title or description).`}
            </p>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
