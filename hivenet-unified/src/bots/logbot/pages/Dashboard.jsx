import { useState, useEffect } from 'react';
import {
  fetchSKUs, fetchStock, fetchSuppliers, fetchAlerts, fetchDecisions,
  buildInventoryRows, buildCategories, buildSummary, alertLevel, timeAgo,
} from '../api.js';
import { Card, CardHeader, StatCard, ActionCard, AlertRow, fmtNum } from '@/components.jsx';
import { Icons } from '@/icons.jsx';
import { DonutChart } from '@/charts.jsx';

const ACTION_CFG = {
  critical: { text: 'text-fb-red',    bg: 'bg-fb-red-dim',    border: 'border-fb-red/20'    },
  high:     { text: 'text-orange-400', bg: 'bg-orange-950/40', border: 'border-orange-500/20' },
  medium:   { text: 'text-fb-accent', bg: 'bg-fb-accent-dim', border: 'border-fb-accent/20' },
  low:      { text: 'text-fb-green',  bg: 'bg-fb-green-dim',  border: 'border-fb-green/20'  },
};

export default function Dashboard({ onNavigate }) {
  const [summary,    setSummary]    = useState(null);
  const [categories, setCategories] = useState([]);
  const [alerts,     setAlerts]     = useState([]);
  const [decisions,  setDecisions]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchSKUs(), fetchStock(), fetchSuppliers(), fetchAlerts(), fetchDecisions()])
      .then(([skus, stock, suppliers, alts, decs]) => {
        setSummary(buildSummary(stock, suppliers, alts));
        setCategories(buildCategories(stock, skus));
        setAlerts(alts.slice(0, 5));
        setDecisions(decs.slice(0, 5));
        setError(null);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20 text-fb-muted text-sm">Loading…</div>;
  if (error)   return <div className="flex items-center justify-center py-20 text-fb-red text-sm">Error: {error}</div>;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4">
        <ActionCard label="Inventory"    sub="View all SKUs"        icon={<Icons.Inventory size={18} />}   onClick={() => onNavigate('inventory')} />
        <ActionCard label="Alerts"       sub={`${summary.activeAlerts} active`} icon={<Icons.Alerts size={18} />} onClick={() => onNavigate('alerts')} />
        <ActionCard label="Forecasts"    sub="Demand predictions"   icon={<Icons.Forecasts size={18} />}   onClick={() => onNavigate('forecasts')} />
        <ActionCard label="AI Assistant" sub="Ask LogBot"           icon={<Icons.AIAssistant size={18} />} onClick={() => onNavigate('ai')} />
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total SKUs"      color="accent" value={fmtNum(summary.totalSKUs)}           sub="In inventory"       icon={<Icons.Inventory size={16} />} />
        <StatCard label="Critical Stock"  color="red"    value={summary.criticalCount}                sub="Need reorder"       icon={<Icons.Alerts size={16} />}    />
        <StatCard label="Inventory Value" color="blue"   value={`₹${(summary.inventoryValue/1000).toFixed(1)}K`} sub="All items"  icon={<Icons.Analytics size={16} />} />
        <StatCard label="Suppliers"       color="green"  value={summary.supplierCount}                sub={`Avg ${summary.avgLeadTime}d lead`} icon={<Icons.TrendUp size={16} />} />
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 space-y-3">
          <Card className="p-5">
            <CardHeader title="Reorder Decisions" subtitle="Current inventory status"
              action={<button onClick={() => onNavigate('inventory')} className="text-xs text-fb-accent hover:underline">View all</button>}
            />
            {decisions.length === 0
              ? <p className="text-xs text-fb-muted text-center py-6">No reorder decisions — inventory looks healthy.</p>
              : (
                <div className="space-y-2">
                  {decisions.map(d => {
                    const c = ACTION_CFG[d.priority] || ACTION_CFG.low;
                    return (
                      <div key={d.sku_id} className={`flex items-center gap-3 p-3 rounded-lg border ${c.bg} ${c.border}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-fb-text">{d.sku_name}</span>
                          </div>
                          <p className="text-[10px] text-fb-muted mt-0.5">{d.rationale}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className={`text-xs font-bold font-mono ${c.text}`}>{d.action.replace(/_/g, ' ')}</div>
                          {d.recommended_order_qty > 0 && <div className="text-[10px] text-fb-muted">Order {Math.round(d.recommended_order_qty)} units</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            }
          </Card>

          <Card className="p-5">
            <CardHeader title="Inventory by Category" subtitle="Value distribution" />
            {categories.length > 0
              ? <DonutChart data={categories} height={200} />
              : <div className="flex items-center justify-center h-52 text-fb-muted text-xs">No category data yet — add SKUs with categories</div>}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <CardHeader title="Active Alerts" />
            {alerts.length === 0
              ? <p className="text-xs text-fb-muted text-center py-6">No active alerts.</p>
              : (
                <div className="space-y-2">
                  {alerts.map(a => (
                    <AlertRow key={a.id} level={alertLevel(a.severity)} message={a.message} time={timeAgo(a.triggered_at)} />
                  ))}
                </div>
              )
            }
            <button onClick={() => onNavigate('alerts')} className="mt-3 w-full text-xs text-fb-accent hover:underline text-center">View all alerts →</button>
          </Card>

          <Card className="p-5">
            <CardHeader title="Supply Chain Stats" />
            <div className="space-y-3">
              {[
                ['Total SKUs',     fmtNum(summary.totalSKUs),      'text-fb-accent'],
                ['Critical Items', summary.criticalCount,            'text-fb-red'   ],
                ['Low Stock',      summary.lowStockCount,            'text-fb-accent'],
                ['Suppliers',      summary.supplierCount,            'text-fb-muted' ],
                ['Avg Lead Time',  `${summary.avgLeadTime}d`,       'text-fb-muted' ],
              ].map(([l, v, c]) => (
                <div key={l} className="flex items-center justify-between py-2 border-b border-fb-border/50 last:border-0">
                  <span className="text-xs text-fb-muted">{l}</span>
                  <span className={`text-xs font-bold font-mono ${c}`}>{v}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
