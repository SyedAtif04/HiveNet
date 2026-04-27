import { useState, useEffect } from 'react';
import { MOCK_ALERTS } from '../data.js';
import { fetchSummary, fetchMonthly, fetchCategories, fetchPredictions } from '../api.js';
import { Card, CardHeader, StatCard, ActionCard, AlertRow, PredCard, fmt } from '@/components.jsx';
import { Icons } from '@/icons.jsx';
import { LineChart, DonutChart, SparkLine } from '@/charts.jsx';

export default function Dashboard({ onNavigate }) {
  const [summary,       setSummary]       = useState(null);
  const [monthlyFull,   setMonthlyFull]   = useState([]);
  const [monthly,       setMonthly]       = useState([]);
  const [timePeriod,    setTimePeriod]    = useState('6M');
  const [categories,    setCategories]    = useState([]);
  const [predictions,   setPredictions]   = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchSummary(), fetchMonthly(), fetchCategories(), fetchPredictions()])
      .then(([s, m, c, p]) => {
        setSummary(s);
        setMonthlyFull(m);
        setMonthly(m);
        setCategories(c);
        setPredictions(p);
        setError(null);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handlePeriodChange = (period) => {
    setTimePeriod(period);
    const months = period === '1M' ? 1 : period === '3M' ? 3 : 6;
    setMonthly(monthlyFull.slice(-months));
  };

  const margin = summary && summary.income > 0
    ? ((summary.profit / summary.income) * 100).toFixed(1)
    : '0.0';

  const avgMonthlyIncome = monthly.length > 0
    ? Math.round(monthly.reduce((sum, m) => sum + m.income, 0) / monthly.length)
    : 0;

  const topCategory = categories.length > 0
    ? categories.reduce((max, c) => c.value > max.value ? c : max)
    : null;

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

      <Card className="p-5">
        <CardHeader title="Monthly Income vs Expense" subtitle="Revenue performance over time"
          action={<div className="flex gap-1">{['1M','3M','6M'].map(t => (
            <button
              key={t}
              onClick={() => handlePeriodChange(t)}
              className={`text-[10px] px-2 py-1 rounded border transition-colors btn-ghost ${
                timePeriod === t
                  ? 'border-fb-accent text-fb-accent bg-fb-accent/10'
                  : 'border-fb-border text-fb-muted hover:border-fb-accent/50 hover:text-fb-accent'
              }`}
            >
              {t}
            </button>
          ))}</div>}
        />
        {monthly.length > 0
          ? <LineChart data={monthly} height={220} />
          : <div className="flex items-center justify-center h-56 text-fb-muted text-xs">No monthly data yet</div>}
      </Card>

      {monthly.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-5">
            <div className="text-xs font-semibold text-fb-muted uppercase tracking-wider mb-4">Total Income</div>
            <div className="text-2xl font-bold font-mono text-fb-green">{fmt(summary.income)}</div>
          </Card>
          <Card className="p-5">
            <div className="text-xs font-semibold text-fb-muted uppercase tracking-wider mb-4">Total Expense</div>
            <div className="text-2xl font-bold font-mono text-fb-red">{fmt(summary.expense)}</div>
          </Card>
          <Card className="p-5">
            <div className="text-xs font-semibold text-fb-muted uppercase tracking-wider mb-4">Net Profit</div>
            <div className="text-2xl font-bold font-mono text-fb-blue">{fmt(summary.profit)}</div>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2 p-5">
          <CardHeader title="Alerts" subtitle={`${MOCK_ALERTS.length} active`}
            action={<span className="text-[10px] text-fb-accent cursor-pointer hover:underline">View all</span>} />
          <div className="space-y-2">{MOCK_ALERTS.map(a => <AlertRow key={a.id} {...a} />)}</div>
        </Card>
        <Card className="p-5">
          <CardHeader title="Quick Stats" />
          <div className="grid grid-cols-1 gap-3">
            <div className="bg-fb-card2 rounded-lg p-3 border border-fb-border">
              <div className="text-[10px] text-fb-muted mb-1">Margin</div>
              <div className="text-xl font-bold font-mono text-fb-blue">{margin}%</div>
            </div>
            <div className="bg-fb-card2 rounded-lg p-3 border border-fb-border">
              <div className="text-[10px] text-fb-muted mb-1">Avg Monthly Income</div>
              <div className="text-xl font-bold font-mono text-fb-green">{fmt(avgMonthlyIncome)}</div>
            </div>
            {topCategory && (
              <div className="bg-fb-card2 rounded-lg p-3 border border-fb-border">
                <div className="text-[10px] text-fb-muted mb-1">Top Category</div>
                <div className="text-xl font-bold font-mono text-fb-red truncate">{topCategory.name}</div>
              </div>
            )}
          </div>
        </Card>
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
          <SparkLine data={monthly} height={280} getValue={d => d.income - d.expense} />
        </Card>
      )}
    </div>
  );
}
