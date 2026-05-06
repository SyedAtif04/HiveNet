import { useState, useEffect, useRef } from 'react';
import { fetchAlerts, runAlertCheck, resolveAlert, resolveAlertWithRestock, fetchDecisions, alertLevel, timeAgo } from '../api.js';
import { Card, CardHeader, AlertRow, PriorityBadge } from '@/components.jsx';
import { Icons } from '@/icons.jsx';

const LEVEL_FILTERS = ['All', 'error', 'warning', 'info'];

export default function Alerts() {
  const [alerts,        setAlerts]        = useState([]);
  const [decisions,     setDecisions]     = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [checking,      setChecking]      = useState(false);
  const [error,         setError]         = useState(null);
  const [filter,        setFilter]        = useState('All');
  const [checkMsg,      setCheckMsg]      = useState(null);
  const [resolveDialog, setResolveDialog] = useState(null); // alert object or null
  const [restockQty,    setRestockQty]    = useState('');
  const [resolving,     setResolving]     = useState(false);
  const qtyInputRef = useRef(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([fetchAlerts(), fetchDecisions()])
      .then(([alts, decs]) => { setAlerts(alts); setDecisions(decs); setError(null); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleCheck = async () => {
    setChecking(true); setCheckMsg(null);
    try {
      const result = await runAlertCheck();
      setCheckMsg(`✓ Checked ${result.checked} items — ${result.alerts_created} new alert(s) created.`);
      loadData();
    } catch (e) {
      setCheckMsg(`Error: ${e.message}`);
    } finally {
      setChecking(false);
    }
  };

  const openResolveDialog = (alert) => {
    setResolveDialog(alert);
    setRestockQty('');
    setTimeout(() => qtyInputRef.current?.focus(), 50);
  };

  const closeResolveDialog = () => {
    setResolveDialog(null);
    setRestockQty('');
  };

  const handleResolveWithRestock = async () => {
    const qty = parseFloat(restockQty);
    if (isNaN(qty) || qty < 0) return;
    setResolving(true);
    try {
      await resolveAlertWithRestock(resolveDialog.id, qty);
      setAlerts(prev => prev.filter(a => a.id !== resolveDialog.id));
      closeResolveDialog();
    } catch (e) {
      console.error('Resolve failed:', e.message);
    } finally {
      setResolving(false);
    }
  };

  const filtered = alerts.filter(a => filter === 'All' || alertLevel(a.severity) === filter);

  const counts = {
    error:   alerts.filter(a => a.severity === 'critical').length,
    warning: alerts.filter(a => a.severity === 'high').length,
    info:    alerts.filter(a => a.severity === 'medium').length,
  };

  if (loading) return <div className="flex items-center justify-center py-20 text-fb-muted text-sm">Loading…</div>;
  if (error)   return <div className="flex items-center justify-center py-20 text-fb-red text-sm">Error: {error}</div>;

  return (
    <div className="space-y-5">
      {resolveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={closeResolveDialog}>
          <div className="card-glass border border-fb-border rounded-2xl p-6 w-80 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-fb-text mb-1">Resolve Alert</h3>
            <p className="text-xs text-fb-muted mb-4 leading-relaxed">{resolveDialog.message}</p>

            <label className="block text-xs text-fb-muted mb-1.5">New quantity after restock</label>
            <input
              ref={qtyInputRef}
              type="number"
              min="0"
              step="1"
              value={restockQty}
              onChange={e => setRestockQty(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleResolveWithRestock(); if (e.key === 'Escape') closeResolveDialog(); }}
              placeholder="Enter quantity…"
              className="w-full bg-fb-card2 border border-fb-border rounded-lg px-3 py-2 text-sm text-fb-text placeholder-fb-muted focus:outline-none focus:border-fb-accent/60 mb-4"
            />

            <div className="flex gap-2">
              <button onClick={closeResolveDialog}
                className="flex-1 px-3 py-2 rounded-lg text-xs font-medium border border-fb-border bg-fb-card2 text-fb-muted hover:border-fb-accent/40 transition-colors">
                Cancel
              </button>
              <button onClick={handleResolveWithRestock} disabled={resolving || restockQty === '' || isNaN(parseFloat(restockQty))}
                className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold btn-primary disabled:opacity-40 transition-colors">
                {resolving ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {[
          ['Critical / Error', counts.error,   'text-fb-red',    'bg-fb-red-dim',    'border-fb-red/20'   ],
          ['Warnings',         counts.warning,  'text-fb-accent', 'bg-fb-accent-dim', 'border-fb-accent/20'],
          ['Info',             counts.info,     'text-fb-blue',   'bg-fb-blue-dim',   'border-fb-blue/20'  ],
        ].map(([label, count, text, bg, border]) => (
          <div key={label} className={`card-glass rounded-xl border ${border} ${bg} p-4 flex items-center gap-3`}>
            <div className={`text-3xl font-bold font-mono ${text}`}>{count}</div>
            <div className="text-xs text-fb-muted">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            {LEVEL_FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${filter === f ? 'bg-fb-accent text-fb-sidebar font-semibold' : 'bg-fb-card2 border border-fb-border text-fb-muted hover:border-fb-accent/50'}`}>
                {f}
              </button>
            ))}
            <button onClick={handleCheck} disabled={checking}
              className="ml-auto px-4 py-1.5 rounded-lg btn-primary text-xs flex items-center gap-1.5 disabled:opacity-50">
              <Icons.Zap size={13} />
              {checking ? 'Checking…' : 'Run Threshold Check'}
            </button>
          </div>

          {checkMsg && (
            <div className={`px-4 py-3 rounded-xl text-xs border ${checkMsg.startsWith('Error') ? 'bg-fb-red-dim border-fb-red/20 text-fb-red' : 'bg-fb-green-dim border-fb-green/20 text-fb-green'}`}>
              {checkMsg}
            </div>
          )}

          <Card className="p-5">
            <CardHeader title="Active Alerts" action={<span className="text-xs text-fb-muted">{filtered.length} shown</span>} />
            {filtered.length === 0
              ? <div className="text-center py-8 text-fb-muted text-sm">No alerts{filter !== 'All' ? ` of type "${filter}"` : ''}. Run a threshold check to scan inventory.</div>
              : (
                <div className="space-y-2">
                  {filtered.map(a => (
                    <div key={a.id} className="flex items-start gap-2">
                      <div className="flex-1">
                        <AlertRow level={alertLevel(a.severity)} message={a.message} time={timeAgo(a.triggered_at)} />
                      </div>
                      <button onClick={() => openResolveDialog(a)}
                        className="mt-1 flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium border bg-fb-card2 border-fb-border text-fb-muted hover:border-fb-accent/50 hover:text-fb-accent transition-colors">
                        Resolve
                      </button>
                    </div>
                  ))}
                </div>
              )
            }
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <CardHeader title="Summary" />
            <div className="space-y-3">
              {[
                ['Total Active',  alerts.length,  'text-fb-text'  ],
                ['Critical',      counts.error,    'text-fb-red'   ],
                ['Warnings',      counts.warning,  'text-fb-accent'],
                ['Info',          counts.info,     'text-fb-blue'  ],
              ].map(([l, v, c]) => (
                <div key={l} className="flex items-center justify-between py-2 border-b border-fb-border/50 last:border-0">
                  <span className="text-xs text-fb-muted">{l}</span>
                  <span className={`text-xs font-bold font-mono ${c}`}>{v}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <CardHeader title="Reorder Queue" subtitle="Pending decisions" />
            {decisions.filter(d => d.action !== 'NO_ACTION').length === 0
              ? <p className="text-xs text-fb-muted text-center py-4">No reorder actions needed.</p>
              : (
                <div className="space-y-2">
                  {decisions.filter(d => d.action !== 'NO_ACTION').slice(0, 6).map(d => (
                    <div key={d.sku_id} className="flex items-center justify-between gap-2 py-2 border-b border-fb-border/50 last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-fb-text truncate">{d.sku_name}</p>
                        <p className="text-[10px] text-fb-muted">Qty: {Math.round(d.current_qty)} · ROP: {Math.round(d.reorder_point)}</p>
                      </div>
                      <PriorityBadge level={d.priority} />
                    </div>
                  ))}
                </div>
              )
            }
          </Card>

          <Card className="p-5">
            <CardHeader title="Quick Actions" />
            <div className="space-y-2">
              {[['Run Checks', 'Re-scan all thresholds', handleCheck], ['Refresh Alerts', 'Reload alert list', loadData]].map(([label, sub, fn]) => (
                <button key={label} onClick={fn} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-fb-card2 border border-fb-border hover:border-fb-accent/40 text-left transition-colors">
                  <span className="text-xs font-medium text-fb-text">{label}</span>
                  <span className="text-[10px] text-fb-muted ml-auto">{sub}</span>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
