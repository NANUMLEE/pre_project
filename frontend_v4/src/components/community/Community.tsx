import { useState, useEffect } from 'react';
import { Home, MapPin, User, TrendingUp, Award, Calendar, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from '../ui/button';
import { getCurrentUser } from '../../utils/auth';

type CommunityProps = {
  onNavigate: (screen: 'home' | 'course' | 'community' | 'mypage') => void;
};

type RunningStats = {
  totalDistance: number;
  totalDuration: number;
  avgPace: number;
  avgDistance: number;
  totalRuns: number;
  records: Array<{
    id: string;
    date: string;
    distance: number;
    pace: number;
    duration: number;
  }>;
};

export function Community({ onNavigate }: CommunityProps) {
  const [currentChart, setCurrentChart] = useState<'distance' | 'frequency' | 'pace'>('distance');
  const [stats, setStats] = useState<RunningStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 사용자의 러닝 기록 데이터 로드
  useEffect(() => {
    const loadRunningStats = async () => {
      try {
        const user = getCurrentUser();
        if (!user || !user.email) {
          console.error('사용자 정보를 찾을 수 없습니다');
          setIsLoading(false);
          return;
        }

        const response = await fetch(
          `https://nana-nondefiant-jodee.ngrok-free.dev/api/user/records/${encodeURIComponent(user.email)}`,
          {
            headers: {
              'ngrok-skip-browser-warning': 'true',
            }
          }
        );

        if (!response.ok) {
          throw new Error('러닝 기록 로드 실패');
        }

        const data = await response.json();
        console.log('📊 러닝 통계:', data);
        setStats(data);
      } catch (error) {
        console.error('러닝 기록 로드 오류:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRunningStats();
  }, []);

  // Mock data for line charts
  const weeklyDistanceData = [
    { day: '월', distance: 5.2 },
    { day: '화', distance: 3.8 },
    { day: '수', distance: 6.5 },
    { day: '목', distance: 4.2 },
    { day: '금', distance: 7.1 },
    { day: '토', distance: 8.3 },
    { day: '일', distance: 5.5 }
  ];

  const weeklyFrequencyData = [
    { week: '1주', count: 3 },
    { week: '2주', count: 4 },
    { week: '3주', count: 5 },
    { week: '4주', count: 4 }
  ];

  const paceChangeData = [
    { month: '7월', pace: 6.2 },
    { month: '8월', pace: 5.9 },
    { month: '9월', pace: 5.5 },
    { month: '10월', pace: 5.3 },
    { month: '11월', pace: 5.0 }
  ];

  // Mock records
  const records = [
    {
      id: '1',
      courseName: '한강 러닝 코스',
      date: '2025-11-10',
      distance: 8.3,
      duration: 2490, // seconds
      pace: 5.0,
      calories: 650
    },
    {
      id: '2',
      courseName: '올림픽공원 순환',
      date: '2025-11-09',
      distance: 5.5,
      duration: 1650,
      pace: 5.0,
      calories: 430
    },
    {
      id: '3',
      courseName: '남산 야경 러닝',
      date: '2025-11-08',
      distance: 7.1,
      duration: 2130,
      pace: 5.0,
      calories: 550
    },
    {
      id: '4',
      courseName: '여의도 공원',
      date: '2025-11-07',
      distance: 4.2,
      duration: 1260,
      pace: 5.0,
      calories: 320
    },
    {
      id: '5',
      courseName: '청계천 코스',
      date: '2025-11-05',
      distance: 6.5,
      duration: 1950,
      pace: 5.0,
      calories: 510
    }
  ];

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}시간 ${minutes}분`;
    }
    return `${minutes}분`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
  };

  // 실제 데이터 또는 Mock 데이터 사용 (실제 데이터를 우선)
  const totalDistance = stats?.totalDistance ?? 0;
  const totalDuration = stats?.totalDuration ?? 0;
  const avgPace = stats?.avgPace ?? 0;
  const avgDistance = stats?.avgDistance ?? 0;
  const displayRecords = stats?.records || records;

  // 기록이 있을 때만 max 계산
  const maxDistance = displayRecords.length > 0 ? Math.max(...displayRecords.map(r => r.distance)) : 0;
  const maxDuration = displayRecords.length > 0 ? Math.max(...displayRecords.map(r => r.duration)) : 0;

  const chartTitles = {
    distance: '주간 거리',
    frequency: '운동 빈도',
    pace: '페이스 변화'
  };

  const renderChart = () => {
    if (currentChart === 'distance') {
      return (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={weeklyDistanceData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="day" 
              tick={{ fontSize: 12, fill: '#787878' }}
              stroke="#e0e0e0"
            />
            <YAxis 
              tick={{ fontSize: 12, fill: '#787878' }}
              stroke="#e0e0e0"
              label={{ value: 'km', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#787878' } }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#fff', 
                border: '1px solid #e0e0e0', 
                borderRadius: '8px',
                fontSize: '12px'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="distance" 
              stroke="#f89305" 
              strokeWidth={2}
              dot={{ fill: '#f89305', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      );
    } else if (currentChart === 'frequency') {
      return (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={weeklyFrequencyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="week" 
              tick={{ fontSize: 12, fill: '#787878' }}
              stroke="#e0e0e0"
            />
            <YAxis 
              tick={{ fontSize: 12, fill: '#787878' }}
              stroke="#e0e0e0"
              label={{ value: '횟수', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#787878' } }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#fff', 
                border: '1px solid #e0e0e0', 
                borderRadius: '8px',
                fontSize: '12px'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="count" 
              stroke="#03cfb4" 
              strokeWidth={2}
              dot={{ fill: '#03cfb4', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      );
    } else {
      return (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={paceChangeData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 12, fill: '#787878' }}
              stroke="#e0e0e0"
            />
            <YAxis 
              tick={{ fontSize: 12, fill: '#787878' }}
              stroke="#e0e0e0"
              label={{ value: 'min/km', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#787878' } }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#fff', 
                border: '1px solid #e0e0e0', 
                borderRadius: '8px',
                fontSize: '12px'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="pace" 
              stroke="#2e2d52" 
              strokeWidth={2}
              dot={{ fill: '#2e2d52', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      );
    }
  };

  const handlePrevChart = () => {
    if (currentChart === 'distance') setCurrentChart('pace');
    else if (currentChart === 'frequency') setCurrentChart('distance');
    else setCurrentChart('frequency');
  };

  const handleNextChart = () => {
    if (currentChart === 'distance') setCurrentChart('frequency');
    else if (currentChart === 'frequency') setCurrentChart('pace');
    else setCurrentChart('distance');
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-[#2e2d52] text-white px-6 pt-12 pb-6">
        <h2 className="text-white mb-6">러닝 레포트</h2>
        
        {/* Summary Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
            <p className="text-sm opacity-80 mb-1">누적 거리</p>
            <p className="text-2xl">{totalDistance.toFixed(1)} km</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
            <p className="text-sm opacity-80 mb-1">총 운동시간</p>
            <p className="text-2xl">{formatDuration(totalDuration)}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
            <p className="text-sm opacity-80 mb-1">평균 페이스</p>
            <p className="text-2xl">{avgPace.toFixed(1)} <span className="text-sm opacity-80">(min/km)</span></p>
          </div>
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
            <p className="text-sm opacity-80 mb-1">평균 거리</p>
            <p className="text-2xl">{avgDistance.toFixed(1)} km</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Running Pattern Prediction */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-[#f89305]" />
            <h3 className="text-[#2e2d52]">러닝 패턴 예측</h3>
          </div>
          
          {/* Chart Navigation */}
          <div className="flex items-center justify-between mb-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevChart}
              className="h-8 w-8"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <p className="text-sm text-[#2e2d52]">{chartTitles[currentChart]}</p>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextChart}
              className="h-8 w-8"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
          
          {renderChart()}
          
          {/* Chart Indicators */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <div 
              className={`w-2 h-2 rounded-full ${currentChart === 'distance' ? 'bg-[#f89305]' : 'bg-gray-300'}`}
            />
            <div 
              className={`w-2 h-2 rounded-full ${currentChart === 'frequency' ? 'bg-[#03cfb4]' : 'bg-gray-300'}`}
            />
            <div 
              className={`w-2 h-2 rounded-full ${currentChart === 'pace' ? 'bg-[#2e2d52]' : 'bg-gray-300'}`}
            />
          </div>
        </div>

        {/* Best Records */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-[#f89305]" />
            <h3 className="text-[#2e2d52]">베스트 레코드</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-[#f89305] to-[#ffa940] rounded-xl p-4 text-white">
              <p className="text-sm opacity-90 mb-1">최장 거리</p>
              <p className="text-2xl">{maxDistance.toFixed(1)} km</p>
            </div>
            <div className="bg-gradient-to-br from-[#03cfb4] to-[#00b89f] rounded-xl p-4 text-white">
              <p className="text-sm opacity-90 mb-1">최장 시간</p>
              <p className="text-lg">{formatDuration(maxDuration)}</p>
            </div>
          </div>
        </div>

        {/* Records List */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-[#2e2d52]" />
            <h3 className="text-[#2e2d52]">러닝 기록</h3>
          </div>
          
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {displayRecords.slice(0, 2).map((record) => (
              <div
                key={record.id}
                className="border border-gray-200 rounded-xl p-4 hover:border-[#f89305] transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-[#2e2d52] mb-1">{record.courseName}</h4>
                    <p className="text-sm text-[#787878]">{formatDate(record.date)}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <p className="text-xs text-[#787878] mb-1">거리</p>
                    <p className="text-sm text-[#2e2d52]">{record.distance} km</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#787878] mb-1">시간</p>
                    <p className="text-sm text-[#2e2d52]">{formatDuration(record.duration)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#787878] mb-1">페이스</p>
                    <p className="text-sm text-[#2e2d52]">{record.pace}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#787878] mb-1">칼로리</p>
                    <p className="text-sm text-[#2e2d52]">{record.calories}</p>
                  </div>
                </div>
              </div>
            ))}
            
            {displayRecords.length > 2 && (
              <div className="pt-2 border-t border-gray-200">
                <p className="text-xs text-center text-[#787878]">
                  아래로 스크롤하여 {displayRecords.length - 2}개의 기록을 더 볼 수 있습니다
                </p>
                {displayRecords.slice(2).map((record) => (
                  <div
                    key={record.id}
                    className="border border-gray-200 rounded-xl p-4 hover:border-[#f89305] transition-colors mt-3"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-[#2e2d52] mb-1">{record.courseName}</h4>
                        <p className="text-sm text-[#787878]">{formatDate(record.date)}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <p className="text-xs text-[#787878] mb-1">거리</p>
                        <p className="text-sm text-[#2e2d52]">{record.distance} km</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#787878] mb-1">시간</p>
                        <p className="text-sm text-[#2e2d52]">{formatDuration(record.duration)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#787878] mb-1">페이스</p>
                        <p className="text-sm text-[#2e2d52]">{record.pace}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#787878] mb-1">칼로리</p>
                        <p className="text-sm text-[#2e2d52]">{record.calories}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="grid grid-cols-4 gap-1 max-w-md mx-auto">
          <button
            onClick={() => onNavigate('home')}
            className="flex flex-col items-center justify-center py-3 text-[#787878] hover:bg-gray-50"
          >
            <Home className="w-6 h-6" />
            <span className="text-xs mt-1">홈</span>
          </button>
          <button
            onClick={() => onNavigate('course')}
            className="flex flex-col items-center justify-center py-3 text-[#787878] hover:bg-gray-50"
          >
            <MapPin className="w-6 h-6" />
            <span className="text-xs mt-1">코스</span>
          </button>
          <button
            onClick={() => onNavigate('community')}
            className="flex flex-col items-center justify-center py-3 text-[#f89305] bg-orange-50"
          >
            <BarChart3 className="w-6 h-6" />
            <span className="text-xs mt-1">레포트</span>
          </button>
          <button
            onClick={() => onNavigate('mypage')}
            className="flex flex-col items-center justify-center py-3 text-[#787878] hover:bg-gray-50"
          >
            <User className="w-6 h-6" />
            <span className="text-xs mt-1">마이</span>
          </button>
        </div>
      </div>
    </div>
  );
}