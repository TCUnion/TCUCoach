import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { UserHardData, UserSubjectiveData, ChatMessage, DailyWorkout, DecisionResult } from '../../types/coach';
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

    // 宣告一個 ref 來防止重複抓取 (尤其是在 React 18 Strict Mode 下)
    const isFetchingRef = useRef(false);

    // Check for Strava Token and Fetch Data
    useEffect(() => {
        if (hasToken && flowState === 'INGESTION' && !hardData && !isFetchingRef.current) {

            const fetchData = async () => {
                isFetchingRef.current = true;
                try {
                    addMessage('assistant', '偵測到 Strava 連結，正在同步最近活動數據...', 'text');

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

                    // 1. 從新的 strava_activities 資料表抓取最新活動
                    // 必須先從 LocalStorage 取得當前使用者的 Strava ID
                    const storedAthlete = localStorage.getItem('strava_athlete');
                    let athleteId: number | undefined;
                    if (storedAthlete) {
                        try {
                            athleteId = JSON.parse(storedAthlete).id;
                        } catch {
                            console.error("Failed to parse athlete ID");
                        }
                    }

                    // 建構查詢 (最近 30 天)
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                    const dateLimit = thirtyDaysAgo.toISOString();

                    let query = supabase
                        .from('strava_activities')
                        .select('id, athlete_id, name, moving_time, average_watts, weighted_average_watts, start_date, start_date_local, gear_id, device_name, average_heartrate, max_heartrate, average_temp, distance, total_elevation_gain, suffer_score, kilojoules')
                        .gte('start_date', dateLimit)
                        .order('start_date', { ascending: false });

                    // 若有 ID 則進行過濾，確保只看到自己的數據
                    if (athleteId) {
                        query = query.eq('athlete_id', athleteId);
                    }

                    const { data: recentActivities, error } = await query;

                    if (error) throw error;

                    if (recentActivities && recentActivities.length > 0) {
                        const lastActivity = recentActivities[0];

                        // 2. 獲取單車名稱 (如果要顯示使用的車子)
                        let bikeName = '未知單車';
                        if (lastActivity.gear_id) {
                            const { data: bikeData } = await supabase
                                .from('bikes')
                                .select('name')
                                .eq('id', lastActivity.gear_id)
                                .maybeSingle();
                            if (bikeData) bikeName = bikeData.name;
                        }

                        // 3. 計算 TSS 與強度 (IF)
                        // 優先使用加權平均功率 (Weighted Average Watts)，若無則用平均功率
                        const power = lastActivity.weighted_average_watts || lastActivity.average_watts || 150;
                        
                        // 優先順序: 1. 手動設定 (LocalStorage) 2. Strava Profile 3. 預設值 (200)
                        let ftp = 200; 
                        const manualFtp = localStorage.getItem('user_ftp');

                        if (manualFtp) {
                            ftp = parseInt(manualFtp, 10);
                        } else if (storedAthlete) {
                            try {
                                const profile = JSON.parse(storedAthlete);
                                if (profile.ftp) ftp = profile.ftp;
                            } catch (e) {
                                console.error("Failed to parse stored athlete for FTP", e);
                            }
                        }

                        const intensityFactor = power / ftp;

                        // TSS 公式: (sec * power * IF) / (FTP * 3600) * 100
                        const movingTime = lastActivity.moving_time || 3600;
                        const tss = Math.round((movingTime * power * intensityFactor) / (ftp * 3600) * 100);

                        const newData: UserHardData = {
                            ftp,
                            yesterdayTss: tss,
                            yesterdayIf: Number(intensityFactor.toFixed(2)),
                            tsb: -15, // 模擬 TSB 疲勞值
                            recentActivities: recentActivities, // Pass all fetched activities
                            sufferScore: lastActivity.suffer_score || 0,
                            kilojoules: lastActivity.kilojoules || 0,
                            maxHeartRate: lastActivity.max_heartrate || 0,
                            avgHeartRate: lastActivity.average_heartrate || 0
                        };

                        setHardData(newData);

                        // 4.1 抓取並分析 Strava Streams (時序數據)
                        let streamMessage = '';
                        try {
                            // 先從 Supabase 抓取
                            let { data: streamData } = await supabase
                                .from('strava_streams')
                                .select('streams')
                                .eq('activity_id', lastActivity.id)
                                .maybeSingle();

                            if (!streamData && hasToken) {
                                // 若 Supabase 沒有，嘗試從 Strava API 抓取並同步 (Fallback 邏輯)
                                const token = localStorage.getItem('strava_access_token');
                                const response = await fetch(`https://www.strava.com/api/v3/activities/${lastActivity.id}/streams?keys=time,distance,latlng,altitude,velocity_smooth,heartrate,cadence,watts,temp,moving,grade_smooth&key_by_type=true`, {
                                    headers: { 'Authorization': `Bearer ${token}` }
                                });

                                if (response.ok) {
                                    const rawStreams = await response.json();
                                    // 轉換為陣列格式儲存
                                    const streamsArray = Object.keys(rawStreams).map(key => ({
                                        type: key,
                                        ...rawStreams[key]
                                    }));

                                    await supabase.from('strava_streams').upsert({
                                        activity_id: lastActivity.id,
                                        streams: streamsArray
                                    });
                                    streamData = { streams: streamsArray };
                                }
                            }

                            if (streamData) {
                                const analysis = analyzeStreams(streamData.streams as StravaStream[], ftp);
                                const distribution = getZoneDistribution(analysis);
                                if (analysis.hasPower) {
                                    streamMessage = `\n\n#### **強度分佈 (Power Profile)**\n`;
                                    streamMessage += `根據秒級數據分析，您的功率分佈如下：\n`;
                                    streamMessage += `| 區間 | 比例 | 狀態 |\n| :--- | :--- | :--- |\n`;
                                    streamMessage += `| Zone 1-2 | ${distribution[1] + distribution[2]}% | 基礎有氧 |\n`;
                                    streamMessage += `| Zone 3-4 | ${distribution[3] + distribution[4]}% | 訓練負擔 |\n`;
                                    streamMessage += `| Zone 5-6 | ${distribution[5] + distribution[6]}% | 高強度無氧 |\n`;

                                    if (analysis.maxWatts > ftp * 1.5) {
                                        streamMessage += `\n*備註：偵測到多處高功率衝刺 (${analysis.maxWatts}W)，這會加速神經疲勞。*`;
                                    }
                                }
                            }
                        } catch (streamErr) {
                            console.error('Stream sync/analysis failed:', streamErr);
                        }

                        // 4. 組合更詳細的運動狀態通知 (表格化)
                        let statusMsg = `![Strava](/strava-logo.png)\n\n### **運動數據同步成功！**\n\n`;
                        statusMsg += `| 項目 | 詳細資訊 |\n`;
                        statusMsg += `| :--- | :--- |\n`;
                        statusMsg += `| **運動名稱** | ${lastActivity.name || '未命名活動'} |\n`;
                        statusMsg += `| **使用的車子** | ${bikeName} |\n`;
                        statusMsg += `| **使用設備** | ${lastActivity.device_name || '未知設備'} |\n`;
                        statusMsg += `| **運動數據** | ${Math.round(power)}W / ${Math.round(lastActivity.average_heartrate || 0)}bpm |\n`;
                        if (lastActivity.average_temp) {
                            statusMsg += `| **環境溫度** | ${lastActivity.average_temp}°C |\n`;
                        }
                        statusMsg += `| **預估負擔** | TSS ${tss} (IF: ${newData.yesterdayIf}) |\n`;

                        // 附加 Stream 分析訊息
                        statusMsg += streamMessage;

                        addMessage('assistant', statusMsg);

                        setTimeout(() => {
                            addMessage('assistant', '根據數據顯示，您昨天的訓練負荷較高。請回報目前的「自覺體感」，讓我為您微調明天的課表。', 'form');
                            setFlowState('DIAGNOSTIC');
                        }, 1000);

                    } else {
                        addMessage('assistant', '資料庫中尚未發現您的活動紀錄，請確認您已在 Strava 上傳活動。');
                    }

                } catch (e) {
                    console.error(e);
                    addMessage('assistant', '資料同步失敗，請檢查網路或是 Supabase 連線。');
                }
            };
            fetchData();
        }
    }, [hasToken, flowState, hardData, addMessage]); 

    // Listen for manual FTP updates
    useEffect(() => {
        const handleFtpUpdate = () => {
           // Reset hardData to null to trigger refetch (simple way)
           // Or ideally, just update the FTP part of hardData.
           // For simplicity in this Architecture:
           setHardData(null); 
           isFetchingRef.current = false; // Allow refetch
        };

        window.addEventListener('user-ftp-update', handleFtpUpdate);
        return () => window.removeEventListener('user-ftp-update', handleFtpUpdate);
    }, []);

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
