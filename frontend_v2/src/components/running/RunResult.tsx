import { Share2, MapPin, Clock, Gauge, Flame, TrendingUp } from 'lucide-react';
import { Button } from '../ui/button';
import type { Run } from '../../types';

type RunResultProps = {
  run: Run;
  onComplete: () => void;
  onRunAgain: () => void;
};

export function RunResult({ run, onComplete, onRunAgain }: RunResultProps) {
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}시간 ${mins}분 ${secs}초`;
    }
    return `${mins}분 ${secs}초`;
  };

  const formatDate = () => {
    const date = new Date(run.date);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    const weekday = weekdays[date.getDay()];
    return `${month}월 ${day}일 (${weekday})`;
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#f89305] to-[#ffa940] text-white px-6 pt-12 pb-8 text-center">
        <div className="mb-4">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-5xl">🎉</span>
          </div>
          <h1 className="text-white mb-2">완료했습니다!</h1>
          <p className="text-sm opacity-90">{formatDate()}</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-white/20 rounded-xl p-4 backdrop-blur-sm">
            <p className="text-3xl mb-1">{run.distance}</p>
            <p className="text-sm opacity-90">km</p>
          </div>
          <div className="bg-white/20 rounded-xl p-4 backdrop-blur-sm">
            <p className="text-3xl mb-1">{Math.floor(run.duration / 60)}</p>
            <p className="text-sm opacity-90">분</p>
          </div>
          <div className="bg-white/20 rounded-xl p-4 backdrop-blur-sm">
            <p className="text-3xl mb-1">{run.calories}</p>
            <p className="text-sm opacity-90">kcal</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        {/* Route Map */}
        <div className="mb-6">
          <h3 className="text-[#2e2d52] mb-3">달린 경로</h3>
          <div className="bg-gradient-to-br from-green-100 to-blue-100 rounded-2xl h-48 relative overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <MapPin className="w-12 h-12 text-[#f89305]" />
            </div>
          </div>
        </div>

        {/* Detailed Stats */}
        <div className="mb-6">
          <h3 className="text-[#2e2d52] mb-3">상세 기록</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-10 h-10 bg-[#03cfb4]/20 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-[#03cfb4]" />
                </div>
                <p className="text-xs text-[#787878]">총 시간</p>
              </div>
              <p className="text-xl text-[#2e2d52]">{formatTime(run.duration)}</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-10 h-10 bg-[#f89305]/20 rounded-lg flex items-center justify-center">
                  <Gauge className="w-5 h-5 text-[#f89305]" />
                </div>
                <p className="text-xs text-[#787878]">평균 페이스</p>
              </div>
              <p className="text-xl text-[#2e2d52]">{run.pace.toFixed(1)} 분/km</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-10 h-10 bg-[#2e2d52]/20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-[#2e2d52]" />
                </div>
                <p className="text-xs text-[#787878]">평균 속도</p>
              </div>
              <p className="text-xl text-[#2e2d52]">
                {((run.distance / (run.duration / 3600)).toFixed(1))} km/h
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                  <Flame className="w-5 h-5 text-pink-600" />
                </div>
                <p className="text-xs text-[#787878]">칼로리</p>
              </div>
              <p className="text-xl text-[#2e2d52]">{run.calories} kcal</p>
            </div>
          </div>
        </div>

        {/* Motivation Message */}
        <div className="mb-6 p-6 bg-gradient-to-br from-[#03cfb4]/10 to-[#f89305]/10 rounded-2xl text-center">
          <p className="text-lg text-[#2e2d52] mb-2">🏆 훌륭해요!</p>
          <p className="text-sm text-[#787878]">
            목표를 향해 한 걸음 더 나아갔습니다
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pb-6">
          <Button
            onClick={() => {}}
            className="w-full h-14 bg-[#f89305] hover:bg-[#e08504] text-white rounded-xl"
          >
            <Share2 className="w-5 h-5 mr-2" />
            공유하기
          </Button>
          
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={onRunAgain}
              className="h-12 bg-white border-2 border-[#f89305] text-[#f89305] hover:bg-[#f89305] hover:text-white rounded-xl"
            >
              다시 달리기
            </Button>
            <Button
              onClick={onComplete}
              className="h-12 bg-[#2e2d52] hover:bg-[#1e1d42] text-white rounded-xl"
            >
              완료
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}