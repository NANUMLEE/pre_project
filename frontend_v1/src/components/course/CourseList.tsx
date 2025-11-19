import { useState } from 'react';
import { Home, MapPin, BarChart3, User, Star, MapPinned } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '../ui/sheet';
import { GPSMap } from '../map/GPSMap';
import type { Course } from '../../types';

type CourseListProps = {
  onCourseSelect: (course: Course) => void;
  onNavigate: (screen: 'home' | 'course' | 'community' | 'mypage') => void;
  onStartRunning: () => void;
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

  const favoriteCourses = coursesData.filter(c => c.isFavorite);
  const favoritePlaces = placesData.filter(p => p.isFavorite);

  const difficultyColors = {
    easy: 'text-[#03cfb4] bg-[#03cfb4]/10',
    medium: 'text-[#f89305] bg-[#f89305]/10',
    hard: 'text-[#2e2d52] bg-[#2e2d52]/10'
  };

  const difficultyLabels = {
    easy: '초급',
    medium: '중급',
    hard: '고급'
  };

  const handleItemClick = (item: Course | Place) => {
    setSelectedItem(item);
    if ('difficulty' in item) {
      // 코스 클릭 - 경로 표시
      const routeCoords = item.route && item.route.length > 0 ? item.route : [item.startPoint];
      setSelectedRouteCoords(routeCoords as [number, number][]);
      setSelectedPlaceCoord(null);
      setShowSheet(true);
    } else {
      // 장소 클릭 - 마커 표시
      setSelectedPlaceCoord(item.startPoint as [number, number]);
      setSelectedRouteCoords([]);
      setShowSheet(true);
    }
  };

  const handleStartRunning = () => {
    if (selectedItem && 'difficulty' in selectedItem) {
      setShowSheet(false);
      setSelectedRouteCoords([]);
      setSelectedPlaceCoord(null);
      onCourseSelect(selectedItem);
      onStartRunning();
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
    <div className="min-h-screen bg-gray-50 pb-20">
      <style>{`
        /* Sheet Overlay를 투명하게 처리 */
        [data-slot="sheet-overlay"] {
          background-color: transparent !important;
        }
      `}</style>
      {/* Map Area - 실제 Leaflet 지도 */}
      <div className="bg-white">
        <div className="relative h-64">
          {/* 실제 Leaflet 지도 - GPS 실시간 위치 표시 */}
          <GPSMap
            height="256px"
            zoom={15}
            routeCoordinates={selectedRouteCoords}
            placeMarker={selectedPlaceCoord}
          />

          {/* Header Title */}
          <div className="absolute top-4 left-6 z-20">
            <h2 className="text-white bg-black/40 px-3 py-1 rounded-lg">코스 탐색</h2>
          </div>
        </div>
      </div>

      {/* Tab Menu */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex">
          <button
            onClick={() => setActiveTab('courses')}
            className={`flex-1 py-4 text-center transition-colors ${
              activeTab === 'courses'
                ? 'text-[#f89305] border-b-2 border-[#f89305]'
                : 'text-[#787878]'
            }`}
          >
            코스 탐색
          </button>
          <button
            onClick={() => setActiveTab('places')}
            className={`flex-1 py-4 text-center transition-colors ${
              activeTab === 'places'
                ? 'text-[#f89305] border-b-2 border-[#f89305]'
                : 'text-[#787878]'
            }`}
          >
            장소 탐색
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            className={`flex-1 py-4 text-center transition-colors ${
              activeTab === 'favorites'
                ? 'text-[#f89305] border-b-2 border-[#f89305]'
                : 'text-[#787878]'
            }`}
          >
            즐겨찾기
          </button>
        </div>
      </div>

      {/* Content - 스크롤 가능한 목록 */}
      <div className="px-6 py-4 space-y-3 pb-32 max-h-[calc(100vh-320px)] overflow-y-auto">
        {/* Course List */}
        {activeTab === 'courses' && (
          <>
            {coursesData.map((course) => (
              <div
                key={course.id}
                onClick={() => handleItemClick(course)}
                className={`bg-white rounded-2xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-all ${
                  selectedItem?.id === course.id ? 'ring-2 ring-[#f89305]' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-[#2e2d52]">{course.name}</h4>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCourseFavorite(course.id);
                        }}
                        className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                      >
                        <Star className={`w-4 h-4 ${course.isFavorite ? 'text-[#f89305] fill-[#f89305]' : 'text-[#787878]'}`} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${difficultyColors[course.difficulty]}`}>
                        {difficultyLabels[course.difficulty]}
                      </span>
                      <span className="text-sm text-[#787878]">{course.distance}km</span>
                      <span className="text-sm text-[#787878]">•</span>
                      <span className="text-sm text-[#787878]">평균 페이스 {course.avgPace}분/km</span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-[#787878]">{course.description}</p>
              </div>
            ))}
          </>
        )}

        {/* Place List */}
        {activeTab === 'places' && (
          <>
            {placesData.map((place) => (
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
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePlaceFavorite(place.id);
                        }}
                        className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                      >
                        <Star className={`w-4 h-4 ${place.isFavorite ? 'text-[#f89305] fill-[#f89305]' : 'text-[#787878]'}`} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm text-[#787878]">내 위치에서 {place.distance}km</span>
                    </div>
                  </div>
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
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-[#2e2d52]">{course.name}</h4>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCourseFavorite(course.id);
                            }}
                            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                          >
                            <Star className="w-4 h-4 text-[#f89305] fill-[#f89305]" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${difficultyColors[course.difficulty]}`}>
                            {difficultyLabels[course.difficulty]}
                          </span>
                          <span className="text-sm text-[#787878]">{course.distance}km</span>
                          <span className="text-sm text-[#787878]">•</span>
                          <span className="text-sm text-[#787878]">평균 페이스 {course.avgPace}분/km</span>
                        </div>
                      </div>
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
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePlaceFavorite(place.id);
                            }}
                            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                          >
                            <Star className="w-4 h-4 text-[#f89305] fill-[#f89305]" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm text-[#787878]">내 위치에서 {place.distance}km</span>
                        </div>
                      </div>
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
          className="rounded-t-3xl bg-white border-0 shadow-lg"
          style={{
            background: 'white',
            backgroundImage: 'none'
          }}
          aria-describedby={undefined}
        >
          <SheetHeader>
            <SheetTitle className="text-[#2e2d52] text-left">
              {selectedItem?.name}
            </SheetTitle>
          </SheetHeader>

          {/* 코스 팝업 */}
          {selectedItem && 'difficulty' in selectedItem && (
            <div className="mt-6 space-y-6">
              {/* Course Info */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-sm text-[#787878] mb-1">거리</p>
                  <p className="text-xl text-[#2e2d52]">{selectedItem.distance}km</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-[#787878] mb-1">평균 페이스</p>
                  <p className="text-xl text-[#2e2d52]">{selectedItem.avgPace}분/km</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-[#787878] mb-1">난이도</p>
                  <p className="text-xl text-[#2e2d52]">{difficultyLabels[selectedItem.difficulty]}</p>
                </div>
              </div>

              {/* Description */}
              <div>
                <p className="text-sm text-[#787878] mb-2">코스 설명</p>
                <p className="text-sm text-[#2e2d52]">{selectedItem.description}</p>
              </div>

              {/* Start Running Button */}
              <Button
                onClick={handleStartRunning}
                className="w-full h-14 bg-gradient-to-r from-[#f89305] to-[#ffa940] hover:from-[#e08504] hover:to-[#f89305] text-white rounded-2xl"
              >
                러닝 시작하기
              </Button>
            </div>
          )}

          {/* 장소 팝업 */}
          {selectedItem && !('difficulty' in selectedItem) && (
            <div className="mt-6 space-y-6">
              {/* Place Info */}
              <div>
                <p className="text-sm text-[#787878] mb-2">위치</p>
                <p className="text-sm text-[#2e2d52]">{selectedItem.location}</p>
              </div>

              {/* Description */}
              <div>
                <p className="text-sm text-[#787878] mb-2">장소 설명</p>
                <p className="text-sm text-[#2e2d52]">{selectedItem.description}</p>
              </div>

              {/* Distance */}
              <div>
                <p className="text-sm text-[#787878] mb-2">내 위치에서의 거리</p>
                <p className="text-lg text-[#2e2d52]">{selectedItem.distance}km</p>
              </div>
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