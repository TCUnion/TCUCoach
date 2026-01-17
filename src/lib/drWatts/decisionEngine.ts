import { UserHardData, UserSubjectiveData, DecisionResult } from '../../types/coach';

export function decideTraining(
    hardData: UserHardData,
    subjective: UserSubjectiveData
): DecisionResult {
    const { tsb } = hardData;
    const { feeling, sleepQuality, soreness, rpe } = subjective;

    const isFatigued = tsb < -10; // TSB below -10 indicates significant accumulated fatigue
    const isFresh = tsb >= -10;

    const feelsBad = feeling === 'tired' || soreness || sleepQuality === 'poor' || rpe >= 7;
    const feelsGood = feeling !== 'tired' && !soreness && rpe < 7;

    // Decision Matrix
    if (isFatigued && feelsBad) {
        return {
            type: 'RECOVERY',
            reason: '數據顯示累積疲勞高 (Low TSB)，且您主觀感到疲憊/痠痛。為防止過度訓練，今日強制休息或主動恢復。',
            recommendedFocus: 'Active Recovery (Zone 1)'
        };
    }

    if (isFatigued && feelsGood) {
        return {
            type: 'ADAPTIVE_CAP',
            reason: '數據顯示累積疲勞高，雖然您感覺不錯，但為避免生理崩潰，今日強度上限鎖定在 Zone 2 (有氧騎)。',
            recommendedFocus: 'Endurance (Zone 2)'
        };
    }

    if (isFresh && feelsBad) {
        return {
            type: 'TECHNIC',
            reason: '數據顯示體能狀態鮮活 (High TSB)，但您主觀感到無力。建議進行技巧訓練或神經啟動，避免高負重。',
            recommendedFocus: 'Neuromuscular / Cadence'
        };
    }

    // isFresh && feelsGood
    return {
        type: 'TARGET',
        reason: '數據與體感皆顯示狀態良好，可以執行目標課表。',
        recommendedFocus: 'SST / VO2Max / Threshold'
    };
}
