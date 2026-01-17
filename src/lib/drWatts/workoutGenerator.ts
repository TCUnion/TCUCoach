import { DailyWorkout, WorkoutStep } from '../../types/coach';
import { DecisionResult } from '../../types/coach';

export function generateWorkout(decision: DecisionResult): DailyWorkout {
    const steps: WorkoutStep[] = [];
    let title = '';
    let focus = '' as DailyWorkout['focus'];
    let totalDuration = 0;

    switch (decision.type) {
        case 'RECOVERY':
            title = 'Active Recovery Spin';
            focus = 'Recovery';
            steps.push(
                { type: 'warmup', durationSeconds: 600, powerPct: 50, description: '輕鬆踩踏，喚醒肌肉' },
                { type: 'active', durationSeconds: 1200, powerPct: 55, description: '保持 Zone 1，專注呼吸與放鬆' },
                { type: 'cooldown', durationSeconds: 300, powerPct: 45, description: '極輕齒比緩和' }
            );
            break;

        case 'ADAPTIVE_CAP':
            title = 'Strict Zone 2 Endurance';
            focus = 'Endurance';
            steps.push(
                { type: 'warmup', durationSeconds: 600, powerPct: 55, description: '緩慢熱身' },
                { type: 'active', durationSeconds: 2400, powerPct: 70, description: '穩定的 Zone 2 輸出，禁止進入 Zone 3' },
                { type: 'cooldown', durationSeconds: 600, powerPct: 50, description: '緩和' }
            );
            break;

        case 'TECHNIC':
            title = 'Cadence Drills & Neuromuscular';
            focus = 'Anaerobic'; // Using Anaerobic zone for short bursts
            steps.push(
                { type: 'warmup', durationSeconds: 900, powerPct: 60, description: '熱身，漸進提升轉速' },
                { type: 'active', durationSeconds: 30, powerPct: 110, cadence: 110, description: '高轉速爆發 (專注流暢度)' },
                { type: 'rest', durationSeconds: 270, powerPct: 50, description: '完全恢復' },
                { type: 'active', durationSeconds: 30, powerPct: 110, cadence: 120, description: '高轉速爆發' },
                { type: 'rest', durationSeconds: 270, powerPct: 50, description: '完全恢復' },
                { type: 'active', durationSeconds: 30, powerPct: 110, cadence: 130, description: '高轉速爆發 (最高速)' },
                { type: 'cooldown', durationSeconds: 600, powerPct: 50, description: '緩和' }
            );
            break;

        case 'TARGET':
            title = 'Sweet Spot Training (SST)';
            focus = 'Threshold';
            steps.push(
                { type: 'warmup', durationSeconds: 600, powerPct: 60, description: '熱身' },
                { type: 'active', durationSeconds: 300, powerPct: 80, description: 'Tempo 區間準備' },
                { type: 'rest', durationSeconds: 180, powerPct: 55, description: '恢復' },
                { type: 'active', durationSeconds: 1200, powerPct: 90, description: 'SST Block 1 (90% FTP)' },
                { type: 'rest', durationSeconds: 300, powerPct: 55, description: '恢復' },
                { type: 'active', durationSeconds: 1200, powerPct: 90, description: 'SST Block 2 (90% FTP)' },
                { type: 'cooldown', durationSeconds: 600, powerPct: 50, description: '緩和' }
            );
            break;
    }

    totalDuration = steps.reduce((acc, s) => acc + s.durationSeconds, 0);

    // Simple TSS Check (Approx)
    // TSS = (sec * NP * IF) / (FTP * 3600) * 100
    // Here we approximate IF as powerPct/100
    const totalTss = steps.reduce((acc, s) => {
        const rawTss = (s.durationSeconds * (s.powerPct / 100) ** 2) / 36; // Simplified formula
        return acc + rawTss;
    }, 0);

    return {
        title,
        focus,
        decisionReason: decision.reason,
        steps,
        totalTss: Math.round(totalTss),
        totalDurationSeconds: totalDuration
    };
}

export function generateZwo(workout: DailyWorkout): string {
    let xml = `<workout_file>\n`;
    xml += `  <author>TCU Coach</author>\n`;
    xml += `  <name>${workout.title}</name>\n`;
    xml += `  <description>${workout.decisionReason}</description>\n`;
    xml += `  <tags>\n    <tag name="TCUCoach"/>\n  </tags>\n`;
    xml += `  <workout>\n`;

    workout.steps.forEach(step => {
        const duration = step.durationSeconds;
        const power = step.powerPct / 100;

        if (step.type === 'warmup') {
            xml += `    <Warmup Duration="${duration}" PowerLow="0.25" PowerHigh="${power}"><![CDATA[${step.description}]]></Warmup>\n`;
        } else if (step.type === 'cooldown') {
            xml += `    <Cooldown Duration="${duration}" PowerLow="${power}" PowerHigh="0.25"><![CDATA[${step.description}]]></Cooldown>\n`;
        } else if (step.type === 'active' || step.type === 'rest') {
            // IntervalsT / SteadyState
            xml += `    <SteadyState Duration="${duration}" Power="${power}"${step.cadence ? ` Cadence="${step.cadence}"` : ''}><![CDATA[${step.description}]]></SteadyState>\n`;
        }
    });

    xml += `  </workout>\n</workout_file>`;
    return xml;
}
