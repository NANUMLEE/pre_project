/**
 * Kakao Map 컴포넌트 (나중에 구현할 버전)
 *
 * 현재 LeafletMap을 사용하고 있지만,
 * 나중에 Kakao Map으로 변경하려면:
 *
 * 1. 이 파일에 KakaoMap 구현
 * 2. GPSMap.tsx에서 import 변경:
 *    - import LeafletMap from './LeafletMap';
 *    + import KakaoMap from './KakaoMap';
 * 3. GPSMap에서 <LeafletMap ... /> → <KakaoMap ... /> 변경
 *
 * ========================================
 * Kakao Map 설치 및 설정 방법:
 * ========================================
 *
 * 📌 1) 패키지 설치
 * npm install react-kakao-maps-sdk
 *
 * 📌 2) index.html에 Kakao Map API 추가
 * <head>
 *   <script type="text/javascript" src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=YOUR_APP_KEY"></script>
 * </head>
 *
 * 📌 3) 아래 코드를 참고해서 구현
 *
 * import { Map, MapMarker, ZoomControl } from 'react-kakao-maps-sdk';
 *
 * interface Props {
 *   position: { lat: number; lng: number } | null;
 *   zoom?: number;
 *   height?: string;
 * }
 *
 * export default function KakaoMap({
 *   position,
 *   zoom = 3,
 *   height = '500px',
 * }: Props) {
 *   const defaultCenter = { lat: 35.1796, lng: 129.0756 };
 *   const mapCenter = position
 *     ? { lat: position.lat, lng: position.lng }
 *     : defaultCenter;
 *
 *   return (
 *     <Map
 *       center={mapCenter}
 *       zoom={zoom}
 *       style={{ width: '100%', height }}
 *     >
 *       {position && (
 *         <MapMarker position={mapCenter}>
 *           <div style={{ padding: '5px', color: '#000' }}>현재 위치</div>
 *         </MapMarker>
 *       )}
 *       <ZoomControl position="TopRight" />
 *     </Map>
 *   );
 * }
 *
 * ========================================
 * Kakao Map API 키 받는 법:
 * https://developers.kakao.com/console/app
 * ========================================
 */

// 임시 더미 컴포넌트 (나중에 위 코드로 교체)
export default function KakaoMap() {
  return <div>Kakao Map (추후 구현)</div>;
}
