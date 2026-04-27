const SHIFTS = [
  {
    key: 'morning',
    label: 'Morning Shift',
    time: '06:00 – 14:00',
    dot: 'bg-[#E3AA0D]',
    bg: 'bg-[#2f2d3a]',
    border: 'border-[#3a3847]',
    text: 'text-[#E3AA0D]',
  },
  {
    key: 'afternoon',
    label: 'Afternoon Shift',
    time: '14:00 – 22:00',
    dot: 'bg-[#E3AA0D]',
    bg: 'bg-[#2a2835]',
    border: 'border-[#3a3847]',
    text: 'text-[#E3AA0D]',
  },
  {
    key: 'night',
    label: 'Night Shift',
    time: '22:00 – 06:00',
    dot: 'bg-[#E3AA0D]',
    bg: 'bg-[#24222d]',
    border: 'border-[#3a3847]',
    text: 'text-[#E3AA0D]',
  },
];

export default function RosterView({
  selectedDate,
  setSelectedDate,
  rosterData,
  loading,
  onGenerate,
}) {
  return (
    <div className="flex-1 bg-[#282631] rounded-xl shadow-sm p-5 space-y-4">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-200">
          Roster View
        </h2>

        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border border-[#3a3847] bg-[#2f2d3a] rounded-lg px-3 py-1.5 text-sm text-gray-200
                       focus:outline-none focus:ring-2 focus:ring-[#E3AA0D]"
          />

          <button
            onClick={onGenerate}
            disabled={loading}
            className="bg-[#E3AA0D] hover:opacity-90 text-[#282631] text-sm px-4 py-1.5
                       rounded-lg transition disabled:opacity-50 font-semibold"
          >
            {loading ? 'Generating…' : 'Generate Roster'}
          </button>
        </div>
      </div>

      {/* SHIFT CARDS */}
      <div className="space-y-3">
        {SHIFTS.map((shift) => {
          const employees = rosterData?.shifts?.[shift.key] || [];

          return (
            <div
              key={shift.key}
              className={`${shift.bg} border ${shift.border} rounded-xl p-4`}
            >
              {/* HEADER */}
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-2.5 h-2.5 rounded-full ${shift.dot}`} />
                <span className={`font-semibold text-sm ${shift.text}`}>
                  {shift.label}
                </span>
                <span className="text-xs text-gray-400">{shift.time}</span>
              </div>

              {/* STATES */}
              {loading ? (
                <p className="text-xs text-gray-400 italic">
                  Generating roster...
                </p>
              ) : rosterData ? (
                employees.length > 0 ? (
                  <ul className="space-y-1">
                    {employees.map((emp) => (
                      <li
                        key={emp.id}
                        className="text-xs text-gray-200 flex justify-between"
                      >
                        <span>{emp.name}</span>
                        <span className="text-gray-500">#{emp.id}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-gray-400 italic">
                    No employees assigned
                  </p>
                )
              ) : (
                <p className="text-xs text-gray-400 italic text-center">
                  No roster available for selected date
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* SUMMARY (BACK TO ORIGINAL SIMPLE VERSION) */}
      {rosterData && (
        <div className="bg-[#2f2d3a] rounded-xl p-4 flex gap-8 text-sm border border-[#3a3847]">

          <div>
            <p className="text-gray-400 text-xs uppercase">Assigned</p>
            <p className="text-2xl font-bold text-[#E3AA0D]">
              {Object.values(rosterData.shifts || {}).flat().length}
            </p>
          </div>

        </div>
      )}
    </div>
  );
}