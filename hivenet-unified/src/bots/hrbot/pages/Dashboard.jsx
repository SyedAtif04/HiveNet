import { MOCK_HR_SUMMARY, MOCK_SHIFTS_CONFIG, MOCK_SHIFT_REQUIREMENTS, MOCK_ROSTER, MOCK_KPI_ALERTS } from '../data.js';
import { Card, CardHeader, StatCard, ActionCard, AlertRow } from '@/components.jsx';
import { Icons } from '@/icons.jsx';

export default function Dashboard({ onNavigate }) {
  const totalAssigned = Object.values(MOCK_ROSTER).reduce((s, arr) => s + arr.length, 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <ActionCard label="Roster Planner" sub="Manage shifts"       icon={<Icons.Roster size={18} />}    onClick={() => onNavigate('roster')} />
        <ActionCard label="Upload Data"    sub="Import schedules"    icon={<Icons.Upload size={18} />}    onClick={() => onNavigate('upload')} />
        <ActionCard label="Alerts"         sub={`${MOCK_KPI_ALERTS.length} notifications`} icon={<Icons.Alerts size={18} />} onClick={() => {}} />
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Employees" color="accent" value={MOCK_HR_SUMMARY.totalEmployees}  sub="Headcount"        icon={<Icons.Users size={16} />}    />
        <StatCard label="On Leave Today"  color="red"    value={MOCK_HR_SUMMARY.onLeaveToday}    sub="Absent today"     icon={<Icons.TrendDown size={16} />} />
        <StatCard label="Pending Leaves"  color="accent" value={MOCK_HR_SUMMARY.pendingLeaves}   sub="Awaiting approval" icon={<Icons.Alerts size={16} />}   />
        <StatCard label="Shift Shortfall" color={MOCK_HR_SUMMARY.shiftShortfall > 0 ? 'red' : 'green'} value={MOCK_HR_SUMMARY.shiftShortfall} sub="Understaffed slots" icon={<Icons.Roster size={16} />} />
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 space-y-4">
          <Card className="p-5">
            <CardHeader title="Today's Roster Overview" subtitle="Shift assignments for 2026-04-27"
              action={<button onClick={() => onNavigate('roster')} className="text-xs text-fb-accent hover:underline">Manage roster</button>}
            />
            <div className="space-y-4">
              {MOCK_SHIFTS_CONFIG.map(shift => {
                const crew = MOCK_ROSTER[shift.key] || [];
                const req  = MOCK_SHIFT_REQUIREMENTS[shift.key];
                const ok   = crew.length >= req;
                return (
                  <div key={shift.key} className="border border-fb-border rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="text-sm font-semibold text-fb-text">{shift.label}</h4>
                        <p className="text-[10px] text-fb-muted">{shift.time}</p>
                      </div>
                      <div className={`text-xs font-bold px-2.5 py-1 rounded-full border ${ok ? 'bg-fb-green-dim border-fb-green/20 text-fb-green' : 'bg-fb-red-dim border-fb-red/20 text-fb-red'}`}>
                        {crew.length}/{req} staffed
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {crew.map(emp => (
                        <div key={emp.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-fb-card2 border border-fb-border">
                          <div className="w-5 h-5 rounded-full bg-fb-accent text-fb-sidebar flex items-center justify-center text-[9px] font-bold">
                            {emp.name.charAt(0)}
                          </div>
                          <span className="text-xs text-fb-text">{emp.name}</span>
                          <span className="text-[9px] text-fb-muted font-mono">{emp.id}</span>
                        </div>
                      ))}
                      {crew.length < req && Array.from({ length: req - crew.length }).map((_, i) => (
                        <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-dashed border-fb-red/40 bg-fb-red-dim">
                          <Icons.Plus size={12} className="text-fb-red" />
                          <span className="text-xs text-fb-red">Unfilled</span>
                        </div>
                      ))}
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
                ['Scheduled Today',  `${totalAssigned}/${MOCK_HR_SUMMARY.totalEmployees}`, 'text-fb-accent'],
                ['Avg Shift Length', '8 hours',                                             'text-fb-muted' ],
                ['Overtime Today',   '2 employees',                                          'text-fb-accent'],
                ['Roster Date',      '27-04-2026',                                          'text-fb-muted' ],
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
              {MOCK_KPI_ALERTS.map(a => (
                <AlertRow key={a.id} level={a.level} message={a.message} time={a.time} />
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
