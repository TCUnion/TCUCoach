import React, { useState } from 'react';
import { UserSubjectiveData } from '../../types/coach';
import { useStravaActivities } from '../../hooks/useStravaActivities';

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
        <form
            onSubmit={handleSubmit}
            className="bg-zinc-900 border border-zinc-700 rounded-lg p-5 space-y-6 w-full max-w-sm animate-in zoom-in-95 duration-300 max-h-[400px] overflow-y-auto scrollbar-hide"
        >
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
            <ManualSyncSection />
        </form>
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
        } catch (err) {
            console.error(err);
            setStatus('error');
            setTimeout(() => setStatus('idle'), 3000);
            alert('手動同步觸發失敗，請檢查網路或 Console 錯誤訊息');
        }
    };

    return (
        <div className="pt-6 mt-6 border-t border-zinc-800">
            <h4 className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-3">手動同步 Strava 活動</h4>
            <div className="flex flex-col gap-2">
                <select
                    value={activityId}
                    onChange={(e) => setActivityId(e.target.value)}
                    disabled={loading}
                    className="w-full bg-black/30 border border-zinc-700 rounded text-sm px-3 py-2 text-zinc-300 focus:border-emerald-500 focus:outline-none appearance-none truncate"
                >
                    <option value="">{loading ? "載入中..." : "選擇最近活動..."}</option>
                    {activities.map(act => (
                        <option key={act.id} value={act.activity_id}>
                            {new Date(act.start_date_local).toLocaleDateString()} - {act.name}
                        </option>
                    ))}
                </select>
                <button
                    type="button"
                    onClick={handleSync}
                    disabled={!activityId || status === 'loading'}
                    className={`w-full px-3 py-2 rounded text-sm font-medium transition-colors ${status === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/50' :
                        status === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/50' :
                            'bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700 hover:bg-zinc-700'
                        }`}
                >
                    {status === 'loading' ? '處理中...' :
                        status === 'success' ? '已發送同步請求' :
                            status === 'error' ? '請求失敗' : '同步所選活動'}
                </button>
            </div>
            <p className="text-[10px] text-zinc-600 mt-2">
                * 若數據未更新，請選擇活動並點擊同步以觸發重新分析。
            </p>
        </div>
    );
}
