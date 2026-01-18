export interface StravaStream {
    type: string;
    data: number[];
    series_type: string;
    original_size: number;
    resolution: string;
}

export interface StreamAnalysis {
    hasPower: boolean;
    hasHeartRate: boolean;
    averageWatts: number;
    maxWatts: number;
    timeInZones: Record<number, number>; // seconds in each power zone
    variabilityIndex: number; // NP / AvgPower
}

/**
 * 分析 Strava Streams 數據
 */
export function analyzeStreams(streams: StravaStream[], ftp: number): StreamAnalysis {
    const powerStream = streams.find(s => s.type === 'watts');
    const hrStream = streams.find(s => s.type === 'heartrate');

    const analysis: StreamAnalysis = {
        hasPower: !!powerStream,
        hasHeartRate: !!hrStream,
        averageWatts: 0,
        maxWatts: 0,
        timeInZones: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
        variabilityIndex: 1
    };

    if (powerStream && powerStream.data.length > 0) {
        const data = powerStream.data;
        const total = data.reduce((acc, v) => acc + v, 0);
        analysis.averageWatts = total / data.length;
        analysis.maxWatts = Math.max(...data);

        // 簡單區間統計 (基於秒數，假設每秒一筆數據)
        data.forEach(watt => {
            const pct = (watt / ftp) * 100;
            let zone = 1;
            if (pct <= 55) zone = 1;
            else if (pct <= 75) zone = 2;
            else if (pct <= 90) zone = 3;
            else if (pct <= 105) zone = 4;
            else if (pct <= 120) zone = 5;
            else zone = 6;
            analysis.timeInZones[zone] = (analysis.timeInZones[zone] || 0) + 1;
        });
    }

    return analysis;
}

/**
 * 將秒數轉換為分鐘百分比，便於 UI 顯示
 */
export function getZoneDistribution(analysis: StreamAnalysis): Record<number, number> {
    const totalSeconds = Object.values(analysis.timeInZones).reduce((a, b) => a + b, 0);
    if (totalSeconds === 0) return {};

    const dist: Record<number, number> = {};
    for (const [zone, secs] of Object.entries(analysis.timeInZones)) {
        dist[Number(zone)] = Math.round((secs / totalSeconds) * 100);
    }
    return dist;
}
