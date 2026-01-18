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
            try {
                const { data, error } = await supabase
                    .from('strava_activities')
                    .select('id, name, start_date_local, distance, moving_time, total_elevation_gain, average_watts')
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
    }, []);

    return { activities, loading, error };
}
