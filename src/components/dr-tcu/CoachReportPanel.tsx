import { Activity, Battery, TrendingUp, User, Zap } from 'lucide-react';
import { useEffect } from 'react';
import { UserHardData, DecisionResult, StravaActivity } from '../../types/coach';
import { useStravaProfile } from '../../lib/hooks/useStravaProfile';

interface CoachReportPanelProps {
    hardData: UserHardData | null;
    decision: DecisionResult | null;
}

export default function CoachReportPanel({ hardData, decision }: CoachReportPanelProps) {
    const { profile } = useStravaProfile();

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'STRAVA_AUTH_SUCCESS') {
                const { athlete } = event.data;
                console.log('收到 Strava 授權成功訊息:', athlete);

                if (athlete.access_token) localStorage.setItem('strava_access_token', athlete.access_token);
                if (athlete.refresh_token) localStorage.setItem('strava_refresh_token', athlete.refresh_token);
                if (athlete.expires_at) localStorage.setItem('strava_expires_at', athlete.expires_at.toString());
                localStorage.setItem('strava_athlete', JSON.stringify(athlete));

                window.dispatchEvent(new CustomEvent('strava-token-update'));
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    const handleConnect = () => {
        const width = 600;
        const height = 700;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;

        const returnUrl = encodeURIComponent(window.location.origin + '/strava-success');
        const authUrl = `https://n8n.criterium.tw/webhook/strava/auth/start?return_url=${returnUrl}`;

        window.open(
            authUrl,
            'strava_auth',
            `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
        );
    };

    // Helper to determine fatigue color
    const getTsbColor = (tsb: number) => {
        if (tsb > 20) return 'text-emerald-400';
        if (tsb > -10) return 'text-blue-400';
        if (tsb > -30) return 'text-orange-400';
        return 'text-red-500';
    };

    const getTsbLabel = (tsb: number) => {
        if (tsb > 20) return '過度恢復 (Resting)';
        if (tsb > -10) return '狀態良好 (Fresh)';
        if (tsb > -30) return '疲勞累積 (Optimal)';
        return '需注意疲勞 (High Risk)';
    };

    return (
        <div className="h-full flex flex-col bg-surface/40 backdrop-blur-xl p-6 space-y-8 overflow-y-auto border-r border-white/5">
            {/* Header / Profile */}
            <div className="flex items-center gap-4 border-b border-zinc-800 pb-6">
                <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center p-1 overflow-hidden">
                        {profile?.profile_medium ? (
                            <img src={profile.profile_medium} alt="Profile" className="w-full h-full rounded-full object-cover" />
                        ) : (
                            <User className="w-8 h-8 text-zinc-400" />
                        )}
                    </div>
                    {profile && (
                        <div className="absolute -bottom-1 -right-1 bg-strava rounded-full p-1 border-2 border-surface shadow-lg">
                            <svg className="w-3 h-3 text-white fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.477 0l-4.91 9.775h4.172z" />
                            </svg>
                        </div>
                    )}
                </div>
                <div>
                    <h2 className="text-xl font-display font-medium text-white">
                        {profile ? `${profile.firstname} ${profile.lastname}` : '訪客運動員'}
                    </h2>
                    <div className="flex items-center gap-2">
                        {profile ? (
                            <span className="text-[10px] font-bold text-strava tracking-wider uppercase">STRAVA CONNECTED</span>
                        ) : (
                            <button
                                onClick={handleConnect}
                                className="px-3 py-1.5 bg-strava hover:bg-strava/90 text-white text-xs font-bold rounded-lg transition-all hover:scale-105 active:scale-95 shadow-lg shadow-strava/20 flex items-center gap-1 cursor-pointer"
                                aria-label="連結 Strava 帳號"
                            >
                                連結 Strava
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 gap-4">
                {/* FTP */}
                <div
                    onClick={() => {
                        const currentFtp = hardData?.ftp || 200;
                        const newFtp = window.prompt('請輸入新的 FTP (瓦數):', currentFtp.toString());
                        if (newFtp && !isNaN(Number(newFtp))) {
                            localStorage.setItem('user_ftp', newFtp);
                            window.dispatchEvent(new Event('user-ftp-update'));
                        }
                    }}
                    className="bg-surface/50 border border-white/5 rounded-2xl p-4 relative group hover:border-primary/50 transition-all cursor-pointer hover:bg-surface hover:shadow-glass active:scale-[0.98]"
                    title="點擊修改 FTP"
                    aria-label="修改功能性閾值功率"
                >
                    <div className="absolute top-4 right-4 p-1.5 bg-white/5 rounded-xl group-hover:bg-primary/20 transition-colors">
                        <Zap className="w-4 h-4 text-blue-400 group-hover:text-primary animate-pulse-slow" />
                    </div>
                    <p className="text-[10px] uppercase font-bold tracking-wider text-dr-muted mb-1 group-hover:text-primary transition-colors">FTP</p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-display font-bold text-white group-hover:text-primary transition-colors">
                            {hardData?.ftp || '--'}
                        </span>
                        <span className="text-xs text-dr-muted font-mono">W</span>
                    </div>
                </div>

                {/* TSB (Form) */}
                <div className="bg-surface/50 border border-white/5 rounded-2xl p-4 relative group hover:border-white/20 transition-all cursor-default">
                    <div className="absolute top-4 right-4 p-1.5 bg-white/5 rounded-xl">
                        <Battery className={`w-4 h-4 ${hardData ? getTsbColor(hardData.tsb) : 'text-dr-muted'}`} />
                    </div>
                    <p className="text-[10px] uppercase font-bold tracking-wider text-dr-muted mb-1">TSB</p>
                    <div className="flex items-baseline gap-1">
                        <span className={`text-2xl font-display font-bold ${hardData ? getTsbColor(hardData.tsb) : 'text-dr-muted'}`}>
                            {hardData?.tsb ?? '--'}
                        </span>
                    </div>
                    <p className="text-[10px] text-dr-muted mt-1 font-medium">{hardData ? getTsbLabel(hardData.tsb) : '無數據'}</p>
                </div>
            </div>

            {/* Fitness Metrics Grid */}
            <div className="grid grid-cols-2 gap-4">
                {/* Suffer Score */}
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 relative group hover:border-zinc-700 transition-colors">
                    <div className="absolute top-4 right-4 p-1.5 bg-zinc-900 rounded-lg">
                        <Activity className={`w-4 h-4 ${(hardData?.sufferScore ?? 0) > 100 ? 'text-red-500' :
                                (hardData?.sufferScore ?? 0) > 50 ? 'text-amber-500' :
                                    'text-emerald-500'
                            }`} />
                    </div>
                    <p className="text-xs text-zinc-500 mb-1">相對耗力 (Suffer)</p>
                    <div className="flex items-baseline gap-1">
                        <span className={`text-2xl font-display font-bold ${(hardData?.sufferScore ?? 0) > 100 ? 'text-red-500' :
                                (hardData?.sufferScore ?? 0) > 50 ? 'text-amber-500' :
                                    'text-emerald-500'
                            }`}>
                            {hardData?.sufferScore ?? '--'}
                        </span>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-1">
                        {(hardData?.sufferScore ?? 0) > 100 ? '極艱苦' :
                            (hardData?.sufferScore ?? 0) > 50 ? '艱苦' : '輕鬆'}
                    </p>
                </div>

                {/* Energy Output */}
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 relative group hover:border-zinc-700 transition-colors">
                    <div className="absolute top-4 right-4 p-1.5 bg-zinc-900 rounded-lg">
                        <Zap className="w-4 h-4 text-orange-500" />
                    </div>
                    <p className="text-xs text-zinc-500 mb-1">能量輸出 (Energy)</p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-display font-bold text-white">
                            {hardData?.kilojoules ? Math.round(hardData.kilojoules) : '--'}
                        </span>
                        <span className="text-xs text-zinc-500 font-mono">kJ</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-1">
                        {hardData?.kilojoules ? `${Math.round(hardData.kilojoules * 0.239)} kcal` : '--'}
                    </p>
                </div>

                {/* Max Heart Rate */}
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 relative group hover:border-zinc-700 transition-colors">
                    <div className="absolute top-4 right-4 p-1.5 bg-zinc-900 rounded-lg">
                        <TrendingUp className="w-4 h-4 text-red-500" />
                    </div>
                    <p className="text-xs text-zinc-500 mb-1">最大心率 (Max HR)</p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-display font-bold text-white">
                            {hardData?.maxHeartRate ?? '--'}
                        </span>
                        <span className="text-xs text-zinc-500 font-mono">bpm</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-1">
                        {hardData?.maxHeartRate ? `${Math.round((hardData.maxHeartRate / 220) * 100)}% 最大值` : '--'}
                    </p>
                </div>

                {/* Average Heart Rate */}
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 relative group hover:border-zinc-700 transition-colors">
                    <div className="absolute top-4 right-4 p-1.5 bg-zinc-900 rounded-lg">
                        <Activity className="w-4 h-4 text-pink-500" />
                    </div>
                    <p className="text-xs text-zinc-500 mb-1">平均心率 (Avg HR)</p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-display font-bold text-white">
                            {hardData?.avgHeartRate ? Math.round(hardData.avgHeartRate) : '--'}
                        </span>
                        <span className="text-xs text-zinc-500 font-mono">bpm</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-1">
                        {hardData?.avgHeartRate && hardData?.maxHeartRate
                            ? `${Math.round((hardData.avgHeartRate / hardData.maxHeartRate) * 100)}% 最大心率`
                            : '--'}
                    </p>
                </div>
            </div>

            {/* Training Load (Yesterday) */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-500" />
                        昨日訓練負荷
                    </h3>
                    {hardData && (
                        <span className="text-xs font-mono text-zinc-500">
                            強度係數 (IF): {hardData.yesterdayIf.toFixed(2)}
                        </span>
                    )}
                </div>

                <div className="bg-surface/50 rounded-2xl border border-white/5 p-5 shadow-inner">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-dr-muted">TSS</span>
                        <span className="text-xl font-display font-bold text-white">{hardData?.yesterdayTss || 0}</span>
                    </div>
                    {/* Visual Bar for TSS (0-300 range approximate) */}
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-primary to-blue-400 rounded-full transition-all duration-1000"
                            style={{ width: `${Math.min(((hardData?.yesterdayTss || 0) / 300) * 100, 100)}%` }}
                        />
                    </div>
                    <div className="flex justify-between mt-1.5 text-[10px] text-dr-muted font-bold tracking-tighter uppercase">
                        <span>Rest</span>
                        <span>Train</span>
                        <span>Overload</span>
                    </div>
                </div>
            </div>

            {/* Coach Recommendation (Decision) */}
            <div className="space-y-3 pt-4 border-t border-zinc-800/50">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-violet-500" />
                        今日訓練重點
                    </h3>
                </div>

                {decision ? (
                    <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-500 text-white uppercase tracking-wider">
                                {decision.type}
                            </span>
                        </div>
                        <p className="text-sm text-zinc-200 font-medium mb-1">{decision.recommendedFocus}</p>
                        <p className="text-xs text-zinc-400 leading-relaxed opacity-80 line-clamp-3">
                            {decision.reason}
                        </p>
                    </div>
                ) : (
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-8 flex flex-col items-center text-center text-zinc-600">
                        <p className="text-xs">等待數據分析...</p>
                    </div>
                )}
            </div>

            {/* System Status / Footer */}
            <div className="mt-auto pt-6 border-t border-zinc-800/30">
                <div className="flex justify-between items-center text-[10px] text-zinc-600 font-mono">
                    <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        SYSTEM ONLINE
                    </span>
                    <span>TCU-CORE v2.1</span>
                </div>
            </div>
            {/* Recent Activities List */}
            <div className="pt-2 border-t border-zinc-800">
                <h3 className="text-sm text-zinc-400 font-medium mb-3">近期活動 (過去30天)</h3>
                <div className="space-y-2">
                    {hardData?.recentActivities?.slice(0, 5).map((activity: StravaActivity) => {
                        const actPower = activity.weighted_average_watts || activity.average_watts || 0;
                        const actFtp = hardData.ftp || 200;
                        const actIf = actPower / actFtp;
                        const actMovingTime = activity.moving_time || 0;
                        const actTss = Math.round((actMovingTime * actPower * actIf) / (actFtp * 3600) * 100);

                        return (
                            <div key={activity.id} className="bg-zinc-950/50 border border-zinc-900 rounded-lg p-3 hover:bg-zinc-900 transition-colors">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-zinc-200 font-medium text-sm truncate max-w-[70%]">{activity.name}</span>
                                    <span className="text-zinc-500 text-xs">
                                        {new Date(activity.start_date_local).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-zinc-400">
                                    <span>{(activity.distance / 1000).toFixed(1)} km</span>
                                    <span>•</span>
                                    <span>{Math.floor(activity.moving_time / 60)} min</span>
                                    <span>•</span>
                                    <span className={actTss > 80 ? 'text-amber-500' : 'text-emerald-500'}>
                                        TSS {actTss > 0 ? actTss : '--'}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                    {(!hardData?.recentActivities || hardData.recentActivities.length === 0) && (
                        <div className="text-center py-4 text-zinc-600 text-xs">
                            無近期活動紀錄
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
