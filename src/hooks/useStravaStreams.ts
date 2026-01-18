import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { StravaStream } from '../lib/drTcu/streamAnalyzer';

interface UseStravaStreamsResult {
    streams: StravaStream[] | null;
    loading: boolean;
    error: string | null;
}

/**
 * Fetch synchronized Strava Streams from Supabase by Activity ID
 */
export function useStravaStreams(activityId: number | string | null): UseStravaStreamsResult {
    const [streams, setStreams] = useState<StravaStream[] | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!activityId) {
            setStreams(null);
            setLoading(false);
            return;
        }

        const fetchStreams = async () => {
            setLoading(true);
            setError(null);
            try {
                // Determine if we need to search by BigInt or string
                // The DB column is BIGINT, Supabase JS handles it well, but let's be safe
                const { data, error: sbError } = await supabase
                    .from('strava_streams')
                    .select('streams')
                    .eq('activity_id', activityId)
                    .single();

                if (sbError) throw sbError;

                if (data && data.streams) {
                    // The raw JSONB in Supabase is already stored as StravaStream[] by n8n
                    setStreams(data.streams as StravaStream[]);
                } else {
                    setStreams(null);
                }
            } catch (err: unknown) {
                console.error("Error fetching Strava Streams:", err);
                const errorMessage = err instanceof Error ? err.message : 'Failed to load stream data';
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        };

        fetchStreams();
    }, [activityId]);

    return { streams, loading, error };
}
