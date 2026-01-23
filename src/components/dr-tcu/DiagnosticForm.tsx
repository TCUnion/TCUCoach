import React, { useState } from 'react';
import { UserSubjectiveData } from '../../types/coach';

interface DiagnosticFormProps {
    onSubmit: (data: UserSubjectiveData) => void;
}

export default function DiagnosticForm({ onSubmit }: DiagnosticFormProps) {
    const [rpe, setRpe] = useState(5);
    const [soreness, setSoreness] = useState<boolean>(false);
    const [sleep, setSleep] = useState<UserSubjectiveData['sleepQuality']>('average');
    const [feeling, setFeeling] = useState<UserSubjectiveData['feeling']>('ok');
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (submitted) return;
        setSubmitted(true);
        onSubmit({
            rpe,
            soreness,
            sleepQuality: sleep,
            feeling
        });
    };

    if (submitted) {
        return (
            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 text-center text-primary animate-pulse shadow-inner">
                已提交體感數據
            </div>
        );
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="bg-surface/80 backdrop-blur-md border border-white/10 rounded-3xl p-6 space-y-6 w-full max-w-sm animate-in zoom-in-95 duration-300 overflow-y-auto scrollbar-hide shadow-glass"
        >
            <h3 className="text-white font-display font-medium border-b border-white/5 pb-3">今日體感回報</h3>

            {/* RPE Slider */}
            <div className="space-y-3">
                <div className="flex justify-between text-[11px] font-bold tracking-wider uppercase">
                    <label className="text-dr-muted">疲勞度 (RPE)</label>
                    <span className="text-primary font-mono bg-primary/10 px-2 py-0.5 rounded-md">{rpe}/10</span>
                </div>
                <input
                    type="range"
                    min="1" max="10"
                    value={rpe}
                    onChange={(e) => setRpe(Number(e.target.value))}
                    className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-primary hover:accent-primary/80 transition-all"
                />
                <div className="flex justify-between text-[10px] text-dr-muted/60 px-1 font-medium">
                    <span>輕鬆</span>
                    <span>極累</span>
                </div>
            </div>

            {/* Soreness */}
            <div className="space-y-3">
                <label className="text-[11px] font-bold tracking-wider uppercase text-dr-muted block">肌肉痠痛/傷痛訊號?</label>
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={() => setSoreness(false)}
                        className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${!soreness ? 'bg-primary/10 border-primary/30 text-primary shadow-sm' : 'bg-white/5 border-white/5 text-dr-muted hover:bg-white/10'}`}
                    >
                        無痠痛
                    </button>
                    <button
                        type="button"
                        onClick={() => setSoreness(true)}
                        className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${soreness ? 'bg-red-500/10 border-red-500/30 text-red-500 shadow-sm' : 'bg-white/5 border-white/5 text-dr-muted hover:bg-white/10'}`}
                    >
                        有痠痛
                    </button>
                </div>
            </div>

            {/* Sleep */}
            <div className="space-y-2">
                <label className="text-sm text-zinc-400 block">昨晚睡眠品質</label>
                <div className="grid grid-cols-3 gap-2">
                    {(['poor', 'average', 'good'] as const).map((q) => (
                        <button
                            key={q}
                            type="button"
                            onClick={() => setSleep(q)}
                            className={`py-2 text-sm rounded-md capitalize border transition-all ${sleep === q ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-400' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-750'}`}
                        >
                            {q === 'poor' ? '差' : q === 'average' ? '普通' : '好'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Feeling */}
            <div className="space-y-2">
                <label className="text-sm text-zinc-400 block">整體精神狀態</label>
                <div className="grid grid-cols-3 gap-2">
                    {(['tired', 'ok', 'fresh'] as const).map((f) => (
                        <button
                            key={f}
                            type="button"
                            onClick={() => setFeeling(f)}
                            className={`py-2 text-sm rounded-md capitalize border transition-all ${feeling === f ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-400' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-750'}`}
                        >
                            {f === 'tired' ? '無力' : f === 'ok' ? '還好' : '鮮活'}
                        </button>
                    ))}
                </div>
            </div>

            <button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-2xl transition-all shadow-lg shadow-primary/20 active:scale-95 cursor-pointer ring-offset-2 ring-offset-background focus:ring-2 focus:ring-primary/50"
            >
                提交今日數據
            </button>
        </form>
    );
}
