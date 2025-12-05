import { useEffect, useState } from 'react';
import LeafletMap from './LeafletMap';
import { useWebSocket, UserLocation } from '../../hooks/useWebSocket';
import { filterNearbyUsers, generateClientId } from '../../services/locationService';
import { WS_ENDPOINT } from '../../config/api';
// 나중에 카카오맵으로 바꿀 때는 아래처럼 import 교체하면 됨
// import KakaoMap from "./KakaoMap";

interface GPSPosition {
  lat: number;
  lng: number;
}

interface GPSMapProps {
  /**
   * 지도 높이 (기본값: 500px)
   * Running 컴포넌트에서는 더 작게, 다른 화면에서는 더 크게 설정 가능
   */
  height?: string;
  /**
   * 지도 줌 레벨 (기본값: 16)
   */
  zoom?: number;
  /**
   * GPS 위치 변경 시 콜백 함수 (Running에서 실시간 속도/거리 계산용)
   */
  onPositionChange?: (position: GPSPosition) => void;
  /**
   * WebSocket 서버 주소 (기본값: ws://localhost:8000/ws)
   */
  wsUrl?: string;
  /**
   * 실시간 사용자 위치 표시 여부 (기본값: true)
   */
  showOtherUsers?: boolean;
  /**
   * 코스 경로 좌표 (선택사항)
   */
  routeCoordinates?: [number, number][];
  /**
   * 장소 마커 좌표 (선택사항)
   */
  placeMarker?: [number, number] | null;
}

/**
 * GPS 실시간 위치 추적 + 지도 통합 컴포넌트
 *
 * 기능:
 * - 브라우저 Geolocation API를 사용해 실시간 GPS 위치 추적
 * - Leaflet 지도에 현재 위치 마커 표시
 * - WebSocket을 통해 다른 사용자 위치 실시간 수신
 * - 10km 반경 필터링으로 근처 사용자만 표시
 * - 옵션: 위치 변경 시 부모 컴포넌트에 콜백 (거리/속도 계산용)
 *
 * 나중에 카카오맵으로 변경하려면:
 * 1. LeafletMap import → KakaoMap import로 변경
 * 2. KakaoMap.tsx 파일 생성 (같은 Props 인터페이스 사용)
 * 3. GPS 추적 로직(watchPosition)은 그대로 사용 가능
 */
export function GPSMap({
  height = '500px',
  zoom = 16,
  onPositionChange,
  wsUrl = WS_ENDPOINT,
  showOtherUsers = true,
  routeCoordinates = [],
  placeMarker = null,
}: GPSMapProps) {
  const [position, setPosition] = useState<GPSPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [nearbyUsers, setNearbyUsers] = useState<UserLocation[]>([]);
  const [clientId] = useState(() => generateClientId());
  const [userId] = useState(() => localStorage.getItem('userId') || undefined);
  const [isLoginRequired, setIsLoginRequired] = useState(false);

  // 로그인 여부 확인
  const isLoggedIn = !!userId;

  // WebSocket 연결 (고정 userId를 함께 전달)
  const { isConnected, otherUsers, sendLocation } = useWebSocket(clientId, wsUrl, userId);

  useEffect(() => {
    // console.log('GPSMap mounted - GPS 추적 시작');
    // console.log('🔐 로그인 상태:', isLoggedIn ? `userId: ${userId}` : '로그인하지 않음');

    // 로그인하지 않은 사용자는 위치 공유 불가
    if (!isLoggedIn) {
      setIsLoginRequired(true);
      setIsLoading(false);
      console.warn('⚠️ 로그인하지 않은 사용자는 위치 공유를 할 수 없습니다.');
      return;
    }

    if (!navigator.geolocation) {
      setError('이 브라우저는 GPS를 지원하지 않습니다.');
      setIsLoading(false);
      return;
    }

    /**
     * GPS 실시간 위치 추적 (10초마다)
     * - enableHighAccuracy: true → 더 정확한 위치 (배터리 많이 사용)
     * - maximumAge: 0 → 캐시 사용 안 함 (항상 최신 위치)
     * - timeout: 10000 → 10초 이내에 위치를 못 가져오면 오류
     */
    const updatePosition = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newPosition: GPSPosition = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          // console.log('GPS 위치 업데이트 (10초 주기):', newPosition);
          setPosition(newPosition);
          setError(null);
          setIsLoading(false);

          // WebSocket으로 위치 정보 전송 (다른 사용자들이 볼 수 있도록)
          if (isConnected && showOtherUsers) {
            sendLocation(pos.coords.latitude, pos.coords.longitude);
          }

          // 부모 컴포넌트에 위치 변경 알림 (Running 컴포넌트에서 거리/시간 계산)
          if (onPositionChange) {
            onPositionChange(newPosition);
          }
        },
        (err) => {
          console.error('GPS 오류:', err);
          console.error('오류 코드:', err.code, '오류 메시지:', err.message);

          let errorMessage = `GPS 오류: ${err.message}`;
          if (err.code === err.PERMISSION_DENIED) {
            errorMessage = '위치 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요.';
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            errorMessage = 'GPS 신호를 찾을 수 없습니다. 실외에서 시도해주세요.';
          } else if (err.code === err.TIMEOUT) {
            errorMessage = 'GPS 위치 접근 시간 초과. 다시 시도해주세요.';
          }

          setError(errorMessage);
          setIsLoading(false);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 10000,
        }
      );
    };

    // 즉시 한 번 실행
    updatePosition();

    // 10초마다 반복 실행
    const intervalId = setInterval(updatePosition, 10000);

    // 컴포넌트 언마운트 시 GPS 추적 중지 (배터리 절약)
    return () => {
      // console.log('GPSMap unmounted - GPS 추적 중지');
      clearInterval(intervalId);
    };
  }, [onPositionChange, isConnected, sendLocation, showOtherUsers]);

  /**
   * 다른 사용자 위치를 10km 반경으로 필터링
   */
  useEffect(() => {
    if (position && showOtherUsers && otherUsers.length > 0) {
      const filtered = filterNearbyUsers(
        position.lat,
        position.lng,
        otherUsers,
        10 // 10km 반径
      );
      // 거리 정보가 포함된 사용자 목록으로 업데이트
      const usersWithDistance = filtered.map(user => ({
        ...user,
        distance: user.distance
      }));
      setNearbyUsers(usersWithDistance);
      // console.log(`🔍 ${filtered.length}명의 근처 사용자 발견`, usersWithDistance);
    } else {
      setNearbyUsers([]);
    }
  }, [position, otherUsers, showOtherUsers]);

  // 로그인하지 않은 사용자 화면
  if (isLoginRequired) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-white" style={{ height: height || '100%' }}>
        <div className="text-center px-6 py-8">
          <div className="text-5xl mb-4">🔐</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">로그인이 필요합니다</h2>
          <p className="text-gray-600 text-sm mb-6">
            실시간 위치 공유를 사용하려면 먼저 로그인하세요.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-amber-800 text-xs leading-relaxed">
              💡 로그인 후 다시 접속하면 근처 러너들과 실시간으로 위치를 공유할 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col" style={{ height: height || '100%' }}>
      {/* 에러 상태 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 mx-4">
          <p className="text-red-600 text-sm">{error}</p>
          <p className="text-red-500 text-xs mt-2">
            💡 브라우저 설정에서 위치 권한을 허용해주세요.
          </p>
        </div>
      )}

      {/* 지도 렌더링 - 항상 표시 (로딩 중이어도) */}
      <div className="flex-1 w-full">
        <LeafletMap
          position={position}
          zoom={zoom}
          height="100%"
          otherUsers={showOtherUsers ? (nearbyUsers as any[]) : []}
          routeCoordinates={routeCoordinates}
          placeMarker={placeMarker}
        />
      </div>

      {/* 로딩 상태 - 지도 위에 오버레이 */}
      {isLoading && !error && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-white/50 rounded-lg"
          style={{ height }}
        >
          <p className="text-gray-600 font-semibold">GPS 위치 접근 중...</p>
        </div>
      )}
    </div>
  );
}

