import { useState, useCallback, useEffect, useRef } from 'react';
import { UserHardData, UserSubjectiveData, ChatMessage, DailyWorkout, DecisionResult, StravaActivity } from '../../types/coach';
import { decideTraining } from '../drTcu/decisionEngine';
import { generateWorkout } from '../drTcu/workoutGenerator';
import { analyzeStreams, getZoneDistribution, StravaStream } from '../drTcu/streamAnalyzer';

export type FlowState = 'INGESTION' | 'DIAGNOSTIC' | 'PRESCRIPTION';

const INITIAL_MESSAGES: ChatMessage[] = [
    {
        id: 'intro',
        role: 'assistant',
        content: '我是 TCU AI教練，您的科學化運動分析師。請同步您最近的訓練日誌。',
        timestamp: Date.now(),
    }
];

export function useDrTcu() {
    const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
    const [flowState, setFlowState] = useState<FlowState>('INGESTION');
    const [hardData, setHardData] = useState<UserHardData | null>(null);
    const [decision, setDecision] = useState<DecisionResult | null>(null);
    const [workout, setWorkout] = useState<DailyWorkout | null>(null);
    const [input, setInput] = useState('');

    const addMessage = useCallback((role: 'user' | 'assistant', content: string, type: 'text' | 'form' | 'result' = 'text') => {
        setMessages(prev => [...prev, {
            id: Math.random().toString(36).substr(2, 9),
            role,
            content,
            type,
            timestamp: Date.now()
        }]);
    }, []);

    const [hasToken, setHasToken] = useState(!!localStorage.getItem('strava_access_token'));

    // Listen for storage events (from auth popup)
    useEffect(() => {
        const handleStorageChange = () => {
            const token = localStorage.getItem('strava_access_token');
            setHasToken(!!token);
        };

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('strava-token-update', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('strava-token-update', handleStorageChange);
        };
    }, []);

    const isFetchingRef = useRef(false);

    // Reusable analysis function
    const analyzeActivity = useCallback(async (activityId?: number | string) => {
        try {
            const storedAthlete = localStorage.getItem('strava_athlete');
            let athleteId: number | undefined;
            if (storedAthlete) {
                try {
                    athleteId = JSON.parse(storedAthlete).id;
                } catch {
                    console.error("Failed to parse athlete ID");
                }
            }
            if (!athleteId) {
                // 如果是自動執行且失敗，可能不應直接報錯給用戶看，但如果是手動點擊分析則應提示
                if (activityId) {
                    addMessage('assistant', '無法識別運動員身份，請重新連結 Strava。');
                }
                return;
            }

            const endpoint = activityId
                ? `/api/v1/db/activities/${activityId}/analysis?athlete_id=${athleteId}`
                : `/api/v1/db/activities/latest?athlete_id=${athleteId}`;

            addMessage('assistant', `正在分析${activityId ? '指定的' : '最新'}活動數據...`);

            const response = await fetch(endpoint, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('strava_access_token') || ''}`
                }
            });

            if (!response.ok) {
                throw new Error('無法從伺服器取得數據');
            }
            const activity = await response.json();

            if (activity) {
                // 2. Parsed Data Logic
                const bikeName = activity.bike_name || '未知單車';

                console.log('Bike:', bikeName);
                const power = activity.weighted_average_watts || activity.average_watts || 150;

                let ftp = 200;
                const manualFtp = localStorage.getItem('user_ftp');
                if (manualFtp) {
                    ftp = parseInt(manualFtp, 10);
                } else if (storedAthlete) {
                    try {
                        const profile = JSON.parse(storedAthlete);
                        if (profile.ftp) ftp = profile.ftp;
                    } catch {
                        // ignore JSON parse error
                    }
                }

                const intensityFactor = power / ftp;
                const movingTime = activity.moving_time || 3600;
                const tss = Math.round((movingTime * power * intensityFactor) / (ftp * 3600) * 100);

                const newData: UserHardData = {
                    ftp,
                    yesterdayTss: tss,
                    yesterdayIf: Number(intensityFactor.toFixed(2)),
                    tsb: -15, // Simplified TSB model since we don't track full history here
                    recentActivities: [activity] as unknown as StravaActivity[],
                    sufferScore: activity.suffer_score || 0,
                    kilojoules: activity.kilojoules || 0,
                    maxHeartRate: activity.max_heartrate || 0,
                    avgHeartRate: activity.average_heartrate || 0
                };

                setHardData(newData);

                // Stream Analysis
                let streamMessage = '';
                try {
                    const streamsArray = activity.streams;
                    if (streamsArray) {
                        const analysis = analyzeStreams(streamsArray as StravaStream[], ftp);
                        const distribution = getZoneDistribution(analysis);
                        if (analysis.hasPower) {
                            streamMessage = `\n\n#### **強度分佈 (Power Profile)**\n`;
                            streamMessage += `根據秒級數據分析，您的功率分佈如下：\n`;
                            streamMessage += `| 區間 | 比例 | 狀態 |\n| :--- | :--- | :--- |\n`;
                            streamMessage += `| Zone 1-2 | ${distribution[1] + distribution[2]}% | 基礎有氧 |\n`;
                            streamMessage += `| Zone 3-4 | ${distribution[3] + distribution[4]}% | 訓練負擔 |\n`;
                            streamMessage += `| Zone 5-6 | ${distribution[5] + distribution[6]}% | 高強度無氧 |\n`;
                        }
                    }
                } catch (e) { console.error(e); }

                let statusMsg = `![Strava](/strava-logo.png)\n\n### **運動數據分析報告**\n\n`;
                statusMsg += `| 項目 | 詳細資訊 |\n`;
                statusMsg += `| :--- | :--- |\n`;
                statusMsg += `| **運動名稱** | ${activity.name} |\n`;
                statusMsg += `| **預估負擔** | TSS ${tss} (IF: ${newData.yesterdayIf}) |\n`;
                statusMsg += streamMessage;

                addMessage('assistant', statusMsg);

                // 如果是自動初始化的流程，則提示進行下一步
                if (!activityId) {
                    setTimeout(() => {
                        addMessage('assistant', '根據數據顯示，您昨天的訓練負荷較高。請回報目前的「自覺體感」，讓我為您微調明天的課表。', 'form');
                        setFlowState('DIAGNOSTIC');
                    }, 1000);
                } else {
                    // 如果是手動點選，可能只需要顯示結果，無需強制進入 DIAGNOSTIC，
                    // 或者給一個 "開始課表規劃" 的按鈕？
                    // 為了保持一致性，我們也提示
                    setTimeout(() => {
                        addMessage('assistant', '已加載此活動數據。如需規劃明日課表，請回報「自覺體感」。', 'form');
                        setFlowState('DIAGNOSTIC');
                    }, 1000);
                }
            }
        } catch (error) {
            console.error(error);
            addMessage('assistant', '分析失敗，請確認網路連線。');
        }
    }, [addMessage]);

    // Initial Fetch (Auto-analyze latest)
    useEffect(() => {
        if (hasToken && flowState === 'INGESTION' && !hardData && !isFetchingRef.current) {
            isFetchingRef.current = true;
            analyzeActivity().finally(() => {
                isFetchingRef.current = false;
            });

        }
    }, [hasToken, flowState, hardData, analyzeActivity]);

    // Listen for manual FTP updates
    useEffect(() => {
        const handleFtpUpdate = () => {
            setHardData(null);
            isFetchingRef.current = false;
        };

        window.addEventListener('user-ftp-update', handleFtpUpdate);
        return () => window.removeEventListener('user-ftp-update', handleFtpUpdate);
    }, []);

    const handleIngestion = useCallback((input: string) => {
        addMessage('user', input);

        setTimeout(() => {
            // Mock Logic if needed, but primarily we depend on analyzeActivity
            const mockData: UserHardData = {
                ftp: 250,
                yesterdayTss: 150,
                yesterdayIf: 0.9,
                tsb: -25
            };
            setHardData(mockData);

            addMessage('assistant', `數據分析完畢。昨天的 TSS 高達 ${mockData.yesterdayTss} (IF ${mockData.yesterdayIf})，累積疲勞 TSB 為 ${mockData.tsb}。這對生理負擔很大。`);

            setTimeout(() => {
                addMessage('assistant', '在確認明天的課表前，請回報您的狀態。', 'form');
                setFlowState('DIAGNOSTIC');
            }, 1000);
        }, 1500);
    }, [addMessage]);

    const handleDiagnostic = useCallback((data: UserSubjectiveData) => {
        if (!hardData) return;

        addMessage('user', `RPE: ${data.rpe}, 感覺: ${data.feeling === 'tired' ? '累' : '還好'}`);

        const result = decideTraining(hardData, data);
        setDecision(result);

        const generatedWorkout = generateWorkout(result);
        setWorkout(generatedWorkout);

        setTimeout(() => {
            addMessage('assistant', result.reason);
            setTimeout(() => {
                addMessage('assistant', '這是為您規劃的明天課表：', 'result');
                setFlowState('PRESCRIPTION');
            }, 500);
        }, 1000);
    }, [hardData, addMessage]);

    return {
        messages,
        input,
        setInput,
        handleSend: handleIngestion,
        handleDiagnostic,
        decision,
        flowState,
        hardData,
        analyzeActivity,
        workout // Added workout to return type if needed by UI
    };
}
