import { useState } from 'react';
import { MOCK_SHIFTS_CONFIG, MOCK_SHIFT_REQUIREMENTS, MOCK_ROSTER } from '../data.js';
import { Card, CardHeader, Modal, Field, Input, Select } from '@/components.jsx';
import { Icons } from '@/icons.jsx';

const WEEK_DAYS = ['Mon 27', 'Tue 28', 'Wed 29', 'Thu 30', 'Fri 01', 'Sat 02', 'Sun 03'];

export default function Roster() {
  const [roster,      setRoster]      = useState(MOCK_ROSTER);
  const [modalOpen,   setModalOpen]   = useState(false);
  const [addShift,    setAddShift]    = useState('morning');
  const [empName,     setEmpName]     = useState('');
  const [empId,       setEmpId]       = useState('');
  const [selectedDay, setSelectedDay] = useState('Mon 27');
  const [generated,   setGenerated]   = useState(false);

  const handleAdd = () => {
    if (!empName.trim() || !empId.trim()) return;
    const newEmp = { id: empId.trim(), name: empName.trim() };
    setRoster(prev => ({ ...prev, [addShift]: [...(prev[addShift] || []), newEmp] }));
    setEmpName(''); setEmpId('');
    setModalOpen(false);
  };

  const handleRemove = (shift, empId) => {
    setRoster(prev => ({ ...prev, [shift]: prev[shift].filter(e => e.id !== empId) }));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex gap-1 overflow-x-auto">
          {WEEK_DAYS.map(d => (
            <button key={d} onClick={() => setSelectedDay(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${selectedDay === d ? 'bg-fb-accent text-fb-sidebar font-semibold' : 'bg-fb-card2 border border-fb-border text-fb-muted hover:border-fb-accent/50'}`}>
              {d}
            </button>
          ))}
        </div>
        <div className="flex gap-2 ml-auto">
          <button onClick={() => setGenerated(true)} className="btn-primary px-4 py-2 rounded-lg text-xs flex items-center gap-1.5">
            <Icons.Zap size={13} /> Auto-Generate
          </button>
          <button onClick={() => setModalOpen(true)} className="btn-ghost px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 border border-fb-border">
            <Icons.Plus size={13} /> Add Employee
          </button>
        </div>
      </div>

      {generated && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-fb-green-dim border border-fb-green/20 text-fb-green text-xs font-medium">
          <Icons.Check size={14} /> Roster auto-generated for {selectedDay} — all shifts filled using availability data.
          <button onClick={() => setGenerated(false)} className="ml-auto text-fb-green/60 hover:text-fb-green"><Icons.X size={14} /></button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-5">
        {MOCK_SHIFTS_CONFIG.map(shift => {
          const crew = roster[shift.key] || [];
          const req  = MOCK_SHIFT_REQUIREMENTS[shift.key];
          const ok   = crew.length >= req;
          return (
            <Card key={shift.key} className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-fb-text">{shift.label}</h3>
                  <p className="text-[10px] text-fb-muted">{shift.time}</p>
                </div>
                <div className={`text-xs font-bold px-2.5 py-1 rounded-full border ${ok ? 'bg-fb-green-dim border-fb-green/20 text-fb-green' : 'bg-fb-red-dim border-fb-red/20 text-fb-red'}`}>
                  {crew.length}/{req}
                </div>
              </div>

              <div className="space-y-2">
                {crew.map(emp => (
                  <div key={emp.id} className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-fb-card2 border border-fb-border group">
                    <div className="w-7 h-7 rounded-full bg-fb-accent text-fb-sidebar flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                      {emp.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-fb-text truncate">{emp.name}</p>
                      <p className="text-[9px] font-mono text-fb-muted">{emp.id}</p>
                    </div>
                    <button onClick={() => handleRemove(shift.key, emp.id)}
                      className="opacity-0 group-hover:opacity-100 text-fb-muted hover:text-fb-red transition-all">
                      <Icons.X size={13} />
                    </button>
                  </div>
                ))}
                {crew.length < req && Array.from({ length: req - crew.length }).map((_, i) => (
                  <button key={i} onClick={() => { setAddShift(shift.key); setModalOpen(true); }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-fb-red/40 bg-fb-red-dim hover:border-fb-red/60 transition-colors">
                    <Icons.Plus size={12} className="text-fb-red" />
                    <span className="text-xs text-fb-red">Add employee</span>
                  </button>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-fb-border">
                <div className="flex items-center justify-between text-[10px] text-fb-muted">
                  <span>Duration: 8 hrs</span>
                  <span className={ok ? 'text-fb-green' : 'text-fb-red'}>{ok ? 'Fully staffed' : 'Understaffed'}</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-5">
        <CardHeader title="All Assigned Employees" subtitle={`${selectedDay} · across all shifts`} />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-fb-card2/50">
              <tr>
                {['Employee ID', 'Name', 'Shift', 'Time', 'Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-fb-muted uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_SHIFTS_CONFIG.flatMap(shift =>
                (roster[shift.key] || []).map((emp, i) => (
                  <tr key={`${shift.key}-${emp.id}`} className="border-t border-fb-border/50 hover:bg-fb-card2/30 transition-colors">
                    <td className="px-4 py-3 text-xs font-mono text-fb-accent">{emp.id}</td>
                    <td className="px-4 py-3 text-xs font-medium text-fb-text">{emp.name}</td>
                    <td className="px-4 py-3 text-xs text-fb-muted">{shift.label}</td>
                    <td className="px-4 py-3 text-xs font-mono text-fb-muted">{shift.time}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] px-2 py-0.5 rounded-md border bg-fb-green-dim border-fb-green/20 text-fb-green font-medium">Scheduled</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Employee to Shift">
        <div className="space-y-4">
          <Field label="Shift">
            <Select value={addShift} onChange={e => setAddShift(e.target.value)}>
              {MOCK_SHIFTS_CONFIG.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </Select>
          </Field>
          <Field label="Employee ID">
            <Input placeholder="E-109" value={empId} onChange={e => setEmpId(e.target.value)} />
          </Field>
          <Field label="Employee Name">
            <Input placeholder="Full name" value={empName} onChange={e => setEmpName(e.target.value)} />
          </Field>
          <div className="flex gap-3 pt-2">
            <button onClick={handleAdd} className="flex-1 py-2.5 rounded-lg btn-primary text-xs font-semibold">Add to Roster</button>
            <button onClick={() => setModalOpen(false)} className="flex-1 py-2.5 rounded-lg btn-ghost text-xs">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
