import { MapPin, Users, RadioTower } from 'lucide-react';
import { GPSMap } from '../map/GPSMap';
import { useState, useEffect } from 'react';
import { useWebSocket } from '../../hooks/useWebSocket';
import { generateClientId, formatDistance, filterNearbyUsers } from '../../services/locationService';
import { WS_ENDPOINT, API_BASE_URL } from '../../config/api';

/**
 * 주변 러닝 코스 및 실시간 러너 위치를 표시하는 컴포넌트
 *
 * 기능:
 * - GPSMap을 통해 실시간 GPS 위치 추적
 * - WebSocket을 통해 다른 러너의 위치 수신
 * - 10km 반경 내 근처 러너 표시
 * - 주변 러닝 코스 목록 표시 (API에서 실제 데이터 로드)
 */

interface NearbyLocation {
  id: string;
  name: string;
  runners: number;
  distance: string;
  distanceFromMe: string; // 내 위치로부터의 거리
  courseStartLat?: number;
  courseStartLng?: number;
  courseEndLat?: number;
  courseEndLng?: number;
}

export function NearbyMap() {
  const [clientId] = useState(() => generateClientId());
  // localStorage에서 userId 읽기 (로그인 시 저장됨)
  const [userId] = useState(() => localStorage.getItem('userId') || '1');
  const [myPosition, setMyPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyUsers, setNearbyUsers] = useState<any[]>([]);
  const [nearbyLocations, setNearbyLocations] = useState<NearbyLocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedCourses, setHasLoadedCourses] = useState(false);

  const { otherUsers, isConnected } = useWebSocket(
    clientId,
    WS_ENDPOINT,
    userId
  );

  // userId 확인 로그
  console.log('📍 NearbyMap - userId:', userId, 'clientId:', clientId);

  // userId 변경 시 (로그인/회원가입) 초기화
  useEffect(() => {
    setHasLoadedCourses(false);
    console.log('🔄 userId 변경됨, 코스 로드 상태 초기화');
  }, [userId]);

  // GPS 위치 변경 시 거리 재계산 (실시간 근처 러너만)
  const handlePositionChange = (position: { lat: number; lng: number }) => {
    setMyPosition(position);
    // 첫 위치 감지 시에만 코스 로드 (로그인 직후)
    if (userId && !hasLoadedCourses) {
      console.log('🔄 첫 위치 감지됨, 주변 코스 API 호출');
      fetchNearbyRunningCourses(position.lat, position.lng);
      setHasLoadedCourses(true);
    }
  };

  // 위치 데이터가 변경될 때마다 거리 계산 (근처 러너만)
  useEffect(() => {
    if (myPosition && otherUsers.length > 0) {
      const filtered = filterNearbyUsers(
        myPosition.lat,
        myPosition.lng,
        otherUsers,
        10 // 10km 반경
      );
      setNearbyUsers(filtered);
      console.log(`📍 NearbyMap: ${filtered.length}명 근처에서 발견`, filtered);
    } else {
      setNearbyUsers([]);
    }
  }, [myPosition, otherUsers]);

  // 두 지점 사이의 거리를 Haversine 공식으로 계산 (km)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // 지구 반지름 (km)
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const fetchNearbyRunningCourses = async (lat: number, lon: number) => {
    try {
      setIsLoading(true);
      const numericUserId = parseInt(userId, 10) || 1;

      const url = `${API_BASE_URL}/api/nearby-running-courses?user_id=${numericUserId}&user_lat=${lat}&user_lon=${lon}&k=3`;
      console.log('🌐 주변 러닝 코스 API 요청:', url);

      const response = await fetch(url, {
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      });

      if (!response.ok) {
        throw new Error(`API 응답 오류: ${response.status}`);
      }

      const data = await response.json();
      console.log('📍 주변 러닝 코스 데이터:', data);

      // API 응답 데이터를 UI 포맷으로 변환
      if (data.recommended_courses && Array.isArray(data.recommended_courses)) {
        const formattedLocations: NearbyLocation[] = data.recommended_courses.map(
          (course: any, index: number) => {
            // 코스의 시작점과 끝점 좌표
            const startLat = parseFloat(course['위도1'] || course.start_lat || 0);
            const startLng = parseFloat(course['경도1'] || course.start_lng || 0);
            const endLat = parseFloat(course['위도2'] || course.end_lat || 0);
            const endLng = parseFloat(course['경도2'] || course.end_lng || 0);

            // 코스의 중간 지점 계산
            const courseMidLat = (startLat + endLat) / 2;
            const courseMidLng = (startLng + endLng) / 2;

            // 내 위치에서 코스 중간 지점까지의 거리 계산
            const distanceToCoarse = calculateDistance(lat, lon, courseMidLat, courseMidLng);

            return {
              id: `${index}`,
              name: course['러닝코스 명'] || course.name || '코스명 미정',
              runners: Math.floor(Math.random() * 20) + 5,
              distance: course['거리'] ? `${course['거리']}km` : '거리 미정',
              distanceFromMe: `${distanceToCoarse.toFixed(1)}km`,
              courseStartLat: startLat,
              courseStartLng: startLng,
              courseEndLat: endLat,
              courseEndLng: endLng
            };
          }
        );
        setNearbyLocations(formattedLocations);
      }
    } catch (error) {
      console.error('❌ 주변 러닝 코스 로드 실패:', error);
      // 에러 발생 시 빈 배열 유지 (UI 정상 렌더링)
      setNearbyLocations([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden mb-6">
      {/* 실제 Leaflet 지도 - GPS 실시간 위치 + 다른 러너 위치 표시 */}
      <div className="relative h-64 overflow-hidden rounded-t-2xl">
        <GPSMap
          height="264px"
          zoom={15}
          wsUrl={WS_ENDPOINT}
          showOtherUsers={true}
          onPositionChange={handlePositionChange}
        />
      </div>

      {/* 실시간 러너 정보 */}
      <div className="p-4 border-b border-gray-100 bg-blue-50">
        <div className="flex items-center gap-2 text-sm">
          <RadioTower className="w-4 h-4 text-blue-600" />
          <span className={`font-semibold ${isConnected ? 'text-green-600' : 'text-gray-500'}`}>
            {isConnected ? '실시간 러너 위치 공유 활성화' : '위치 공유 준비 중...'}
          </span>
          {otherUsers.length > 0 && (
            <span className="ml-auto text-gray-600">
              · {otherUsers.length}명 근처
            </span>
          )}
        </div>
      </div>

      {/* 근처 러너 목록 */}
      {nearbyUsers.length > 0 && (
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-[#2e2d52] mb-3 flex items-center gap-2 text-sm font-semibold">
            <Users className="w-4 h-4 text-[#f89305]" />
            근처 러너
          </h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {nearbyUsers.slice(0, 5).map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div>
                    <p className="text-xs font-medium text-[#2e2d52]">
                      {user.id.substring(0, 10)}...
                    </p>
                  </div>
                </div>
                <span className="text-xs text-[#787878] font-semibold">
                  {formatDistance(user.distance || 0)}
                </span>
              </div>
            ))}
            {nearbyUsers.length > 5 && (
              <p className="text-xs text-center text-gray-500 pt-2">
                +{nearbyUsers.length - 5}명 더보기
              </p>
            )}
          </div>
        </div>
      )}

      {/* 주변 러닝 코스 */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[#2e2d52] flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#f89305]" />
            주변 러닝 코스
          </h3>
          <button
            onClick={() => {
              if (myPosition) {
                console.log('🔄 주변 러닝 코스 새로고침');
                fetchNearbyRunningCourses(myPosition.lat, myPosition.lng);
              }
            }}
            className="text-xs px-2 py-1 bg-[#f89305] text-white rounded hover:bg-orange-600 transition-colors"
          >
            새로고침
          </button>
        </div>
        {isLoading ? (
          <div className="flex justify-center items-center py-4">
            <div className="animate-spin">
              <div className="w-4 h-4 border-2 border-[#f89305] border-t-transparent rounded-full"></div>
            </div>
            <span className="text-sm text-gray-500 ml-2">코스 로딩 중...</span>
          </div>
        ) : nearbyLocations.length > 0 ? (
          <div className="space-y-2">
            {nearbyLocations.map((location) => (
              <div
                key={location.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <MapPin className="w-4 h-4 text-[#787878]" />
                <div>
                  <p className="text-sm text-[#2e2d52]">{location.name}</p>
                  <p className="text-xs text-[#787878]">내 위치로부터 {location.distanceFromMe}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">주변 러닝 코스를 불러올 수 없습니다</p>
            <p className="text-xs text-gray-400 mt-1">위치 정보를 확인해주세요</p>
          </div>
        )}
      </div>
    </div>
  );
}
