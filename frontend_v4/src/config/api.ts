/**
 * API 및 WebSocket 서버 설정
 * 환경 변수에서 서버 주소를 읽습니다.
 *
 * ngrok 터널 생성 방법:
 * - HTTP API: ngrok http 8000
 * - WebSocket: ngrok http 8080 (또는 ngrok tcp 8080)
 *
 * ⚠️ 중요: ngrok URL에 포트번호를 포함하면 안 됩니다!
 * ngrok이 자동으로 포트를 매핑합니다.
 */

// HTTP API 서버 (메인 백엔드 - 포트 8000)
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'https://nana-nondefiant-jodee.ngrok-free.dev';

// WebSocket 서버 (실시간 위치 공유 - 포트 8080)
// ngrok에서 WebSocket을 사용할 때는 https/wss 사용 필요
// ngrok이 HTTP를 WSS로 자동 변환합니다.
export const WS_BASE_URL =
  import.meta.env.VITE_WS_BASE_URL || 'wss://paramedical-unsortable-nan.ngrok-free.dev';

/**
 * 날씨 정보 API 엔드포인트
 */
export const WEATHER_ENDPOINT = API_BASE_URL;

/**
 * WebSocket 연결 엔드포인트
 */
export const WS_ENDPOINT = `${WS_BASE_URL}/ws`;

/**
 * API 요청 옵션
 */
export const API_REQUEST_OPTIONS: RequestInit = {
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include', // 쿠키 포함
};

/**
 * WebSocket 연결 설정
 */
export const WS_CONFIG = {
  url: WS_ENDPOINT,
  reconnectInterval: 3000, // 3초마다 재연결 시도
  maxReconnectAttempts: 5,
};
