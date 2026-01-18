import React, { useMemo } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Area,
    ComposedChart
} from 'recharts';
import { useStravaStreams } from '../hooks/useStravaStreams';
import { transformStreamsToDataPoints } from '../lib/utils/strava';

interface TooltipPayloadItem {
    dataKey: string;
    value: number | string;
    color: string;
    name: string;
}

interface CustomTooltipProps {
    active?: boolean;
    payload?: TooltipPayloadItem[];
    label?: number;
}

interface AnalysisChartProps {
    activityId: number | string | null;
}

const AnalysisChart: React.FC<AnalysisChartProps> = ({ activityId }) => {
    const { streams, loading, error } = useStravaStreams(activityId);

    const data = useMemo(() => {
        if (!streams) return [];
        return transformStreamsToDataPoints(streams);
    }, [streams]);

    if (loading) {
        return (
            <div className="w-full h-64 flex items-center justify-center bg-gray-50 border rounded-lg">
                <span className="text-gray-500 animate-pulse">載入數據分析中...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full h-64 flex items-center justify-center bg-red-50 border border-red-200 rounded-lg text-red-500">
                無法載入分析數據: {error}
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="w-full h-64 flex items-center justify-center bg-gray-50 border rounded-lg text-gray-400">
                此活動無詳細數據流 (Streams)
            </div>
        );
    }

    // 格式化 X 軸時間 (秒 -> HH:MM:SS)
    const formatXAxis = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}`;
        return `${m}:${s.toString().padStart(2, '0')}`; // 若少於 1 小時，只顯示 MM:SS
    };

    /**
     * 自定義 Tooltip 內容
     */
    const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white/90 p-3 border border-gray-200 shadow-lg rounded text-sm font-mono">
                    <p className="font-bold text-gray-700 mb-1">{formatXAxis(label || 0)}</p>
                    {payload.map((p: TooltipPayloadItem) => (
                        <div key={p.dataKey} className="flex items-center gap-2" style={{ color: p.color }}>
                            <span className="w-20 font-semibold text-xs uppercase">{translateKey(p.dataKey)}:</span>
                            <span className="font-bold">
                                {p.value} {getUnit(p.dataKey)}
                            </span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="w-full space-y-8">
            {/* 主要圖表：功率與心率 */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="w-1 h-6 bg-orange-500 rounded-full"></span>
                    功率與心率分析
                </h3>
                <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} syncId="stravaChart">
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                            <XAxis
                                dataKey="time"
                                tickFormatter={formatXAxis}
                                stroke="#9ca3af"
                                fontSize={12}
                                minTickGap={50}
                            />
                            {/* 左軸：功率 (Watts) */}
                            <YAxis
                                yAxisId="left"
                                orientation="left"
                                stroke="#f97316"
                                label={{ value: '瓦數 (W)', angle: -90, position: 'insideLeft', fill: '#f97316', fontSize: 12 }}
                                domain={[0, 'auto']}
                            />
                            {/* 右軸：心率 (HR) */}
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                stroke="#ef4444"
                                domain={[60, 200]} // 設定合理的心率區間，避免線條太扁
                                hide={false}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend verticalAlign="top" height={36} />

                            <Line
                                yAxisId="left"
                                type="monotone"
                                dataKey="watts"
                                name="功率"
                                stroke="#f97316"
                                strokeWidth={1.5}
                                dot={false}
                                activeDot={{ r: 4 }}
                                isAnimationActive={false} // 性能優化：關閉大量數據點的動畫
                            />
                            <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="heartrate"
                                name="心率"
                                stroke="#ef4444"
                                strokeWidth={1.5}
                                dot={false}
                                isAnimationActive={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 次要圖表：海拔與速度 */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="w-1 h-6 bg-blue-500 rounded-full"></span>
                    地形與速度
                </h3>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={data} syncId="stravaChart">
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                            <XAxis
                                dataKey="time"
                                tickFormatter={formatXAxis}
                                stroke="#9ca3af"
                                fontSize={12}
                                minTickGap={50}
                            />
                            {/* 左軸：海拔 (Elevation) */}
                            <YAxis
                                yAxisId="left"
                                orientation="left"
                                stroke="#6b7280"
                                tick={{ fontSize: 11 }}
                            />
                            {/* 右軸：速度 (Speed) */}
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                stroke="#3b82f6"
                                domain={[0, 'auto']}
                            />
                            <Tooltip content={<CustomTooltip />} />

                            {/* 海拔使用 Area 填充，更有地形感 */}
                            <Area
                                yAxisId="left"
                                type="monotone"
                                dataKey="altitude"
                                name="海拔"
                                fill="#f3f4f6"
                                stroke="#9ca3af"
                                strokeWidth={1}
                                isAnimationActive={false}
                            />
                            <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="speed"
                                name="速度"
                                stroke="#3b82f6"
                                strokeWidth={1.5}
                                dot={false}
                                isAnimationActive={false}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

// 輔助函式：翻譯與單位
function translateKey(key: string) {
    const map: Record<string, string> = {
        watts: '功率',
        heartrate: '心率',
        cadence: '踏頻',
        speed: '速度',
        altitude: '海拔',
        grade: '坡度'
    };
    return map[key] || key;
}

function getUnit(key: string) {
    const map: Record<string, string> = {
        watts: 'W',
        heartrate: 'bpm',
        cadence: 'rpm',
        speed: 'km/h',
        altitude: 'm',
        grade: '%'
    };
    return map[key] || '';
}

export default AnalysisChart;
