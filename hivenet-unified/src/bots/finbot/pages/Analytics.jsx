import { useState, useEffect } from 'react';
import { fetchSummary, fetchMonthly, fetchCategories } from '../api.js';
import { Card, CardHeader, StatCard, fmt } from '@/components.jsx';
import { Icons } from '@/icons.jsx';
import { DonutChart, LineChart } from '@/charts.jsx';

const PRESETS = ['1M', '3M', '6M', 'YTD', 'All'];

const getDateRange = (preset) => {
  const today = new Date();
  const year = today.getFullYear();
  let start, end;

  end = today.toISOString().split('T')[0];

  switch(preset) {
    case '1M':
      start = new Date(today.setMonth(today.getMonth() - 1)).toISOString().split('T')[0];
      break;
    case '3M':
      start = new Date(today.setMonth(today.getMonth() - 3)).toISOString().split('T')[0];
      break;
    case '6M':
      start = new Date(today.setMonth(today.getMonth() - 6)).toISOString().split('T')[0];
      break;
    case 'YTD':
      start = `${year}-01-01`;
      break;
    case 'All':
      start = null;
      end = null;
      break;
    default:
      start = new Date(today.setMonth(today.getMonth() - 6)).toISOString().split('T')[0];
  }
  return { start, end };
};

export default function Analytics() {
  const [preset,     setPreset]     = useState('6M');
  const [start,      setStart]      = useState('2026-01-01');
  const [end,        setEnd]        = useState('2026-06-30');
  const [summary,    setSummary]    = useState(null);
  const [monthly,    setMonthly]    = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  const loadData = (startDate, endDate) => {
    setLoading(true);
    Promise.all([fetchSummary(startDate, endDate), fetchMonthly(startDate, endDate), fetchCategories(startDate, endDate)])
      .then(([s, m, c]) => { setSummary(s); setMonthly(m); setCategories(c); setError(null); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  const handlePresetClick = (p) => {
    setPreset(p);
    const { start: s, end: e } = getDateRange(p);
    if (s) setStart(s);
    if (e) setEnd(e);
  };

  const handleApply = () => {
    loadData(start, end);
  };

  useEffect(() => {
    loadData(start, end);
  }, []);

  const total = categories.reduce((s, c) => s + c.amount, 0) || 1;

  if (loading) return <div className="flex items-center justify-center py-20 text-fb-muted text-sm">Loading…</div>;
  if (error)   return <div className="flex items-center justify-center py-20 text-fb-red text-sm">Error: {error}</div>;

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Icons.Calendar size={14} className="text-fb-muted" />
            <input type="date" value={start} onChange={e => setStart(e.target.value)} className="bg-fb-card2 border border-fb-border rounded-lg px-3 py-1.5 text-xs text-fb-text focus:border-fb-accent/60 transition-colors outline-none" />
            <span className="text-fb-muted text-xs">to</span>
            <input type="date" value={end} onChange={e => setEnd(e.target.value)} className="bg-fb-card2 border border-fb-border rounded-lg px-3 py-1.5 text-xs text-fb-text focus:border-fb-accent/60 transition-colors outline-none" />
          </div>
          <div className="flex gap-1">
            {PRESETS.map(p => (
              <button key={p} onClick={() => handlePresetClick(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${preset === p ? 'bg-fb-accent text-fb-sidebar font-semibold' : 'bg-fb-card2 border border-fb-border text-fb-muted hover:border-fb-accent/50'}`}>
                {p}
              </button>
            ))}
          </div>
          <button onClick={handleApply} className="px-4 py-1.5 rounded-lg btn-primary text-xs">Apply</button>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Income"  color="green" value={fmt(summary.income)}  sub="All time" icon={<Icons.TrendUp size={16}/>}   />
        <StatCard label="Total Expense" color="red"   value={fmt(summary.expense)} sub="All time" icon={<Icons.TrendDown size={16}/>} />
        <StatCard label="Net Profit"    color="blue"  value={fmt(summary.profit)}  sub="All time" icon={<Icons.Analytics size={16}/>}  />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-5">
          <CardHeader title="Monthly Breakdown" subtitle="Income vs Expense by month" />
          {monthly.length > 0
            ? <LineChart data={monthly} height={220} />
            : <div className="flex items-center justify-center h-56 text-fb-muted text-xs">No monthly data yet</div>}
        </Card>
        <Card className="p-5">
          <CardHeader title="Category Breakdown" subtitle="Expense distribution" />
          {categories.length > 0
            ? <DonutChart data={categories} height={220} />
            : <div className="flex items-center justify-center h-56 text-fb-muted text-xs">No expense data yet</div>}
        </Card>
      </div>

      {categories.length > 0 && (
        <Card className="p-5">
          <CardHeader title="Category Summary" subtitle="Spending breakdown" />
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-fb-card2/50">
                <tr>
                  {['Category', 'Amount', 'Share %', 'Progress'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-fb-muted uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categories.map((row, i) => (
                  <tr key={row.name} className={`border-t border-fb-border/50 hover:bg-fb-card2/30 transition-colors ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
                    <td className="px-4 py-3 text-xs font-medium text-fb-text">{row.name}</td>
                    <td className="px-4 py-3 text-xs font-bold font-mono text-fb-accent">{fmt(row.amount)}</td>
                    <td className="px-4 py-3 text-xs font-mono text-fb-muted">{row.pct}%</td>
                    <td className="px-4 py-3">
                      <div className="w-32 bg-fb-card2 rounded-full h-1.5">
                        <div className="h-full bg-fb-accent rounded-full transition-all" style={{ width: `${row.pct}%` }}></div>
                      </div>
                    </td>
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
