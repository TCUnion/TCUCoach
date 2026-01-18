import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function StravaSuccess() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        // n8n might return 'token' instead of 'access_token'
        const accessToken = searchParams.get('access_token') || searchParams.get('token');
        const refreshToken = searchParams.get('refresh_token');
        const expiresAt = searchParams.get('expires_at');

        if (accessToken) {
            // Store in localStorage
            localStorage.setItem('strava_access_token', accessToken);
            localStorage.setItem('strava_refresh_token', refreshToken || '');
            localStorage.setItem('strava_expires_at', expiresAt || '0');

            // Try to get athlete info from params (if n8n passes it)
            const athleteStr = searchParams.get('athlete');
            if (athleteStr) {
                try {
                    // It might be URL encoded JSON
                    const athlete = JSON.parse(decodeURIComponent(athleteStr));
                    localStorage.setItem('strava_athlete', JSON.stringify(athlete));
                } catch (e) {
                    console.error('Failed to parse athlete param', e);
                }
            } else {
                // Fallback: If no athlete param, we might want to clear old one or keep it?
                // Let's keep it if exists to avoid flickering, or clear if we want strict sync.
            }

            // Notify opener if exists (though localStorage event should handle it across tabs)
            if (window.opener) {
                // Force closing the popup
                window.close();
            } else {
                // If not a popup, redirect to home
                window.location.href = "/?strava_connected=true";
            }
        }
    }, [searchParams, navigate]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-white">
            <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mb-4"></div>
            <p className="text-zinc-400">Connecting to Strava...</p>
        </div>
    );
}
