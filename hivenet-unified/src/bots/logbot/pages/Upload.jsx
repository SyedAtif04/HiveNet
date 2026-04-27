import { useState, useRef } from 'react';
import { Card, CardHeader } from '@/components.jsx';
import { Icons } from '@/icons.jsx';
import { uploadFile, runForecast } from '../api.js';

const DURATION_OPTIONS = [
  { value: '3_months',  label: '3 Months (90 days)'  },
  { value: '6_months',  label: '6 Months (180 days)' },
  { value: '12_months', label: '12 Months (365 days)' },
];

export default function Upload({ onNavigate }) {
  const [dragging,      setDragging]      = useState(false);
  const [file,          setFile]          = useState(null);
  const [status,        setStatus]        = useState('idle');   // idle | uploading | done | error
  const [uploadResult,  setUploadResult]  = useState(null);
  const [uploadError,   setUploadError]   = useState('');
  const [duration,      setDuration]      = useState('3_months');
  const [forecasting,   setForecasting]   = useState(false);
  const [forecastMsg,   setForecastMsg]   = useState('');
  const inputRef = useRef(null);

  const processFile = async (f) => {
    setFile(f);
    setStatus('uploading');
    setUploadError('');
    setUploadResult(null);
    setForecastMsg('');
    try {
      const result = await uploadFile(f);
      setUploadResult(result);
      setStatus('done');
    } catch (e) {
      setUploadError(e.message);
      setStatus('error');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  };

  const handleRunForecast = async () => {
    if (!uploadResult?.path) return;
    setForecasting(true);
    setForecastMsg('');
    try {
      await runForecast(uploadResult.path, duration);
      setForecastMsg('success');
    } catch (e) {
      setForecastMsg(`error:${e.message}`);
    } finally {
      setForecasting(false);
    }
  };

  const isSuccess = forecastMsg === 'success';
  const forecastError = forecastMsg.startsWith('error:') ? forecastMsg.slice(6) : '';

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 space-y-4">
          <Card
            className={`p-8 border-2 border-dashed transition-all duration-200 cursor-pointer ${dragging ? 'drag-over' : 'border-fb-border hover:border-fb-accent/40'}`}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current.click()}>
            <input
              ref={inputRef} type="file" accept=".csv" className="hidden"
              onChange={e => { const f = e.target.files[0]; if (f) processFile(f); }} />
            <div className="flex flex-col items-center gap-3 text-center">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${dragging ? 'bg-fb-accent text-fb-sidebar' : 'bg-fb-card2 text-fb-muted border border-fb-border'}`}>
                <Icons.Upload size={28} />
              </div>
              <div>
                <p className="text-sm font-semibold text-fb-text">{dragging ? 'Drop it here!' : 'Drag & drop CSV dataset'}</p>
                <p className="text-xs text-fb-muted mt-1">Supports CSV only — up to 100 MB</p>
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
                {status === 'done'      && <div className="flex items-center gap-1.5 text-fb-green text-xs font-medium"><Icons.Check size={14} /> Uploaded</div>}
                {status === 'uploading' && <div className="text-xs text-fb-accent animate-pulse">Uploading…</div>}
                {status === 'error'     && <div className="text-xs text-fb-red">Upload failed</div>}
              </div>

              {status === 'uploading' && (
                <div className="w-full bg-fb-card2 rounded-full h-1.5 overflow-hidden">
                  <div className="h-full bg-fb-accent rounded-full animate-pulse" style={{ width: '60%' }}></div>
                </div>
              )}

              {status === 'error' && (
                <p className="text-xs text-fb-red">{uploadError}</p>
              )}

              {status === 'done' && uploadResult && (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    ['Status',   'Uploaded ✓', 'text-fb-green'],
                    ['Filename', uploadResult.filename, 'text-fb-accent'],
                    ['Size',     `${(uploadResult.size_bytes / 1024).toFixed(1)} KB`, 'text-fb-blue'],
                  ].map(([l, v, c]) => (
                    <div key={l} className="bg-fb-card2 rounded-lg p-3 border border-fb-border text-center">
                      <div className="text-[10px] text-fb-muted mb-1">{l}</div>
                      <div className={`text-sm font-bold font-mono truncate ${c}`}>{v}</div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {status === 'done' && uploadResult && (
            <Card className="p-5">
              <CardHeader title="Run Forecast" subtitle="Train model and generate demand predictions" />
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-semibold text-fb-muted uppercase tracking-wider block mb-2">Forecast Duration</label>
                  <div className="flex gap-2">
                    {DURATION_OPTIONS.map(opt => (
                      <button key={opt.value} onClick={() => setDuration(opt.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${duration === opt.value ? 'bg-fb-accent text-fb-sidebar font-semibold' : 'bg-fb-card2 border border-fb-border text-fb-muted hover:border-fb-accent/50'}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {isSuccess && (
                  <div className="px-4 py-3 rounded-xl text-xs border bg-fb-green-dim border-fb-green/20 text-fb-green">
                    ✓ Forecast complete — <button onClick={() => onNavigate?.('forecasts')} className="underline font-semibold">View results</button>
                  </div>
                )}
                {forecastError && (
                  <div className="px-4 py-3 rounded-xl text-xs border bg-fb-red-dim border-fb-red/20 text-fb-red">
                    Error: {forecastError}
                  </div>
                )}

                <button onClick={handleRunForecast} disabled={forecasting}
                  className="w-full py-2.5 rounded-lg btn-primary text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                  <Icons.Zap size={13} />
                  {forecasting ? 'Running ML pipeline… (this may take a few minutes)' : 'Run Forecast'}
                </button>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <CardHeader title="Upload Requirements" subtitle="CSV format guide" />
            <div className="space-y-3 mt-2">
              {[
                ['date',     'Date column (YYYY-MM-DD)'],
                ['quantity', 'Demand / usage quantity'],
                ['material', 'Item / material name (optional)'],
                ['region',   'Region or warehouse (optional)'],
              ].map(([field, desc]) => (
                <div key={field}>
                  <label className="text-[10px] font-semibold text-fb-muted uppercase tracking-wider block mb-1">{field}</label>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-mono bg-fb-card2 border-fb-border text-fb-muted">
                    {desc}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <CardHeader title="After Upload" />
            <div className="space-y-3 text-xs text-fb-muted">
              <p>1. Select forecast duration above</p>
              <p>2. Click <span className="text-fb-accent font-medium">Run Forecast</span></p>
              <p>3. View results on the <button onClick={() => onNavigate?.('forecasts')} className="text-fb-accent hover:underline font-medium">Forecasts page</button></p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
