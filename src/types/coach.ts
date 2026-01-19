export type Zone = 1 | 2 | 3 | 4 | 5 | 6;

export interface PowerZone {
    zone: Zone;
    name: string;
    minPct: number;
    maxPct: number;
    description: string;
}

export interface UserHardData {
    ftp: number;
    yesterdayTss: number;
    yesterdayIf: number;
    tsb: number; // Training Stress Balance
    recentActivities?: any[];
    sufferScore?: number;
    kilojoules?: number;
    maxHeartRate?: number;
    avgHeartRate?: number;
}

export interface UserSubjectiveData {
    rpe: number; // 1-10
    soreness: boolean;
    sleepQuality: 'poor' | 'average' | 'good';
    feeling: 'tired' | 'ok' | 'fresh';
}

export interface WorkoutStep {
    type: 'warmup' | 'active' | 'rest' | 'cooldown';
    durationSeconds: number;
    powerPct: number; // %FTP
    cadence?: number;
    description: string;
}

export interface DailyWorkout {
    title: string;
    focus: 'Recovery' | 'Endurance' | 'Tempo' | 'Threshold' | 'VO2Max' | 'Anaerobic';
    decisionReason: string; // From decision matrix
    steps: WorkoutStep[];
    totalTss: number;
    totalDurationSeconds: number;
    nutritionStrategy?: {
        pre: string;
        during: string;
        post: string;
    };
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    type?: 'text' | 'form' | 'result';
    timestamp: number;
}

export type DecisionType = 'RECOVERY' | 'ADAPTIVE_CAP' | 'TECHNIC' | 'TARGET';

export interface DecisionResult {
    type: DecisionType;
    reason: string;
    recommendedFocus: string;
}
