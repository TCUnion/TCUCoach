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
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 text-center text-emerald-500 animate-pulse">
                已提交體感數據
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-700 rounded-lg p-5 space-y-6 w-full max-w-sm animate-in zoom-in-95 duration-300">
            <h3 className="text-zinc-200 font-medium border-b border-zinc-800 pb-2">今日體感回報</h3>

            {/* RPE Slider */}
            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <label className="text-zinc-400">疲勞度 (RPE)</label>
                    <span className="text-emerald-400 font-mono">{rpe}/10</span>
                </div>
                <input
                    type="range"
                    min="1" max="10"
                    value={rpe}
                    onChange={(e) => setRpe(Number(e.target.value))}
                    className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-xs text-zinc-600 px-1">
                    <span>輕鬆</span>
                    <span>極累</span>
                </div>
            </div>

            {/* Soreness */}
            <div className="space-y-2">
                <label className="text-sm text-zinc-400 block">肌肉痠痛/傷痛訊號?</label>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setSoreness(false)}
                        className={`flex-1 py-2 px-3 rounded-md text-sm transition-all border ${!soreness ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-400' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-750'}`}
                    >
                        無痠痛
                    </button>
                    <button
                        type="button"
                        onClick={() => setSoreness(true)}
                        className={`flex-1 py-2 px-3 rounded-md text-sm transition-all border ${soreness ? 'bg-red-500/20 border-red-500/50 text-red-400' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-750'}`}
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
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 rounded-lg transition-colors ring-offset-2 ring-offset-zinc-900 focus:ring-2 focus:ring-emerald-500"
            >
                提交狀態
            </button>
        </form>
    );
}
