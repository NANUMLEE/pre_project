import { ArrowLeft, MapPin, Clock, TrendingUp, Star, Heart, Share2, Navigation } from 'lucide-react';
import { Button } from '../ui/button';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import type { Course } from '../../types';

type CourseDetailProps = {
  course: Course;
  onStartRunning: (course: Course) => void;
  onBack: () => void;
};

export function CourseDetail({ course, onStartRunning, onBack }: CourseDetailProps) {
  const difficultyLabels = {
    easy: '초급',
    medium: '중급',
    hard: '고급'
  };

  const difficultyColors = {
    easy: 'bg-[#03cfb4]',
    medium: 'bg-[#f89305]',
    hard: 'bg-[#2e2d52]'
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header with Image */}
      <div className="relative h-64">
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1560452460-6ebc93101db9?w=800"
          alt={course.name}
          className="w-full h-full object-cover"
        />
        <button
          onClick={onBack}
          className="absolute top-6 left-6 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-[#2e2d52]" />
        </button>
        <div className="absolute top-6 right-6 flex gap-2">
          <button className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center">
            <Heart className="w-5 h-5 text-[#f89305]" />
          </button>
          <button className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center">
            <Share2 className="w-5 h-5 text-[#2e2d52]" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        {/* Title & Rating */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h2 className="text-[#2e2d52] mb-2">{course.name}</h2>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-[#f89305]">
                <Star className="w-4 h-4 fill-[#f89305]" />
                <span className="text-sm">{course.rating}</span>
              </div>
              <span className="text-sm text-[#787878]">({course.reviews} 리뷰)</span>
            </div>
          </div>
          <div className={`${difficultyColors[course.difficulty]} text-white px-4 py-2 rounded-full text-sm`}>
            {difficultyLabels[course.difficulty]}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-xl">
          <div className="text-center">
            <MapPin className="w-5 h-5 text-[#f89305] mx-auto mb-1" />
            <p className="text-sm text-[#787878] mb-1">거리</p>
            <p className="text-[#2e2d52]">{course.distance}km</p>
          </div>
          <div className="text-center">
            <Clock className="w-5 h-5 text-[#03cfb4] mx-auto mb-1" />
            <p className="text-sm text-[#787878] mb-1">소요시간</p>
            <p className="text-[#2e2d52]">{course.estimatedTime}분</p>
          </div>
          <div className="text-center">
            <TrendingUp className="w-5 h-5 text-[#2e2d52] mx-auto mb-1" />
            <p className="text-sm text-[#787878] mb-1">난이도</p>
            <p className="text-[#2e2d52]">{difficultyLabels[course.difficulty]}</p>
          </div>
        </div>

        {/* Description */}
        <div className="mb-6">
          <h3 className="text-[#2e2d52] mb-3">코스 설명</h3>
          <p className="text-[#787878] leading-relaxed">
            {course.description}
          </p>
        </div>

        {/* Map */}
        <div className="mb-6">
          <h3 className="text-[#2e2d52] mb-3">경로</h3>
          <div className="bg-gradient-to-br from-green-100 to-blue-100 rounded-xl h-48 relative overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <Navigation className="w-12 h-12 text-[#f89305]" />
            </div>
            <div className="absolute bottom-4 left-4 right-4">
              <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm text-[#2e2d52]">
                  <MapPin className="w-4 h-4 text-[#f89305]" />
                  <span>출발지: {course.location}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Weather Info */}
        <div className="mb-6 p-4 bg-[#03cfb4]/10 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#787878] mb-1">오늘의 날씨</p>
              <p className="text-[#2e2d52]">18° 맑음</p>
            </div>
            <p className="text-sm text-[#2e2d52]">🏃 러닝하기 좋은 날씨!</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pb-6">
          <Button
            onClick={() => onStartRunning(course)}
            className="flex-1 h-14 bg-[#f89305] hover:bg-[#e08504] text-white rounded-xl"
          >
            시작하기
          </Button>
        </div>
      </div>
    </div>
  );
}
