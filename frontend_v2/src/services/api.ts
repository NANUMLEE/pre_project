// API 서비스 - 백엔드와 통신

const API_BASE_URL = 'https://nana-nondefiant-jodee.ngrok-free.dev';

// 고유한 ID 생성 함수
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export interface CourseData {
  [key: string]: string | number | null | any[];
  '자치구': string;
  '러닝코스 명': string;
  '시작 주소': string;
  '끝 주소': string;
  '위도1': string;
  '경도1': string;
  '경유지위도1': string;
  '경유지경도1': string;
  '경유지위도2': string;
  '경유지경도2': string;
  '경유지위도3': string;
  '경유지경도3': string;
  '위도2': string;
  '경도2': string;
  '거리': string;
  '코스': string;
  start_lat?: number;
  start_lng?: number;
  end_lat?: number;
  end_lng?: number;
  via?: Array<{ lat: number; lng: number }>;
}

export interface PlaceData {
  [key: string]: string | number | null | any[];
  '자치구': string;
  '러닝코스 명': string;
  '시작 주소': string;
  '끝 주소': string;
  '위도1': string;
  '경도1': string;
  '거리': string;
  '코스': string;
  start_lat?: number;
  start_lng?: number;
}

// 코스 데이터 가져오기
export async function fetchCourses(): Promise<CourseData[]> {
  try {
    console.log('코스 데이터 요청:', `${API_BASE_URL}/api/courses`);
    const response = await fetch(`${API_BASE_URL}/api/courses`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      mode: 'cors',
    });

    if (!response.ok) {
      throw new Error(`API 에러: ${response.status}`);
    }
    const data = await response.json();
    console.log('코스 데이터 로드 성공:', data.courses?.length || 0, '개');
    return data.courses || [];
  } catch (error) {
    console.error('코스 데이터 로딩 실패:', error);
    return [];
  }
}

// 장소 데이터 가져오기
export async function fetchPlaces(): Promise<PlaceData[]> {
  try {
    console.log('장소 데이터 요청:', `${API_BASE_URL}/api/places`);
    const response = await fetch(`${API_BASE_URL}/api/places`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      mode: 'cors',
    });

    if (!response.ok) {
      throw new Error(`API 에러: ${response.status}`);
    }
    const data = await response.json();
    console.log('장소 데이터 로드 성공:', data.places?.length || 0, '개');
    return data.places || [];
  } catch (error) {
    console.error('장소 데이터 로딩 실패:', error);
    return [];
  }
}

// CSV 데이터를 프론트엔드 Course 타입으로 변환
export function convertToCourse(csvData: CourseData, index: number): import('../types').Course {

  const startLat = parseFloat(csvData['위도1']?.toString() || '0') || 0;
  const startLng = parseFloat(csvData['경도1']?.toString() || '0') || 0;

  // 경유지 좌표 수집
  const viaPoints: Array<{ lat: number; lng: number }> = [];

  // 경유지 1
  const via1Lat = parseFloat(csvData['경유지위도1']?.toString() || '');
  const via1Lng = parseFloat(csvData['경유지경도1']?.toString() || '');
  if (!isNaN(via1Lat) && !isNaN(via1Lng)) {
    viaPoints.push({ lat: via1Lat, lng: via1Lng });
  }

  // 경유지 2
  const via2Lat = parseFloat(csvData['경유지위도2']?.toString() || '');
  const via2Lng = parseFloat(csvData['경유지경도2']?.toString() || '');
  if (!isNaN(via2Lat) && !isNaN(via2Lng)) {
    viaPoints.push({ lat: via2Lat, lng: via2Lng });
  }

  // 경유지 3
  const via3Lat = parseFloat(csvData['경유지위도3']?.toString() || '');
  const via3Lng = parseFloat(csvData['경유지경도3']?.toString() || '');
  if (!isNaN(via3Lat) && !isNaN(via3Lng)) {
    viaPoints.push({ lat: via3Lat, lng: via3Lng });
  }

  // 경로: 시작점 + 경유지들 + 끝점
  const endLat = parseFloat(csvData['위도2']?.toString() || '0') || startLat;
  const endLng = parseFloat(csvData['경도2']?.toString() || '0') || startLng;

  const route: [number, number][] = [
    [startLat, startLng],
    ...viaPoints.map((p: any) => [p.lat, p.lng] as [number, number]),
    [endLat, endLng]
  ];

  // 난이도 결정 (거리 기반)
  let difficulty: 'easy' | 'medium' | 'hard' = 'medium';
  if (distanceNumber < 5) {
    difficulty = 'easy';
  } else if (distanceNumber > 10) {
    difficulty = 'hard';
  }

  // 평균 페이스 (km당 분 단위, 거리 기반 추정)
  const avgPace = distanceNumber > 0 ? 6 : 0;

  return {
    id: `course-${index}-${csvData['러닝코스 명']?.toString() || 'unknown'}`,
    name: csvData['러닝코스 명']?.toString() || '',
    description: csvData['코스']?.toString() || `${distance}km 러닝 코스`,
    distance: distance,
    difficulty: difficulty,
    estimatedTime: Math.round(distanceNumber * avgPace),
    location: csvData['자치구']?.toString() || '',
    startPoint: [startLat, startLng],
    route: route,
    rating: 4.5,
    reviews: 0,
    isFavorite: false,
    avgPace: avgPace
  };
}

// CSV 데이터를 프론트엔드 Place 타입으로 변환
export function convertToPlace(csvData: PlaceData, index: number): any {
  const distance = parseFloat(csvData['거리']?.toString() || '0') || 0;
  const startLat = parseFloat(csvData['위도1']?.toString() || '0') || 0;
  const startLng = parseFloat(csvData['경도1']?.toString() || '0') || 0;

  return {
    id: `place-${index}-${csvData['러닝코스 명']?.toString() || 'unknown'}`,
    name: csvData['러닝코스 명']?.toString() || '',
    description: csvData['코스']?.toString() || `${distance}km 떨어진 러닝 장소`,
    distance: distance,
    location: csvData['자치구']?.toString() || '',
    address: csvData['시작 주소']?.toString() || '',
    startPoint: [startLat, startLng],
    isFavorite: false
  };
}
