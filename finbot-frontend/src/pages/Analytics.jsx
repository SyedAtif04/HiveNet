import { useState } from 'react';
import { MOCK_SUMMARY, MOCK_MONTHLY, MOCK_CATEGORIES } from '../data.js';
import { Card, CardHeader, StatCard, fmt } from '../components.jsx';
import { Icons } from '../icons.jsx';
import { LineChart, BarChart, DonutChart } from '../charts.jsx';

export default function Analytics() {
  const [startDate, setStart] = useState('2026-01-01');
  const [endDate,   setEnd]   = useState('2026-06-30');

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
              className="bg-fb-card2 border border-fb-border rounded-lg px-3 text-sm text-fb-text focus:border-fb-accent/60 transition-colors outline-none"
              style={{ width: 150, padding: '6px 10px', fontSize: 12 }} />
            <span className="text-fb-dim text-xs">to</span>
            <input type="date" value={endDate} onChange={e => setEnd(e.target.value)}
              className="bg-fb-card2 border border-fb-border rounded-lg px-3 text-sm text-fb-text focus:border-fb-accent/60 transition-colors outline-none"
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
          { label: 'Total Income',  value: fmt(MOCK_SUMMARY.income),  color: 'green', trend: '+14.2%', up: true  },
          { label: 'Total Expense', value: fmt(MOCK_SUMMARY.expense), color: 'red',   trend: '+6.8%',  up: false },
          { label: 'Net Profit',    value: fmt(MOCK_SUMMARY.profit),  color: 'blue',  trend: '+21.5%', up: true  },
          { label: 'Transactions',  value: MOCK_SUMMARY.transactions, color: 'accent',trend: '+6.3%',  up: true  },
        ].map(s => (
          <StatCard key={s.label} label={s.label} value={s.value} color={s.color} trend={`${s.trend} vs prev`} trendUp={s.up} />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-5">
        <Card className="p-5">
          <CardHeader title="Monthly Breakdown" subtitle="Income vs Expense by month" />
          <BarChart data={MOCK_MONTHLY.flatMap(d => [
            { name: d.month + ' Inc', amount: d.income,  color: '#3ecf8e' },
            { name: d.month + ' Exp', amount: d.expense, color: '#e05555' },
          ])} height={220} />
        </Card>
        <Card className="p-5">
          <CardHeader title="Category Breakdown" subtitle="Expense distribution" />
          <DonutChart data={MOCK_CATEGORIES} height={220} />
        </Card>
      </div>

      <Card className="p-5">
        <CardHeader title="Profit Trend" subtitle="Net profit per month"
          action={<span className="text-xs font-mono text-fb-accent font-bold">{fmt(MOCK_SUMMARY.profit)} total</span>} />
        <LineChart data={MOCK_MONTHLY.map(d => ({ month: d.month, income: d.income - d.expense, expense: 0 }))} height={200} />
      </Card>

      <Card className="overflow-hidden">
        <div className="px-5 py-3 border-b border-fb-border">
          <h3 className="text-sm font-semibold text-fb-text">Category Summary</h3>
        </div>
        <table className="w-full">
          <thead className="bg-fb-card2/50">
            <tr>
              {['Category', 'Amount', 'Share', 'Trend'].map(h => (
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
                <td className="px-5 py-3 text-sm font-bold font-mono text-fb-red">{fmt(c.amount)}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-fb-card2 rounded-full h-1.5 w-24">
                      <div className="h-full rounded-full" style={{ width: `${c.pct}%`, background: c.color }}></div>
                    </div>
                    <span className="text-xs text-fb-muted">{c.pct}%</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-xs text-fb-red">+{(i * 2 + 3).toFixed(1)}% MoM</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
