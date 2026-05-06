import { useState, useRef } from 'react';
import { uploadEmployees, uploadShiftRequirements } from '../api.js';
import { Card, CardHeader } from '@/components.jsx';
import { Icons } from '@/icons.jsx';

const EMP_COLS  = ['emp_code', 'first_name', 'last_name', 'email', 'role', 'department', 'salary'];
const SHIFT_COLS = ['date', 'shift_type', 'required_count'];

function UploadZone({ title, subtitle, cols, onUpload }) {
  const [dragging, setDragging] = useState(false);
  const [file,     setFile]     = useState(null);
  const [status,   setStatus]   = useState('idle');
  const [result,   setResult]   = useState(null);
  const [error,    setError]    = useState(null);
  const inputRef               = useRef(null);

  const processFile = async (f) => {
    setFile(f);
    setStatus('uploading');
    setError(null);
    try {
      const res = await onUpload(f);
      setResult(res);
      setStatus('done');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  };

  return (
    <Card className="p-5 space-y-4">
      <CardHeader title={title} subtitle={subtitle} />

      <div
        className={`p-6 border-2 border-dashed rounded-xl transition-all duration-200 cursor-pointer ${dragging ? 'drag-over' : 'border-fb-border hover:border-fb-accent/40'}`}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current.click()}>
        <input ref={inputRef} type="file" accept=".xlsx" className="hidden"
          onChange={e => { const f = e.target.files[0]; if (f) processFile(f); }} />
        <div className="flex flex-col items-center gap-2 text-center">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${dragging ? 'bg-fb-accent text-fb-sidebar' : 'bg-fb-card2 text-fb-muted border border-fb-border'}`}>
            <Icons.Upload size={22} />
          </div>
          <p className="text-xs font-semibold text-fb-text">{dragging ? 'Drop it here!' : 'Drag & drop or click to browse'}</p>
          <p className="text-[10px] text-fb-muted">Accepts .xlsx only — max 2 MB</p>
        </div>
      </div>

      {file && (
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-fb-card2 border border-fb-border">
          <Icons.File size={16} className="text-fb-muted flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-fb-text truncate">{file.name}</p>
            <p className="text-[10px] text-fb-muted">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
          {status === 'uploading' && <span className="text-[10px] text-fb-accent animate-pulse">Uploading…</span>}
          {status === 'done'      && <span className="flex items-center gap-1 text-[10px] text-fb-green font-medium"><Icons.Check size={12} /> Processed</span>}
          {status === 'error'     && <span className="text-[10px] text-fb-red font-medium">Failed</span>}
        </div>
      )}

      {status === 'uploading' && (
        <div className="w-full bg-fb-card2 rounded-full h-1 overflow-hidden">
          <div className="h-full bg-fb-accent rounded-full animate-pulse" style={{ width: '60%' }} />
        </div>
      )}

      {status === 'done' && result && (
        <div className="grid grid-cols-3 gap-3">
          {[
            ['Total Rows', result.total,    'text-fb-accent'],
            ['Inserted',   result.inserted, 'text-fb-green' ],
            ['Skipped',    result.failed,   result.failed > 0 ? 'text-fb-red' : 'text-fb-muted'],
          ].map(([l, v, c]) => (
            <div key={l} className="bg-fb-card2 rounded-lg p-3 border border-fb-border text-center">
              <div className="text-[10px] text-fb-muted mb-1">{l}</div>
              <div className={`text-sm font-bold font-mono ${c}`}>{v}</div>
            </div>
          ))}
        </div>
      )}

      {status === 'error' && error && (
        <div className="px-3 py-2.5 rounded-lg bg-fb-red-dim border border-fb-red/20 text-fb-red text-xs">{error}</div>
      )}

      <div className="pt-1">
        <p className="text-[10px] text-fb-muted font-semibold uppercase tracking-wider mb-2">Expected columns</p>
        <div className="flex flex-wrap gap-1.5">
          {cols.map(c => (
            <span key={c} className="text-[9px] px-2 py-0.5 rounded bg-fb-card2 border border-fb-border text-fb-dim font-mono">{c}</span>
          ))}
        </div>
      </div>
    </Card>
  );
}

export default function Upload() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-5">
        <UploadZone
          title="Upload Employees"
          subtitle="Import employee records from Excel"
          cols={EMP_COLS}
          onUpload={uploadEmployees}
        />
        <UploadZone
          title="Upload Shift Requirements"
          subtitle="Define required staff per shift per day"
          cols={SHIFT_COLS}
          onUpload={uploadShiftRequirements}
        />
      </div>

      <Card className="p-5">
        <CardHeader title="Upload Instructions" />
        <div className="grid grid-cols-2 gap-6 mt-1">
          <div>
            <p className="text-xs font-semibold text-fb-text mb-2">Employee File</p>
            <ul className="space-y-1 text-[11px] text-fb-muted list-disc list-inside">
              <li><span className="font-mono text-fb-accent">emp_code</span> must be unique per employee</li>
              <li>Rows with duplicate emp_codes are skipped (no overwrite)</li>
              <li><span className="font-mono text-fb-accent">role</span> defaults to "staff" if blank</li>
              <li><span className="font-mono text-fb-accent">salary</span> should be a number (optional)</li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold text-fb-text mb-2">Shift Requirements File</p>
            <ul className="space-y-1 text-[11px] text-fb-muted list-disc list-inside">
              <li><span className="font-mono text-fb-accent">date</span> format: YYYY-MM-DD</li>
              <li><span className="font-mono text-fb-accent">shift_type</span>: morning, afternoon, or night</li>
              <li><span className="font-mono text-fb-accent">required_count</span>: number of staff needed</li>
              <li>Existing entries for the same date + shift are updated</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
