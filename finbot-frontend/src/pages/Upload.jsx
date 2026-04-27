import { useState, useRef } from 'react';
import { Card, CardHeader } from '../components.jsx';
import { Icons } from '../icons.jsx';

const PREVIEW_ROWS = [
  ['01-04-2026', 'Income',  '4200', 'Sales',      'Q2 product revenue'],
  ['02-04-2026', 'Expense', '1800', 'Salaries',   'March payroll batch'],
  ['03-04-2026', 'Expense', '620',  'Marketing',  'Google Ads campaign'],
  ['04-04-2026', 'Income',  '900',  'Services',   'Consulting retainer'],
  ['05-04-2026', 'Expense', '340',  'Software',   'AWS monthly bill'],
];
const PREVIEW_COLS = ['date', 'type', 'amount', 'category', 'description'];

const MAPPING = { date: 'date', amount: 'amount', category: 'category', type: 'type', description: 'description' };

export default function Upload() {
  const [dragging, setDragging] = useState(false);
  const [file, setFile]         = useState(null);
  const [status, setStatus]     = useState('idle');
  const inputRef                = useRef(null);

  const processFile = (f) => {
    setFile(f); setStatus('processing');
    setTimeout(() => setStatus('done'), 1800);
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  };

  return (
    <div className="space-y-5 fade-in">
      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 space-y-4">
          <Card
            className={`p-8 border-2 border-dashed transition-all duration-200 cursor-pointer ${dragging ? 'drag-over' : 'border-fb-border hover:border-fb-accent/40'}`}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current.click()}>
            <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={e => { const f = e.target.files[0]; if (f) processFile(f); }} />
            <div className="flex flex-col items-center gap-3 text-center">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${dragging ? 'bg-fb-accent text-fb-sidebar' : 'bg-fb-card2 text-fb-muted border border-fb-border'}`}>
                <Icons.Upload size={28} />
              </div>
              <div>
                <p className="text-sm font-semibold text-fb-text">{dragging ? 'Drop it here!' : 'Drag & drop your file'}</p>
                <p className="text-xs text-fb-muted mt-1">Supports CSV, XLSX, XLS — up to 50MB</p>
              </div>
              <button className="btn-primary px-5 py-2 rounded-lg text-xs" onClick={e => e.stopPropagation()}>Browse Files</button>
            </div>
          </Card>

          {file && (
            <Card className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-lg bg-fb-card2 border border-fb-border flex items-center justify-center text-fb-accent">
                  <Icons.File size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-fb-text truncate">{file.name}</p>
                  <p className="text-xs text-fb-muted">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                {status === 'done' && (
                  <div className="flex items-center gap-1.5 text-fb-green text-xs font-medium">
                    <Icons.Check size={14} /> Processed
                  </div>
                )}
                {status === 'processing' && <div className="text-xs text-fb-accent animate-pulse">Processing…</div>}
              </div>
              {status === 'done' && (
                <div className="grid grid-cols-3 gap-3">
                  {[['Status','Processed ✓','text-fb-green'],['Rows Imported','1,240','text-fb-accent'],['Columns Detected','6','text-fb-blue']].map(([l,v,c]) => (
                    <div key={l} className="bg-fb-card2 rounded-lg p-3 border border-fb-border text-center">
                      <div className="text-[10px] text-fb-muted mb-1">{l}</div>
                      <div className={`text-sm font-bold font-mono ${c}`}>{v}</div>
                    </div>
                  ))}
                </div>
              )}
              {status === 'processing' && (
                <div className="w-full bg-fb-card2 rounded-full h-1.5 overflow-hidden">
                  <div className="h-full bg-fb-accent rounded-full animate-pulse" style={{ width: '60%' }}></div>
                </div>
              )}
            </Card>
          )}

          {status === 'done' && (
            <Card className="overflow-hidden">
              <div className="px-5 py-3 border-b border-fb-border">
                <h3 className="text-sm font-semibold text-fb-text">Data Preview <span className="text-fb-muted font-normal text-xs ml-2">First 5 rows</span></h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-fb-card2/50">
                    <tr>{PREVIEW_COLS.map(c => (
                      <th key={c} className="px-4 py-2.5 text-left text-[11px] font-semibold text-fb-accent uppercase tracking-wider">{c}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {PREVIEW_ROWS.map((row, i) => (
                      <tr key={i} className="border-t border-fb-border/50 hover:bg-fb-card2/20">
                        {row.map((cell, j) => <td key={j} className="px-4 py-2.5 text-xs text-fb-muted font-mono">{cell}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <CardHeader title="Field Mapping" subtitle="Detected columns" />
            {status === 'idle' && <p className="text-xs text-fb-muted text-center py-6">Upload a file to see detected fields.</p>}
            {status !== 'idle' && (
              <div className="space-y-3">
                {Object.entries(MAPPING).map(([field, col]) => (
                  <div key={field}>
                    <label className="text-[10px] font-semibold text-fb-muted uppercase tracking-wider block mb-1">{field}</label>
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-mono
                      ${status === 'done' ? 'bg-fb-green-dim border-fb-green/30 text-fb-green' : 'bg-fb-card2 border-fb-border text-fb-muted'}`}>
                      {status === 'done' && <Icons.Check size={12} />}
                      {col}
                    </div>
                  </div>
                ))}
                {status === 'done' && (
                  <button className="w-full mt-2 py-2.5 rounded-lg btn-primary text-xs font-semibold">Confirm & Import</button>
                )}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <CardHeader title="Recent Uploads" />
            {[
              { name: 'march_2026.csv', rows: 412, date: '28-03-2026' },
              { name: 'feb_2026.xlsx',  rows: 380, date: '01-03-2026' },
              { name: 'jan_2026.csv',   rows: 395, date: '02-02-2026' },
            ].map(f => (
              <div key={f.name} className="flex items-center gap-2 py-2.5 border-t border-fb-border/50 first:border-0">
                <Icons.File size={14} className="text-fb-muted flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-fb-text truncate">{f.name}</p>
                  <p className="text-[10px] text-fb-muted">{f.rows} rows · {f.date}</p>
                </div>
                <Icons.Download size={13} className="text-fb-muted hover:text-fb-accent cursor-pointer flex-shrink-0" />
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
