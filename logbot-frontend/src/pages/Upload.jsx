import { useState, useRef } from 'react';
import { Card, CardHeader } from '../components.jsx';
import { Icons } from '../icons.jsx';

const RECENT_UPLOADS = [
  { id: 1, name: 'inventory_apr2026.csv',  rows: 2340, status: 'success', time: '2h ago',  size: '1.2 MB' },
  { id: 2, name: 'demand_q1_2026.csv',     rows: 4820, status: 'success', time: '1d ago',  size: '2.8 MB' },
  { id: 3, name: 'suppliers_2026.xlsx',    rows:   87, status: 'success', time: '3d ago',  size: '0.4 MB' },
  { id: 4, name: 'stockout_events.csv',    rows:  234, status: 'error',   time: '5d ago',  size: '0.1 MB' },
];

const PIPELINE_STEPS = [
  { id: 1, label: 'File Validation',       sub: 'Check format, encoding, column headers' },
  { id: 2, label: 'Data Preprocessing',    sub: 'Clean nulls, normalize types, parse dates' },
  { id: 3, label: 'Database Seeding',      sub: 'Insert records into inventory & demand tables' },
  { id: 4, label: 'Feature Engineering',   sub: 'Generate ML-ready features & time series' },
  { id: 5, label: 'Optimization Seeding',  sub: 'Compute Safety Stock, ROP, EOQ per SKU' },
];

export default function Upload() {
  const [dragging, setDragging]     = useState(false);
  const [file, setFile]             = useState(null);
  const [status, setStatus]         = useState(null); // null | 'processing' | 'done' | 'error'
  const [progress, setProgress]     = useState(0);
  const [completedSteps, setCompleted] = useState([]);
  const inputRef = useRef(null);

  const acceptFile = (f) => {
    const ok = f && (f.name.endsWith('.csv') || f.name.endsWith('.xlsx') || f.name.endsWith('.xls'));
    if (!ok) { alert('Only CSV or Excel files are accepted.'); return; }
    if (f.size > 50 * 1024 * 1024) { alert('File must be under 50 MB.'); return; }
    setFile(f);
    setStatus(null);
    setProgress(0);
    setCompleted([]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) acceptFile(f);
  };

  const handleIngest = () => {
    if (!file) return;
    setStatus('processing');
    setCompleted([]);
    let step = 0;
    const advance = () => {
      step++;
      setCompleted(prev => [...prev, step]);
      setProgress(Math.round((step / PIPELINE_STEPS.length) * 100));
      if (step < PIPELINE_STEPS.length) setTimeout(advance, 700 + Math.random() * 400);
      else setStatus('done');
    };
    setTimeout(advance, 600);
  };

  return (
    <div className="space-y-5 fade-in">
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Files Uploaded',    value: RECENT_UPLOADS.length,  color: 'accent' },
          { label: 'Records Processed', value: '7,481',                 color: 'green'  },
          { label: 'Max File Size',      value: '50 MB',                 color: 'blue'   },
          { label: 'Accepted Formats',  value: 'CSV / XLSX',            color: 'accent' },
        ].map(s => (
          <div key={s.label} className={`card-glass rounded-xl border border-fb-border p-5`}>
            <div className="text-xs font-medium text-fb-muted uppercase tracking-wider">{s.label}</div>
            <div className={`text-2xl font-bold font-mono mt-2 ${s.color === 'green' ? 'text-fb-green' : s.color === 'blue' ? 'text-fb-blue' : 'text-fb-accent'}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 space-y-4">
          <Card
            className={`p-8 border-2 border-dashed transition-colors cursor-pointer ${dragging ? 'drag-over' : 'border-fb-border hover:border-fb-accent/40'}`}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => !file && inputRef.current?.click()}
          >
            <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={e => e.target.files[0] && acceptFile(e.target.files[0])} />
            {!file ? (
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="w-14 h-14 rounded-2xl bg-fb-card2 border border-fb-border flex items-center justify-center text-fb-muted">
                  <Icons.Upload size={24} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-fb-text">Drop your CSV or Excel file here</p>
                  <p className="text-xs text-fb-muted mt-1">or click to browse — max 50 MB</p>
                </div>
                <div className="flex gap-2 text-[10px] text-fb-dim">
                  {['.CSV', '.XLSX', '.XLS'].map(ext => (
                    <span key={ext} className="px-2 py-1 rounded bg-fb-card2 border border-fb-border font-mono">{ext}</span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-fb-accent-dim border border-fb-accent/20 flex items-center justify-center text-fb-accent flex-shrink-0">
                    <Icons.File size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-fb-text truncate">{file.name}</p>
                    <p className="text-xs text-fb-muted">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setFile(null); setStatus(null); }}
                    className="text-fb-muted hover:text-fb-red transition-colors"><Icons.X size={16} /></button>
                </div>

                {status === null && (
                  <button onClick={(e) => { e.stopPropagation(); handleIngest(); }}
                    className="w-full py-2.5 rounded-xl btn-primary text-sm flex items-center justify-center gap-2">
                    <Icons.Zap size={16} /> Run Ingestion Pipeline
                  </button>
                )}

                {(status === 'processing' || status === 'done') && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-fb-muted">{status === 'done' ? 'Ingestion complete' : 'Processing…'}</span>
                      <span className="font-mono text-fb-accent">{progress}%</span>
                    </div>
                    <div className="h-1.5 bg-fb-card2 rounded-full overflow-hidden">
                      <div className="h-full bg-fb-accent rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                    </div>
                    <div className="space-y-2">
                      {PIPELINE_STEPS.map(step => {
                        const done = completedSteps.includes(step.id);
                        const active = !done && completedSteps.length === step.id - 1;
                        return (
                          <div key={step.id} className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${done ? 'bg-fb-green-dim' : active ? 'bg-fb-accent-dim' : 'bg-fb-card2'} border ${done ? 'border-fb-green/20' : active ? 'border-fb-accent/20' : 'border-fb-border'}`}>
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${done ? 'bg-fb-green text-white' : active ? 'bg-fb-accent text-fb-sidebar' : 'bg-fb-card border border-fb-border text-fb-dim'}`}>
                              {done ? <Icons.Check size={10} /> : <span className="text-[9px] font-bold">{step.id}</span>}
                            </div>
                            <div className="min-w-0">
                              <div className={`text-xs font-medium ${done ? 'text-fb-green' : active ? 'text-fb-accent' : 'text-fb-muted'}`}>{step.label}</div>
                              <div className="text-[10px] text-fb-dim truncate">{step.sub}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {status === 'done' && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-fb-green-dim border border-fb-green/20">
                        <Icons.Check size={14} className="text-fb-green" />
                        <span className="text-xs text-fb-green font-medium">Pipeline completed successfully — inventory updated</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        <Card className="p-5">
          <CardHeader title="Recent Uploads" subtitle={`${RECENT_UPLOADS.length} files`} />
          <div className="space-y-3">
            {RECENT_UPLOADS.map(u => (
              <div key={u.id} className="flex items-start gap-3 p-3 rounded-lg bg-fb-card2 border border-fb-border">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${u.status === 'success' ? 'bg-fb-green-dim text-fb-green' : 'bg-fb-red-dim text-fb-red'}`}>
                  {u.status === 'success' ? <Icons.Check size={13} /> : <Icons.X size={13} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-fb-text truncate">{u.name}</p>
                  <p className="text-[10px] text-fb-muted">{u.rows.toLocaleString()} rows · {u.size}</p>
                  <p className="text-[10px] text-fb-dim mt-0.5">{u.time}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-lg bg-fb-card2 border border-fb-border">
            <p className="text-[10px] text-fb-muted leading-relaxed">
              Supported columns: <span className="font-mono text-fb-dim">sku_name, quantity, unit_price, category, supplier, lead_time_days, demand_date</span>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
