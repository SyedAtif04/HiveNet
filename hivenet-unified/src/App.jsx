import { BotProvider, useBot } from './context/BotContext.jsx';
import Sidebar from './layout/Sidebar.jsx';
import Header from './layout/Header.jsx';
import { BOTS } from './bots/index.js';

function AppInner() {
  const { currentBot, currentPage, navigate } = useBot();
  const bot = BOTS[currentBot];
  const PageComponent = bot.pages[currentPage] || bot.pages.dashboard;

  return (
    <div className="min-h-screen bg-fb-bg text-fb-text">
      <Sidebar />
      <Header />
      <main className="ml-56 pt-14 min-h-screen p-6">
        <div className="fade-in" key={`${currentBot}__${currentPage}`}>
          <PageComponent onNavigate={navigate} />
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BotProvider>
      <AppInner />
    </BotProvider>
  );
}
