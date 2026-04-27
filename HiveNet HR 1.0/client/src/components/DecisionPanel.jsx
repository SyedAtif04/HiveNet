const SHIFT_SUMMARY = [
  { label: 'Morning',   color: 'text-[#E3AA0D]', staff: '3 staff' },
  { label: 'Afternoon', color: 'text-[#E3AA0D]', staff: '3 staff' },
  { label: 'Night',     color: 'text-[#E3AA0D]', staff: '2 staff' },
];

function getStatus(loading, error, rosterData) {
  if (loading)     return { text: 'Generating…',             color: 'text-[#E3AA0D]', bg: 'bg-[#2f2d3a]' };
  if (error)       return { text: error,                      color: 'text-red-400',   bg: 'bg-[#2a1f22]'  };
  if (!rosterData) return { text: 'No roster generated yet.', color: 'text-gray-400',  bg: 'bg-[#2f2d3a]' };

  const total = Object.values(rosterData.shifts ?? {}).reduce((sum, arr) => sum + arr.length, 0);
  if (total === 0) return { text: 'No employees assigned.',   color: 'text-[#E3AA0D]', bg: 'bg-[#2f2d3a]' };
  return { text: `${total} employee(s) assigned.`,            color: 'text-[#E3AA0D]', bg: 'bg-[#2f2d3a]'  };
}

export default function DecisionPanel({ selectedDate, rosterData, error, loading, onGenerate }) {
  const status = getStatus(loading, error, rosterData);

  return (
    <div className="w-72 bg-[#282631] rounded-xl shadow-sm p-5 space-y-5 border border-[#3a3847]">

      <h2 className="text-lg font-semibold text-gray-200">Decision Panel</h2>

      {/* Selected date */}
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Selected Date</p>
        <p className="text-gray-200 font-medium">{selectedDate}</p>
      </div>

      {/* Shift requirements */}
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Shift Requirements</p>
        <div className="space-y-2">
          {SHIFT_SUMMARY.map((s) => (
            <div key={s.label} className="flex justify-between text-sm">
              <span className={`font-medium ${s.color}`}>{s.label}</span>
              <span className="text-gray-400">{s.staff}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Status */}
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Status</p>
        <div className={`${status.bg} rounded-lg p-3 border border-[#3a3847]`}>
          <p className={`text-sm font-medium ${status.color}`}>{status.text}</p>
        </div>
      </div>

      <button
        onClick={onGenerate}
        disabled={loading}
        className="w-full bg-[#E3AA0D] hover:opacity-90 text-[#282631] font-semibold text-sm py-2
                   rounded-lg transition disabled:opacity-50"
      >
        {loading ? 'Generating…' : 'Generate Roster'}
      </button>
    </div>
  );
}