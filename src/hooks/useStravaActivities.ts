import { useState, useEffect } from 'react';

export interface StravaActivitySummary {
    id: number; // Strava ID (BigInt in DB/Zeabur)
    name: string;
    start_date_local: string;
    distance: number;
    moving_time: number;
    total_elevation_gain: number;
    average_watts?: number;
    isSynced?: boolean;
}

export function useStravaActivities() {
    const [activities, setActivities] = useState<StravaActivitySummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchActivities = async () => {
            // Get Athlete ID from LocalStorage
            const storedAthlete = localStorage.getItem('strava_athlete');
            if (!storedAthlete) {
                setLoading(false);
                return;
            }

            let athleteId: number | undefined;
            try {
                athleteId = JSON.parse(storedAthlete).id;
            } catch {
                console.error("Failed to parse athlete ID");
            }

            if (!athleteId) {
                setLoading(false);
                return;
            }

            try {
                // Use Backend API Proxy (Secure)
                // Pass athlete_id. Backend should ideally verify this with a token, 
                // but for now it acts as a secure gateway compared to direct DB access.
                const response = await fetch(`/api/v1/db/activities?athlete_id=${athleteId}`, {
                    headers: {
                        // Pass token if we had one implemented for backend auth verification
                        'Authorization': `Bearer ${localStorage.getItem('strava_access_token') || ''}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch activities');
                }

                const data: StravaActivitySummary[] = await response.json();
                setActivities(data);

            } catch (err: unknown) {
                console.error('Error fetching activities:', err);
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setLoading(false);
            }
        };

        fetchActivities();

        // Listen for token updates to refetch
        const handleUpdate = () => fetchActivities();
        window.addEventListener('strava-token-update', handleUpdate);
        return () => window.removeEventListener('strava-token-update', handleUpdate);
    }, []);

    return { activities, loading, error };
}
