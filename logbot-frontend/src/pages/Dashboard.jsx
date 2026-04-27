import { MOCK_SUMMARY, MOCK_MONTHLY, MOCK_CATEGORIES, MOCK_FORECASTS, MOCK_ALERTS, MOCK_DECISIONS } from '../data.js';
import { Card, CardHeader, StatCard, ActionCard, AlertRow, ForecastCard, fmtNum } from '../components.jsx';
import { Icons } from '../icons.jsx';
import { DualLineChart, DonutChart, SparkLine } from '../charts.jsx';

const ACTION_CFG = {
  critical: { label: 'URGENT', dot: '#e05555', bar: 'bg-fb-red' },
  high:     { label: 'HIGH',   dot: '#f5c518', bar: 'bg-fb-accent' },
  medium:   { label: 'MED',    dot: '#4c9eff', bar: 'bg-fb-blue' },
  low:      { label: 'LOW',    dot: '#3ecf8e', bar: 'bg-fb-green' },
};

const sparkData = MOCK_MONTHLY.map(d => ({ month: d.month, value: d.demand }));

export default function Dashboard({ onNavigate }) {
  return (
    <div className="space-y-5 fade-in">
      <div className="grid grid-cols-4 gap-4">
        <ActionCard label="Upload Data"        sub="Import inventory CSV"     icon={<Icons.Upload size={18} />}      onClick={() => onNavigate('upload')} />
        <ActionCard label="Run Forecast"       sub="Generate ML predictions"  icon={<Icons.Forecasts size={18} />}   onClick={() => onNavigate('forecasts')} />
        <ActionCard label="View Analytics"     sub="Demand & stock trends"    icon={<Icons.Analytics size={18} />}   onClick={() => onNavigate('analytics')} />
        <ActionCard label="Ask LogBot AI"      sub="Chat with supply data"    icon={<Icons.AIAssistant size={18} />} onClick={() => onNavigate('ai')} />
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total SKUs"        color="accent" value={MOCK_SUMMARY.totalSKUs}                      sub="Active products"         icon={<Icons.Inventory size={16} />} />
        <StatCard label="Active Alerts"     color="red"    value={MOCK_SUMMARY.activeAlerts}                   sub="Require attention"       trend="3 critical" trendUp={false} icon={<Icons.Alerts size={16} />} />
        <StatCard label="Low / Critical"    color="accent" value={`${MOCK_SUMMARY.lowStockCount} / ${MOCK_SUMMARY.criticalCount}`} sub="Stock at risk"  icon={<Icons.Zap size={16} />} />
        <StatCard label="Forecast Accuracy" color="green"  value={`${MOCK_SUMMARY.forecastAccuracy}%`}         sub="ML model confidence"     trend="+1.3% vs last month" trendUp={true} icon={<Icons.Forecasts size={16} />} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2 p-5">
          <CardHeader
            title="Demand vs Fulfilled"
            subtitle="Monthly units over last 6 months"
            action={
              <div className="flex gap-1">
                {['1M','3M','6M'].map(t => (
                  <button key={t} className="text-[10px] px-2 py-1 rounded border border-fb-border text-fb-muted hover:border-fb-accent/50 hover:text-fb-accent transition-colors btn-ghost">{t}</button>
                ))}
              </div>
            }
          />
          <DualLineChart
            data={MOCK_MONTHLY}
            label1="Demand" label2="Fulfilled"
            key1="demand" key2="fulfilled"
            color1="#f5c518" color2="#3ecf8e"
            height={220}
          />
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="p-5 flex-1">
            <CardHeader title="Active Alerts" subtitle={`${MOCK_ALERTS.filter(a => !a.resolved).length} unresolved`}
              action={<span onClick={() => onNavigate('alerts')} className="text-[10px] text-fb-accent cursor-pointer hover:underline">View all</span>} />
            <div className="space-y-2">
              {MOCK_ALERTS.slice(0, 4).map(a => <AlertRow key={a.id} {...a} />)}
            </div>
          </Card>
          <Card className="p-5">
            <CardHeader title="Quick Stats" />
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-fb-card2 rounded-lg p-3 border border-fb-border">
                <div className="text-[10px] text-fb-muted mb-1">Fulfillment</div>
                <div className="text-xl font-bold font-mono text-fb-green">{MOCK_SUMMARY.fulfillmentRate}%</div>
                <div className="text-[10px] text-fb-green mt-1">+0.4% ↑</div>
              </div>
              <div className="bg-fb-card2 rounded-lg p-3 border border-fb-border">
                <div className="text-[10px] text-fb-muted mb-1">Avg Lead Time</div>
                <div className="text-xl font-bold font-mono text-fb-blue">{MOCK_SUMMARY.avgLeadTime}d</div>
                <div className="text-[10px] text-fb-muted mt-1">{MOCK_SUMMARY.supplierCount} suppliers</div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-1 p-5">
          <CardHeader title="Category Breakdown" subtitle="Inventory value distribution" />
          <DonutChart data={MOCK_CATEGORIES} height={200} />
        </Card>

        <Card className="col-span-2 p-5">
          <CardHeader title="Reorder Decisions"
            subtitle="AI-generated recommendations"
            action={<button onClick={() => onNavigate('inventory')} className="text-[10px] text-fb-accent hover:underline cursor-pointer">Full inventory →</button>} />
          <div className="space-y-2">
            {MOCK_DECISIONS.slice(0, 5).map(d => {
              const cfg = ACTION_CFG[d.priority] || ACTION_CFG.low;
              return (
                <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg bg-fb-card2 border border-fb-border hover:border-fb-border/80 transition-colors">
                  <div className="flex-shrink-0"><Icons.Dot color={cfg.dot} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-fb-text">{d.name}</span>
                      <span className="text-[9px] font-mono text-fb-dim">{d.sku}</span>
                    </div>
                    <div className="text-[10px] text-fb-muted mt-0.5">{d.reason}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={`text-[10px] font-bold px-2 py-0.5 rounded ${d.priority === 'critical' ? 'bg-fb-red-dim text-fb-red' : d.priority === 'high' ? 'bg-orange-950/40 text-orange-400' : d.priority === 'medium' ? 'bg-fb-accent-dim text-fb-accent' : 'bg-fb-green-dim text-fb-green'}`}>
                      {d.action.replace('_', ' ')}
                    </div>
                    {d.qty > 0 && <div className="text-[10px] text-fb-muted mt-0.5">Order {fmtNum(d.qty)} units</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2 p-5">
          <CardHeader title="Demand Forecasts" subtitle="AI-powered predictions"
            action={<button onClick={() => onNavigate('forecasts')} className="text-[10px] text-fb-accent hover:underline cursor-pointer">Full forecast →</button>} />
          <div className="grid grid-cols-3 gap-4">
            <ForecastCard period="Next 3 Months"  data={MOCK_FORECASTS.threeMonth}  />
            <ForecastCard period="Next 6 Months"  data={MOCK_FORECASTS.sixMonth}    />
            <ForecastCard period="Next 12 Months" data={MOCK_FORECASTS.twelveMonth} />
          </div>
        </Card>

        <Card className="p-5">
          <CardHeader title="Demand Trend" subtitle={`${fmtNum(MOCK_SUMMARY.monthlyDemand)} units this month`} />
          <SparkLine data={sparkData} color="#f5c518" height={80} />
          <div className="mt-3 pt-3 border-t border-fb-border grid grid-cols-2 gap-2">
            <div>
              <div className="text-[10px] text-fb-muted">Inventory Value</div>
              <div className="text-sm font-bold font-mono text-fb-accent">${(MOCK_SUMMARY.inventoryValue / 1000).toFixed(0)}k</div>
            </div>
            <div>
              <div className="text-[10px] text-fb-muted">Stock Health</div>
              <div className="text-sm font-bold font-mono text-fb-green">{(100 - (MOCK_SUMMARY.criticalCount / MOCK_SUMMARY.totalSKUs * 100)).toFixed(1)}%</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
