/**
 * 위치 공유 및 거리 계산 서비스
 *
 * 주요 기능:
 * - 두 좌표 사이의 거리 계산 (Haversine 공식)
 * - 10km 반경 필터링
 * - 거리순 정렬
 */

export interface Location {
  id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  distance?: number;
}

/**
 * Haversine 공식을 사용하여 두 좌표 사이의 거리 계산 (km)
 *
 * @param lat1 - 첫 번째 위도
 * @param lon1 - 첫 번째 경도
 * @param lat2 - 두 번째 위도
 * @param lon2 - 두 번째 경도
 * @returns 거리 (km)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
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
}

/**
 * 내 위치로부터 10km 이내의 사용자만 필터링
 *
 * @param myLatitude - 내 위도
 * @param myLongitude - 내 경도
 * @param otherUsers - 다른 사용자 목록
 * @param radiusKm - 반경 (기본값: 10km)
 * @returns 거리 정보가 포함된 필터링된 사용자 목록 (거리순 정렬)
 */
export function filterNearbyUsers(
  myLatitude: number,
  myLongitude: number,
  otherUsers: Location[],
  radiusKm: number = 10
): (Location & { distance: number })[] {
  const nearbyUsers = otherUsers
    .map((user) => ({
      ...user,
      distance: calculateDistance(
        myLatitude,
        myLongitude,
        user.latitude,
        user.longitude
      ),
    }))
    .filter((user) => user.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance);

  return nearbyUsers;
}

/**
 * 사용자 ID 생성 (고유값)
 *
 * @returns 생성된 사용자 ID
 */
export function generateClientId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 거리를 읽기 쉬운 형식으로 변환
 *
 * @param distanceKm - 거리 (km)
 * @returns 포맷된 거리 문자열
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${(distanceKm * 1000).toFixed(0)}m`;
  }
  return `${distanceKm.toFixed(2)}km`;
}

/**
 * 타임스탬프를 읽기 쉬운 형식으로 변환
 *
 * @param timestamp - ISO 형식 타임스탬프
 * @returns 포맷된 시간 문자열 (예: "2분 전", "1시간 전")
 */
export function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return '방금 전';
  } else if (diffMins < 60) {
    return `${diffMins}분 전`;
  } else if (diffHours < 24) {
    return `${diffHours}시간 전`;
  } else {
    return `${diffDays}일 전`;
  }
}
