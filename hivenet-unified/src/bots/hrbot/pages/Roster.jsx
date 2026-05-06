import { useState, useEffect, useCallback } from 'react';
import { fetchRoster, generateRoster, getWeekDays, SHIFTS_CONFIG } from '../api.js';
import { Card, CardHeader, Modal, Field, Input, Select } from '@/components.jsx';
import { Icons } from '@/icons.jsx';

const WEEK_DAYS = getWeekDays();

export default function Roster() {
  const [selectedDay, setSelectedDay] = useState(WEEK_DAYS[0]);
  const [roster,      setRoster]      = useState({});
  const [reqs,        setReqs]        = useState({});
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [generating,  setGenerating]  = useState(false);
  const [generated,   setGenerated]   = useState(false);
  const [genResult,   setGenResult]   = useState(null);
  const [modalOpen,   setModalOpen]   = useState(false);
  const [addShift,    setAddShift]    = useState('morning');
  const [empName,     setEmpName]     = useState('');
  const [empId,       setEmpId]       = useState('');

  const loadRoster = useCallback(async (date) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRoster(date);
      setRoster(data.shifts || {});
      setReqs({});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setGenerated(false);
    loadRoster(selectedDay.date);
  }, [selectedDay, loadRoster]);

  const handleGenerate = async () => {
    setGenerating(true);
    setGenerated(false);
    try {
      const result = await generateRoster(selectedDay.date);
      setGenResult(result);
      setGenerated(true);
      await loadRoster(selectedDay.date);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleAdd = () => {
    if (!empName.trim() || !empId.trim()) return;
    setRoster(prev => ({
      ...prev,
      [addShift]: [...(prev[addShift] || []), { id: empId.trim(), name: empName.trim() }],
    }));
    setEmpName(''); setEmpId('');
    setModalOpen(false);
  };

  const handleRemove = (shift, id) => {
    setRoster(prev => ({ ...prev, [shift]: prev[shift].filter(e => e.id !== id) }));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex gap-1 overflow-x-auto">
          {WEEK_DAYS.map(d => (
            <button key={d.date} onClick={() => setSelectedDay(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${selectedDay.date === d.date ? 'bg-fb-accent text-fb-sidebar font-semibold' : 'bg-fb-card2 border border-fb-border text-fb-muted hover:border-fb-accent/50'}`}>
              {d.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 ml-auto">
          <button onClick={handleGenerate} disabled={generating}
            className="btn-primary px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 disabled:opacity-60">
            <Icons.Zap size={13} /> {generating ? 'Generating…' : 'Auto-Generate'}
          </button>
          <button onClick={() => setModalOpen(true)} className="btn-ghost px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 border border-fb-border">
            <Icons.Plus size={13} /> Add Employee
          </button>
        </div>
      </div>

      {generated && genResult && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-fb-green-dim border border-fb-green/20 text-fb-green text-xs font-medium">
          <Icons.Check size={14} />
          Roster generated for {selectedDay.label} — {genResult.assigned ?? 0} employee{(genResult.assigned ?? 0) !== 1 ? 's' : ''} assigned.
          {genResult.shortfall > 0 && <span className="text-fb-red ml-2">({genResult.shortfall} unfilled)</span>}
          <button onClick={() => setGenerated(false)} className="ml-auto text-fb-green/60 hover:text-fb-green"><Icons.X size={14} /></button>
        </div>
      )}

      {error && (
        <div className="px-4 py-3 rounded-xl bg-fb-red-dim border border-fb-red/20 text-fb-red text-xs">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40 text-fb-muted text-sm animate-pulse">Loading roster…</div>
      ) : (
        <div className="grid grid-cols-3 gap-5">
          {SHIFTS_CONFIG.map(shift => {
            const crew = roster[shift.key] || [];
            const req  = reqs[shift.key] ?? null;
            const ok   = req === null ? crew.length > 0 : crew.length >= req;
            return (
              <Card key={shift.key} className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-fb-text">{shift.label}</h3>
                    <p className="text-[10px] text-fb-muted">{shift.time}</p>
                  </div>
                  <div className={`text-xs font-bold px-2.5 py-1 rounded-full border ${ok ? 'bg-fb-green-dim border-fb-green/20 text-fb-green' : 'bg-fb-red-dim border-fb-red/20 text-fb-red'}`}>
                    {crew.length}{req !== null ? `/${req}` : ''}
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
                        <p className="text-[9px] font-mono text-fb-muted">#{emp.id}</p>
                      </div>
                      <button onClick={() => handleRemove(shift.key, emp.id)}
                        className="opacity-0 group-hover:opacity-100 text-fb-muted hover:text-fb-red transition-all">
                        <Icons.X size={13} />
                      </button>
                    </div>
                  ))}
                  {crew.length === 0 && (
                    <button onClick={() => { setAddShift(shift.key); setModalOpen(true); }}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-fb-red/40 bg-fb-red-dim hover:border-fb-red/60 transition-colors">
                      <Icons.Plus size={12} className="text-fb-red" />
                      <span className="text-xs text-fb-red">Add employee</span>
                    </button>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-fb-border">
                  <div className="flex items-center justify-between text-[10px] text-fb-muted">
                    <span>Duration: 8 hrs</span>
                    <span className={crew.length > 0 ? 'text-fb-green' : 'text-fb-red'}>{crew.length > 0 ? 'Staffed' : 'Empty'}</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {!loading && (
        <Card className="p-5">
          <CardHeader title="All Assigned Employees" subtitle={`${selectedDay.label} · across all shifts`} />
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
                {SHIFTS_CONFIG.flatMap(shift =>
                  (roster[shift.key] || []).map(emp => (
                    <tr key={`${shift.key}-${emp.id}`} className="border-t border-fb-border/50 hover:bg-fb-card2/30 transition-colors">
                      <td className="px-4 py-3 text-xs font-mono text-fb-accent">#{emp.id}</td>
                      <td className="px-4 py-3 text-xs font-medium text-fb-text">{emp.name}</td>
                      <td className="px-4 py-3 text-xs text-fb-muted">{shift.label}</td>
                      <td className="px-4 py-3 text-xs font-mono text-fb-muted">{shift.time}</td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] px-2 py-0.5 rounded-md border bg-fb-green-dim border-fb-green/20 text-fb-green font-medium">Scheduled</span>
                      </td>
                    </tr>
                  ))
                )}
                {SHIFTS_CONFIG.every(s => !(roster[s.key] || []).length) && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-xs text-fb-muted">No assignments for {selectedDay.label}. Use Auto-Generate to create the roster.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Employee to Shift">
        <div className="space-y-4">
          <Field label="Shift">
            <Select value={addShift} onChange={e => setAddShift(e.target.value)}>
              {SHIFTS_CONFIG.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </Select>
          </Field>
          <Field label="Employee ID">
            <Input placeholder="e.g. 42" value={empId} onChange={e => setEmpId(e.target.value)} />
          </Field>
          <Field label="Employee Name">
            <Input placeholder="Full name" value={empName} onChange={e => setEmpName(e.target.value)} />
          </Field>
          <p className="text-[10px] text-fb-muted">Note: manually added entries are view-only and not saved to the database.</p>
          <div className="flex gap-3 pt-2">
            <button onClick={handleAdd} className="flex-1 py-2.5 rounded-lg btn-primary text-xs font-semibold">Add to Roster</button>
            <button onClick={() => setModalOpen(false)} className="flex-1 py-2.5 rounded-lg btn-ghost text-xs">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
