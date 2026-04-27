import { useState, useEffect } from 'react';
import { fetchForecastResults } from '../api.js';
import { Card, CardHeader, ForecastCard } from '@/components.jsx';
import { Icons } from '@/icons.jsx';
import { UnitBarChart } from '@/charts.jsx';

function parseSummary(result) {
  if (!result?.data) return null;
  const d = result.data;
  const totalDemand = Math.round(d.total_predicted_demand || 0);
  const horizonDays = d.horizon_days || 90;
  const avgMonthly  = Math.round(totalDemand / (horizonDays / 30));
  const materials   = d.materials || [];
  const topMat      = materials.length
    ? materials.reduce((a, b) => (a.total_predicted_demand > b.total_predicted_demand ? a : b), materials[0])
    : null;

  // Compute trend from aggregated forecast first vs last week avg
  const agg   = d.aggregated_forecast || d.forecast || [];
  const week  = Math.max(1, Math.round(agg.length / (horizonDays / 7)));
  const first = agg.slice(0, week).reduce((s, r) => s + (r.y_hat || 0), 0) / week;
  const last  = agg.slice(-week).reduce((s, r) => s + (r.y_hat || 0), 0) / week;
  const trendPct = first > 0 ? ((last - first) / first) * 100 : 0;
  const trend = (trendPct >= 0 ? '+' : '') + trendPct.toFixed(1) + '%';

  return {
    totalDemand,
    avgMonthly,
    trend,
    confidence: 94,
    topSKU:     topMat?.material_name || (d.metadata?.material ?? '—'),
    topQty:     topMat ? Math.round(topMat.total_predicted_demand) : 0,
  };
}

function buildMonthly(result) {
  if (!result?.data) return [];
  const d = result.data;
  const daily = d.aggregated_forecast || d.forecast || [];
  const ordered = [];
  const seen = {};
  for (const row of daily) {
    const dt   = new Date(row.date);
    const yr   = dt.getUTCFullYear();
    const mo   = dt.getUTCMonth();
    const key  = `${yr}-${String(mo).padStart(2, '0')}`;
    const label = dt.toLocaleString('default', { month: 'short', timeZone: 'UTC' }) + ' \'' + String(yr).slice(2);
    if (!seen[key]) { seen[key] = { month: label, demand: 0, lower: 0, upper: 0 }; ordered.push(seen[key]); }
    seen[key].demand += row.y_hat   || 0;
    seen[key].lower  += row.y_lower || 0;
    seen[key].upper  += row.y_upper || 0;
  }
  return ordered.map(m => ({
    month:  m.month,
    demand: Math.round(m.demand),
    lower:  Math.round(m.lower),
    upper:  Math.round(m.upper),
  }));
}

const DURATIONS = [
  { key: '3_months',  label: '3-Month Forecast'  },
  { key: '6_months',  label: '6-Month Forecast'  },
  { key: '12_months', label: '12-Month Forecast' },
];

export default function Forecasts({ onNavigate }) {
  const [results,  setResults]  = useState({});
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState('3_months');

  useEffect(() => {
    setLoading(true);
    Promise.all(DURATIONS.map(({ key }) => fetchForecastResults(key).then(r => [key, r]).catch(() => [key, null])))
      .then(pairs => {
        const map = Object.fromEntries(pairs);
        setResults(map);
        const first = DURATIONS.find(({ key }) => map[key]);
        if (first) setSelected(first.key);
      })
      .finally(() => setLoading(false));
  }, []);

  const hasAny   = Object.values(results).some(Boolean);
  const monthly  = buildMonthly(results[selected]);
  const summaries = DURATIONS.map(({ key, label }) => ({ key, label, summary: parseSummary(results[key]) }));

  if (loading) return <div className="flex items-center justify-center py-20 text-fb-muted text-sm">Loading…</div>;

  if (!hasAny) return (
    <div className="space-y-5">
      <Card className="p-10 flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-fb-card2 border border-fb-border flex items-center justify-center text-fb-muted">
          <Icons.Forecasts size={28} />
        </div>
        <div>
          <p className="text-sm font-semibold text-fb-text">No forecast data yet</p>
          <p className="text-xs text-fb-muted mt-1">Upload a CSV dataset and run a forecast to see predictions here.</p>
        </div>
        <button onClick={() => onNavigate?.('upload')} className="btn-primary px-5 py-2 rounded-lg text-xs flex items-center gap-1.5">
          <Icons.Upload size={13} /> Upload Data
        </button>
      </Card>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        {summaries.map(({ key, label, summary }) =>
          summary
            ? <ForecastCard key={key} period={label} data={summary} />
            : (
              <Card key={key} className="p-5">
                <div className="text-xs font-semibold text-fb-muted uppercase tracking-wider mb-4">{label}</div>
                <p className="text-xs text-fb-muted text-center py-6">No data — run forecast first.</p>
              </Card>
            )
        )}
      </div>

      {monthly.length > 0 && (
        <Card className="p-5">
          <CardHeader title="Demand Forecast" subtitle="Predicted units by month with confidence intervals"
            action={
              <div className="flex gap-1">
                {DURATIONS.map(({ key, label }) => results[key] && (
                  <button key={key} onClick={() => setSelected(key)}
                    className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${selected === key ? 'bg-fb-accent text-fb-sidebar' : 'bg-fb-card2 border border-fb-border text-fb-muted hover:border-fb-accent/50'}`}>
                    {label.split('-')[0].trim()}
                  </button>
                ))}
              </div>
            }
          />
          <UnitBarChart data={monthly} height={160} />
          <div className="mt-3 grid grid-cols-3 gap-4 text-center">
            {[
              ['Total Demand',  `${(parseSummary(results[selected])?.totalDemand || 0).toLocaleString()} units`, 'text-fb-accent'],
              ['Avg / Month',   `${(parseSummary(results[selected])?.avgMonthly  || 0).toLocaleString()} units`, 'text-fb-blue'  ],
              ['Horizon',       `${results[selected]?.horizon_days || '—'} days`,                                'text-fb-green' ],
            ].map(([l, v, c]) => (
              <div key={l} className="bg-fb-card2 rounded-lg p-3 border border-fb-border">
                <div className="text-[10px] text-fb-muted mb-1">{l}</div>
                <div className={`text-sm font-bold font-mono ${c}`}>{v}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {summaries.some(s => s.summary) && (
        <Card className="p-5">
          <CardHeader title="Forecast Info" subtitle="Details from the latest model run" />
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Model Type',  value: 'LightGBM + ETS' },
              { label: 'Retrieved',   value: results['3_months']?.retrieved_at ? new Date(results['3_months'].retrieved_at).toLocaleDateString() : '—' },
              { label: 'Horizon',     value: `${results[selected]?.horizon_days || '—'} days` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-fb-card2 rounded-lg p-4 border border-fb-border">
                <div className="text-[10px] text-fb-muted uppercase tracking-wider mb-1">{label}</div>
                <div className="text-sm font-bold font-mono text-fb-accent">{value}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
