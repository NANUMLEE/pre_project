import { Home as HomeIcon, MapPin, User, BarChart3 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { WeatherWidget } from './WeatherWidget';
import { NearbyMap } from './NearbyMap';
import { RecommendedCourses } from './RecommendedCourses';
import { Button } from '../ui/button';
import type { User as UserType, Course } from '../../types';

interface NearbyLocation {
  id: string;
  name: string;
  runners: number;
  distance: string;
  distanceFromMe: string;
  courseStartLat?: number;
  courseStartLng?: number;
  courseEndLat?: number;
  courseEndLng?: number;
}

type HomeProps = {
  user: UserType;
  onStartRunning: (course?: Course) => void;
  onCourseClick: (course: Course) => void;
  onNavigate: (screen: 'home' | 'course' | 'community' | 'mypage') => void;
  courses: Course[];
  nearbyLocations: NearbyLocation[];
  setNearbyLocations: (locations: NearbyLocation[]) => void;
  recommendedCourses: Course[];
  setRecommendedCourses: (courses: Course[]) => void;
  allRecommendedCourses: Course[];
  setAllRecommendedCourses: (courses: Course[]) => void;
};

export function Home({
  user,
  onStartRunning,
  onCourseClick,
  onNavigate,
  courses,
  nearbyLocations,
  setNearbyLocations,
  recommendedCourses,
  setRecommendedCourses,
  allRecommendedCourses,
  setAllRecommendedCourses
}: HomeProps) {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-[#2e2d52] text-white px-6 pt-12 pb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm opacity-90 mb-1">안녕하세요,</p>
            <h2 className="text-white">{user.nickname}님!</h2>
          </div>
          <Avatar className="w-12 h-12 border-2 border-white">
            <AvatarImage src={user.profileImage} />
            <AvatarFallback className="bg-white/20 text-white">
              <User className="w-6 h-6" />
            </AvatarFallback>
          </Avatar>
        </div>
        
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/20">
          <div>
            <p className="text-2xl text-white mb-1">{user.totalRuns}</p>
            <p className="text-xs opacity-80">총 러닝</p>
          </div>
          <div>
            <p className="text-2xl text-white mb-1">{user.totalDistance.toFixed(1)}</p>
            <p className="text-xs opacity-80">총 거리 (km)</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 -mt-6">
        {/* Weather Widget */}
        <WeatherWidget />

        {/* Start Running Button */}
        <Button
          onClick={() => onStartRunning()}
          className="w-full h-16 bg-gradient-to-r from-[#f89305] to-[#ffa940] hover:from-[#e08504] hover:to-[#f89305] text-white rounded-2xl shadow-lg mb-6"
        >
          <span className="text-lg">러닝 시작하기</span>
        </Button>

        {/* Nearby Map */}
        <NearbyMap nearbyLocations={nearbyLocations} setNearbyLocations={setNearbyLocations} />

        {/* Recommended Courses - AI Pattern Analysis */}
        <RecommendedCourses
          courses={courses}
          onStartRunning={onStartRunning}
          recommendedCourses={recommendedCourses}
          setRecommendedCourses={setRecommendedCourses}
          allRecommendedCourses={allRecommendedCourses}
          setAllRecommendedCourses={setAllRecommendedCourses}
        />
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="grid grid-cols-4 gap-1 max-w-md mx-auto">
          <button
            onClick={() => onNavigate('home')}
            className="flex flex-col items-center justify-center py-3 text-[#f89305] bg-orange-50"
          >
            <HomeIcon className="w-6 h-6" />
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