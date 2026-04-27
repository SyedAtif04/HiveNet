import { useState, useRef, useEffect } from 'react';
import { MOCK_CHAT, MOCK_KNOWLEDGE } from '../data.js';
import { Card } from '../components.jsx';
import { Icons } from '../icons.jsx';

const SUGGESTIONS = [
  'What was my biggest expense last quarter?',
  'Show me profit trend forecast',
  'Which months had highest income?',
  'Summarize my Q1 2026 performance',
];

const MOCK_RESPONSES = [
  "Based on your data, your biggest expense in Q1 2026 was **Salaries** at $42,000 (47% of total expenses), followed by **Operations** at $18,000 (20%).",
  "Your profit trend shows consistent growth — **$3,800 in Jan** rising to **$6,300 in Jun**. The forecast predicts continued growth of +12.4% next month.",
  "Your highest income months were **April** ($23,600) and **February** ($21,400). Both were driven by strong sales performance.",
  "Q1 2026 summary: Total income **$58,600**, expenses **$42,500**, net profit **$16,100** with a margin of 27.5%. Strong performance overall!",
  "I can help you analyze your financial data. Could you be more specific about what you'd like to know?",
];

const renderText = (text) => {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((p, i) => i % 2 === 1 ? <strong key={i} className="text-fb-text font-semibold">{p}</strong> : p);
};

export default function AIAssistant() {
  const [messages, setMessages] = useState(MOCK_CHAT);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [kbSearch, setKbSearch] = useState('');
  const bottomRef               = useRef(null);
  const responseIdx             = useRef(0);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollTop = bottomRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text }]);
    setLoading(true);
    setTimeout(() => {
      const reply = MOCK_RESPONSES[responseIdx.current % MOCK_RESPONSES.length];
      responseIdx.current++;
      setMessages(prev => [...prev, { role: 'bot', text: reply }]);
      setLoading(false);
    }, 900 + Math.random() * 600);
  };

  const filteredKB = MOCK_KNOWLEDGE.filter(k =>
    !kbSearch || k.title.toLowerCase().includes(kbSearch.toLowerCase()) || k.tags.some(t => t.includes(kbSearch.toLowerCase()))
  );

  return (
    <div className="flex gap-5 fade-in" style={{ height: 'calc(100vh - 8rem)' }}>
      <div className="flex-1 flex flex-col gap-4">
        <Card className="flex-1 flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-fb-border flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-fb-accent-dim border border-fb-accent/20 flex items-center justify-center text-fb-accent">
              <Icons.AIAssistant size={16} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-fb-text">FinBot AI</h3>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-fb-green"></div>
                <span className="text-[10px] text-fb-muted">Online · Connected to your data</span>
              </div>
            </div>
          </div>

          <div ref={bottomRef} className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold
                  ${msg.role === 'bot' ? 'bg-fb-accent text-fb-sidebar' : 'bg-fb-blue text-white'}`}>
                  {msg.role === 'bot' ? 'AI' : 'U'}
                </div>
                <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-xs leading-relaxed
                  ${msg.role === 'bot' ? 'chat-bubble-bot rounded-tl-sm text-fb-muted' : 'chat-bubble-user rounded-tr-sm text-fb-text'}`}>
                  {renderText(msg.text)}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-fb-accent flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-fb-sidebar">AI</div>
                <div className="chat-bubble-bot px-4 py-3 rounded-2xl rounded-tl-sm">
                  <div className="flex gap-1">
                    {[0,1,2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-fb-muted animate-bounce" style={{ animationDelay: `${i * 0.15}s` }}></div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {messages.length <= 3 && (
            <div className="px-5 pb-3 flex flex-wrap gap-2">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => setInput(s)}
                  className="text-[10px] px-3 py-1.5 rounded-full border border-fb-border text-fb-muted hover:border-fb-accent/50 hover:text-fb-accent transition-colors">
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="px-5 py-4 border-t border-fb-border flex items-center gap-3">
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Ask about your finances…"
              className="flex-1 bg-fb-card2 border border-fb-border rounded-xl px-4 py-2.5 text-sm text-fb-text placeholder-fb-dim focus:border-fb-accent/60 transition-colors outline-none" />
            <button onClick={sendMessage} disabled={!input.trim() || loading}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all
                ${input.trim() && !loading ? 'btn-primary' : 'bg-fb-card2 border border-fb-border text-fb-dim cursor-not-allowed'}`}>
              <Icons.Send size={16} />
            </button>
          </div>
        </Card>
      </div>

      <div className="w-72 flex flex-col gap-4">
        <Card className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 py-4 border-b border-fb-border">
            <h3 className="text-sm font-semibold text-fb-text mb-3">Knowledge Sources</h3>
            <div className="flex items-center gap-2 bg-fb-card2 border border-fb-border rounded-lg px-3 py-2">
              <Icons.Search size={13} />
              <input value={kbSearch} onChange={e => setKbSearch(e.target.value)}
                className="bg-transparent text-xs text-fb-text placeholder-fb-dim outline-none flex-1"
                placeholder="Search knowledge…" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredKB.map(k => (
              <div key={k.id} className="p-3 rounded-lg bg-fb-card2 border border-fb-border hover:border-fb-accent/30 cursor-pointer transition-colors">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="text-xs font-medium text-fb-text leading-tight flex-1">{k.title}</p>
                  <span className="text-[10px] font-mono font-bold text-fb-accent flex-shrink-0">{k.score}</span>
                </div>
                <p className="text-[10px] text-fb-muted leading-relaxed line-clamp-2">{k.preview}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {k.tags.map(t => (
                    <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-fb-card border border-fb-border text-fb-dim">{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
