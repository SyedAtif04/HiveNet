import { createContext, useContext, useState, useCallback } from 'react';

const BotContext = createContext(null);

export function BotProvider({ children }) {
  const [currentBot, setCurrentBot]   = useState('finbot');
  const [currentPage, setCurrentPage] = useState('dashboard');

  const navigate  = useCallback((page) => setCurrentPage(page), []);
  const switchBot = useCallback((bot) => { setCurrentBot(bot); setCurrentPage('dashboard'); }, []);

  return (
    <BotContext.Provider value={{ currentBot, currentPage, navigate, switchBot }}>
      {children}
    </BotContext.Provider>
  );
}

export const useBot = () => useContext(BotContext);
