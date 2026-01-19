import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

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

            const fifteenDaysAgo = new Date();
            fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
            const dateLimit = fifteenDaysAgo.toISOString();

            try {
                // 1. Fetch activities
                const { data: activityData, error: activityError } = await supabase
                    .from('strava_activities')
                    .select('id, name, start_date_local, distance, moving_time, total_elevation_gain, average_watts')
                    .eq('athlete_id', athleteId)
                    .gte('start_date_local', dateLimit)
                    .order('start_date_local', { ascending: false })
                    .limit(10);

                if (activityError) throw activityError;

                if (activityData && activityData.length > 0) {
                    // 2. Check which ones have streams (already synced)
                    const activityIds = activityData.map(a => a.id);
                    const { data: streamData, error: streamError } = await supabase
                        .from('strava_streams')
                        .select('activity_id')
                        .in('activity_id', activityIds);

                    if (streamError) {
                        console.error('Error fetching stream status:', streamError);
                        // Don't fail the whole fetch, just assume none synced
                        setActivities(activityData.map(a => ({ ...a, isSynced: false })));
                    } else {
                        const syncedIds = new Set(streamData?.map(s => s.activity_id) || []);
                        setActivities(activityData.map(a => ({
                            ...a,
                            isSynced: syncedIds.has(a.id)
                        })));
                    }
                } else {
                    setActivities([]);
                }
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
