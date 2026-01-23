import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, CheckCircle2 } from 'lucide-react';
import { UserSubjectiveData } from '../../types/coach';
import { useStravaActivities, StravaActivitySummary } from '../../hooks/useStravaActivities';

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

            <ManualSyncSection />
        </form >
    );
}

function ManualSyncSection() {
    const [activityId, setActivityId] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const { activities, loading } = useStravaActivities();

    const handleSync = async () => {
        if (!activityId) return;
        setStatus('loading');
        try {
            // 從 localStorage 取得 athlete (owner_id)
            const athleteStr = localStorage.getItem('strava_athlete');
            const ownerId = athleteStr ? JSON.parse(athleteStr).id : 96603889; // Fallback to provided owner_id if missing

            const payload = {
                aspect_type: "create",
                event_time: Math.floor(Date.now() / 1000),
                object_id: Number(activityId),
                object_type: "activity",
                owner_id: ownerId,
                subscription_id: 123456, // Dummy ID
                updates: {}
            };

            await fetch('https://n8n.criterium.tw/webhook/strava-activity-webhook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            setStatus('success');
            setTimeout(() => setStatus('idle'), 3000);
            setActivityId('');

            // 觸發重新抓取活動，更新同步狀態
            window.dispatchEvent(new CustomEvent('strava-token-update'));
        } catch (err) {
            console.error(err);
            setStatus('error');
            setTimeout(() => setStatus('idle'), 3000);
        }
    };

    return (
        <div className="pt-6 mt-6 border-t border-zinc-800">
            <h4 className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-3">手動同步 Strava 活動</h4>

            {/* 狀態通知 */}
            <AnimatePresence>
                {status !== 'idle' && (
                    <motion.div
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        className={`overflow-hidden`}
                    >
                        <div className={`p-3 rounded-xl text-xs border flex items-center gap-2 ${status === 'loading' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
                            status === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                                'bg-red-500/10 border-red-500/30 text-red-400'
                            }`}>
                            {status === 'loading' && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                            {status === 'success' && <CheckCircle2 className="w-3.5 h-3.5" />}
                            <span>
                                {status === 'loading' ? '正在同步活動，請稍候...' :
                                    status === 'success' ? '同步請求已發送！請稍後查看數據變動。' :
                                        '同步失敗，請檢查網路連線。'}
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex flex-col gap-2 mt-4">
                <div className="relative group">
                    <select
                        value={activityId}
                        onChange={(e) => setActivityId(e.target.value)}
                        disabled={loading || status === 'loading'}
                        className="w-full bg-black/30 border border-zinc-700 rounded-xl text-sm px-3 py-2.5 text-zinc-300 focus:border-emerald-500 focus:outline-none appearance-none truncate disabled:opacity-50 transition-all hover:border-zinc-500"
                    >
                        <option value="">{loading ? "載入中..." : "選擇最近活動..."}</option>
                        {activities.map((act: StravaActivitySummary) => (
                            <option
                                key={act.id}
                                value={act.id}
                                disabled={act.isSynced}
                                className={act.isSynced ? 'text-zinc-500 italic' : 'text-zinc-200'}
                            >
                                {new Date(act.start_date_local).toLocaleDateString()} - {act.name} {act.isSynced ? '(已上傳)' : ''}
                            </option>
                        ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                        </svg>
                    </div>
                </div>
                <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={handleSync}
                    disabled={!activityId || status === 'loading'}
                    className={`w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all shadow-lg ${status === 'loading' ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' :
                        status === 'success' ? 'bg-emerald-600 text-white shadow-emerald-500/20' :
                            status === 'error' ? 'bg-red-600 text-white shadow-red-500/20' :
                                'bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700 hover:bg-zinc-700 hover:border-zinc-600 shadow-black/20'
                        }`}
                >
                    <div className="flex items-center justify-center gap-2">
                        {status === 'loading' ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>處理中...</span>
                            </>
                        ) : status === 'success' ? (
                            <>
                                <CheckCircle2 className="w-4 h-4" />
                                <span>發送成功</span>
                            </>
                        ) : (
                            <span>同步所選活動</span>
                        )}
                    </div>
                </motion.button>
            </div>
            <p className="text-[10px] text-zinc-600 mt-2">
                * 若數據未更新，請選擇活動並點擊同步以觸發重新分析。
            </p>
        </div>
    );
}
