import { useNavigate } from 'react-router-dom';
import { useRef, useEffect, useState } from 'react';
import { useDrTcu } from '../../lib/hooks/useDrTcu';
import { ChatMessage, DailyWorkout, UserSubjectiveData } from '../../types/coach';
import { Send, User, Bot, TrendingUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DiagnosticForm from './DiagnosticForm';
import ResultCard from './ResultCard';
import CoachReportPanel from './CoachReportPanel';

export default function DrTcuContainer() {
    const { messages, flowState, handleIngestion, handleDiagnostic, workout, hardData, decision } = useDrTcu();
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSend = () => {
        if (!input.trim()) return;
        if (flowState === 'INGESTION') {
            handleIngestion(input);
            setInput('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }

    return (
        <div className="w-full max-w-7xl mx-auto h-[85vh] grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 lg:p-0">
            {/* Left Panel: Professional Report (4 cols) */}
            <div className="lg:col-span-4 h-full bg-surface shadow-glass rounded-3xl border border-white/5 overflow-hidden order-2 lg:order-1 transition-all duration-500 hover:shadow-glass-hover">
                <CoachReportPanel hardData={hardData} decision={decision} />
            </div>

            {/* Right Panel: AI Chat Interface (8 cols) */}
            <div className="lg:col-span-8 h-full bg-surface shadow-glass rounded-3xl border border-white/5 overflow-hidden flex flex-col order-1 lg:order-2 transition-all duration-500 hover:shadow-glass-hover">
                {/* Header */}
                <div className="bg-surface border-b border-white/5 p-5 flex items-center space-x-3 shrink-0">
                    <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 shadow-inner">
                        <Bot className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-lg font-display font-medium text-white">TCU AI教練</h2>
                        <p className="text-xs text-zinc-400">Scientific Cycling Coach • v2.0</p>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <button
                            onClick={() => navigate('/analysis')}
                            className="flex items-center gap-1 px-3 py-1.5 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 transition-colors text-xs border border-zinc-700"
                            title="查看活動分析"
                            aria-label="活動分析"
                        >
                            <TrendingUp className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">活動分析</span>
                        </button>
                    </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {messages.map((msg) => (
                        <MessageItem
                            key={msg.id}
                            message={msg}
                            onFormSubmit={handleDiagnostic}
                            workout={workout}
                        />
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area (Only visible in Ingestion) */}
                <div className={`p-5 bg-surface border-t border-white/5 transition-all shrink-0 ${flowState !== 'INGESTION' ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                    <div className="relative group">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={flowState === 'INGESTION' ? "輸入昨日數據 (例: TSS 150)..." : "等待分析..."}
                            className="w-full bg-background/50 border border-white/10 text-white rounded-2xl pl-5 pr-14 py-3.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-dr-muted/50 shadow-inner"
                            disabled={flowState !== 'INGESTION'}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || flowState !== 'INGESTION'}
                            className="absolute right-2 top-2 p-2 bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-30 disabled:hover:bg-primary transition-all shadow-lg shadow-primary/20 active:scale-90 cursor-pointer"
                            aria-label="發送訊息"
                        >
                            <Send className="w-4.5 h-4.5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function MessageItem({ message, onFormSubmit, workout }: { message: ChatMessage, onFormSubmit: (data: UserSubjectiveData) => void, workout: DailyWorkout | null }) {
    const isBot = message.role === 'assistant';

    return (
        <div className={`flex w-full ${isBot ? 'justify-start' : 'justify-end'} animate-in fade-in slide-in-from-bottom-2`}>
            <div className={`flex max-w-[85%] ${isBot ? 'flex-row' : 'flex-row-reverse'} items-start gap-3`}>

                {/* Avatar */}
                <div className={`flex-shrink-0 w-9 h-9 rounded-2xl flex items-center justify-center shadow-sm ${isBot ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-white/5 text-dr-muted border border-white/10'}`}>
                    {isBot ? <Bot className="w-5.5 h-5.5" /> : <User className="w-5.5 h-5.5" />}
                </div>

                {/* Content */}
                <div className={`flex flex-col space-y-2 ${isBot ? 'items-start' : 'items-end'}`}>
                    <div className={`px-5 py-3.5 rounded-2xl text-sm leading-relaxed shadow-sm transition-all duration-300 hover:shadow-md ${isBot
                        ? 'bg-surface/80 backdrop-blur-md text-dr-text rounded-tl-none border border-white/10 prose prose-invert prose-sm max-w-none'
                        : 'bg-primary text-white rounded-tr-none shadow-primary/20'
                        }`}>
                        {isBot ? (
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    table: ({ ...props }) => <table className="border-collapse border border-zinc-700 my-2 w-full" {...props} />,
                                    th: ({ ...props }) => <th className="border border-zinc-700 px-3 py-1 bg-zinc-900 font-bold" {...props} />,
                                    td: ({ ...props }) => <td className="border border-zinc-700 px-3 py-1" {...props} />,
                                    img: ({ ...props }) => <img className="max-h-12 object-contain my-2" {...props} />,
                                }}
                            >
                                {message.content}
                            </ReactMarkdown>
                        ) : (
                            message.content
                        )}
                    </div>

                    {/* Special Content: Form */}
                    {isBot && message.type === 'form' && (
                        <div className="w-full mt-2">
                            <DiagnosticForm onSubmit={onFormSubmit} />
                        </div>
                    )}

                    {/* Special Content: Result */}
                    {isBot && message.type === 'result' && workout && (
                        <div className="w-full mt-2 min-w-[300px] sm:min-w-[400px]">
                            <ResultCard workout={workout} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
