import { Share2, MapPin, Clock, Gauge, Flame, TrendingUp } from 'lucide-react';
import { Button } from '../ui/button';
import type { Run } from '../../types';
import { useState, useEffect } from 'react';
import { saveRunningRecord } from '../../services/api';
import '../styles/loading-overlay.css';

type RunResultProps = {
  run: Run;
  onComplete: () => void;
  onRunAgain: () => void;
};

export function RunResult({ run, onComplete, onRunAgain }: RunResultProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // 컴포넌트 마운트 시 DB에 기록 저장
  useEffect(() => {
    const saveRecord = async () => {
      try {
        setIsSaving(true);
        const userId = localStorage.getItem('userId');
        if (!userId) {
          setSaveError('사용자 정보를 찾을 수 없습니다');
          setIsSaving(false);
          return;
        }

        // 시작 시간과 종료 시간 계산
        const endTime = new Date(run.date);
        const startTime = new Date(endTime.getTime() - run.duration * 1000);

        // 시간을 "YYYY-MM-DD HH:MM:SS" 포맷으로 변환
        const formatDateTime = (date: Date): string => {
          const pad = (n: number) => String(n).padStart(2, '0');
          return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
        };

        const startTimeStr = formatDateTime(startTime);
        const endTimeStr = formatDateTime(endTime);

        const recordData = {
          user_id: parseInt(userId),
          start_time: startTimeStr,
          end_time: endTimeStr,
          distance_km: run.distance,
          pace_km: run.pace,
          calories_kcal: run.calories,
          start_point: null,
          end_point: null,
          route: null
        };

        console.log('DB에 저장할 데이터:', recordData);
        const result = await saveRunningRecord(recordData);
        console.log('DB 저장 성공:', result);

        // 최소 0.5초 동안 로딩 화면 표시
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error('DB 저장 중 오류:', error);
        setSaveError(error instanceof Error ? error.message : '저장 중 오류가 발생했습니다');
      } finally {
        setIsSaving(false);
      }
    };

    saveRecord();
  }, [run]);
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
      {/* Error Message */}
      {saveError && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <p className="font-semibold">저장 오류</p>
          <p className="text-sm">{saveError}</p>
        </div>
      )}

      {/* Saving Overlay */}
      {isSaving && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <style>{`
            @keyframes spinnerRotate {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            .loading-spinner-container {
              animation: spinnerRotate 0.8s linear infinite;
              display: inline-block;
            }
          `}</style>
          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <div className="loading-spinner-container">
                <svg width="48" height="48" viewBox="0 0 50 50">
                  <circle
                    cx="25"
                    cy="25"
                    r="20"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.3)"
                    strokeWidth="3"
                  />
                  <circle
                    cx="25"
                    cy="25"
                    r="20"
                    fill="none"
                    stroke="#f89305"
                    strokeWidth="3"
                    strokeDasharray="31.4 125.6"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
            <p className="text-white text-lg font-semibold animate-pulse">기록 저장 중</p>
          </div>
        </div>
      )}

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