import { useState, useEffect } from 'react';
import { fetchSummary, fetchRoster, todayISO, SHIFTS_CONFIG } from '../api.js';
import { Card, CardHeader, StatCard, ActionCard, AlertRow } from '@/components.jsx';
import { Icons } from '@/icons.jsx';

export default function Dashboard({ onNavigate }) {
  const [summary,  setSummary]  = useState(null);
  const [roster,   setRoster]   = useState({});
  const [reqs,     setReqs]     = useState({});
  const [alerts,   setAlerts]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  const today = todayISO();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([fetchSummary(), fetchRoster(today)])
      .then(([sum, rosterData]) => {
        if (cancelled) return;
        setSummary(sum);
        setRoster(rosterData.shifts || {});

        const builtReqs = {};
        SHIFTS_CONFIG.forEach(s => { builtReqs[s.key] = 0; });
        setReqs(builtReqs);

        const newAlerts = [];
        SHIFTS_CONFIG.forEach(shift => {
          const crew = (rosterData.shifts || {})[shift.key] || [];
          if (crew.length === 0) {
            newAlerts.push({ id: shift.key, level: 'error', message: `${shift.label} has no employees assigned`, time: 'now' });
          }
        });
        if (sum.pendingLeaves > 0) {
          newAlerts.push({ id: 'leaves', level: 'info', message: `${sum.pendingLeaves} leave request${sum.pendingLeaves !== 1 ? 's' : ''} pending manager approval`, time: 'today' });
        }
        if (sum.shiftShortfall > 0) {
          newAlerts.push({ id: 'shortfall', level: 'warning', message: `${sum.shiftShortfall} shift position${sum.shiftShortfall !== 1 ? 's' : ''} unfilled today`, time: 'today' });
        }
        setAlerts(newAlerts);
      })
      .catch(err => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [today]);

  const totalAssigned = Object.values(roster).reduce((s, arr) => s + arr.length, 0);

  const todayFormatted = new Date(today + 'T00:00:00').toLocaleDateString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).split('/').join('-');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-fb-muted text-sm animate-pulse">Loading HR data…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-fb-red text-sm">Failed to load: {error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <ActionCard label="Roster Planner" sub="Manage shifts"       icon={<Icons.Roster size={18} />}    onClick={() => onNavigate('roster')} />
        <ActionCard label="Upload Data"    sub="Import schedules"    icon={<Icons.Upload size={18} />}    onClick={() => onNavigate('upload')} />
        <ActionCard label="AI Assistant"   sub={`${alerts.length} notification${alerts.length !== 1 ? 's' : ''}`} icon={<Icons.AIAssistant size={18} />} onClick={() => onNavigate('ai')} />
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Employees" color="accent" value={summary.totalEmployees}  sub="Headcount"          icon={<Icons.Users size={16} />}    />
        <StatCard label="On Leave Today"  color="red"    value={summary.onLeaveToday}    sub="Absent today"       icon={<Icons.TrendDown size={16} />} />
        <StatCard label="Pending Leaves"  color="accent" value={summary.pendingLeaves}   sub="Awaiting approval"  icon={<Icons.Alerts size={16} />}   />
        <StatCard label="Shift Shortfall" color={summary.shiftShortfall > 0 ? 'red' : 'green'} value={summary.shiftShortfall} sub="Understaffed slots" icon={<Icons.Roster size={16} />} />
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 space-y-4">
          <Card className="p-5">
            <CardHeader title="Today's Roster Overview" subtitle={`Shift assignments for ${todayFormatted}`}
              action={<button onClick={() => onNavigate('roster')} className="text-xs text-fb-accent hover:underline">Manage roster</button>}
            />
            <div className="space-y-4">
              {SHIFTS_CONFIG.map(shift => {
                const crew = roster[shift.key] || [];
                const req  = reqs[shift.key] || 0;
                const ok   = req === 0 ? crew.length > 0 : crew.length >= req;
                return (
                  <div key={shift.key} className="border border-fb-border rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="text-sm font-semibold text-fb-text">{shift.label}</h4>
                        <p className="text-[10px] text-fb-muted">{shift.time}</p>
                      </div>
                      <div className={`text-xs font-bold px-2.5 py-1 rounded-full border ${ok || crew.length > 0 ? 'bg-fb-green-dim border-fb-green/20 text-fb-green' : 'bg-fb-red-dim border-fb-red/20 text-fb-red'}`}>
                        {crew.length}{req > 0 ? `/${req}` : ''} staffed
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {crew.map(emp => (
                        <div key={emp.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-fb-card2 border border-fb-border">
                          <div className="w-5 h-5 rounded-full bg-fb-accent text-fb-sidebar flex items-center justify-center text-[9px] font-bold">
                            {emp.name.charAt(0)}
                          </div>
                          <span className="text-xs text-fb-text">{emp.name}</span>
                          <span className="text-[9px] text-fb-muted font-mono">#{emp.id}</span>
                        </div>
                      ))}
                      {crew.length === 0 && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-dashed border-fb-red/40 bg-fb-red-dim">
                          <Icons.Plus size={12} className="text-fb-red" />
                          <span className="text-xs text-fb-red">No staff assigned</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <CardHeader title="HR Stats" />
            <div className="space-y-3">
              {[
                ['Scheduled Today',  `${totalAssigned}/${summary.totalEmployees}`, 'text-fb-accent'],
                ['Avg Shift Length', '8 hours',                                     'text-fb-muted' ],
                ['Shift Shortfall',  `${summary.shiftShortfall} slots`,             summary.shiftShortfall > 0 ? 'text-fb-red' : 'text-fb-green'],
                ['Roster Date',      todayFormatted,                                'text-fb-muted' ],
              ].map(([l, v, c]) => (
                <div key={l} className="flex items-center justify-between py-2 border-b border-fb-border/50 last:border-0">
                  <span className="text-xs text-fb-muted">{l}</span>
                  <span className={`text-xs font-bold font-mono ${c}`}>{v}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <CardHeader title="Notifications" />
            <div className="space-y-2">
              {alerts.length === 0
                ? <p className="text-xs text-fb-muted py-2">No alerts for today.</p>
                : alerts.map(a => <AlertRow key={a.id} level={a.level} message={a.message} time={a.time} />)
              }
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
