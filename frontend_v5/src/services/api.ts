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
  '난이도': string;
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
  const endLat = parseFloat(csvData['위도2']?.toString() || '0') || startLat;
  const endLng = parseFloat(csvData['경도2']?.toString() || '0') || startLng;

  // 경로: 시작점 + 끝점
  const route: [number, number][] = [
    [startLat, startLng],
    [endLat, endLng]
  ];

  // 거리 파싱
  const distanceNumber = parseFloat(csvData['거리']?.toString() || '0') || 0;
  const distance = distanceNumber;
  const distanceString = `${csvData['거리']?.toString() || '0'}km`;

  // 난이도 파싱 (CSV 데이터)
  const difficultyString = csvData['난이도']?.toString() || '';
  let difficulty: 'easy' | 'medium' | 'hard' = 'medium';

  if (difficultyString.includes('초급')) {
    difficulty = 'easy';
  } else if (difficultyString.includes('중급')) {
    difficulty = 'medium';
  } else if (difficultyString.includes('상급') || difficultyString.includes('고급')) {
    difficulty = 'hard';
  }

  // 평균 페이스 (duration_min / 거리)
  const durationMin = parseFloat(csvData['duration_min']?.toString() || '0') || 0;
  const avgPace = distanceNumber > 0 ? Math.round((durationMin / distanceNumber) * 100) / 100 : 6;

  return {
    id: `course-${index}-${csvData['러닝코스 명']?.toString() || 'unknown'}`,
    name: csvData['러닝코스 명']?.toString() || '',
    description: csvData['코스']?.toString() || `${distance}km 러닝 코스`,
    distance: distance,
    distanceString: distanceString,
    difficulty: difficulty,
    difficultyString: difficultyString,
    estimatedTime: Math.round(durationMin),
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
    description: csvData['코스']?.toString() || '',
    distance: distance,
    location: csvData['자치구']?.toString() || '',
    address: csvData['시작 주소']?.toString() || '',
    startPoint: [startLat, startLng],
    isFavorite: false
  };
}

// 맞춤형 추천 코스 가져오기
export async function fetchRecommendedCourses(userId: number = 1, k: number = 5): Promise<CourseData[]> {
  try {
    console.log('추천 코스 요청:', `${API_BASE_URL}/api/recommended-courses`, { userId, k });
    const response = await fetch(`${API_BASE_URL}/api/recommended-courses?user_id=${userId}&k=${k}`, {
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
    console.log('추천 코스 로드 성공:', data.recommended_courses?.length || 0, '개');
    return data.recommended_courses || [];
  } catch (error) {
    console.error('추천 코스 로딩 실패:', error);
    return [];
  }
}

// 코스별 칼로리 조회
export interface CalorieInfoResponse {
  success: boolean;
  user_id: number;
  user_info: {
    name: string;
    gender: string;
    age: number;
    height_cm: number;
    weight_kg: number;
  };
  course_info: {
    course_name: string;
    distance_km: number;
    estimated_time_min: number;
    difficulty: string;
  };
  calorie_info: {
    predicted_calories: number;
    calorie_per_km: number;
    unit: string;
  };
}

export async function fetchCourseCalories(
  userId: number,
  courseIndex: number
): Promise<number | null> {
  try {
    console.log('칼로리 조회 요청:', `${API_BASE_URL}/api/course-calorie-info`, { userId, courseIndex });
    const response = await fetch(
      `${API_BASE_URL}/api/course-calorie-info?user_id=${userId}&course_index=${courseIndex}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        mode: 'cors',
      }
    );

    if (!response.ok) {
      throw new Error(`API 에러: ${response.status}`);
    }
    const data: CalorieInfoResponse = await response.json();
    console.log(
      '칼로리 조회 성공:',
      data.course_info.course_name,
      data.calorie_info.predicted_calories,
      'kcal'
    );
    return data.calorie_info.predicted_calories;
  } catch (error) {
    console.error('칼로리 조회 실패:', error);
    return null;
  }
}

// 러닝 기록 저장
export interface RunningRecordRequest {
  user_id: number;
  start_time: string;
  end_time: string;
  distance_km: number;
  pace_km?: number;
  calories_kcal?: number;
  start_point?: string;
  end_point?: string;
  via1_point?: string;
  via2_point?: string;
  via3_point?: string;
  route?: string;
}

export async function saveRunningRecord(record: RunningRecordRequest): Promise<any> {
  try {
    console.log('러닝 기록 저장 요청:', `${API_BASE_URL}/api/running-record`, record);
    const response = await fetch(`${API_BASE_URL}/api/running-record`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      mode: 'cors',
      body: JSON.stringify(record),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('서버 응답:', response.status, errorText);
      throw new Error(`API 에러: ${response.status} - ${errorText}`);
    }
    const data = await response.json();
    console.log('러닝 기록 저장 성공:', data.record_id);
    return data;
  } catch (error) {
    console.error('러닝 기록 저장 실패:', error);
    throw error;
  }
}
