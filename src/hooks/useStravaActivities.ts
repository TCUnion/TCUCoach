import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface StravaActivitySummary {
    id: number;
    name: string;
    start_date_local: string;
    distance: number;
    moving_time: number;
    total_elevation_gain: number;
    average_watts?: number;
}

export function useStravaActivities() {
    const [activities, setActivities] = useState<StravaActivitySummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchActivities = async () => {
            // Get Athlete ID from LocalStorage (fastest access without hook overhead if just needed for ID)
            const storedAthlete = localStorage.getItem('strava_athlete');
            if (!storedAthlete) {
                setLoading(false);
                return;
            }

            let athleteId: number | undefined;
            try {
                athleteId = JSON.parse(storedAthlete).id;
            } catch (e) {
                console.error("Failed to parse athlete ID");
            }

            if (!athleteId) {
                setLoading(false);
                return;
            }

            try {
                // Query strava_activities filtering by athlete_id_int (BigInt in DB) or athlete_id (Text)
                // We'll try athlete_id (Text) first as it is more common, but DB has both.
                // Based on schema, athlete_id is text.
                const { data, error } = await supabase
                    .from('strava_activities')
                    .select('id, name, start_date_local, distance, moving_time, total_elevation_gain, average_watts')
                    .eq('athlete_id', athleteId.toString())
                    .order('start_date_local', { ascending: false })
                    .limit(10);

                if (error) throw error;
                setActivities(data || []);
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
