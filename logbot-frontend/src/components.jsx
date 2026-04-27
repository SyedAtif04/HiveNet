import { Icons } from './icons.jsx';

export const Card = ({ children, className = '', style = {}, onClick, onDragOver, onDragLeave, onDrop }) => (
  <div
    className={`card-glass rounded-xl border border-fb-border ${className}`}
    style={style}
    onClick={onClick}
    onDragOver={onDragOver}
    onDragLeave={onDragLeave}
    onDrop={onDrop}
  >
    {children}
  </div>
);

export const CardHeader = ({ title, subtitle, action }) => (
  <div className="flex items-center justify-between mb-4">
    <div>
      <h3 className="text-sm font-semibold text-fb-text">{title}</h3>
      {subtitle && <p className="text-xs text-fb-muted mt-0.5">{subtitle}</p>}
    </div>
    {action && <div>{action}</div>}
  </div>
);

export const StatCard = ({ label, value, sub, trend, trendUp, color = 'accent', icon }) => {
  const colorMap = {
    accent: { text: 'text-fb-accent', bg: 'bg-fb-accent-dim', border: 'border-fb-accent/20' },
    green:  { text: 'text-fb-green',  bg: 'bg-fb-green-dim',  border: 'border-fb-green/20'  },
    red:    { text: 'text-fb-red',    bg: 'bg-fb-red-dim',    border: 'border-fb-red/20'    },
    blue:   { text: 'text-fb-blue',   bg: 'bg-fb-blue-dim',   border: 'border-fb-blue/20'   },
  };
  const c = colorMap[color] || colorMap.accent;
  return (
    <Card className={`p-5 border ${c.border} flex flex-col gap-3`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-fb-muted uppercase tracking-wider">{label}</span>
        {icon && <div className={`w-8 h-8 rounded-lg ${c.bg} ${c.text} flex items-center justify-center`}>{icon}</div>}
      </div>
      <div>
        <div className={`text-2xl font-bold ${c.text} font-mono`}>{value}</div>
        {sub && <div className="text-xs text-fb-muted mt-0.5">{sub}</div>}
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-xs font-medium ${trendUp ? 'text-fb-green' : 'text-fb-red'}`}>
          {trendUp ? <Icons.TrendUp size={12} /> : <Icons.TrendDown size={12} />}
          {trend}
        </div>
      )}
    </Card>
  );
};

export const ActionCard = ({ label, sub, icon, onClick, active }) => (
  <button onClick={onClick}
    className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-150 text-center cursor-pointer w-full
      ${active ? 'bg-fb-accent border-fb-accent text-fb-sidebar' : 'card-glass border-fb-border text-fb-muted hover:border-fb-accent/50 hover:text-fb-accent'}`}>
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${active ? 'bg-black/10' : 'bg-fb-card2'}`}>
      {icon}
    </div>
    <div>
      <div className={`text-xs font-semibold ${active ? 'text-fb-sidebar' : 'text-fb-text'}`}>{label}</div>
      {sub && <div className={`text-[10px] mt-0.5 ${active ? 'text-fb-sidebar/70' : 'text-fb-muted'}`}>{sub}</div>}
    </div>
  </button>
);

export const AlertRow = ({ level, message, time }) => {
  const cfg = {
    error:   { dot: '#e05555', bg: 'bg-fb-red-dim',   text: 'text-fb-red'    },
    warning: { dot: '#f5c518', bg: 'bg-fb-accent-dim', text: 'text-fb-accent' },
    info:    { dot: '#4c9eff', bg: 'bg-fb-blue-dim',  text: 'text-fb-blue'   },
  };
  const c = cfg[level] || cfg.info;
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg ${c.bg} border border-white/5`}>
      <div className="mt-1 flex-shrink-0"><Icons.Dot color={c.dot} /></div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-fb-text leading-relaxed">{message}</p>
        <p className="text-[10px] text-fb-muted mt-0.5">{time}</p>
      </div>
    </div>
  );
};

export const Badge = ({ label, color = 'default' }) => {
  const cls = {
    Income:   'bg-fb-green-dim text-fb-green border-fb-green/20',
    Expense:  'bg-fb-red-dim text-fb-red border-fb-red/20',
    Active:   'bg-fb-green-dim text-fb-green border-fb-green/20',
    Inactive: 'bg-fb-red-dim text-fb-red border-fb-red/20',
    default:  'bg-fb-card2 text-fb-muted border-fb-border',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border ${cls[color] || cls.default}`}>
      {label}
    </span>
  );
};

export const StockBadge = ({ status }) => {
  const cls = {
    Critical: 'bg-fb-red-dim text-fb-red border-fb-red/20',
    Low:      'bg-fb-accent-dim text-fb-accent border-fb-accent/20',
    OK:       'bg-fb-green-dim text-fb-green border-fb-green/20',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border ${cls[status] || cls.OK}`}>
      {status}
    </span>
  );
};

export const PriorityBadge = ({ level }) => {
  const cls = {
    critical: 'bg-fb-red-dim text-fb-red border-fb-red/20',
    high:     'bg-orange-950/40 text-orange-400 border-orange-400/20',
    medium:   'bg-fb-accent-dim text-fb-accent border-fb-accent/20',
    low:      'bg-fb-green-dim text-fb-green border-fb-green/20',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border ${cls[level] || cls.low}`}>
      {level.charAt(0).toUpperCase() + level.slice(1)}
    </span>
  );
};

export const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
      <div className="relative z-10 w-full max-w-md bg-fb-card border border-fb-border rounded-2xl shadow-2xl fade-in"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-fb-border">
          <h2 className="text-sm font-semibold text-fb-text">{title}</h2>
          <button onClick={onClose} className="text-fb-muted hover:text-fb-text transition-colors"><Icons.X /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

export const Field = ({ label, children }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-medium text-fb-muted uppercase tracking-wider">{label}</label>
    {children}
  </div>
);

export const Input = (props) => (
  <input className="w-full bg-fb-card2 border border-fb-border rounded-lg px-3 py-2.5 text-sm text-fb-text placeholder-fb-dim focus:border-fb-accent/60 transition-colors" {...props} />
);

export const Select = ({ children, ...props }) => (
  <select className="w-full bg-fb-card2 border border-fb-border rounded-lg px-3 py-2.5 text-sm text-fb-text focus:border-fb-accent/60 transition-colors" {...props}>
    {children}
  </select>
);

export const ForecastCard = ({ period, data }) => (
  <Card className="p-5">
    <div className="text-xs font-semibold text-fb-muted uppercase tracking-wider mb-4">{period}</div>
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] text-fb-muted">Total Demand</div>
          <div className="text-xl font-bold font-mono text-fb-accent">{data.totalDemand.toLocaleString()}</div>
          <div className="text-[10px] text-fb-muted">units</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-fb-muted">Avg / Month</div>
          <div className="text-sm font-bold font-mono text-fb-blue">{data.avgMonthly.toLocaleString()}</div>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs font-medium text-fb-green">
          <Icons.TrendUp size={12} />
          {data.trend}
        </div>
        <div className="text-[10px] text-fb-muted">
          <span className="text-fb-accent font-mono font-bold">{data.confidence}%</span> conf.
        </div>
      </div>
      <div className="border-t border-fb-border pt-2">
        <div className="text-[10px] text-fb-muted">Top SKU</div>
        <div className="text-xs text-fb-text font-medium truncate">{data.topSKU}</div>
        <div className="text-[10px] text-fb-muted font-mono">{data.topQty} units</div>
      </div>
    </div>
  </Card>
);

export const fmt = (n) => '$' + Math.abs(n).toLocaleString();
export const fmtNum = (n) => Number(n).toLocaleString();
