import { useState } from 'react';
import { MOCK_SUMMARY, MOCK_MONTHLY, MOCK_CATEGORIES, MOCK_SUPPLIERS } from '../data.js';
import { Card, CardHeader, StatCard, fmt } from '../components.jsx';
import { Icons } from '../icons.jsx';
import { DualLineChart, BarChart, DonutChart } from '../charts.jsx';

export default function Analytics() {
  const [startDate, setStart] = useState('2025-11-01');
  const [endDate,   setEnd]   = useState('2026-04-30');

  const categoryBarData = MOCK_CATEGORIES.map(c => ({
    name: c.name.split(' ')[0],
    amount: c.amount,
    color: c.color,
  }));

  return (
    <div className="space-y-5 fade-in">
      <Card className="p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-fb-muted">
            <Icons.Calendar size={16} />
            <span className="text-xs font-medium text-fb-muted">Date Range</span>
          </div>
          <div className="flex items-center gap-2">
            <input type="date" value={startDate} onChange={e => setStart(e.target.value)}
              className="bg-fb-card2 border border-fb-border rounded-lg text-sm text-fb-text focus:border-fb-accent/60 transition-colors outline-none"
              style={{ width: 150, padding: '6px 10px', fontSize: 12 }} />
            <span className="text-fb-dim text-xs">to</span>
            <input type="date" value={endDate} onChange={e => setEnd(e.target.value)}
              className="bg-fb-card2 border border-fb-border rounded-lg text-sm text-fb-text focus:border-fb-accent/60 transition-colors outline-none"
              style={{ width: 150, padding: '6px 10px', fontSize: 12 }} />
          </div>
          <div className="flex gap-1 ml-auto">
            {['1M','3M','6M','YTD','All'].map(t => (
              <button key={t} className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium btn-ghost">{t}</button>
            ))}
          </div>
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg btn-primary text-xs">
            <Icons.Refresh size={13} /> Apply
          </button>
        </div>
      </Card>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total SKUs',       value: MOCK_SUMMARY.totalSKUs,                  color: 'accent', trend: '+4.2% vs last period', up: true  },
          { label: 'Inventory Value',  value: fmt(MOCK_SUMMARY.inventoryValue),         color: 'green',  trend: '+9.8% vs last period', up: true  },
          { label: 'Fulfillment Rate', value: `${MOCK_SUMMARY.fulfillmentRate}%`,       color: 'blue',   trend: '+0.4% vs last period', up: true  },
          { label: 'Active Suppliers', value: MOCK_SUMMARY.supplierCount,              color: 'accent', trend: 'Stable',               up: true  },
        ].map(s => (
          <StatCard key={s.label} label={s.label} value={s.value} color={s.color} trend={s.trend} trendUp={s.up} />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-5">
        <Card className="p-5">
          <CardHeader title="Monthly Demand vs Fulfilled" subtitle="Units ordered vs units delivered" />
          <DualLineChart
            data={MOCK_MONTHLY}
            label1="Demand" label2="Fulfilled"
            key1="demand" key2="fulfilled"
            color1="#f5c518" color2="#3ecf8e"
            height={220}
          />
        </Card>
        <Card className="p-5">
          <CardHeader title="Inventory by Category" subtitle="Value distribution (USD)" />
          <DonutChart data={MOCK_CATEGORIES} height={220} />
        </Card>
      </div>

      <Card className="p-5">
        <CardHeader title="Stock Level Trend" subtitle="Aggregate stock level vs demand over 6 months"
          action={<span className="text-xs font-mono text-fb-accent font-bold">{MOCK_SUMMARY.monthlyDemand} units / month</span>} />
        <DualLineChart
          data={MOCK_MONTHLY}
          label1="Stock Level" label2="Demand"
          key1="stockLevel" key2="demand"
          color1="#4c9eff" color2="#f5c518"
          height={200}
        />
      </Card>

      <div className="grid grid-cols-2 gap-5">
        <Card className="p-5">
          <CardHeader title="Inventory Value by Category" subtitle="USD value per category" />
          <BarChart data={categoryBarData} height={200} />
        </Card>

        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-fb-border">
            <h3 className="text-sm font-semibold text-fb-text">Supplier Performance</h3>
            <p className="text-xs text-fb-muted mt-0.5">Lead time and reliability overview</p>
          </div>
          <table className="w-full">
            <thead className="bg-fb-card2/50">
              <tr>
                {['Supplier', 'SKUs', 'Lead Time', 'Reliability', 'Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-fb-muted uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_SUPPLIERS.map((s, i) => (
                <tr key={s.id} className="border-t border-fb-border/50 hover:bg-fb-card2/20">
                  <td className="px-4 py-3 text-xs font-medium text-fb-text">{s.name}</td>
                  <td className="px-4 py-3 text-xs font-mono text-fb-muted">{s.skuCount}</td>
                  <td className="px-4 py-3 text-xs font-mono text-fb-muted">{s.leadTime}d</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-fb-card2 rounded-full h-1.5 w-20">
                        <div className="h-full rounded-full" style={{ width: `${s.reliability}%`, background: s.reliability >= 95 ? '#3ecf8e' : s.reliability >= 90 ? '#f5c518' : '#e05555' }}></div>
                      </div>
                      <span className="text-xs font-mono text-fb-muted">{s.reliability}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border ${s.status === 'Active' ? 'bg-fb-green-dim text-fb-green border-fb-green/20' : 'bg-fb-red-dim text-fb-red border-fb-red/20'}`}>
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="px-5 py-3 border-b border-fb-border">
          <h3 className="text-sm font-semibold text-fb-text">Category Summary</h3>
        </div>
        <table className="w-full">
          <thead className="bg-fb-card2/50">
            <tr>
              {['Category', 'Value', 'Share', 'MoM Trend'].map(h => (
                <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold text-fb-muted uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MOCK_CATEGORIES.map((c, i) => (
              <tr key={c.name} className="border-t border-fb-border/50 hover:bg-fb-card2/20">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: c.color }}></div>
                    <span className="text-sm text-fb-text">{c.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-sm font-bold font-mono text-fb-accent">{fmt(c.amount)}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-fb-card2 rounded-full h-1.5 w-24">
                      <div className="h-full rounded-full" style={{ width: `${c.pct}%`, background: c.color }}></div>
                    </div>
                    <span className="text-xs text-fb-muted">{c.pct}%</span>
                  </div>
                </td>
                <td className={`px-5 py-3 text-xs ${i < 3 ? 'text-fb-green' : 'text-fb-muted'}`}>
                  {i < 3 ? `+${(i * 1.8 + 2.1).toFixed(1)}%` : '–'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
