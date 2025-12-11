import { Cloud, Droplets, Wind } from 'lucide-react';
import { useState, useEffect } from 'react';
import { WEATHER_ENDPOINT } from '../../config/api';

interface GPSCoordinate {
  lat: number;
  lng: number;
}

export function WeatherWidget() {
  const [weather, setWeather] = useState({
    temperature: 0,
    condition: '로딩중...',
    humidity: 0,
    windSpeed: 0,
    message: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gpsPosition, setGpsPosition] = useState<GPSCoordinate | null>(null);

  /**
   * GPS 위치 가져오기 (한 번만 실행)
   */
  useEffect(() => {
    if (!navigator.geolocation) {
      setError('이 브라우저는 GPS를 지원하지 않습니다.');
      setLoading(false);
      return;
    }

    // 현재 위치를 한 번만 가져옴
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsPosition({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (err) => {
        console.warn('GPS 위치 접근 실패:', err);
        // GPS 실패 시 기본값 사용 (부산)
        setGpsPosition({
          lat: 35.106,
          lng: 129.032,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 30000, // 30초로 증가 (GPS 신호 약할 때)
        maximumAge: 300000, // 5분 캐시
      }
    );
  }, []);

  /**
   * GPS 위치가 확정되면 날씨 정보 조회
   */
  useEffect(() => {
    if (!gpsPosition) return;

    const fetchWeather = async () => {
      try {
        setLoading(true);
        // GPS 좌표를 기반으로 날씨 API 호출
        // nx = 경도 (longitude), ny = 위도 (latitude)
        const url = `${WEATHER_ENDPOINT}/api/weather/today?nx=${gpsPosition.lng}&ny=${gpsPosition.lat}`;
        console.log('🌤️ 날씨 API 호출:', url);

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
          },
          mode: 'cors',
        });
        console.log('🌤️ 응답 상태:', response.status, response.statusText);
        console.log('📊 Content-Type:', response.headers.get('content-type'));

        // Content-Type 먼저 확인
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.error('❌ JSON이 아닌 Content-Type:', contentType);
          throw new Error(`잘못된 응답 형식: ${contentType || 'unknown'}`);
        }

        if (!response.ok) {
          console.error('❌ API 오류 상태:', response.status);
          throw new Error(`API 오류: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('✅ 날씨 데이터 수신:', data);

        setWeather({
          temperature: Math.round(data.temp),
          condition: data.sky,
          humidity: data.humidity,
          windSpeed: data.wind || 0,
          message: data.message || '🏃 러닝하기 좋은 날씨입니다!'
        });
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '오류 발생';
        setError(errorMessage);
        console.error('❌ 날씨 조회 오류:', errorMessage);
        console.error('❌ 전체 오류:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [gpsPosition]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
        <p className="text-[#787878]">날씨 정보 로딩중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
        <p className="text-red-500 mb-2">오류: {error}</p>
        <p className="text-xs text-[#787878]">
          💡 GPS 권한을 허용하거나, 백그라운드에서 위치 접근 권한을 확인해주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-[#787878] mb-1">오늘의 날씨</p>
          <div className="flex items-center gap-2">
            <span className="text-3xl text-[#2e2d52]">{weather.temperature}°</span>
            <span className="text-[#787878]">{weather.condition}</span>
          </div>
        </div>
        <Cloud className="w-16 h-16 text-[#03cfb4]" />
      </div>

      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <Droplets className="w-4 h-4 text-[#03cfb4]" />
          <div>
            <p className="text-xs text-[#787878]">습도</p>
            <p className="text-sm text-[#2e2d52]">{weather.humidity}%</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Wind className="w-4 h-4 text-[#03cfb4]" />
          <div>
            <p className="text-xs text-[#787878]">풍속</p>
            <p className="text-sm text-[#2e2d52]">{weather.windSpeed}m/s</p>
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-[#03cfb4]/10 rounded-xl">
        <p className="text-sm text-[#2e2d52]">
          {weather.message}
        </p>
      </div>
    </div>
  );
}
