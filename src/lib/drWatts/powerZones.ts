import { PowerZone, Zone } from '../../types/coach';

export const ZONES: Record<Zone, PowerZone> = {
    1: { zone: 1, name: 'Active Recovery', minPct: 0, maxPct: 55, description: '<55% FTP. 排酸、動態恢復。' },
    2: { zone: 2, name: 'Endurance', minPct: 56, maxPct: 75, description: '56-75% FTP. 有氧基礎與代謝效率。' },
    3: { zone: 3, name: 'Tempo', minPct: 76, maxPct: 90, description: '76-90% FTP. 肌肉耐力區間。' },
    4: { zone: 4, name: 'Threshold', minPct: 91, maxPct: 105, description: '91-105% FTP. 功能性閾值功率。' },
    5: { zone: 5, name: 'VO2Max', minPct: 106, maxPct: 120, description: '106-120% FTP. 擴大有氧引擎。' },
    6: { zone: 6, name: 'Anaerobic', minPct: 121, maxPct: 200, description: '>121% FTP. 無氧爆發。' },
};

export function getZone(pct: number): PowerZone {
    if (pct <= 55) return ZONES[1];
    if (pct <= 75) return ZONES[2];
    if (pct <= 90) return ZONES[3];
    if (pct <= 105) return ZONES[4];
    if (pct <= 120) return ZONES[5];
    return ZONES[6];
}

export function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m${s > 0 ? ` ${s}s` : ''}`;
}
