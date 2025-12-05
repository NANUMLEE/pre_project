import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/button';
import VoiceCommandButton from '../VoiceCommandButton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { MapContainer, TileLayer, Marker, Circle, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from '../../utils/leafletFix';
import type { Course, Run } from '../../types';
import { useWebSocket, type UserLocation } from '../../hooks/useWebSocket';
import { WS_ENDPOINT } from '../../config/api';
import { formatDistance } from '../../services/locationService';

type RunningProps = {
  course: Course | null;
  onComplete: (run: Run) => void;
  onBack?: () => void;
};

interface GPSPosition {
  lat: number;
  lng: number;
}

// 지도 센터와 줌을 제어하는 컴포넌트
function MapController({ course, currentPosition }: { course: Course | null; currentPosition: GPSPosition | null }) {
  const map = useMap();

  useEffect(() => {
    if (course && course.route && course.route.length > 0 && currentPosition) {
      // 경로와 현재 위치를 모두 포함하는 bounds 생성
      const allPoints = [...course.route, [currentPosition.lat, currentPosition.lng]] as [number, number][];
      const bounds = L.latLngBounds(allPoints);
      map.fitBounds(bounds, { padding: [80, 80], animate: true });
    } else if (course && course.route && course.route.length > 0) {
      // 경로만 있으면 경로 전체가 보이도록 줌 조정
      const bounds = L.latLngBounds(course.route as [number, number][]);
      map.fitBounds(bounds, { padding: [50, 50], animate: true });
    } else if (currentPosition) {
      // 현재 위치만 있으면 현재 위치를 중심으로
      map.setView([currentPosition.lat, currentPosition.lng], 16);
    }
  }, [course, currentPosition, map]);

  return null;
}

export function Running({ course, onComplete, onBack }: RunningProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [distance, setDistance] = useState(0);
  const [showStopDialog, setShowStopDialog] = useState(false);
  const [showBackDialog, setShowBackDialog] = useState(false);
  const [previousPosition, setPreviousPosition] = useState<GPSPosition | null>(null);
  const [currentPosition, setCurrentPosition] = useState<GPSPosition | null>(null);
  const [selectedUserForEmoji, setSelectedUserForEmoji] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [receivedEmoji, setReceivedEmoji] = useState<{ emoji: string; from: string } | null>(null);
  const intervalRef = useRef<number | null>(null);

  // 코스 데이터 확인
  useEffect(() => {
    console.log('Running 컴포넌트 - course 데이터:', course);
    if (course && course.route) {
      console.log('코스 경로:', course.route);
    }
  }, [course]);

  // 이모티콘 목록
  const EMOJI_LIST = ['🙌', '🔥', '💪'];

  // 이모티콘 타입을 실제 이모지로 변환
  const getEmojiIcon = (emojiType: string): string => {
    const emojiMap: Record<string, string> = {
      'FIGHTING': '💪',
      'HIGHFIVE': '🙌',
      'FIRE': '🔥',
      '파이팅': '💪',
      '하이파이브': '🙌',
      '열정': '🔥',
    };
    return emojiMap[emojiType] || emojiType;
  };

  // 로그인 여부 확인
  const userId = localStorage.getItem('userId');
  const isLoggedIn = !!userId;

  // WebSocket으로 다른 사용자의 위치 수신
  const clientId = useRef(
    `client_${Date.now()}_${Math.random().toString(36).substring(7)}`
  ).current;
  const { otherUsers, isConnected, sendLocation, sendEmoji, onEmojiReceived } = useWebSocket(
    clientId,
    WS_ENDPOINT,
    userId || undefined
  );

  // GPS 위치 실시간 추적 및 WebSocket 전송 (10초마다)
  useEffect(() => {
    if (!navigator.geolocation) {
      console.error('GPS not supported');
      return;
    }

    // GPS 위치 가져오는 함수
    const updatePosition = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newPosition: GPSPosition = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          // console.log('GPS 위치 업데이트 (10초 주기):', newPosition);
          setCurrentPosition(newPosition);

          // WebSocket으로 위치 전송 (로그인했을 때만)
          if (isLoggedIn && isConnected) {
            sendLocation(newPosition.lat, newPosition.lng);
          }

          // 러닝 중일 때만 거리 계산
          if (isRunning && !isPaused) {
            handlePositionChange(newPosition);
          }
        },
        (err) => {
          console.error('GPS 오류:', err);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 10000,
        }
      );
    };

    // 즉시 한 번 실행
    updatePosition();

    // 10초마다 반복 실행
    const intervalId = setInterval(updatePosition, 10000);

    return () => {
      clearInterval(intervalId);
    };
  }, [isRunning, isPaused, isLoggedIn, isConnected, sendLocation]);

  // 타이머
  useEffect(() => {
    if (isRunning && !isPaused) {
      intervalRef.current = window.setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isPaused]);

  // ✨ 이모티콘 수신 감지 (신규)
  useEffect(() => {
    if (onEmojiReceived) {
      console.log('🎉 Running.tsx에서 이모티콘 수신:', onEmojiReceived);
      setReceivedEmoji({
        emoji: onEmojiReceived.emoji || '😀',
        from: onEmojiReceived.from || 'unknown'
      });

      // 3초 후 초기화
      const timer = setTimeout(() => {
        setReceivedEmoji(null);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [onEmojiReceived]);

  // Haversine 공식을 사용하여 두 좌표 간의 거리 계산 (km 단위)
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // 지구의 반지름 (km)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const calculatePace = () => {
    if (distance === 0) return 0;
    return duration / 60 / distance;
  };

  const calculateCalories = () => {
    return Math.round(distance * 60);
  };

  /**
   * GPS 위치 변경 시 거리 계산
   * Haversine 공식을 사용해 두 좌표 간의 거리 계산
   */
  const handlePositionChange = (newPosition: GPSPosition) => {
    if (!isRunning || isPaused) return;

    if (previousPosition) {
      // Haversine 공식으로 두 좌표 간 거리 계산
      const R = 6371; // 지구 반지름 (km)
      const lat1 = (previousPosition.lat * Math.PI) / 180;
      const lat2 = (newPosition.lat * Math.PI) / 180;
      const deltaLat = ((newPosition.lat - previousPosition.lat) * Math.PI) / 180;
      const deltaLng = ((newPosition.lng - previousPosition.lng) * Math.PI) / 180;

      const a =
        Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
        Math.cos(lat1) *
          Math.cos(lat2) *
          Math.sin(deltaLng / 2) *
          Math.sin(deltaLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distanceDiff = R * c; // km 단위

      // GPS 노이즈 필터링 (100m 이상의 변화만 인정)
      if (distanceDiff > 0.0001) {
        setDistance((prev) => prev + distanceDiff);
      }
    }

    setPreviousPosition(newPosition);
  };

  const handleStart = () => {
    // 로그인하지 않은 사용자는 러닝 시작 불가
    if (!isLoggedIn) {
      console.warn('⚠️ 로그인하지 않은 사용자는 러닝을 시작할 수 없습니다.');
      alert('러닝을 시작하려면 먼저 로그인하세요.');
      return;
    }

    setIsRunning(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
  };

  const handleStopClick = () => {
    setShowStopDialog(true);
  };

  const handleStopConfirm = () => {
    console.log('종료 버튼 클릭 - duration:', duration, 'distance:', distance);

    // duration > 0이면 기록 저장 (distance가 0이어도 상관없음)
    if (duration > 0) {
      const newRun: Run = {
        id: Date.now().toString(),
        userId: userId || 'unknown', // 로그인한 사용자 ID 사용
        courseId: course?.id,
        date: new Date(),
        duration,
        distance: parseFloat(distance.toFixed(2)),
        calories: calculateCalories(),
        pace: parseFloat(calculatePace().toFixed(2)),
        route: []
      };
      console.log('Run 데이터:', newRun);
      onComplete(newRun);
      setShowStopDialog(false);
    } else {
      console.log('duration이 0이므로 저장 안 함');
    }
  };

  const handleBackClick = () => {
    if (isRunning) {
      setShowBackDialog(true);
    } else {
      onBack?.();
    }
  };

  const handleBackConfirm = () => {
    onBack?.();
  };

  return (
    <div className="min-h-screen bg-[#2e2d52] text-white flex flex-col overflow-hidden relative rounded-3xl" style={{ height: '100vh' }}>
      {/* Header */}
      <div className="px-6 pt-6 pb-4 z-20 relative flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBackClick}
              className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <p className="text-sm opacity-80">{isRunning ? '러닝 중' : '러닝 준비'}</p>
              {course && <p className="text-sm">{course.name}</p>}
              {/* WebSocket 연결 상태 표시 */}
              {isLoggedIn && (
                <p className="text-xs opacity-60 mt-1">
                  <span className={`inline-block w-2 h-2 rounded-full mr-1 ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></span>
                  {isConnected ? `실시간 공유 활성화 (${otherUsers.length}명)` : '위치 공유 대기 중...'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ✨ 받은 이모티콘 애니메이션 표시 (신규) - Map Area 위에 표시 */}
      {receivedEmoji && (
        <div
          className="fixed inset-0 flex items-center justify-center pointer-events-none z-50"
          style={{
            animation: 'float-up 1s ease-out forwards',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)'
          }}
        >
          <div style={{
            fontSize: window.innerWidth < 768 ? '100px' : '150px',
            textShadow: '0 4px 8px rgba(0,0,0,0.3)'
          }}>
            {getEmojiIcon(receivedEmoji.emoji)}
          </div>
        </div>
      )}

      <style>{`
        @keyframes float-up {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -150%) scale(1.5);
            opacity: 0;
          }
        }
      `}</style>

      {/* Map Area - Middle section with borders */}
      <div className="relative flex-1 overflow-hidden mx-4 rounded-2xl z-10 mb-4">

        <MapContainer
          center={currentPosition ? [currentPosition.lat, currentPosition.lng] : [35.1053, 129.0173]}
          zoom={16}
          scrollWheelZoom={true}
          style={{
            height: '100%',
            width: '100%',
            borderRadius: '16px'
          }}
        >
          <MapController course={course} currentPosition={currentPosition} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {/* 코스 경로 표시 */}
          {course && course.route && course.route.length > 0 && (
            <>
              {/* 경로 테두리 (흰색 하이라이트) */}
              <Polyline
                positions={course.route as [number, number][]}
                pathOptions={{
                  color: 'white',
                  weight: 8,
                  opacity: 0.8,
                  lineCap: 'round',
                  lineJoin: 'round'
                }}
              />
              {/* 실제 경로 */}
              <Polyline
                positions={course.route as [number, number][]}
                pathOptions={{
                  color: '#f89305',
                  weight: 4,
                  opacity: 1,
                  lineCap: 'round',
                  lineJoin: 'round'
                }}
              />
            </>
          )}

          {/* GPS 마커 */}
          {currentPosition && (
            <>
              <Marker
                position={[currentPosition.lat, currentPosition.lng]}
                icon={L.divIcon({
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
                })}
              >
                <Popup>
                  <div className="text-sm font-semibold">내 위치</div>
                </Popup>
              </Marker>
              <Circle
                center={[currentPosition.lat, currentPosition.lng]}
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
            </>
          )}

          {/* 다른 사용자 마커 */}
          {otherUsers && otherUsers.length > 0 && (
            otherUsers.map((user: UserLocation) => (
              <Marker
                key={user.id}
                position={[user.latitude, user.longitude]}
                icon={L.divIcon({
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
                })}
                onClick={() => setSelectedUserForEmoji(user.id)}
              >
                <Popup>
                  <div className="text-xs">
                    <div className="font-semibold text-orange-600 mb-2">
                      {user.name || user.userId || user.id}
                    </div>
                    <div className="text-[#787878] text-xs font-semibold mb-2">
                      거리: {currentPosition ?
                        formatDistance(calculateDistance(currentPosition.lat, currentPosition.lng, user.latitude, user.longitude))
                        : formatDistance(user.distance || 0)}
                    </div>
                    {/* ✨ 이모티콘 버튼 (신규) */}
                    <div className="flex gap-1 mt-2">
                      {EMOJI_LIST.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => {
                            if (userId) {
                              sendEmoji(user.id, emoji);
                            }
                            setSelectedUserForEmoji(null);
                          }}
                          className="text-lg hover:scale-125 transition-transform cursor-pointer"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))
          )}
        </MapContainer>
      </div>

      {/* Stats Section - Bottom */}
      <div className="z-20 relative pt-4 pb-6 px-6 flex-shrink-0">
        {/* Bottom Row: 거리, 시간, 칼로리, 페이스 (4개) - 한 줄 */}
        <div className="bg-white/10 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center">
              <p className="text-xs font-light opacity-60 mb-1">거리</p>
              <p className="text-2xl font-black">{distance.toFixed(2)}</p>
              <p className="text-xs font-light opacity-60 mt-1">km</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-light opacity-60 mb-1">시간</p>
              <p className="text-2xl font-black">{formatTime(duration)}</p>
              <p className="text-xs font-light opacity-60 mt-1">분:초</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-light opacity-60 mb-1">칼로리</p>
              <p className="text-2xl font-black">{calculateCalories()}</p>
              <p className="text-xs font-light opacity-60 mt-1">kcal</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-light opacity-60 mb-1">페이스</p>
              <p className="text-2xl font-black">{calculatePace().toFixed(1)}</p>
              <p className="text-xs font-light opacity-60 mt-1">분/km</p>
            </div>
          </div>
        </div>

        {/* Control Buttons */}
        {!isRunning ? (
          <Button
            onClick={handleStart}
            className="w-full h-12 bg-[#f89305] hover:bg-[#e08504] text-white rounded-2xl font-semibold text-base"
          >
            <Play className="w-5 h-5 mr-2" />
            시작
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              onClick={handlePause}
              className="flex-1 h-12 bg-[#03cfb4] hover:bg-[#02b89a] text-white border-none rounded-2xl font-semibold text-sm"
            >
              <Pause className="w-5 h-5 mr-1" />
              {isPaused ? '재개' : '일시정지'}
            </Button>
            <Button
              onClick={handleStopClick}
              className="flex-1 h-12 bg-[#f89305] hover:bg-[#e08504] text-white rounded-2xl font-semibold text-sm"
            >
              <Square className="w-5 h-5 mr-1" />
              종료
            </Button>
          </div>
        )}
      </div>

      {/* Stop Confirmation Dialog */}
      <AlertDialog open={showStopDialog} onOpenChange={setShowStopDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>러닝을 종료하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              현재까지의 기록이 저장됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-200 text-[#2e2d52]">
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleStopConfirm}
              className="bg-[#f89305] hover:bg-[#e08504] text-white"
            >
              종료
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Back Confirmation Dialog */}
      <AlertDialog open={showBackDialog} onOpenChange={setShowBackDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>러닝을 취소하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              러닝 중에는 뒤로가기를 할 수 없습니다. 러닝을 종료하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-200 text-[#2e2d52]">
              계속하기
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBackConfirm}
              className="bg-[#f89305] hover:bg-[#e08504] text-white"
            >
              취소
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 음성 명령 플로팅 버튼 */}
      {isLoggedIn && userId && (
        <VoiceCommandButton
          userId={userId}
          compact={true}
          onResult={(result) => {
            console.log('음성 명령 결과:', result);
            // 필요시 추가 처리 (예: 이모티콘 전송, 주변 러너 정보 표시 등)
          }}
        />
      )}
    </div>
  );
}