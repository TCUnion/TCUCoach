import { useState } from 'react';
import { DailyWorkout } from '../../types/coach';
import { generateZwo } from '../../lib/drTcu/workoutGenerator';
import { formatDuration } from '../../lib/drTcu/powerZones';
import { FileCode, List, Bike, Copy, Check } from 'lucide-react';

interface ResultCardProps {
    workout: DailyWorkout;
}

export default function ResultCard({ workout }: ResultCardProps) {
    const [tab, setTab] = useState<'narrative' | 'table' | 'zwo'>('narrative');
    const [copied, setCopied] = useState(false);

    const zwoContent = generateZwo(workout);

    const handleCopy = () => {
        navigator.clipboard.writeText(zwoContent);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden w-full shadow-lg flex flex-col animate-in zoom-in-95 duration-500">
            {/* Header with Title & Summary */}
            <div className="p-5 border-b border-zinc-800 bg-zinc-800/30">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-display font-semibold text-white tracking-wide">{workout.title}</h3>
                    <span className={`px-2 py-0.5 text-xs font-mono rounded border ${workout.focus === 'Recovery' ? 'border-green-500/50 text-green-400 bg-green-500/10' :
                        workout.focus === 'Endurance' ? 'border-cyan-500/50 text-cyan-400 bg-cyan-500/10' :
                            workout.focus === 'Tempo' ? 'border-blue-500/50 text-blue-400 bg-blue-500/10' :
                                workout.focus === 'Threshold' ? 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10' :
                                    'border-red-500/50 text-red-400 bg-red-500/10'
                        }`}>
                        {workout.focus.toUpperCase()}
                    </span>
                </div>
                <div className="flex gap-4 text-xs text-zinc-400 font-mono">
                    <span>TSS: {workout.totalTss}</span>
                    <span>Time: {Math.floor(workout.totalDurationSeconds / 60)}m</span>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-zinc-800">
                <button
                    onClick={() => setTab('narrative')}
                    className={`flex-1 py-3 text-xs font-medium flex items-center justify-center gap-2 hover:bg-zinc-800/50 transition-colors ${tab === 'narrative' ? 'text-emerald-400 border-b-2 border-emerald-500' : 'text-zinc-500'}`}
                >
                    <Bike className="w-4 h-4" /> 敘事模式
                </button>
                <button
                    onClick={() => setTab('table')}
                    className={`flex-1 py-3 text-xs font-medium flex items-center justify-center gap-2 hover:bg-zinc-800/50 transition-colors ${tab === 'table' ? 'text-emerald-400 border-b-2 border-emerald-500' : 'text-zinc-500'}`}
                >
                    <List className="w-4 h-4" /> 表格模式
                </button>
                <button
                    onClick={() => setTab('zwo')}
                    className={`flex-1 py-3 text-xs font-medium flex items-center justify-center gap-2 hover:bg-zinc-800/50 transition-colors ${tab === 'zwo' ? 'text-emerald-400 border-b-2 border-emerald-500' : 'text-zinc-500'}`}
                >
                    <FileCode className="w-4 h-4" /> Zwift Code
                </button>
            </div>

            {/* Content Area */}
            <div className="p-5 min-h-[200px] max-h-[400px] overflow-y-auto bg-zinc-950/50">

                {/* Narrative Mode */}
                {tab === 'narrative' && (
                    <div className="space-y-4">
                        <div className="grid gap-3 relative border-l-2 border-emerald-500/20 pl-4 py-1">
                            {workout.steps.map((step, idx) => (
                                <div key={idx} className="text-sm">
                                    <div className="flex items-center gap-2 text-zinc-300 font-medium mb-1">
                                        <span className={`w-2 h-2 rounded-full ${step.type === 'active' ? 'bg-red-500' :
                                            step.type === 'rest' ? 'bg-green-500' :
                                                'bg-blue-500'
                                            }`} />
                                        {formatDuration(step.durationSeconds)} @ {step.powerPct}% FTP
                                    </div>
                                    <p className="text-zinc-500 text-xs pl-4">{step.description}</p>
                                </div>
                            ))}
                        </div>
                        {/* 補給策略區塊 */}
                        {workout.nutritionStrategy && (
                            <div className="mt-6 pt-6 border-t border-zinc-800 space-y-4">
                                <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-1 h-3 bg-emerald-500 rounded-full" />
                                    推薦補給策略
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="bg-zinc-900/80 p-3 rounded-lg border border-zinc-800/50">
                                        <div className="text-[10px] text-zinc-500 uppercase mb-1 font-bold">Pre 訓練前</div>
                                        <div className="text-xs text-zinc-300 leading-relaxed">{workout.nutritionStrategy.pre}</div>
                                    </div>
                                    <div className="bg-zinc-900/80 p-3 rounded-lg border border-zinc-800/50">
                                        <div className="text-[10px] text-zinc-500 uppercase mb-1 font-bold">During 訓練中</div>
                                        <div className="text-xs text-zinc-300 leading-relaxed">{workout.nutritionStrategy.during}</div>
                                    </div>
                                    <div className="bg-zinc-900/80 p-3 rounded-lg border border-zinc-800/50">
                                        <div className="text-[10px] text-zinc-500 uppercase mb-1 font-bold">Post 訓練後</div>
                                        <div className="text-xs text-zinc-300 leading-relaxed">{workout.nutritionStrategy.post}</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <p className="text-xs text-zinc-600 italic mt-4 pt-4 border-t border-zinc-800">
                            "TCU AI教練: {workout.decisionReason}"
                        </p>
                    </div>
                )}

                {/* Table Mode */}
                {tab === 'table' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                            <thead className="text-zinc-500 border-b border-zinc-800">
                                <tr>
                                    <th className="pb-2 pl-2">Phase</th>
                                    <th className="pb-2">Time</th>
                                    <th className="pb-2">%FTP</th>
                                    <th className="pb-2">Inst.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/50">
                                {workout.steps.map((step, idx) => (
                                    <tr key={idx} className="hover:bg-zinc-900/50">
                                        <td className="py-2 pl-2 capitalize text-zinc-300">{step.type}</td>
                                        <td className="py-2 text-zinc-400">{formatDuration(step.durationSeconds)}</td>
                                        <td className="py-2 font-mono text-emerald-400">{step.powerPct}%</td>
                                        <td className="py-2 text-zinc-500 truncate max-w-[120px]">{step.description}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* ZWO Mode */}
                {tab === 'zwo' && (
                    <div className="relative group">
                        <pre className="text-[10px] font-mono text-zinc-400 bg-black p-3 rounded border border-zinc-800 overflow-x-auto whitespace-pre-wrap break-all">
                            {zwoContent}
                        </pre>
                        <button
                            onClick={handleCopy}
                            className="absolute top-2 right-2 p-2 bg-zinc-800 text-zinc-300 rounded hover:bg-zinc-700 border border-zinc-700 transition-all opacity-0 group-hover:opacity-100"
                            title="Copy to Clipboard"
                        >
                            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
