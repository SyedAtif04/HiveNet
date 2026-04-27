import { useState } from 'react';
import KPIStrip from './components/KPIStrip';
import RosterView from './components/RosterView';
import DecisionPanel from './components/DecisionPanel';
import FloatingActions from './components/FloatingActions';

const today = new Date().toISOString().split('T')[0];

export default function App() {
  const [selectedDate, setSelectedDate] = useState(today);
  const [rosterData, setRosterData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

    try {
      const genRes = await fetch(`/api/roster/generate/${selectedDate}`);
      const genData = await genRes.json();

      if (!genRes.ok) {
        throw new Error(genData.message || 'Generation failed');
      }

      const rosterRes = await fetch(`/api/roster/${selectedDate}`);
      const text = await rosterRes.text();

      if (!rosterRes.ok) {
        throw new Error(`Roster fetch failed: ${text}`);
      }

      const data = JSON.parse(text);

      setRosterData(data);
    } catch (err) {
      console.error(err);
      setError(err.message);
      setRosterData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#282631]">

      {/* Header */}
      <header className="bg-[#2f2d3a] border-b border-[#3a3847] px-6 py-4">
        <h1 className="text-xl font-bold text-[#E3AA0D]">
          HiveNet HR Dashboard
        </h1>
        <p className="text-sm text-gray-400">
          Shift Scheduling System
        </p>
      </header>

      <div className="px-6 py-5 space-y-4">
        <KPIStrip shortfall={null} />

        <div className="flex gap-4 items-start">
          <RosterView
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            rosterData={rosterData}
            loading={loading}
            onGenerate={handleGenerate}
          />

          <DecisionPanel
            selectedDate={selectedDate}
            rosterData={rosterData}
            error={error}
            loading={loading}
            onGenerate={handleGenerate}
          />
        </div>
      </div>

      <FloatingActions />
    </div>
  );
}