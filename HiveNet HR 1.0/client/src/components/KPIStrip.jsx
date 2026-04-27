const STATIC_CARDS = [
  { label: 'Total Employees', value: '—', color: 'text-[#E3AA0D]', bg: 'bg-[#2f2d3a]' },
  { label: 'On Leave Today',  value: '—', color: 'text-red-400',    bg: 'bg-[#2a1f22]' },
  { label: 'Pending Leaves',  value: '—', color: 'text-[#E3AA0D]', bg: 'bg-[#2f2d3a]' },
];

export default function KPIStrip({ shortfall }) {
  const shortfallCard = {
    label: 'Shift Shortage',
    value: shortfall === null ? '—' : shortfall,
    color: shortfall > 0 ? 'text-red-400' : 'text-[#E3AA0D]',
    bg:    shortfall > 0 ? 'bg-[#2a1f22]' : 'bg-[#2f2d3a]',
  };

  return (
    <div className="grid grid-cols-4 gap-4">
      {[...STATIC_CARDS, shortfallCard].map((card) => (
        <div key={card.label} className={`${card.bg} rounded-xl p-4 shadow-sm border border-[#3a3847]`}>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
            {card.label}
          </p>
          <p className={`text-3xl font-bold mt-1 ${card.color}`}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}