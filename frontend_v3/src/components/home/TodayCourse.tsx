import { MapPin, Clock, TrendingUp } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import type { Course } from '../../types';

type TodayCourseProps = {
  onCourseClick: (course: Course) => void;
};

export function TodayCourse({ onCourseClick }: TodayCourseProps) {
  // Mock recommended course
  const course: Course = {
    id: '1',
    name: '한강 러닝 코스',
    description: '여의도 한강공원의 아름다운 경치를 즐기며 달릴 수 있는 코스',
    distance: 5.2,
    difficulty: 'easy',
    estimatedTime: 30,
    location: '여의도',
    startPoint: [37.5285, 126.9328],
    route: [],
    rating: 4.8,
    reviews: 234
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[#2e2d52]">오늘의 추천 코스</h3>
        <button className="text-sm text-[#f89305]">더보기</button>
      </div>

      <div
        onClick={() => onCourseClick(course)}
        className="bg-white rounded-2xl overflow-hidden shadow-sm cursor-pointer hover:shadow-md transition-shadow"
      >
        <div className="relative h-40">
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1560452460-6ebc93101db9?w=800"
            alt={course.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-3 right-3 bg-[#f89305] text-white px-3 py-1 rounded-full text-sm">
            추천
          </div>
        </div>
        
        <div className="p-4">
          <h4 className="text-[#2e2d52] mb-2">{course.name}</h4>
          <p className="text-sm text-[#787878] mb-3 line-clamp-2">
            {course.description}
          </p>
          
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1 text-[#787878]">
              <MapPin className="w-4 h-4" />
              <span>{course.distance}km</span>
            </div>
            <div className="flex items-center gap-1 text-[#787878]">
              <Clock className="w-4 h-4" />
              <span>{course.estimatedTime}분</span>
            </div>
            <div className="flex items-center gap-1 text-[#787878]">
              <TrendingUp className="w-4 h-4" />
              <span className="capitalize">{course.difficulty}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
