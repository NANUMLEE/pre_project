import { useState, useRef } from 'react';
import { Home, MapPin, BarChart3, User, Star, MapPinned } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '../ui/sheet';
import { CourseHeader } from './CourseHeader';
import type { Course } from '../../types';
import { DIFFICULTY_COLORS, DIFFICULTY_LABELS } from '../../constants/difficulty';

type CourseListProps = {
  onCourseSelect: (course: Course) => void;
  onNavigate: (screen: 'home' | 'course' | 'community' | 'mypage') => void;
  onStartRunning: (course?: Course) => void;
  coursesData: Course[];
  placesData: Place[];
  toggleCourseFavorite: (courseId: string) => void;
  togglePlaceFavorite: (placeId: string) => void;
};

type Place = {
  id: string;
  name: string;
  description: string;
  distance: number;
  location: string;
  isFavorite?: boolean;
};

export function CourseList({ onCourseSelect, onNavigate, onStartRunning, coursesData, placesData, toggleCourseFavorite, togglePlaceFavorite }: CourseListProps) {
  const [activeTab, setActiveTab] = useState<'courses' | 'places' | 'favorites'>('courses');
  const [selectedItem, setSelectedItem] = useState<Course | Place | null>(null);
  const [showSheet, setShowSheet] = useState(false);
  const [selectedRouteCoords, setSelectedRouteCoords] = useState<[number, number][]>([]);
  const [selectedPlaceCoord, setSelectedPlaceCoord] = useState<[number, number] | null>(null);
  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const favoriteCourses = coursesData.filter(c => c.isFavorite);
  const favoritePlaces = placesData.filter(p => p.isFavorite);

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

  // 두 좌표의 중간 지점 계산
  const getMidpoint = (lat1: number, lng1: number, lat2: number, lng2: number): [number, number] => {
    return [
      (lat1 + lat2) / 2,
      (lng1 + lng2) / 2
    ];
  };

  // GPS 위치 업데이트 핸들러
  const handlePositionChange = (position: { lat: number; lng: number }) => {
    setUserPosition(position);
  };

  // 거리를 계산하고 가장 가까운 5개의 코스 필터링 및 정렬
  const getSortedCourses = (): Course[] => {
    if (!userPosition) return coursesData;

    const coursesWithDistance = coursesData.map(course => {
      const midpoint = getMidpoint(course.startPoint[0], course.startPoint[1], course.route[course.route.length - 1][0], course.route[course.route.length - 1][1]);
      const distance = calculateDistance(userPosition.lat, userPosition.lng, midpoint[0], midpoint[1]);
      return { ...course, distance };
    });

    return coursesWithDistance.sort((a, b) => a.distance - b.distance).slice(0, 5);
  };

  // 거리를 계산하고 가장 가까운 5개의 장소 필터링 및 정렬
  const getSortedPlaces = (): Place[] => {
    if (!userPosition) return placesData;

    const placesWithDistance = placesData.map(place => {
      const distance = calculateDistance(userPosition.lat, userPosition.lng, place.startPoint[0], place.startPoint[1]);
      return { ...place, distance };
    });

    return placesWithDistance.sort((a, b) => a.distance - b.distance).slice(0, 5);
  };

  const handleItemClick = (item: Course | Place) => {
    setSelectedItem(item);
    if ('difficulty' in item) {
      // 코스 클릭 - 경로 표시
      const routeCoords = item.route && item.route.length > 0 ? item.route : [item.startPoint];
      setSelectedRouteCoords(routeCoords as [number, number][]);
      setSelectedPlaceCoord(null);
      setShowSheet(true);
      // 즉시 스크롤
      if (contentRef.current) {
        contentRef.current.scrollTop = 0;
      }
    } else {
      // 장소 클릭 - 마커 표시
      setSelectedPlaceCoord(item.startPoint as [number, number]);
      setSelectedRouteCoords([]);
      setShowSheet(true);
      // 즉시 스크롤
      if (contentRef.current) {
        contentRef.current.scrollTop = 0;
      }
    }
  };

  const handleStartRunning = () => {
    if (selectedItem && 'difficulty' in selectedItem) {
      setShowSheet(false);
      setSelectedRouteCoords([]);
      setSelectedPlaceCoord(null);
      onStartRunning(selectedItem);
    }
  };

  const handleSheetClose = (open: boolean) => {
    setShowSheet(open);
    if (!open) {
      setSelectedItem(null);
      setSelectedRouteCoords([]);
      setSelectedPlaceCoord(null);
    }
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <style>{`
        /* Sheet Overlay를 투명하게 처리 */
        [data-slot="sheet-overlay"] {
          background-color: transparent !important;
        }
      `}</style>

      {/* Header Component - 지도와 탭 (스크롤 안 됨) */}
      <div className="flex-shrink-0">
        <CourseHeader
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          selectedRouteCoords={selectedRouteCoords}
          selectedPlaceCoord={selectedPlaceCoord}
          onPositionChange={handlePositionChange}
        />
      </div>

      {/* Scrollable Content Area - 리스트만 스크롤 */}
      <div ref={contentRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-3 pb-32">
        {/* Course List */}
        {activeTab === 'courses' && (
          <>
            {getSortedCourses().map((course) => (
              <div
                key={course.id}
                onClick={() => handleItemClick(course)}
                className={`bg-white rounded-2xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-all ${
                  selectedItem?.id === course.id ? 'ring-2 ring-[#f89305]' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="text-[#2e2d52] mb-1">{course.name}</h4>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCourseFavorite(course.id);
                    }}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                  >
                    <Star className={`w-5 h-5 ${course.isFavorite ? 'text-[#f89305] fill-[#f89305]' : 'text-[#787878]'}`} />
                  </button>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${DIFFICULTY_COLORS[course.difficulty]}`}>
                    {'difficultyString' in course && course.difficultyString ? course.difficultyString : DIFFICULTY_LABELS[course.difficulty]}
                  </span>
                  <span className="text-sm text-[#787878]">{'distanceString' in course ? course.distanceString : `${course.distance}km`}</span>
                  <span className="text-sm text-[#787878]">•</span>
                  <span className="text-sm font-semibold text-[#f89305] bg-orange-50 px-2 py-1 rounded-lg">예상 칼로리 {course.expectedCalories || 250}kcal</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm text-[#787878]">
                    내 위치에서 {userPosition && 'startPoint' in course ?
                      (() => {
                        const midpoint = getMidpoint(course.startPoint[0], course.startPoint[1], course.route[course.route.length - 1][0], course.route[course.route.length - 1][1]);
                        return calculateDistance(userPosition.lat, userPosition.lng, midpoint[0], midpoint[1]).toFixed(2);
                      })()
                      : '계산 중'}km
                  </span>
                </div>
                <p className="text-sm text-[#787878]">{course.description}</p>
              </div>
            ))}
          </>
        )}

        {/* Place List */}
        {activeTab === 'places' && (
          <>
            {getSortedPlaces().map((place) => (
              <div
                key={place.id}
                onClick={() => handleItemClick(place)}
                className={`bg-white rounded-2xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-all ${
                  selectedItem?.id === place.id ? 'ring-2 ring-[#f89305]' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPinned className="w-4 h-4 text-[#f89305]" />
                      <h4 className="text-[#2e2d52]">{place.name}</h4>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlaceFavorite(place.id);
                    }}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                  >
                    <Star className={`w-5 h-5 ${place.isFavorite ? 'text-[#f89305] fill-[#f89305]' : 'text-[#787878]'}`} />
                  </button>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm text-[#787878]">
                    내 위치에서 {userPosition && 'startPoint' in place ?
                      calculateDistance(userPosition.lat, userPosition.lng, place.startPoint[0], place.startPoint[1]).toFixed(2)
                      : place.distance}km
                  </span>
                </div>
                <p className="text-sm text-[#787878]">{place.description}</p>
              </div>
            ))}
          </>
        )}

        {/* Favorites List */}
        {activeTab === 'favorites' && (
          <>
            {favoriteCourses.length === 0 && favoritePlaces.length === 0 ? (
              <div className="text-center py-12">
                <Star className="w-12 h-12 text-[#787878] mx-auto mb-3" />
                <p className="text-[#787878]">즐겨찾기한 코스나 장소가 없습니다</p>
              </div>
            ) : (
              <>
                {favoriteCourses.map((course) => (
                  <div
                    key={course.id}
                    onClick={() => handleItemClick(course)}
                    className={`bg-white rounded-2xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-all ${
                      selectedItem?.id === course.id ? 'ring-2 ring-[#f89305]' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="text-[#2e2d52] mb-1">{course.name}</h4>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCourseFavorite(course.id);
                        }}
                        className="p-1 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                      >
                        <Star className="w-5 h-5 text-[#f89305] fill-[#f89305]" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${DIFFICULTY_COLORS[course.difficulty]}`}>
                        {'difficultyString' in course && course.difficultyString ? course.difficultyString : DIFFICULTY_LABELS[course.difficulty]}
                      </span>
                      <span className="text-sm text-[#787878]">{'distanceString' in course ? course.distanceString : `${course.distance}km`}</span>
                      <span className="text-sm text-[#787878]">•</span>
                      <span className="text-sm font-semibold text-[#f89305] bg-orange-50 px-2 py-1 rounded-lg">예상 칼로리 {course.expectedCalories || 250}kcal</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm text-[#787878]">
                        내 위치에서 {userPosition && 'startPoint' in course ?
                          (() => {
                            const midpoint = getMidpoint(course.startPoint[0], course.startPoint[1], course.route[course.route.length - 1][0], course.route[course.route.length - 1][1]);
                            return calculateDistance(userPosition.lat, userPosition.lng, midpoint[0], midpoint[1]).toFixed(2);
                          })()
                          : '계산 중'}km
                      </span>
                    </div>
                    <p className="text-sm text-[#787878]">{course.description}</p>
                  </div>
                ))}
                {favoritePlaces.map((place) => (
                  <div
                    key={place.id}
                    onClick={() => handleItemClick(place)}
                    className={`bg-white rounded-2xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-all ${
                      selectedItem?.id === place.id ? 'ring-2 ring-[#f89305]' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <MapPinned className="w-4 h-4 text-[#f89305]" />
                          <h4 className="text-[#2e2d52]">{place.name}</h4>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePlaceFavorite(place.id);
                        }}
                        className="p-1 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                      >
                        <Star className="w-5 h-5 text-[#f89305] fill-[#f89305]" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm text-[#787878]">
                        내 위치에서 {userPosition && 'startPoint' in place ?
                          calculateDistance(userPosition.lat, userPosition.lng, place.startPoint[0], place.startPoint[1]).toFixed(2)
                          : place.distance}km
                      </span>
                    </div>
                    <p className="text-sm text-[#787878]">{place.description}</p>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>

      {/* Floating Start Button - showSheet가 false일 때만 표시 */}
      {selectedItem && 'difficulty' in selectedItem && !showSheet && (
        <div className="fixed bottom-20 left-0 right-0 px-6 pb-4 bg-gradient-to-t from-white via-white to-transparent pt-6">
          <Button
            onClick={handleStartRunning}
            className="w-full h-14 bg-gradient-to-r from-[#f89305] to-[#ffa940] hover:from-[#e08504] hover:to-[#f89305] text-white rounded-2xl shadow-lg"
          >
            러닝 시작하기
          </Button>
        </div>
      )}

      {/* Course Detail Sheet */}
      <Sheet open={showSheet} onOpenChange={handleSheetClose}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl bg-white border-0 shadow-lg p-0"
          style={{
            background: 'white',
            backgroundImage: 'none'
          }}
          aria-describedby={undefined}
        >
          {/* 코스 팝업 */}
          {selectedItem && 'difficulty' in selectedItem && (
            <div className="w-full p-6 space-y-6">
              {/* Header with Title */}
              <h2 className="text-lg font-semibold text-[#2e2d52]">
                {selectedItem?.name}
              </h2>

              {/* Stats Grid - 3 columns */}
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-sm text-[#787878] mb-2">거리</p>
                  <p className="text-2xl font-bold text-[#2e2d52]">{'distanceString' in selectedItem ? selectedItem.distanceString : `${selectedItem.distance}km`}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-[#787878] mb-2">예상 칼로리</p>
                  <p className="text-2xl font-bold text-[#2e2d52]">{selectedItem.expectedCalories || 250}kcal</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-[#787878] mb-2">난이도</p>
                  <p className="text-2xl font-bold text-[#2e2d52]">{'difficultyString' in selectedItem && selectedItem.difficultyString ? selectedItem.difficultyString : DIFFICULTY_LABELS[selectedItem.difficulty]}</p>
                </div>
              </div>

              {/* Start Running Button */}
              <Button
                onClick={handleStartRunning}
                className="w-full h-14 bg-[#f89305] hover:bg-[#e08504] text-white rounded-full text-base font-semibold shadow-lg transition-all"
              >
                러닝 시작하기
              </Button>
            </div>
          )}

          {/* 장소 팝업 */}
          {selectedItem && !('difficulty' in selectedItem) && (
            <div className="w-full p-6 space-y-6">
              {/* Header with Title */}
              <h2 className="text-lg font-semibold text-[#2e2d52]">
                {selectedItem?.name}
              </h2>

              {/* Address Section */}
              <div className="bg-gray-200 rounded-lg p-4">
                <p className="text-sm text-[#787878] mb-2 font-semibold">주소</p>
                <p className="text-sm text-[#2e2d52] leading-relaxed">
                  {selectedItem.address || selectedItem.location}
                </p>
              </div>

              {/* Start Running Button */}
              <Button
                onClick={handleStartRunning}
                className="w-full h-14 bg-[#f89305] hover:bg-[#e08504] text-white rounded-full text-base font-semibold shadow-lg transition-all"
              >
                러닝 시작하기
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

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
            className="flex flex-col items-center justify-center py-3 text-[#f89305] bg-orange-50"
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
