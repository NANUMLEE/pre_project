import { GPSMap } from '../map/GPSMap';

type CourseHeaderProps = {
  activeTab: 'courses' | 'places' | 'favorites';
  setActiveTab: (tab: 'courses' | 'places' | 'favorites') => void;
  selectedRouteCoords: [number, number][];
  selectedPlaceCoord: [number, number] | null;
  onPositionChange: (position: { lat: number; lng: number }) => void;
};

export function CourseHeader({
  activeTab,
  setActiveTab,
  selectedRouteCoords,
  selectedPlaceCoord,
  onPositionChange,
}: CourseHeaderProps) {
  return (
    <>
      {/* Fixed Map Area */}
      <div className="bg-white h-64 flex-shrink-0">
        <div className="relative w-full h-full">
          {/* 실제 Leaflet 지도 - GPS 실시간 위치 표시 */}
          <GPSMap
            height="100%"
            zoom={15}
            routeCoordinates={selectedRouteCoords}
            placeMarker={selectedPlaceCoord}
            onPositionChange={onPositionChange}
          />

          {/* Header Title */}
          <div className="absolute top-4 left-6 z-20">
            <h2 className="text-white bg-black/40 px-3 py-1 rounded-lg">코스 탐색</h2>
          </div>
        </div>
      </div>

      {/* Fixed Tab Menu */}
      <div className="bg-white border-b border-gray-200 flex-shrink-0 z-10">
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
    </>
  );
}
