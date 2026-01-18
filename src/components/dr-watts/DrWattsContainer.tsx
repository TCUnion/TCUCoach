import { useRef, useEffect, useState } from 'react';
import { useDrWatts } from '../../lib/hooks/useDrWatts';
import { ChatMessage, DailyWorkout, UserSubjectiveData } from '../../types/coach';
import { Send, User, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DiagnosticForm from './DiagnosticForm';
import ResultCard from './ResultCard';
import StravaConnect from './StravaConnect';

export default function DrWattsContainer() {
    const { messages, flowState, handleIngestion, handleDiagnostic, workout } = useDrWatts();
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

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
        <div className="flex flex-col h-[80vh] w-full max-w-4xl bg-surface rounded-xl border border-zinc-800 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-zinc-900 border-b border-zinc-800 p-4 flex items-center space-x-3">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20">
                    <Bot className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                    <h2 className="text-lg font-display font-medium text-white">TCU AI教練</h2>
                    <p className="text-xs text-zinc-400">Scientific Cycling Coach • v1.0</p>
                </div>
                <div className="ml-auto">
                    <StravaConnect />
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
            <div className={`p-4 bg-zinc-900 border-t border-zinc-800 transition-all ${flowState !== 'INGESTION' ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                <div className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={flowState === 'INGESTION' ? "輸入昨日數據 (例: TSS 150)..." : "等待分析..."}
                        className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-lg pl-4 pr-12 py-3 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors placeholder:text-zinc-600"
                        disabled={flowState !== 'INGESTION'}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || flowState !== 'INGESTION'}
                        className="absolute right-2 top-2 p-1.5 bg-emerald-600 text-white rounded-md hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 transition-colors"
                    >
                        <Send className="w-4 h-4" />
                    </button>
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
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isBot ? 'bg-zinc-800 text-emerald-500' : 'bg-zinc-700 text-zinc-300'}`}>
                    {isBot ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
                </div>

                {/* Content */}
                <div className={`flex flex-col space-y-2 ${isBot ? 'items-start' : 'items-end'}`}>
                    <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${isBot
                        ? 'bg-zinc-800 text-zinc-200 rounded-tl-none border border-zinc-700/50 prose prose-invert prose-sm max-w-none'
                        : 'bg-emerald-600 text-white rounded-tr-none'
                        }`}>
                        {isBot ? (
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    table: ({ node, ...props }) => <table className="border-collapse border border-zinc-700 my-2 w-full" {...props} />,
                                    th: ({ node, ...props }) => <th className="border border-zinc-700 px-3 py-1 bg-zinc-900 font-bold" {...props} />,
                                    td: ({ node, ...props }) => <td className="border border-zinc-700 px-3 py-1" {...props} />,
                                    img: ({ node, ...props }) => <img className="max-h-12 object-contain my-2" {...props} />,
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
