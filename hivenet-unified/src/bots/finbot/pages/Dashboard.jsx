import { useState, useEffect } from 'react';
import { MOCK_ALERTS } from '../data.js';
import { fetchSummary, fetchMonthly, fetchCategories, fetchPredictions } from '../api.js';
import { Card, CardHeader, StatCard, ActionCard, AlertRow, PredCard, fmt } from '@/components.jsx';
import { Icons } from '@/icons.jsx';
import { LineChart, DonutChart, SparkLine } from '@/charts.jsx';

export default function Dashboard({ onNavigate }) {
  const [summary,     setSummary]     = useState(null);
  const [monthly,     setMonthly]     = useState([]);
  const [categories,  setCategories]  = useState([]);
  const [predictions, setPredictions] = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchSummary(), fetchMonthly(), fetchCategories(), fetchPredictions()])
      .then(([s, m, c, p]) => {
        setSummary(s);
        setMonthly(m);
        setCategories(c);
        setPredictions(p);
        setError(null);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const margin = summary && summary.income > 0
    ? ((summary.profit / summary.income) * 100).toFixed(1)
    : '0.0';

  if (loading) return <div className="flex items-center justify-center py-20 text-fb-muted text-sm">Loading…</div>;
  if (error)   return <div className="flex items-center justify-center py-20 text-fb-red text-sm">Error: {error}</div>;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4">
        <ActionCard label="Upload Data"    sub="Import new data"      icon={<Icons.Upload size={18} />}      onClick={() => onNavigate('upload')} />
        <ActionCard label="Quick Forecast" sub="Generate predictions" icon={<Icons.Predictions size={18} />} onClick={() => onNavigate('predictions')} />
        <ActionCard label="View Reports"   sub="Analytics & insights" icon={<Icons.Analytics size={18} />}   onClick={() => onNavigate('analytics')} />
        <ActionCard label="AI Assistant"   sub="Chat with your data"  icon={<Icons.AIAssistant size={18} />} onClick={() => onNavigate('ai')} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Income"  color="green" value={fmt(summary.income)}  sub="All time" icon={<Icons.TrendUp size={16} />} />
        <StatCard label="Total Expense" color="red"   value={fmt(summary.expense)} sub="All time" icon={<Icons.TrendDown size={16} />} />
        <StatCard label="Net Profit"    color="blue"  value={fmt(summary.profit)}  sub={`Margin: ${margin}%`} icon={<Icons.TrendUp size={16} />} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2 p-5">
          <CardHeader title="Monthly Income vs Expense" subtitle="Revenue performance over time"
            action={<div className="flex gap-1">{['1M','3M','6M'].map(t => <button key={t} className="text-[10px] px-2 py-1 rounded border border-fb-border text-fb-muted hover:border-fb-accent/50 hover:text-fb-accent transition-colors btn-ghost">{t}</button>)}</div>}
          />
          {monthly.length > 0
            ? <LineChart data={monthly} height={220} />
            : <div className="flex items-center justify-center h-56 text-fb-muted text-xs">No monthly data yet</div>}
        </Card>
        <div className="flex flex-col gap-4">
          <Card className="p-5 flex-1">
            <CardHeader title="Alerts" subtitle={`${MOCK_ALERTS.length} active`}
              action={<span className="text-[10px] text-fb-accent cursor-pointer hover:underline">View all</span>} />
            <div className="space-y-2">{MOCK_ALERTS.map(a => <AlertRow key={a.id} {...a} />)}</div>
          </Card>
          <Card className="p-5">
            <CardHeader title="Quick Stats" />
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-fb-card2 rounded-lg p-3 border border-fb-border">
                <div className="text-[10px] text-fb-muted mb-1">Net Profit</div>
                <div className="text-xl font-bold font-mono text-fb-accent">{fmt(summary.profit)}</div>
              </div>
              <div className="bg-fb-card2 rounded-lg p-3 border border-fb-border">
                <div className="text-[10px] text-fb-muted mb-1">Margin</div>
                <div className="text-xl font-bold font-mono text-fb-blue">{margin}%</div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-1 p-5">
          <CardHeader title="Category Breakdown" subtitle="Expense distribution" />
          {categories.length > 0
            ? <DonutChart data={categories} height={200} />
            : <div className="flex items-center justify-center h-52 text-fb-muted text-xs">No category data yet</div>}
        </Card>
        {predictions && (
          <Card className="col-span-2 p-5">
            <CardHeader title="Financial Predictions" subtitle={`AI forecast · method: ${predictions.method}`}
              action={<button onClick={() => onNavigate('predictions')} className="text-[10px] text-fb-accent hover:underline cursor-pointer">Full forecast →</button>} />
            <div className="grid grid-cols-3 gap-4">
              <PredCard period="Next Month"   data={predictions.nextMonth}   />
              <PredCard period="Next Quarter" data={predictions.nextQuarter} />
              <PredCard period="Next Year"    data={predictions.nextYear}    />
            </div>
          </Card>
        )}
      </div>

      {monthly.length > 0 && (
        <Card className="p-5">
          <CardHeader title="Profit Trend" subtitle="Net profit across months"
            action={<span className="text-xs font-mono text-fb-accent font-bold">{fmt(summary.profit)} total</span>} />
          <SparkLine data={monthly} height={80} getValue={d => d.income - d.expense} />
        </Card>
      )}
    </div>
  );
}
