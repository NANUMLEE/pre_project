import { useState } from 'react';
import { Home, MapPin, User as UserIcon, Settings, Bell, HelpCircle, LogOut, Star, Target, History, CloudRain, Clock, Ruler, Weight, BarChart3 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Progress } from '../ui/progress';
import { Switch } from '../ui/switch';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../ui/alert-dialog';
import type { User } from '../../types';

type MyPageProps = {
  user: User;
  onNavigate: (screen: 'home' | 'course' | 'community' | 'mypage') => void;
  onLogout: () => void;
  onUpdateUser: (updatedUser: User) => void;
  coursesData: any[];
  placesData: any[];
  toggleCourseFavorite: (courseId: string) => void;
  togglePlaceFavorite: (placeId: string) => void;
};

export function MyPage({ user, onNavigate, onLogout, onUpdateUser, coursesData, placesData, toggleCourseFavorite, togglePlaceFavorite }: MyPageProps) {
  const [weatherAlertEnabled, setWeatherAlertEnabled] = useState(true);
  const [runningReminderEnabled, setRunningReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('07:00');
  const [showTimeDialog, setShowTimeDialog] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showFavoritesDialog, setShowFavoritesDialog] = useState(false);
  const [showRecordsDialog, setShowRecordsDialog] = useState(false);
  const [showGoalDialog, setShowGoalDialog] = useState(false);

  // Profile edit states
  const [nickname, setNickname] = useState(user.nickname);
  const [height, setHeight] = useState(user.height?.toString() || '');
  const [weight, setWeight] = useState(user.weight?.toString() || '');

  // Weekly goal states
  const [weeklyGoal, setWeeklyGoal] = useState({
    targetDistance: 20,
    targetRuns: 5,
    currentDistance: 12.3,
    currentRuns: 3
  });
  const [targetDistance, setTargetDistance] = useState(weeklyGoal.targetDistance.toString());
  const [targetRuns, setTargetRuns] = useState(weeklyGoal.targetRuns.toString());

  // Favorite courses and places from props
  const favoriteCourses = coursesData.filter(c => c.isFavorite).map(c => ({
    id: c.id,
    name: c.name,
    distance: c.distance,
    type: 'course' as const
  }));

  const favoritePlaces = placesData.filter(p => p.isFavorite).map(p => ({
    id: p.id,
    name: p.name,
    distance: p.distance,
    type: 'place' as const
  }));

  const allFavorites = [...favoriteCourses, ...favoritePlaces];

  // Mock running records
  const runningRecords = [
    {
      id: '1',
      date: '2025-11-10',
      courseName: '한강 러닝 코스',
      distance: 8.3,
      duration: 2490,
      pace: 5.0,
      calories: 650
    },
    {
      id: '2',
      date: '2025-11-08',
      courseName: '올림픽공원 순환',
      distance: 5.2,
      duration: 1860,
      pace: 6.0,
      calories: 420
    },
    {
      id: '3',
      date: '2025-11-05',
      courseName: '청계천 러닝 코스',
      distance: 4.2,
      duration: 1500,
      pace: 5.9,
      calories: 340
    },
    {
      id: '4',
      date: '2025-11-03',
      courseName: '남산 순환로',
      distance: 7.8,
      duration: 2340,
      pace: 5.0,
      calories: 580
    },
    {
      id: '5',
      date: '2025-11-01',
      courseName: '한강 러닝 코스',
      distance: 6.5,
      duration: 2100,
      pace: 5.4,
      calories: 490
    }
  ];

  const progressDistance = (weeklyGoal.currentDistance / weeklyGoal.targetDistance) * 100;
  const progressRuns = (weeklyGoal.currentRuns / weeklyGoal.targetRuns) * 100;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}분 ${secs}초`;
  };

  const handleSaveProfile = () => {
    // Update user with new profile information
    const updatedUser: User = {
      ...user,
      nickname,
      height: height ? parseInt(height) : user.height,
      weight: weight ? parseInt(weight) : user.weight
    };
    onUpdateUser(updatedUser);
    setShowProfileDialog(false);
  };


  const handleSaveGoal = () => {
    setWeeklyGoal({
      ...weeklyGoal,
      targetDistance: parseFloat(targetDistance) || 20,
      targetRuns: parseInt(targetRuns) || 5
    });
    setShowGoalDialog(false);
  };

  const handleFavoriteItemClick = (item: typeof allFavorites[0]) => {
    setShowFavoritesDialog(false);
    onNavigate('course');
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Profile Header */}
      <div className="bg-[#2e2d52] text-white px-6 pt-12 pb-8">
        <div className="flex items-center gap-4 mb-6">
          <Avatar className="w-20 h-20 border-4 border-white">
            <AvatarImage src={user.profileImage} />
            <AvatarFallback className="bg-[#f89305] text-white text-2xl">
              {user.nickname.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h2 className="text-white mb-1">{user.nickname}</h2>
            <p className="text-sm opacity-90">{user.email}</p>
          </div>
          <button 
            onClick={() => setShowProfileDialog(true)}
            className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/20">
          <div className="text-center">
            <p className="text-2xl mb-1">{user.totalRuns}</p>
            <p className="text-xs opacity-80">총 러닝</p>
          </div>
          <div className="text-center">
            <p className="text-2xl mb-1">{user.totalDistance.toFixed(1)}</p>
            <p className="text-xs opacity-80">총 거리 (km)</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        {/* Weekly Goal */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-[#f89305]" />
            <h3 className="text-[#2e2d52]">주간 목표</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[#787878]">거리</span>
                <span className="text-sm text-[#2e2d52]">
                  {weeklyGoal.currentDistance}km / {weeklyGoal.targetDistance}km
                </span>
              </div>
              <Progress value={progressDistance} className="h-2" />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[#787878]">횟수</span>
                <span className="text-sm text-[#2e2d52]">
                  {weeklyGoal.currentRuns}회 / {weeklyGoal.targetRuns}회
                </span>
              </div>
              <Progress value={progressRuns} className="h-2" />
            </div>
          </div>
          
          <Button 
            onClick={() => setShowGoalDialog(true)}
            className="w-full mt-4 bg-[#f89305]/10 hover:bg-[#f89305]/20 text-[#f89305] border-none"
          >
            목표 수정하기
          </Button>
        </div>

        {/* Favorite Courses */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-[#f89305]" />
              <h3 className="text-[#2e2d52]">즐겨찾기 코스</h3>
            </div>
            <button 
              onClick={() => setShowFavoritesDialog(true)}
              className="text-sm text-[#f89305]"
            >
              전체보기
            </button>
          </div>
          
          <div className="space-y-3">
            {favoriteCourses.slice(0, 2).map((course) => (
              <div
                key={course.id}
                onClick={() => handleFavoriteItemClick(course)}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-[#787878]" />
                  <span className="text-sm text-[#2e2d52]">{course.name}</span>
                </div>
                <span className="text-sm text-[#787878]">{course.distance}km</span>
              </div>
            ))}
            {favoriteCourses.length === 0 && (
              <p className="text-sm text-[#787878] text-center py-4">즐겨찾기한 코스가 없습니다</p>
            )}
          </div>
        </div>

        {/* Running Settings */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <h3 className="text-[#2e2d52] mb-4">러닝 알림 설정</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <CloudRain className="w-5 h-5 text-[#787878]" />
                <div>
                  <p className="text-sm text-[#2e2d52]">날씨 기반 러닝 알림</p>
                  <p className="text-xs text-[#787878]">러닝하기 좋은 날씨를 알려드려요</p>
                </div>
              </div>
              <Switch 
                checked={weatherAlertEnabled}
                onCheckedChange={setWeatherAlertEnabled}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <Clock className="w-5 h-5 text-[#787878]" />
                <div>
                  <p className="text-sm text-[#2e2d52]">러닝 리마인더</p>
                  <p className="text-xs text-[#787878]">
                    {runningReminderEnabled 
                      ? `매일 ${reminderTime}에 알림을 보내드려요` 
                      : '원하는 시간에 러닝 알림을 받으세요'}
                  </p>
                </div>
              </div>
              <Switch 
                checked={runningReminderEnabled}
                onCheckedChange={setRunningReminderEnabled}
              />
            </div>

            {runningReminderEnabled && (
              <Dialog open={showTimeDialog} onOpenChange={setShowTimeDialog}>
                <Button 
                  onClick={() => setShowTimeDialog(true)}
                  className="w-full bg-gray-50 hover:bg-gray-100 text-[#2e2d52] border-none"
                >
                  알림 시간 설정: {reminderTime}
                </Button>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>러닝 리마인더 시간</DialogTitle>
                    <DialogDescription>
                      알림을 받을 시간을 설정해주세요.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <input
                      type="time"
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-xl text-center text-lg"
                    />
                  </div>
                  <Button 
                    onClick={() => setShowTimeDialog(false)}
                    className="w-full bg-[#f89305] hover:bg-[#e08504] text-white"
                  >
                    확인
                  </Button>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Menu */}
        <div className="space-y-3 mb-6">
          <button className="w-full flex items-center justify-between p-4 bg-white rounded-xl shadow-sm hover:bg-gray-50">
            <div className="flex items-center gap-3">
              <HelpCircle className="w-5 h-5 text-[#787878]" />
              <span className="text-sm text-[#2e2d52]">도움말</span>
            </div>
            <span className="text-[#787878]">›</span>
          </button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="w-full flex items-center justify-between p-4 bg-white rounded-xl shadow-sm hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <LogOut className="w-5 h-5 text-[#787878]" />
                  <span className="text-sm text-[#2e2d52]">로그아웃</span>
                </div>
                <span className="text-[#787878]">›</span>
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>로그아웃</AlertDialogTitle>
                <AlertDialogDescription>
                  정말 로그아웃 하시겠습니까?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-gray-200 text-[#2e2d52]">
                  취소
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={onLogout}
                  className="bg-[#f89305] hover:bg-[#e08504] text-white"
                >
                  로그아웃
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <button className="w-full flex items-center justify-between p-4 bg-white rounded-xl shadow-sm hover:bg-gray-50">
            <span className="text-sm text-[#787878]">회원탈퇴</span>
            <span className="text-[#787878]">›</span>
          </button>
        </div>

        <p className="text-center text-xs text-[#787878]">Version 1.0.0</p>
      </div>

      {/* Profile Edit Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>계정 정보</DialogTitle>
            <DialogDescription>
              프로필 정보를 수정할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Profile Image */}
            <div className="flex flex-col items-center gap-3">
              <Avatar className="w-24 h-24 border-4 border-gray-200">
                <AvatarImage src={user.profileImage} />
                <AvatarFallback className="bg-[#f89305] text-white text-3xl">
                  {nickname.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Nickname */}
            <div>
              <label className="block text-sm text-[#2e2d52] mb-2">닉네임</label>
              <Input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="h-12 bg-[#f3f3f5] border-none rounded-xl"
              />
            </div>

            {/* Email (read-only) */}
            <div>
              <label className="block text-sm text-[#2e2d52] mb-2">이메일</label>
              <Input
                type="email"
                value={user.email}
                disabled
                className="h-12 bg-gray-100 border-none rounded-xl text-[#787878]"
              />
            </div>

            {/* Height */}
            <div>
              <label className="block text-sm text-[#2e2d52] mb-2">키 (cm)</label>
              <div className="relative">
                <Ruler className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#787878]" />
                <Input
                  type="number"
                  placeholder="예: 170"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="pl-12 h-12 bg-[#f3f3f5] border-none rounded-xl"
                />
              </div>
            </div>

            {/* Weight */}
            <div>
              <label className="block text-sm text-[#2e2d52] mb-2">몸무게 (kg)</label>
              <div className="relative">
                <Weight className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#787878]" />
                <Input
                  type="number"
                  placeholder="예: 65"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="pl-12 h-12 bg-[#f3f3f5] border-none rounded-xl"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowProfileDialog(false)}
              className="flex-1"
            >
              취소
            </Button>
            <Button
              onClick={handleSaveProfile}
              className="flex-1 bg-[#f89305] hover:bg-[#e08504] text-white"
            >
              저장
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Goal Edit Dialog */}
      <Dialog open={showGoalDialog} onOpenChange={setShowGoalDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>주간 목표 수정</DialogTitle>
            <DialogDescription>
              이번 주 러닝 목표를 설정해주세요.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div>
              <label className="block text-sm text-[#2e2d52] mb-2">목표 거리 (km)</label>
              <Input
                type="number"
                placeholder="예: 20"
                value={targetDistance}
                onChange={(e) => setTargetDistance(e.target.value)}
                className="h-12 bg-[#f3f3f5] border-none rounded-xl"
              />
            </div>

            <div>
              <label className="block text-sm text-[#2e2d52] mb-2">목표 횟수 (회)</label>
              <Input
                type="number"
                placeholder="예: 5"
                value={targetRuns}
                onChange={(e) => setTargetRuns(e.target.value)}
                className="h-12 bg-[#f3f3f5] border-none rounded-xl"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowGoalDialog(false)}
              className="flex-1"
            >
              취소
            </Button>
            <Button
              onClick={handleSaveGoal}
              className="flex-1 bg-[#f89305] hover:bg-[#e08504] text-white"
            >
              저장
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Favorites Dialog */}
      <Dialog open={showFavoritesDialog} onOpenChange={setShowFavoritesDialog}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>즐겨찾기</DialogTitle>
            <DialogDescription>
              저장한 코스와 장소 목록입니다.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-4">
            {allFavorites.length === 0 ? (
              <div className="text-center py-8">
                <Star className="w-12 h-12 text-[#787878] mx-auto mb-3" />
                <p className="text-sm text-[#787878]">즐겨찾기한 항목이 없습니다</p>
              </div>
            ) : (
              allFavorites.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleFavoriteItemClick(item)}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${item.type === 'course' ? 'bg-[#f89305]/20' : 'bg-[#03cfb4]/20'} rounded-lg flex items-center justify-center`}>
                      <MapPin className={`w-5 h-5 ${item.type === 'course' ? 'text-[#f89305]' : 'text-[#03cfb4]'}`} />
                    </div>
                    <div>
                      <p className="text-sm text-[#2e2d52]">{item.name}</p>
                      <p className="text-xs text-[#787878]">
                        {item.type === 'course' ? '코스' : '장소'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm text-[#2e2d52]">{item.distance}km</p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (item.type === 'course') {
                          toggleCourseFavorite(item.id);
                        } else {
                          togglePlaceFavorite(item.id);
                        }
                      }}
                      className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                    >
                      <Star className="w-5 h-5 text-[#f89305] fill-[#f89305]" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Records Dialog */}
      <Dialog open={showRecordsDialog} onOpenChange={setShowRecordsDialog}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>전체 기록</DialogTitle>
            <DialogDescription>
              러닝 기록을 확인할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-4">
            {runningRecords.map((record) => (
              <div
                key={record.id}
                className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-[#2e2d52]">{record.courseName}</p>
                  <p className="text-xs text-[#787878]">{record.date}</p>
                </div>
                
                <div className="grid grid-cols-4 gap-2">
                  <div className="text-center">
                    <p className="text-xs text-[#787878] mb-1">거리</p>
                    <p className="text-sm text-[#2e2d52]">{record.distance}km</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-[#787878] mb-1">시간</p>
                    <p className="text-sm text-[#2e2d52]">{formatTime(record.duration)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-[#787878] mb-1">페이스</p>
                    <p className="text-sm text-[#2e2d52]">{record.pace.toFixed(1)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-[#787878] mb-1">칼로리</p>
                    <p className="text-sm text-[#2e2d52]">{record.calories}</p>
                  </div>
                </div>
              </div>
            ))}
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
            className="flex flex-col items-center justify-center py-3 text-[#787878] hover:bg-gray-50"
          >
            <BarChart3 className="w-6 h-6" />
            <span className="text-xs mt-1">레포트</span>
          </button>
          <button
            onClick={() => onNavigate('mypage')}
            className="flex flex-col items-center justify-center py-3 text-[#f89305] bg-orange-50"
          >
            <UserIcon className="w-6 h-6" />
            <span className="text-xs mt-1">마이</span>
          </button>
        </div>
      </div>
    </div>
  );
}
