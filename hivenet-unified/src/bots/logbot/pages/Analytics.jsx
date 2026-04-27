import { useState, useEffect } from 'react';
import { fetchSKUs, fetchStock, fetchSuppliers, buildCategories, buildSummary } from '../api.js';
import { Card, CardHeader, StatCard, fmtNum } from '@/components.jsx';
import { Icons } from '@/icons.jsx';
import { DonutChart } from '@/charts.jsx';

export default function Analytics() {
  const [summary,    setSummary]    = useState(null);
  const [categories, setCategories] = useState([]);
  const [suppliers,  setSuppliers]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchSKUs(), fetchStock(), fetchSuppliers()])
      .then(([skus, stock, sups]) => {
        setSummary(buildSummary(stock, sups, []));
        setCategories(buildCategories(stock, skus));
        setSuppliers(sups);
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
        <StatCard label="Total SKUs"      color="accent" value={fmtNum(summary.totalSKUs)}          sub="In database"     icon={<Icons.Inventory size={16} />} />
        <StatCard label="Inventory Value" color="blue"   value={`₹${(summary.inventoryValue/1000).toFixed(1)}K`} sub="Stock × price" icon={<Icons.Analytics size={16} />} />
        <StatCard label="Critical Items"  color="red"    value={summary.criticalCount}               sub="Need action"     icon={<Icons.Alerts size={16} />}    />
        <StatCard label="Suppliers"       color="green"  value={summary.supplierCount}               sub={`~${summary.avgLeadTime}d avg lead`} icon={<Icons.TrendUp size={16} />} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-5">
          <CardHeader title="Inventory Value by Category" subtitle="Stock × unit price distribution" />
          {categories.length > 0
            ? <DonutChart data={categories} height={250} />
            : <div className="flex items-center justify-center h-64 text-fb-muted text-xs">No category data — assign categories to SKUs</div>}
        </Card>

        <Card className="p-5">
          <CardHeader title="Category Breakdown" subtitle="Value per category" />
          {categories.length > 0
            ? (
              <div className="space-y-3 mt-2">
                {categories.map(cat => (
                  <div key={cat.name} className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }}></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-fb-text truncate">{cat.name}</span>
                        <span className="text-xs font-bold font-mono text-fb-accent ml-2">₹{cat.amount.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-fb-card2 rounded-full h-1.5">
                        <div className="h-full rounded-full transition-all" style={{ width: `${cat.pct}%`, backgroundColor: cat.color }}></div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-fb-muted w-8 text-right flex-shrink-0">{cat.pct}%</span>
                  </div>
                ))}
              </div>
            )
            : <div className="flex items-center justify-center h-64 text-fb-muted text-xs">No data</div>}
        </Card>
      </div>

      {suppliers.length > 0 && (
        <Card className="p-5">
          <CardHeader title="Supplier Overview" subtitle="Registered suppliers" />
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-fb-card2/50">
                <tr>
                  {['Supplier', 'Lead Time', 'Min Order', 'Unit Cost', 'Reliability', 'Contact'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-fb-muted uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s, i) => (
                  <tr key={s.id} className={`border-t border-fb-border/50 hover:bg-fb-card2/30 transition-colors ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
                    <td className="px-4 py-3 text-xs font-medium text-fb-text">{s.name}</td>
                    <td className="px-4 py-3 text-xs font-mono text-fb-muted">{s.lead_time_days}d</td>
                    <td className="px-4 py-3 text-xs font-mono text-fb-muted">{s.min_order_qty} units</td>
                    <td className="px-4 py-3 text-xs font-bold font-mono text-fb-accent">₹{s.unit_cost?.toLocaleString() ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-fb-card2 rounded-full h-1.5">
                          <div className="h-full bg-fb-accent rounded-full" style={{ width: `${(s.reliability_score || 0) * 100}%` }}></div>
                        </div>
                        <span className="text-xs font-mono text-fb-accent">{((s.reliability_score || 0) * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-fb-muted truncate max-w-xs">{s.contact_info || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
