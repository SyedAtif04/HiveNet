import { useState, useRef, useEffect } from 'react';
import { fetchChatResponse } from '../api.js';
import { Card } from '@/components.jsx';
import { Icons } from '@/icons.jsx';

const SUGGESTIONS = [
  'How many employees do we have?',
  'Who is on leave today?',
  'Are there any pending leave requests?',
  'Is there a shift shortfall today?',
  'How do I generate a roster?',
  'What shift types are available?',
];

const HARDCODED_QA = [
  {
    q: 'How many employees do we have?',
    a: 'Fetching live count from the database — this question checks the employees table in real-time. Ask me and I\'ll give you the latest number!',
  },
  {
    q: 'Who is on leave today?',
    a: 'I\'ll query approved leave records for today\'s date. Ask me directly and I\'ll list the employees currently on approved leave.',
  },
  {
    q: 'Is there a shift shortfall today?',
    a: 'I compare today\'s shift requirements against actual assignments. Ask me directly and I\'ll tell you how many positions are unfilled.',
  },
  {
    q: 'How do I upload employees?',
    a: 'Go to **Upload Data** in the sidebar. Use the **Employee Upload** section and drop an **.xlsx file** with columns: emp_code, first_name, last_name, email, role, department, salary. Duplicate emp_codes are automatically skipped.',
  },
  {
    q: 'How do I generate a roster?',
    a: 'Navigate to **Roster Planner**, select a date using the day tabs at the top, then click **Auto-Generate**. The system picks available employees (not on leave, not already assigned) and fills the shift requirements — prioritising those with fewer hours that week.',
  },
  {
    q: 'What shift types are available?',
    a: 'Three shifts are configured:\n\n- **Morning** — 06:00 to 14:00\n- **Afternoon** — 14:00 to 22:00\n- **Night** — 22:00 to 06:00',
  },
  {
    q: 'How do I upload shift requirements?',
    a: 'Go to **Upload Data** and use the **Shift Requirements** section. Upload an **.xlsx file** with columns: date (YYYY-MM-DD), shift_type (morning/afternoon/night), required_count.',
  },
  {
    q: 'What can you help with?',
    a: 'I can answer HR queries including:\n\n- **Employee headcount** (live from DB)\n- **Leave status** — who is on leave today\n- **Pending leave requests** (live from DB)\n- **Shift shortfall** — unfilled positions today\n- **Roster tips** — how to generate and manage schedules\n- **Data upload guidance** — employees and shift requirements',
  },
];

const renderText = (text) => {
  const lines = text.split('\n');
  return lines.map((line, li) => {
    const parts = line.split(/\*\*(.*?)\*\*/g);
    const rendered = parts.map((p, i) =>
      i % 2 === 1 ? <strong key={i} className="text-fb-text font-semibold">{p}</strong> : p
    );
    return <span key={li}>{rendered}{li < lines.length - 1 && <br />}</span>;
  });
};

export default function AIAssistant() {
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      text: 'Hello! I\'m HRBot AI. I can answer questions about your workforce — headcount, leave status, shift shortfalls, roster generation, and more. What would you like to know?',
    },
  ]);
  const [input,   setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const [qaOpen,  setQaOpen]  = useState(false);
  const bottomRef             = useRef(null);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollTop = bottomRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setLoading(true);

    try {
      const reply = await fetchChatResponse(msg);
      setMessages(prev => [...prev, { role: 'bot', text: reply }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'bot', text: `Error: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-5" style={{ height: 'calc(100vh - 8rem)' }}>
      <div className="flex-1 flex flex-col gap-4">
        <Card className="flex-1 flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-fb-border flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-fb-accent-dim border border-fb-accent/20 flex items-center justify-center text-fb-accent">
              <Icons.AIAssistant size={16} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-fb-text">HRBot AI</h3>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-fb-green" />
                <span className="text-[10px] text-fb-muted">Online · Connected to your HR data</span>
              </div>
            </div>
          </div>

          <div ref={bottomRef} className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold ${msg.role === 'bot' ? 'bg-fb-accent text-fb-sidebar' : 'bg-fb-blue text-white'}`}>
                  {msg.role === 'bot' ? 'AI' : 'U'}
                </div>
                <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-xs leading-relaxed ${msg.role === 'bot' ? 'chat-bubble-bot rounded-tl-sm text-fb-muted' : 'chat-bubble-user rounded-tr-sm text-fb-text'}`}>
                  {renderText(msg.text)}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-fb-accent flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-fb-sidebar">AI</div>
                <div className="chat-bubble-bot px-4 py-3 rounded-2xl rounded-tl-sm">
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-fb-muted animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {messages.length <= 2 && (
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
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Ask about employees, leaves, shifts, rosters…"
              className="flex-1 bg-fb-card2 border border-fb-border rounded-xl px-4 py-2.5 text-sm text-fb-text placeholder-fb-dim focus:border-fb-accent/60 transition-colors outline-none" />
            <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${input.trim() && !loading ? 'btn-primary' : 'bg-fb-card2 border border-fb-border text-fb-dim cursor-not-allowed'}`}>
              <Icons.Send size={16} />
            </button>
          </div>
        </Card>
      </div>

      <div className="w-72 flex flex-col gap-4">
        <Card className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 py-4 border-b border-fb-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-fb-text">Sample Questions</h3>
            <button onClick={() => setQaOpen(o => !o)} className="text-fb-muted hover:text-fb-accent transition-colors">
              <Icons.ChevronDown size={15} className={`transition-transform ${qaOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {HARDCODED_QA.map((qa, i) => (
              <div key={i} className="p-3 rounded-lg bg-fb-card2 border border-fb-border hover:border-fb-accent/30 cursor-pointer transition-colors"
                onClick={() => sendMessage(qa.q)}>
                <p className="text-xs font-medium text-fb-text leading-tight mb-1.5">{qa.q}</p>
                <p className="text-[10px] text-fb-muted leading-relaxed line-clamp-2">{qa.a.replace(/\*\*(.*?)\*\*/g, '$1')}</p>
                <div className="mt-2">
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-fb-card border border-fb-border text-fb-dim">click to ask</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
