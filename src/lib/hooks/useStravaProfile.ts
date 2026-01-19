
import { useState, useEffect } from 'react';

export interface StravaProfile {
    id: number;
    username: string;
    firstname: string;
    lastname: string;
    profile: string; // url 124px
    profile_medium: string; // url 64px
    ftp?: number; // Functional Threshold Power
}

export function useStravaProfile() {
    const [profile, setProfile] = useState<StravaProfile | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasToken, setHasToken] = useState(!!localStorage.getItem('strava_access_token'));

    // 監聽 Token 變更 (與 useDrWatts 類似)
    useEffect(() => {
        const handleStorageChange = () => {
            const token = localStorage.getItem('strava_access_token');
            setHasToken(!!token);
        };

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('strava-token-update', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('strava-token-update', handleStorageChange);
        };
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('strava_access_token');
        if (!token) {
            setProfile(null);
            return;
        }

        const fetchProfile = async () => {
            setLoading(true);

            // 1. Try LocalStorage first
            const storedAthlete = localStorage.getItem('strava_athlete');
            if (storedAthlete) {
                setProfile(JSON.parse(storedAthlete));
                setLoading(false);
                // We can optionally verify token or background refresh here
                return;
            }

            // 2. Fallback to API (might fail due to CORS)
            try {
                // 直接呼叫 Strava API (需確認 CORS)
                const res = await fetch('https://www.strava.com/api/v3/athlete', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!res.ok) {
                    if (res.status === 401) {
                        // Token 過期或無效
                        localStorage.removeItem('strava_access_token');
                        setHasToken(false);
                        throw new Error('Unauthorized');
                    }
                    // Silently fail for CORS/Network to avoid red error in UI if we want
                    // But good to throw to set error state
                    throw new Error('Failed to fetch profile (CORS or Network)');
                }

                const data = await res.json();
                localStorage.setItem('strava_athlete', JSON.stringify(data)); // Cache it
                setProfile(data);
                setError(null);
            } catch (err: unknown) {
                console.error("Failed to fetch Strava profile:", err);
                if (err instanceof Error) {
                    setError(err.message);
                } else {
                    setError(String(err));
                }
                // setProfile(null); // Keep null
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [hasToken]); // 當 Token 狀態改變時觸發

    return { profile, loading, error, hasToken };
}
