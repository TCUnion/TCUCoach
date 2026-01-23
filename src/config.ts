/**
 * 全域設定檔
 * 
 * VITE_API_URL: 
 * - 開發環境: 通常未設定 (使用空字串)，透過 vite.config.ts proxy 轉發到 localhost:8000
 * - 生產環境: 指向後端 API 的完整 URL (例如: https://tcu-api.zeabur.app)
 */
// 去除結尾斜線並確保變數存在
const rawUrl = import.meta.env.VITE_API_URL || '';
export const API_BASE_URL = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;

// [Debug] 在 Console 顯示 API 設定狀態，方便除錯
console.log(`[Config] API_BASE_URL loaded: "${API_BASE_URL}"`);
if (!API_BASE_URL) {
    console.warn('[Config] VITE_API_URL is empty! Requests will fallback to relative path.');
}
