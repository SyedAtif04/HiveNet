import { useState } from 'react';
import { MOCK_ALERTS } from '../data.js';
import { Card, CardHeader, StatCard, AlertRow, PriorityBadge, Modal, fmtNum } from '../components.jsx';
import { Icons } from '../icons.jsx';

const ALERT_CFG = {
  error:   { label: 'Error',   color: 'red',   dot: '#e05555' },
  warning: { label: 'Warning', color: 'accent', dot: '#f5c518' },
  info:    { label: 'Info',    color: 'blue',  dot: '#4c9eff' },
};

export default function Alerts() {
  const [filter, setFilter]       = useState('All');
  const [showResolved, setShowResolved] = useState(false);
  const [selectedAlert, setSelected]    = useState(null);

  const filtered = MOCK_ALERTS
    .filter(a => filter === 'All' || a.level === filter)
    .filter(a => showResolved || !a.resolved);

  const errorCount   = MOCK_ALERTS.filter(a => a.level === 'error' && !a.resolved).length;
  const warningCount = MOCK_ALERTS.filter(a => a.level === 'warning' && !a.resolved).length;
  const infoCount    = MOCK_ALERTS.filter(a => a.level === 'info' && !a.resolved).length;
  const resolvedCount = MOCK_ALERTS.filter(a => a.resolved).length;

  const handleResolve = (id) => {
    // In production, this would call an API
    console.log('Resolve alert:', id);
  };

  return (
    <div className="space-y-5 fade-in">
      <div className="grid grid-cols-4 gap-4">
        <StatCard 
          label="Total Alerts" 
          value={MOCK_ALERTS.length} 
          color="accent" 
          sub="All time" 
          icon={<Icons.Alert size={16} />} 
        />
        <StatCard 
          label="Critical" 
          value={errorCount} 
          color="red" 
          sub="Requires immediate action" 
          trend={errorCount > 0 ? `${errorCount} unresolved` : 'All clear'} 
          trendUp={errorCount === 0}
          icon={<Icons.Zap size={16} />} 
        />
        <StatCard 
          label="Warnings" 
          value={warningCount} 
          color="accent" 
          sub="Monitor closely" 
          icon={<Icons.Alert size={16} />} 
        />
        <StatCard 
          label="Resolved" 
          value={resolvedCount} 
          color="green" 
          sub="This period" 
          icon={<Icons.Check size={16} />} 
        />
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-fb-border flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {['All', 'error', 'warning', 'info'].map(level => (
                <button
                  key={level}
                  onClick={() => setFilter(level)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                    ${filter === level 
                      ? level === 'error' 
                        ? 'bg-fb-red text-white' 
                        : level === 'warning' 
                          ? 'bg-fb-accent text-fb-sidebar' 
                          : level === 'info' 
                            ? 'bg-fb-blue text-white' 
                            : 'bg-fb-accent text-fb-sidebar'
                      : 'bg-fb-card2 text-fb-muted border border-fb-border hover:border-fb-accent/50'
                    }`}
                >
                  {level === 'All' ? 'All' : level.charAt(0).toUpperCase() + level.slice(1)}
                  {level !== 'All' && (
                    <span className="ml-1.5 opacity-70">
                      {level === 'error' ? errorCount : level === 'warning' ? warningCount : infoCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-fb-muted cursor-pointer">
              <input
                type="checkbox"
                checked={showResolved}
                onChange={(e) => setShowResolved(e.target.checked)}
                className="rounded border-fb-border bg-fb-card2"
              />
              Show resolved
            </label>
          </div>
        </div>

        <div className="divide-y divide-fb-border/50">
          {filtered.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-xl bg-fb-card2 border border-fb-border flex items-center justify-center mx-auto mb-3 text-fb-muted">
                <Icons.Check size={20} />
              </div>
              <p className="text-sm text-fb-muted">No alerts to display</p>
            </div>
          ) : (
            filtered.map(alert => {
              const cfg = ALERT_CFG[alert.level] || ALERT_CFG.info;
              return (
                <div
                  key={alert.id}
                  onClick={() => setSelected(alert)}
                  className="p-4 hover:bg-fb-card2/30 cursor-pointer transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                      ${alert.level === 'error' ? 'bg-fb-red-dim text-fb-red' : 
                        alert.level === 'warning' ? 'bg-fb-accent-dim text-fb-accent' : 
                        'bg-fb-blue-dim text-fb-blue'}`}>
                      {alert.level === 'error' ? <Icons.Zap size={14} /> : 
                       alert.level === 'warning' ? <Icons.Alert size={14} /> : 
                       <Icons.Info size={14} />}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {alert.sku && (
                          <span className="text-xs font-mono font-semibold text-fb-accent">{alert.sku}</span>
                        )}
                        {alert.product && (
                          <span className="text-xs text-fb-text">{alert.product}</span>
                        )}
                        <PriorityBadge level={alert.level === 'error' ? 'critical' : alert.level === 'warning' ? 'medium' : 'low'} />
                        {alert.resolved && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-fb-green-dim text-fb-green border border-fb-green/20">
                            Resolved
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-fb-muted leading-relaxed">{alert.message}</p>
                      <p className="text-[10px] text-fb-dim mt-1.5">{alert.time}</p>
                    </div>

                    {!alert.resolved && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleResolve(alert.id); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-fb-card2 border border-fb-border text-xs text-fb-muted hover:border-fb-green/50 hover:text-fb-green transition-colors"
                      >
                        <Icons.Check size={12} />
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="px-4 py-3 border-t border-fb-border flex items-center justify-between">
          <span className="text-xs text-fb-muted">
            Showing {filtered.length} of {MOCK_ALERTS.length} alerts
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-fb-dim">Auto-refresh:</span>
            <span className="text-[10px] text-fb-green flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-fb-green animate-pulse"></div>
              Active
            </span>
          </div>
        </div>
      </Card>

      {/* Alert Detail Modal */}
      <Modal open={!!selectedAlert} onClose={() => setSelected(null)} title="Alert Details">
        {selectedAlert && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center
                ${selectedAlert.level === 'error' ? 'bg-fb-red-dim text-fb-red' : 
                  selectedAlert.level === 'warning' ? 'bg-fb-accent-dim text-fb-accent' : 
                  'bg-fb-blue-dim text-fb-blue'}`}>
                {selectedAlert.level === 'error' ? <Icons.Zap size={18} /> : 
                 selectedAlert.level === 'warning' ? <Icons.Alert size={18} /> : 
                 <Icons.Info size={18} />}
              </div>
              <div>
                <div className="text-sm font-semibold text-fb-text">
                  {ALERT_CFG[selectedAlert.level]?.label || 'Alert'} Notification
                </div>
                <div className="text-xs text-fb-muted">{selectedAlert.time}</div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-fb-card2 border border-fb-border">
              {selectedAlert.sku && (
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-fb-border">
                  <span className="text-xs text-fb-muted">SKU</span>
                  <span className="text-xs font-mono font-semibold text-fb-accent">{selectedAlert.sku}</span>
                </div>
              )}
              {selectedAlert.product && (
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-fb-border">
                  <span className="text-xs text-fb-muted">Product</span>
                  <span className="text-xs text-fb-text">{selectedAlert.product}</span>
                </div>
              )}
              <div>
                <span className="text-xs text-fb-muted block mb-1">Message</span>
                <p className="text-sm text-fb-text">{selectedAlert.message}</p>
              </div>
            </div>

            <div className="flex gap-3">
              {!selectedAlert.resolved && (
                <button
                  onClick={() => { handleResolve(selectedAlert.id); setSelected(null); }}
                  className="flex-1 py-2.5 rounded-lg btn-primary text-sm flex items-center justify-center gap-2"
                >
                  <Icons.Check size={14} /> Mark as Resolved
                </button>
              )}
              <button
                onClick={() => setSelected(null)}
                className="flex-1 py-2.5 rounded-lg btn-ghost text-sm"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}