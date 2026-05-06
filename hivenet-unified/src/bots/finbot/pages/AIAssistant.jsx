import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components.jsx';
import { Icons } from '@/icons.jsx';
import { fetchChatResponse } from '../api.js';

const SUGGESTIONS = [
  'What was my biggest expense last quarter?',
  'Show me profit trend forecast',
  'Which months had highest income?',
  'Summarize my Q1 2026 performance',
];

const renderText = (text) => {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    const parts = line.split(/\*\*(.*?)\*\*/g);
    return (
      <span key={i}>
        {parts.map((p, j) => j % 2 === 1 ? <strong key={j} className="text-fb-text font-semibold">{p}</strong> : p)}
        {i < lines.length - 1 && <br />}
      </span>
    );
  });
};

export default function AIAssistant() {
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const bottomRef               = useRef(null);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollTop = bottomRef.current.scrollHeight;
  }, [messages, loading]);

  const sendMessage = async (text) => {
    const query = (text || input).trim();
    if (!query || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: query }]);
    setLoading(true);

    try {
      const reply = await fetchChatResponse(query);
      setMessages(prev => [...prev, { role: 'bot', text: reply }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'bot', text: `Error: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-5" style={{ height: 'calc(100vh - 8rem)' }}>
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
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
              <div className="w-12 h-12 rounded-xl bg-fb-accent-dim border border-fb-accent/20 flex items-center justify-center text-fb-accent">
                <Icons.AIAssistant size={22} />
              </div>
              <p className="text-sm font-medium text-fb-text">Ask about your finances</p>
              <p className="text-xs text-fb-muted max-w-xs">I can analyse income, expenses, profit trends, forecasts, and transactions using your live data.</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold ${msg.role === 'bot' ? 'bg-fb-accent text-fb-sidebar' : 'bg-fb-blue text-white'}`}>
                {msg.role === 'bot' ? 'AI' : 'U'}
              </div>
              <div className={`max-w-[78%] px-4 py-3 rounded-2xl text-xs leading-relaxed ${msg.role === 'bot' ? 'chat-bubble-bot rounded-tl-sm text-fb-muted' : 'chat-bubble-user rounded-tr-sm text-fb-text'}`}>
                {renderText(msg.text)}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-fb-accent flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-fb-sidebar">AI</div>
              <div className="chat-bubble-bot px-4 py-3 rounded-2xl rounded-tl-sm">
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-fb-muted animate-bounce" style={{ animationDelay: `${i * 0.15}s` }}></div>)}
                </div>
              </div>
            </div>
          )}
        </div>

        {messages.length === 0 && (
          <div className="px-5 pb-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => sendMessage(s)}
                className="text-[10px] px-3 py-1.5 rounded-full border border-fb-border text-fb-muted hover:border-fb-accent/50 hover:text-fb-accent transition-colors">
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="px-5 py-4 border-t border-fb-border flex items-center gap-3">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Ask about your finances…"
            className="flex-1 bg-fb-card2 border border-fb-border rounded-xl px-4 py-2.5 text-sm text-fb-text placeholder-fb-dim focus:border-fb-accent/60 transition-colors outline-none"
          />
          <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${input.trim() && !loading ? 'btn-primary' : 'bg-fb-card2 border border-fb-border text-fb-dim cursor-not-allowed'}`}>
            <Icons.Send size={16} />
          </button>
        </div>
      </Card>
    </div>
  );
}
