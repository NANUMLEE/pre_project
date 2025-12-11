import { useState, useEffect } from 'react';
import { Home, MapPin, User, TrendingUp, Award, Calendar, BarChart3, ChevronLeft, ChevronRight, Clock, Flame, ChevronDown, ArrowRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '../ui/dropdown-menu';
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
    calories?: number;
  }>;
};

export function Community({ onNavigate }: CommunityProps) {
  const [currentChart, setCurrentChart] = useState<'distance' | 'frequency' | 'pace'>('distance');
  const [stats, setStats] = useState<RunningStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAllRecords, setShowAllRecords] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedRecordMonth, setSelectedRecordMonth] = useState<string | null>(null);
  const months = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

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

        // 칼로리 데이터 확인 및 처리
        if (data.records) {
          console.log('📋 기록 샘플:', data.records[0]);
          console.log('🔥 칼로리 데이터:', data.records.map((r: any) => ({ id: r.id, calories: r.calories })));

          // 칼로리가 없으면 거리를 기반으로 계산 (km당 약 100칼로리)
          const processedRecords = data.records.map((record: any) => ({
            ...record,
            calories: record.calories || Math.round(record.distance * 100)
          }));
          setStats({ ...data, records: processedRecords });
        } else {
          setStats(data);
        }
      } catch (error) {
        console.error('러닝 기록 로드 오류:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRunningStats();
  }, []);

  // 월별 필터링 함수
  const getRecordsByMonth = () => {
    if (!stats || !stats.records) return [];
    if (!selectedMonth || selectedMonth === '전체') return stats.records;

    const monthIndex = months.indexOf(selectedMonth) + 1;
    const currentYear = new Date().getFullYear();

    return stats.records.filter((record) => {
      const date = new Date(record.date);
      return date.getMonth() + 1 === monthIndex && date.getFullYear() === currentYear;
    });
  };

  // 기록 월별 필터링 함수
  const getFilteredRecords = () => {
    if (!stats || !stats.records) return [];
    if (!selectedRecordMonth || selectedRecordMonth === '전체') return stats.records;

    const monthIndex = months.indexOf(selectedRecordMonth) + 1;
    const currentYear = new Date().getFullYear();

    return stats.records.filter((record) => {
      const date = new Date(record.date);
      return date.getMonth() + 1 === monthIndex && date.getFullYear() === currentYear;
    });
  };

  const filteredRecords = getFilteredRecords();

  // 주간 데이터 계산 함수
  const calculateWeeklyData = () => {
    const records = getRecordsByMonth();

    // 4주 데이터 초기화
    const weeks: { [key: string]: { distance: number; count: number; pace: number[] } } = {
      '1주': { distance: 0, count: 0, pace: [] },
      '2주': { distance: 0, count: 0, pace: [] },
      '3주': { distance: 0, count: 0, pace: [] },
      '4주': { distance: 0, count: 0, pace: [] }
    };

    const startDate = selectedMonth && selectedMonth !== '전체'
      ? new Date(new Date().getFullYear(), months.indexOf(selectedMonth), 1)
      : new Date(new Date().getFullYear(), 0, 1);

    records.forEach((record) => {
      const recordDate = new Date(record.date);
      const day = recordDate.getDate();
      const weekNum = Math.ceil(day / 7);
      const weekKey = `${weekNum}주`;

      if (weeks[weekKey]) {
        weeks[weekKey].distance += record.distance;
        weeks[weekKey].count += 1;
        weeks[weekKey].pace.push(record.pace);
      }
    });

    // 데이터 변환
    return [
      {
        week: '1주',
        distance: parseFloat(weeks['1주'].distance.toFixed(1)),
        frequency: weeks['1주'].count,
        pace: weeks['1주'].pace.length > 0
          ? parseFloat((weeks['1주'].pace.reduce((a, b) => a + b, 0) / weeks['1주'].pace.length).toFixed(1))
          : 0
      },
      {
        week: '2주',
        distance: parseFloat(weeks['2주'].distance.toFixed(1)),
        frequency: weeks['2주'].count,
        pace: weeks['2주'].pace.length > 0
          ? parseFloat((weeks['2주'].pace.reduce((a, b) => a + b, 0) / weeks['2주'].pace.length).toFixed(1))
          : 0
      },
      {
        week: '3주',
        distance: parseFloat(weeks['3주'].distance.toFixed(1)),
        frequency: weeks['3주'].count,
        pace: weeks['3주'].pace.length > 0
          ? parseFloat((weeks['3주'].pace.reduce((a, b) => a + b, 0) / weeks['3주'].pace.length).toFixed(1))
          : 0
      },
      {
        week: '4주',
        distance: parseFloat(weeks['4주'].distance.toFixed(1)),
        frequency: weeks['4주'].count,
        pace: weeks['4주'].pace.length > 0
          ? parseFloat((weeks['4주'].pace.reduce((a, b) => a + b, 0) / weeks['4주'].pace.length).toFixed(1))
          : 0
      }
    ];
  };

  const weeklyData = calculateWeeklyData();

  const weeklyDistanceData = weeklyData.map(item => ({
    day: item.week,
    distance: item.distance
  }));

  const weeklyFrequencyData = weeklyData.map(item => ({
    week: item.week,
    count: item.frequency
  }));

  const paceChangeData = weeklyData.map(item => ({
    month: item.week,
    pace: item.pace
  }));

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

  // 실제 데이터만 사용
  const totalDistance = stats?.totalDistance ?? 0;
  const totalDuration = stats?.totalDuration ?? 0;
  const avgPace = stats?.avgPace ?? 0;
  const avgDistance = stats?.avgDistance ?? 0;
  const displayRecords = stats?.records || [];

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
              dot={{ fill: '#f89305', r: 3 }}
              activeDot={{ r: 5 }}
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
              dot={{ fill: '#03cfb4', r: 3 }}
              activeDot={{ r: 5 }}
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
              domain={[2, 'auto']}
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
              dot={{ fill: '#2e2d52', r: 3 }}
              activeDot={{ r: 5 }}
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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#f89305]" />
              <h3 className="text-[#2e2d52]">러닝 패턴</h3>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 text-sm font-medium text-[#2e2d52] border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                >
                  {selectedMonth || '전체'}
                  <ChevronDown className="w-4 h-4 ml-2 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" style={{ maxHeight: "150px" }} className="w-40 overflow-y-auto bg-white">
                <DropdownMenuItem onClick={() => setSelectedMonth(null)} className="cursor-pointer py-2">
                  전체
                </DropdownMenuItem>
                {months.map((month) => (
                  <DropdownMenuItem
                    key={month}
                    onClick={() => setSelectedMonth(month)}
                    className="cursor-pointer py-2"
                  >
                    {month}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#2e2d52]" />
              <h3 className="text-[#2e2d52]">러닝 기록</h3>
            </div>
            <button
              onClick={() => setShowAllRecords(true)}
              className="flex items-center gap-1 text-sm text-[#787878] font-medium hover:text-[#f89305] transition-colors group"
            >
              월간 기록
              <ArrowRight className="w-4 h-4 text-[#787878] group-hover:text-[#f89305] group-hover:translate-x-1 transition-all" />
            </button>
          </div>

          <div className="space-y-3">
            {displayRecords.slice(0, 2).map((record) => (
              <div
                key={record.id}
                className="bg-white rounded-xl p-3 shadow-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-[#787878]">
                    <Calendar className="w-2.5 h-2.5" />
                    <span className="text-xs">{formatDate(record.date)}</span>
                  </div>
                  <div className="bg-[#f89305]/10 text-[#f89305] px-3 py-1.8 rounded-full text-xs">
                    {record.distance}km
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="flex items-center gap-1.5">
                    <div className="bg-[#03cfb4]/10 p-1 rounded">
                      <Clock className="w-4 h-4 text-[#03cfb4]" />
                    </div>
                    <div>
                      <p className="text-xs text-[#787878]">시간</p>
                      <p className="text-xs text-[#2e2d52]">{formatDuration(record.duration)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <div className="bg-[#2e2d52]/10 p-1 rounded">
                      <MapPin className="w-4 h-4 text-[#2e2d52]" />
                    </div>
                    <div>
                      <p className="text-xs text-[#787878]">페이스</p>
                      <p className="text-xs text-[#2e2d52]">{record.pace.toFixed(1)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <div className="bg-[#f89305]/10 p-1 rounded">
                      <Flame className="w-4 h-4 text-[#f89305]" />
                    </div>
                    <div>
                      <p className="text-xs text-[#787878]">칼로리</p>
                      <p className="text-xs text-[#2e2d52]">{record.calories || 0}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* All Records Dialog */}
      <Dialog open={showAllRecords} onOpenChange={setShowAllRecords}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>전체 러닝 기록</DialogTitle>
            <DialogDescription>
              모든 러닝 기록을 확인할 수 있습니다.
            </DialogDescription>
          </DialogHeader>

          {/* Month Filter Navigation */}
          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <button
              onClick={() => {
                const currentIndex = selectedRecordMonth ? months.indexOf(selectedRecordMonth) : -1;
                if (currentIndex > 0) {
                  setSelectedRecordMonth(months[currentIndex - 1]);
                } else if (currentIndex === 0) {
                  setSelectedRecordMonth(null);
                }
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-[#2e2d52]"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <span className="text-sm font-medium text-[#2e2d52] min-w-16 text-center">
              {selectedRecordMonth || '전체'}
            </span>

            <button
              onClick={() => {
                const currentIndex = selectedRecordMonth ? months.indexOf(selectedRecordMonth) : -1;
                if (currentIndex === -1) {
                  setSelectedRecordMonth(months[0]);
                } else if (currentIndex < months.length - 1) {
                  setSelectedRecordMonth(months[currentIndex + 1]);
                }
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-[#2e2d52]"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3 py-4 max-h-96 min-h-96 overflow-y-auto">
            {filteredRecords.length === 0 ? (
              <div className="flex items-center justify-center min-h-96 text-center">
                <div>
                  <Calendar className="w-8 h-8 text-[#787878] mx-auto mb-2 opacity-50" />
                  <p className="text-sm text-[#787878]">기록이 없습니다</p>
                </div>
              </div>
            ) : (
              filteredRecords.map((record) => (
              <div
                key={record.id}
                className="bg-white rounded-xl p-3 shadow-sm border border-gray-100"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-[#787878]">
                    <Calendar className="w-2.5 h-2.5" />
                    <span className="text-xs">{formatDate(record.date)}</span>
                  </div>
                  <div className="bg-[#f89305]/10 text-[#f89305] px-3 py-1.8 rounded-full text-xs">
                    {record.distance}km
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="flex items-center gap-1.5">
                    <div className="bg-[#03cfb4]/10 p-1 rounded">
                      <Clock className="w-4 h-4 text-[#03cfb4]" />
                    </div>
                    <div>
                      <p className="text-xs text-[#787878]">시간</p>
                      <p className="text-xs text-[#2e2d52]">{formatDuration(record.duration)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <div className="bg-[#2e2d52]/10 p-1 rounded">
                      <MapPin className="w-4 h-4 text-[#2e2d52]" />
                    </div>
                    <div>
                      <p className="text-xs text-[#787878]">페이스</p>
                      <p className="text-xs text-[#2e2d52]">{record.pace.toFixed(1)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <div className="bg-[#f89305]/10 p-1 rounded">
                      <Flame className="w-4 h-4 text-[#f89305]" />
                    </div>
                    <div>
                      <p className="text-xs text-[#787878]">칼로리</p>
                      <p className="text-xs text-[#2e2d52]">{record.calories || 0}</p>
                    </div>
                  </div>
                </div>
              </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

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