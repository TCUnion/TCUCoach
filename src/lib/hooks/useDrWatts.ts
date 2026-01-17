import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../supabase';
import { UserHardData, UserSubjectiveData, ChatMessage, DailyWorkout, DecisionResult } from '../../types/coach';
import { decideTraining } from '../drWatts/decisionEngine';
import { generateWorkout } from '../drWatts/workoutGenerator';

export type FlowState = 'INGESTION' | 'DIAGNOSTIC' | 'PRESCRIPTION';

const INITIAL_MESSAGES: ChatMessage[] = [
    {
        id: 'intro',
        role: 'assistant',
        content: '我是 TCU 教練，您的科學化運動分析師。請上傳您最近的訓練日誌 (檔案/截圖) 或描述您目前的訓練負荷，我需要先解讀您的基礎數據 (Baseline)，才能為您規劃明天的課表。',
        timestamp: Date.now(),
    }
];

export function useDrWatts() {
    const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
    const [flowState, setFlowState] = useState<FlowState>('INGESTION');
    const [hardData, setHardData] = useState<UserHardData | null>(null);
    const [decision, setDecision] = useState<DecisionResult | null>(null);
    const [workout, setWorkout] = useState<DailyWorkout | null>(null);

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
        // Also listen for custom event if we want to support same-window updates in future
        window.addEventListener('strava-token-update', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('strava-token-update', handleStorageChange);
        };
    }, []);

    // Check for Strava Token and Fetch Data
    useEffect(() => {
        if (hasToken && flowState === 'INGESTION' && !hardData) {

            const fetchData = async () => {
                try {
                    addMessage('assistant', '偵測到 Strava連結，正在同步最近活動數據...', 'text');

                    // 1. Get Strava Athlete ID first
                    // In a real app we might store this in local storage too, but let's query profiles to be sure or just assume we have it.
                    // For now, we'll try to find the latest effort regardless of user to test connection, 
                    // OR if we want to be strict, we need to know the athlete's ID.
                    // Since we don't have a backend exchanging token for ID easily here without calling Strava API directly:
                    // We will query `segment_efforts` order by start_date descending.
                    // Ideally we should filter by the logged in user's strava_id. 
                    // Let's try to fetch the latest effort in the whole DB for demo purposes if we don't have the ID,
                    // or better: let's fetch the latest effort where we have a match.

                    // NOTE: In the reference repo, they use `useSegmentData` which fetches ALL efforts.
                    // Here we just want the LATEST activity for the current user.
                    // Without a backend exchange, we can't easily get the Strava Athlete ID from the access token securely on client side 
                    // unless we call Strava API via the n8n proxy or directly if Scope allows.
                    // Let's assume for this "TCUnion/race" integration, we are sharing the same database.

                    // Simple approach: Fetch the most recent segment effort added to Supabase.
                    const { data: latestEfforts, error } = await supabase
                        .from('segment_efforts')
                        .select('*')
                        .order('start_date', { ascending: false })
                        .limit(1);

                    if (error) throw error;

                    if (latestEfforts && latestEfforts.length > 0) {
                        const lastActivity = latestEfforts[0];

                        // Map Supabase data to our HardData model
                        // TSS is not standard in segment_efforts, usually it's in detailed activity.
                        // We will estimate TSS like before if missing, or use power data.

                        // If average_watts is present
                        const avgWatts = lastActivity.average_watts || 150;
                        const ftp = 250; // Default FTP
                        const intensityFactor = avgWatts / ftp;

                        // Estimate TSS: (sec * NP * IF) / (FTP * 3600) * 100
                        // simplified: (moving_time * avgWatts * IF) ... roughly.
                        // Let's use the simple IF we calculated.
                        const movingTime = lastActivity.elapsed_time || 3600;
                        const tss = Math.round((movingTime * avgWatts * intensityFactor) / (ftp * 3600) * 100);

                        const newData: UserHardData = {
                            ftp,
                            yesterdayTss: tss,
                            yesterdayIf: Number(intensityFactor.toFixed(2)),
                            tsb: -15 // Mock TSB
                        };

                        setHardData(newData);
                        addMessage('assistant', `Strava 同步完成 (via Supabase)！
                        \n最近活動: "${lastActivity.segment_name || '未知路段'}"
                        \n功率: ${Math.round(avgWatts)}W
                        \n心率: ${Math.round(lastActivity.average_heartrate || 0)}bpm
                        \n預估 TSS: ${tss} (IF: ${newData.yesterdayIf})`);

                        setTimeout(() => {
                            addMessage('assistant', '數據顯示疲勞累積。請回報今日狀態以調整明日課表。', 'form');
                            setFlowState('DIAGNOSTIC');
                        }, 1000);

                    } else {
                        addMessage('assistant', '資料庫中未發現近期活動紀錄。');
                        // Reset token if invalid? No, just no data found.
                    }

                } catch (e) {
                    console.error(e);
                    addMessage('assistant', '資料同步失敗，請檢查網路或是 Supabase 連線。');
                }
            };
            fetchData();
        }
    }, [hasToken, flowState, hardData, addMessage]); // Depend on hasToken

    const handleIngestion = useCallback((input: string) => {
        // 模擬解析過程 (Mock parsing hard data from input string)
        // 實際應用中這裡會接 LLM 或 Regex 解析
        addMessage('user', input);

        setTimeout(() => {
            // 模擬解析出 Hard Data
            const mockData: UserHardData = {
                ftp: 250,
                yesterdayTss: 150,
                yesterdayIf: 0.9,
                tsb: -25 // High Fatigue
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

        // Add user response specific to form data manually or just a confirmation
        addMessage('user', `RPE: ${data.rpe}, 感覺: ${data.feeling === 'tired' ? '累' : '還好'}`);

        // Run Logic Engine
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
        flowState,
        handleIngestion,
        handleDiagnostic,
        workout,
        decision,
        hardData
    };
}
