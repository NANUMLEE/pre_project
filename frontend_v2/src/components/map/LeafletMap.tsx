import { MapContainer, TileLayer, Marker, useMap, Circle, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from '../../utils/leafletFix';
import { UserLocation } from '../../hooks/useWebSocket';
import { formatDistance, formatTimeAgo } from '../../services/locationService';

interface Props {
  position: { lat: number; lng: number } | null;
  zoom?: number;
  height?: string;
  otherUsers?: UserLocation[]; // 다른 사용자 위치 (선택사항)
  routeCoordinates?: [number, number][]; // 코스 경로 (선택사항)
  placeMarker?: [number, number] | null; // 장소 마커 (선택사항)
}

/**
 * 지도를 재정렬하고 마커를 업데이트하는 컴포넌트
 * useMap hook을 사용해서 지도 인스턴스에 접근
 */
function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  console.log('지도 중심 업데이트:', lat, lng);
  map.setView([lat, lng], map.getZoom(), { animate: true });
  return null;
}

/**
 * Leaflet 기반 지도 컴포넌트
 * - 사용자 실시간 위치를 마커로 표시
 * - GPS 위치 변경 시 자동으로 지도 이동
 *
 * @param position - 사용자의 GPS 위치 (위도, 경도)
 * @param zoom - 지도 줌 레벨 (기본값: 16)
 * @param height - 지도 높이 (기본값: 500px)
 */
export default function LeafletMap({
  position,
  zoom = 16,
  height = '500px',
  otherUsers = [],
  routeCoordinates = [],
  placeMarker = null,
}: Props) {
  // 기본 좌표: 부산 중구 (임시)
  const defaultCenter: [number, number] = [35.1796, 129.0756];
  const mapCenter: [number, number] = position
    ? [position.lat, position.lng]
    : defaultCenter;

  // 사용자 위치 아이콘 (민트색 원형)
  const userLocationIcon = L.divIcon({
    html: `<div style="
      width: 24px;
      height: 24px;
      background: #03cfb4;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 0 8px rgba(3, 207, 180, 0.5);
    "></div>`,
    iconSize: [24, 24],
    className: 'custom-marker',
  });

  // 다른 사용자 위치 아이콘 (주황색 원형)
  const otherUserIcon = L.divIcon({
    html: `<div style="
      width: 20px;
      height: 20px;
      background: #f89305;
      border: 2px solid white;
      border-radius: 50%;
      box-shadow: 0 0 6px rgba(248, 147, 5, 0.5);
    "></div>`,
    iconSize: [20, 20],
    className: 'other-user-marker',
  });

  // 장소 마커 아이콘 (핑크색 깃발)
  const placeMarkerIcon = L.divIcon({
    html: `<div style="
      width: 32px;
      height: 32px;
      background: #ff6b9d;
      border: 2px solid white;
      border-radius: 50% 50% 50% 0;
      box-shadow: 0 0 8px rgba(255, 107, 157, 0.6);
      transform: rotate(-45deg);
    "></div>`,
    iconSize: [32, 32],
    className: 'place-marker',
  });

  console.log('LeafletMap rendered with height:', height, 'otherUsers:', otherUsers.length);

  return (
    <MapContainer
      center={mapCenter}
      zoom={zoom}
      scrollWheelZoom={true}
      className="w-full h-full"
      style={{
        height: '100%',
        width: '100%',
        position: 'relative',
        zIndex: 1
      }}
    >
      {/* OpenStreetMap 타일 */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* 사용자 위치 마커 */}
      {position && (
        <>
          <Marker
            position={[position.lat, position.lng]}
            icon={userLocationIcon}
          >
            <Popup>
              <div className="text-xs font-semibold">내 위치</div>
            </Popup>
          </Marker>
          {/* 위치 정확도 원 */}
          <Circle
            center={[position.lat, position.lng]}
            radius={50}
            pathOptions={{
              color: '#03cfb4',
              weight: 2,
              opacity: 0.3,
              fill: true,
              fillColor: '#03cfb4',
              fillOpacity: 0.1
            }}
          />
          {/* 지도를 사용자 위치로 자동 이동 */}
          <Recenter lat={position.lat} lng={position.lng} />
        </>
      )}

      {/* 다른 사용자 마커 */}
      {otherUsers && otherUsers.length > 0 && (
        otherUsers.map((user) => (
          <Marker
            key={user.id}
            position={[user.latitude, user.longitude]}
            icon={otherUserIcon}
          >
            <Popup>
              <div className="text-xs">
                <div className="font-semibold text-red-600">
                  {user.id.substring(0, 10)}...
                </div>
                <div className="text-gray-600">
                  거리: {formatDistance(user.distance || 0)}
                </div>
                <div className="text-gray-500 text-xs">
                  {formatTimeAgo(user.timestamp)}
                </div>
              </div>
            </Popup>
          </Marker>
        ))
      )}

      {/* 코스 경로 표시 */}
      {routeCoordinates && routeCoordinates.length > 0 && (
        <Polyline
          positions={routeCoordinates}
          pathOptions={{
            color: '#f89305',
            weight: 4,
            opacity: 0.8,
            lineCap: 'round',
            lineJoin: 'round'
          }}
        />
      )}

      {/* 장소 마커 표시 */}
      {placeMarker && (
        <Marker
          position={placeMarker}
          icon={placeMarkerIcon}
        >
          <Popup>
            <div className="text-xs font-semibold">선택한 장소</div>
          </Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
