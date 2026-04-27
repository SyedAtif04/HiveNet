import { useState, useEffect } from 'react';
import { fetchPredictions, fetchMonthly } from '../api.js';
import { Card, CardHeader, PredCard } from '@/components.jsx';
import { Icons } from '@/icons.jsx';
import { SparkLine } from '@/charts.jsx';

export default function Predictions() {
  const [predictions, setPredictions] = useState(null);
  const [monthly,     setMonthly]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchPredictions(), fetchMonthly()])
      .then(([p, m]) => { setPredictions(p); setMonthly(m); setError(null); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20 text-fb-muted text-sm">Loading…</div>;
  if (error)   return <div className="flex items-center justify-center py-20 text-fb-red text-sm">Error: {error}</div>;

  const ASSUMPTIONS = [
    { label: 'Method',         value: predictions.method ?? 'linear' },
    { label: 'Seasonality',    value: 'Monthly'                      },
    { label: 'Last Updated',   value: new Date().toLocaleDateString('en-GB').replace(/\//g, '-') },
    { label: 'Horizon',        value: '12 months'                    },
    { label: 'Data Months',    value: String(monthly.length)         },
    { label: 'Fallback Chain', value: 'Prophet → ARIMA → Linear'     },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-fb-green-dim border border-fb-green/20 text-fb-green text-xs font-medium">
          <div className="w-1.5 h-1.5 rounded-full bg-fb-green animate-pulse"></div>
          Model Active · method: {predictions.method}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <PredCard period="Next Month"   data={predictions.nextMonth}   />
        <PredCard period="Next Quarter" data={predictions.nextQuarter} />
        <PredCard period="Next Year"    data={predictions.nextYear}    />
      </div>

      {monthly.length > 0 && (
        <Card className="p-5">
          <CardHeader title="Profit Forecast Trend" subtitle="Historical net profit"
            action={<div className="flex items-center gap-3 text-xs text-fb-muted"><span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-fb-accent inline-block rounded"></span>Historical</span></div>}
          />
          <SparkLine data={monthly} height={100} getValue={d => d.income - d.expense} />
        </Card>
      )}

      <Card className="p-5">
        <CardHeader title="Model Assumptions" subtitle="Parameters used in the current forecast model" />
        <div className="grid grid-cols-3 gap-4">
          {ASSUMPTIONS.map(({ label, value }) => (
            <div key={label} className="bg-fb-card2 rounded-lg p-4 border border-fb-border">
              <div className="text-[10px] text-fb-muted uppercase tracking-wider mb-1">{label}</div>
              <div className="text-sm font-bold font-mono text-fb-accent">{value}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
