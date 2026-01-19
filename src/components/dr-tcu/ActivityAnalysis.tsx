import { useState } from 'react';
import { useStravaActivities } from '../../hooks/useStravaActivities';
import AnalysisChart from '../AnalysisChart';
import { Calendar, Clock, Activity, TrendingUp, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ActivityAnalysis() {
    const { activities, loading, error } = useStravaActivities();
    const [selectedActivityId, setSelectedActivityId] = useState<string | number | null>(null);
    const navigate = useNavigate();

    // Auto-select the first activity when loaded
    if (!selectedActivityId && activities.length > 0) {
        setSelectedActivityId(activities[0].id);
    }

    const formatDistance = (m: number) => (m / 1000).toFixed(1) + ' km';
    const formatDuration = (s: number) => {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        return `${h}h ${m}m`;
    };

    return (
        <div className="flex flex-col h-[85vh] w-full max-w-6xl bg-zinc-950 rounded-xl border border-zinc-800 shadow-2xl overflow-hidden mx-auto">
            {/* Header */}
            <div className="bg-zinc-900 border-b border-zinc-800 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/')}
                        className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white"
                        title="返回 AI 教練"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="p-2 bg-orange-500/10 rounded-lg border border-orange-500/20">
                        <TrendingUp className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                        <h2 className="text-xl font-display font-medium text-white">訓練數據分析</h2>
                        <p className="text-xs text-zinc-400">Strava Activity Analysis</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar: Activity List */}
                <div className="w-80 bg-zinc-900/50 border-r border-zinc-800 overflow-y-auto">
                    <div className="p-4 space-y-3">
                        {loading && <div className="text-zinc-500 text-sm text-center py-4">載入活動中...</div>}
                        {error && <div className="text-red-400 text-sm text-center py-4">載入失敗</div>}

                        {!loading && activities.map(activity => (
                            <button
                                key={activity.id}
                                onClick={() => setSelectedActivityId(activity.id)}
                                className={`w-full text-left p-3 rounded-xl border transition-all group ${selectedActivityId === activity.id
                                    ? 'bg-orange-500/10 border-orange-500/50 shadow-inner'
                                    : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800'
                                    }`}
                            >
                                <div className="mb-2">
                                    <h4 className={`font-medium truncate ${selectedActivityId === activity.id ? 'text-orange-400' : 'text-zinc-300 group-hover:text-white'
                                        }`}>
                                        {activity.name}
                                    </h4>
                                    <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(activity.start_date_local).toLocaleDateString()}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="flex items-center gap-1.5 text-zinc-400">
                                        <Activity className="w-3 h-3 text-emerald-500" />
                                        {formatDistance(activity.distance)}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-zinc-400">
                                        <Clock className="w-3 h-3 text-blue-500" />
                                        {formatDuration(activity.moving_time)}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Content: Chart */}
                <div className="flex-1 overflow-y-auto bg-zinc-950 p-6">
                    {selectedActivityId ? (
                        <div className="max-w-4xl mx-auto space-y-6">
                            <div className="flex items-baseline justify-between">
                                <h3 className="text-2xl font-bold text-white">
                                    {activities.find(a => a.id === selectedActivityId)?.name}
                                </h3>
                                <div className="text-zinc-500 font-mono text-sm">
                                    ID: {selectedActivityId}
                                </div>
                            </div>

                            <AnalysisChart activityId={selectedActivityId} />
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-4">
                            <Activity className="w-16 h-16 opacity-20" />
                            <p>請選擇左側活動以檢視詳細分析</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
