import { useEffect, useState } from 'react';

interface QuotaData {
    usage15Min: number;
    usageDaily: number;
    limit15Min: number;
    limitDaily: number;
}

export function StravaQuotaDisplay() {
    const [quota, setQuota] = useState<QuotaData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchQuota = async () => {
            const token = localStorage.getItem('strava_access_token');
            if (!token) return;

            setLoading(true);
            try {
                // We use a simple GET request to a lightweight endpoint (athlete)
                // The headers are what we care about.
                const response = await fetch('https://www.strava.com/api/v3/athlete', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!response.ok) {
                    // If unauthorized, token might be expired.
                    // But we still might get headers? Usually not if 401.
                    if (response.status === 401) {
                        throw new Error("Unauthorized - Token may be expired");
                    }
                }

                // Inspect Headers
                // Note: This requires CORS to expose these headers.
                // Strava might NOT expose 'X-ReadRateLimit-Usage' to CORS requests from browsers.
                // If this fails, a backend proxy or n8n approach is needed.
                const usageHeader = response.headers.get('X-ReadRateLimit-Usage');
                const limitHeader = response.headers.get('X-ReadRateLimit-Limit');

                if (usageHeader && limitHeader) {
                    const [u15, uDaily] = usageHeader.split(',').map(Number);
                    const [l15, lDaily] = limitHeader.split(',').map(Number);
                    setQuota({
                        usage15Min: u15,
                        usageDaily: uDaily,
                        limit15Min: l15,
                        limitDaily: lDaily
                    });
                    setError(null);
                } else {
                    // Fallback or warning if headers are missing (likely CORS stripped them)
                    console.warn("Strava Rate Limit headers not found. CORS may be blocking them.");
                    setError("無法讀取 API 額度資訊 (可能被瀏覽器阻擋，請使用 n8n)");
                }

            } catch (err: unknown) {
                console.error("Error fetching quota:", err);
                setError(err instanceof Error ? err.message : "Fetch Failed");
            } finally {
                setLoading(false);
            }
        };

        fetchQuota();
    }, []);

    if (!quota && !loading && !error) return null;

    return (
        <div className="p-4 bg-white dark:bg-zinc-800 rounded-lg shadow space-y-2 text-sm">
            <h3 className="font-bold text-gray-700 dark:text-gray-200">Strava API 額度狀態</h3>

            {loading && <p>讀取中...</p>}

            {error && (
                <div className="text-red-500 text-xs">
                    {error}
                </div>
            )}

            {quota && (
                <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="flex flex-col">
                        <span className="text-xs text-gray-500">15 分鐘限制</span>
                        <div className="flex items-end gap-1">
                            <span className={`text-lg font-bold ${quota.usage15Min > quota.limit15Min * 0.9 ? 'text-red-500' : 'text-green-500'}`}>
                                {quota.usage15Min}
                            </span>
                            <span className="text-gray-400">/ {quota.limit15Min}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1 dark:bg-gray-700">
                            <div
                                className={`h-1.5 rounded-full ${quota.usage15Min > quota.limit15Min * 0.9 ? 'bg-red-500' : 'bg-green-500'}`}
                                style={{ width: `${Math.min((quota.usage15Min / quota.limit15Min) * 100, 100)}%` }}>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col">
                        <span className="text-xs text-gray-500">每日限制</span>
                        <div className="flex items-end gap-1">
                            <span className={`text-lg font-bold ${quota.usageDaily > quota.limitDaily * 0.9 ? 'text-red-500' : 'text-green-500'}`}>
                                {quota.usageDaily}
                            </span>
                            <span className="text-gray-400">/ {quota.limitDaily}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1 dark:bg-gray-700">
                            <div
                                className={`h-1.5 rounded-full ${quota.usageDaily > quota.limitDaily * 0.9 ? 'bg-red-500' : 'bg-green-500'}`}
                                style={{ width: `${Math.min((quota.usageDaily / quota.limitDaily) * 100, 100)}%` }}>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
