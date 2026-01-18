import { StravaStream } from '../drTcu/streamAnalyzer';

export interface ActivityDataPoint {
    index: number;
    time: number; // seconds
    distance: number; // meters
    altitude?: number;
    lat?: number;
    lng?: number;
    speed?: number; // km/h (converted from m/s)
    heartrate?: number;
    cadence?: number;
    watts?: number;
    grade?: number;
    temp?: number;
    moving?: boolean;
}

/**
 * Transform Supabase (n8n-processed) Strava Streams array into a time-series array for charts.
 * 
 * @param streams - The array of stream objects stored in Supabase
 * @returns Array of data points, where each point represents a single timestamp.
 */
export function transformStreamsToDataPoints(streams: StravaStream[]): ActivityDataPoint[] {
    // 1. Find the 'time' stream to serve as the master index
    const timeStream = streams.find(s => s.type === 'time');
    const distanceStream = streams.find(s => s.type === 'distance');

    if (!timeStream || !timeStream.data) {
        console.warn("Strava Streams missing 'time' data");
        return [];
    }

    const length = timeStream.data.length;
    const result: ActivityDataPoint[] = [];

    // Helper to get data by type for quick lookup inside the loop
    // We filter out time/distance as we handle them locally, but actually looking them up is fine
    const streamMap = new Map<string, number[] | any[]>();
    streams.forEach(s => {
        if (s.data) streamMap.set(s.type, s.data);
    });

    const hasAltitude = streamMap.has('altitude');
    const hasWatts = streamMap.has('watts');
    const hasHeartrate = streamMap.has('heartrate');
    const hasCadence = streamMap.has('cadence');
    const hasVelocity = streamMap.has('velocity_smooth');
    const hasLatlng = streamMap.has('latlng');
    const hasGrade = streamMap.has('grade_smooth');
    const hasTemp = streamMap.has('temp');
    const hasMoving = streamMap.has('moving');

    const timeData = streamMap.get('time') as number[];
    const distData = streamMap.get('distance') as number[];
    const altData = hasAltitude ? streamMap.get('altitude') as number[] : [];
    const wattsData = hasWatts ? streamMap.get('watts') as number[] : [];
    const hrData = hasHeartrate ? streamMap.get('heartrate') as number[] : [];
    const cadData = hasCadence ? streamMap.get('cadence') as number[] : [];
    const velData = hasVelocity ? streamMap.get('velocity_smooth') as number[] : [];
    const latlngData = hasLatlng ? streamMap.get('latlng') as [number, number][] : [];
    const gradeData = hasGrade ? streamMap.get('grade_smooth') as number[] : [];
    const tempData = hasTemp ? streamMap.get('temp') as number[] : [];
    const movingData = hasMoving ? streamMap.get('moving') as boolean[] : [];

    for (let i = 0; i < length; i++) {
        const point: ActivityDataPoint = {
            index: i,
            time: timeData[i],
            distance: distData ? distData[i] : 0,
        };

        if (hasAltitude) point.altitude = altData[i];
        if (hasWatts) point.watts = wattsData[i];
        if (hasHeartrate) point.heartrate = hrData[i];
        if (hasCadence) point.cadence = cadData[i];
        if (hasGrade) point.grade = gradeData[i];
        if (hasTemp) point.temp = tempData[i];
        if (hasMoving) point.moving = movingData[i];

        // Velocity: m/s -> km/h
        if (hasVelocity) {
            point.speed = Number((velData[i] * 3.6).toFixed(1));
        }

        // LatLng separation
        if (hasLatlng && latlngData[i]) {
            const [lat, lng] = latlngData[i];
            point.lat = lat;
            point.lng = lng;
        }

        result.push(point);
    }

    return result;
}
