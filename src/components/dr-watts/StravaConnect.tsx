import { Share2 } from 'lucide-react';
import { useStravaProfile } from '../../lib/hooks/useStravaProfile';

export default function StravaConnect() {
    const { profile, loading, hasToken } = useStravaProfile();

    const handleConnect = () => {
        // Open n8n backend auth endpoint in a popup
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

    if (hasToken) {
        if (loading) {
            return (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 rounded-full border border-zinc-700">
                    <div className="w-6 h-6 rounded-full bg-zinc-700 animate-pulse" />
                    <span className="text-xs text-zinc-400">Loading...</span>
                </div>
            );
        }

        if (profile) {
            return (
                <div className="flex items-center gap-3 px-1 py-1 bg-zinc-800/50 rounded-full border border-zinc-700/50 pr-4">
                    <img
                        src={profile.profile_medium}
                        alt={profile.firstname}
                        className="w-8 h-8 rounded-full border border-[#FC4C02]/30"
                    />
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-zinc-200 leading-none">{profile.firstname}</span>
                        <span className="text-[10px] text-[#FC4C02]">已連結 Strava</span>
                    </div>
                </div>
            );
        }

        // Fallback if profile fetch failed but we have token
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800/50 rounded-full border border-emerald-500/30">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <span className="text-xs text-emerald-500">✓</span>
                </div>
                <span className="text-xs text-emerald-500">已連結</span>
            </div>
        );
    }

    return (
        <button
            onClick={handleConnect}
            className="flex items-center gap-2 px-4 py-2 bg-[#FC4C02] text-white rounded-lg text-sm font-medium hover:bg-[#E34402] transition-colors"
        >
            <Share2 className="w-4 h-4" />
            連結 Strava
        </button>
    );
}
