import { useState } from 'react';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';
import Dashboard    from './pages/Dashboard.jsx';
import Transactions from './pages/Transactions.jsx';
import Upload       from './pages/Upload.jsx';
import Analytics    from './pages/Analytics.jsx';
import Predictions  from './pages/Predictions.jsx';
import AIAssistant  from './pages/AIAssistant.jsx';
import Knowledge    from './pages/Knowledge.jsx';

const PAGES = {
  dashboard:    Dashboard,
  transactions: Transactions,
  upload:       Upload,
  analytics:    Analytics,
  predictions:  Predictions,
  ai:           AIAssistant,
  knowledge:    Knowledge,
};

export default function App() {
  const [page, setPage] = useState('dashboard');
  const PageComponent = PAGES[page] || Dashboard;

  return (
    <div className="min-h-screen bg-fb-bg text-fb-text">
      <Sidebar active={page} onNavigate={setPage} />
      <Header page={page} onNavigate={setPage} />
      <main className="ml-56 pt-14 min-h-screen">
        <div className="p-6 max-w-screen-2xl mx-auto">
          <PageComponent onNavigate={setPage} />
        </div>
      </main>
    </div>
  );
}
