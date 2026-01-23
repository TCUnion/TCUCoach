import { useState, useEffect } from 'react';
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
                const response = await fetch(`/api/v1/db/streams/${activityId}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('strava_access_token') || ''}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch streams');
                }

                const data = await response.json();

                if (data && data.streams) {
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
