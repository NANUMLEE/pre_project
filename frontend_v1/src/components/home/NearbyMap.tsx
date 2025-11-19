import { MapPin, Users, RadioTower } from 'lucide-react';
import { GPSMap } from '../map/GPSMap';
import { useState, useEffect } from 'react';
import { useWebSocket } from '../../hooks/useWebSocket';
import { generateClientId, formatDistance, filterNearbyUsers } from '../../services/locationService';
import { WS_ENDPOINT } from '../../config/api';

/**
 * 주변 러닝 코스 및 실시간 러너 위치를 표시하는 컴포넌트
 *
 * 기능:
 * - GPSMap을 통해 실시간 GPS 위치 추적
 * - WebSocket을 통해 다른 러너의 위치 수신
 * - 10km 반경 내 근처 러너 표시
 * - 주변 러닝 코스 목록 표시
 */
export function NearbyMap() {
  const [clientId] = useState(() => generateClientId());
  // localStorage에서 userId 읽기 (로그인 시 저장됨)
  const [userId] = useState(() => localStorage.getItem('userId') || undefined);
  const [myPosition, setMyPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyUsers, setNearbyUsers] = useState<any[]>([]);

  const { otherUsers, isConnected } = useWebSocket(
    clientId,
    WS_ENDPOINT,
    userId
  );

  // userId 확인 로그
  console.log('📍 NearbyMap - userId:', userId, 'clientId:', clientId);

  // GPS 위치 변경 시 거리 재계산
  const handlePositionChange = (position: { lat: number; lng: number }) => {
    setMyPosition(position);
  };

  // 위치 데이터가 변경될 때마다 거리 계산
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

  // Mock data for nearby running courses
  const nearbyLocations = [
    { id: '1', name: '한강 러닝 코스', runners: 12, distance: '0.5km' },
    { id: '2', name: '올림픽공원', runners: 8, distance: '1.2km' },
    { id: '3', name: '여의도 공원', runners: 15, distance: '2.1km' }
  ];

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
        <h3 className="text-[#2e2d52] mb-3 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-[#f89305]" />
          주변 러닝 코스
        </h3>
        <div className="space-y-2">
          {nearbyLocations.map((location) => (
            <div
              key={location.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-[#787878]" />
                <div>
                  <p className="text-sm text-[#2e2d52]">{location.name}</p>
                  <p className="text-xs text-[#787878]">{location.distance}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 bg-[#2e2d52] text-white px-3 py-1 rounded-full">
                <Users className="w-3 h-3" />
                <span className="text-xs">{location.runners}명</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
