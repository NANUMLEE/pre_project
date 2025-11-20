import { Sparkles, MapPin, TrendingUp } from 'lucide-react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { useState } from 'react';
import type { Course } from '../../types';

type RecommendedCoursesProps = {
  courses: Course[];
  onCourseClick: (course: Course) => void;
};

export function RecommendedCourses({ courses, onCourseClick }: RecommendedCoursesProps) {
  const [showAllRecommended, setShowAllRecommended] = useState(false);

  // AI 분석을 통한 추천 코스 (평균 거리와 선호 난이도 기반)
  const recommendedCourses = courses.slice(0, 3);

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

  const getRecommendationReason = (course: Course) => {
    if (course.difficulty === 'easy') {
      return '편안한 페이스로 즐기기 좋아요';
    } else if (course.difficulty === 'medium') {
      return '당신의 평균 거리와 잘 맞아요';
    } else {
      return '새로운 도전을 원하신다면 추천해요';
    }
  };

  return (
    <>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-[#f89305] to-[#ffa940] rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-[#2e2d52]">추천 코스</h3>
            <p className="text-xs text-[#787878]">당신의 러닝 패턴을 분석했어요</p>
          </div>
        </div>

        <div className="space-y-3">
          {recommendedCourses.map((course) => (
            <div
              key={course.id}
              onClick={() => onCourseClick(course)}
              className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-[#2e2d52]">{course.name}</h4>
                    <span className={`text-xs px-2 py-1 rounded-full ${difficultyColors[course.difficulty]}`}>
                      {difficultyLabels[course.difficulty]}
                    </span>
                  </div>
                  <p className="text-sm text-[#787878] mb-3">{course.description}</p>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-sm text-[#787878]">
                      <MapPin className="w-4 h-4" />
                      <span>{course.distance}km</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-[#787878]">
                      <TrendingUp className="w-4 h-4" />
                      <span>평균 {course.avgPace}분/km</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* AI Recommendation Badge */}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-[#03cfb4]/20 rounded-full flex items-center justify-center">
                    <Sparkles className="w-3 h-3 text-[#03cfb4]" />
                  </div>
                  <p className="text-xs text-[#787878]">
                    {getRecommendationReason(course)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Button
          onClick={() => setShowAllRecommended(true)}
          className="w-full mt-3 bg-gray-50 hover:bg-gray-100 text-[#2e2d52] border-none"
        >
          더 많은 추천 보기
        </Button>
      </div>

      {/* All Recommended Dialog */}
      <Dialog open={showAllRecommended} onOpenChange={setShowAllRecommended}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI 추천 코스</DialogTitle>
            <DialogDescription>
              당신의 러닝 패턴을 분석한 맞춤형 추천입니다.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-4">
            {courses.map((course) => (
              <div
                key={course.id}
                onClick={() => {
                  setShowAllRecommended(false);
                  onCourseClick(course);
                }}
                className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-sm text-[#2e2d52]">{course.name}</h4>
                      <span className={`text-xs px-2 py-1 rounded-full ${difficultyColors[course.difficulty]}`}>
                        {difficultyLabels[course.difficulty]}
                      </span>
                    </div>
                    <p className="text-xs text-[#787878] mb-2">{course.description}</p>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 text-xs text-[#787878]">
                        <MapPin className="w-3 h-3" />
                        <span>{course.distance}km</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-[#787878]">
                        <TrendingUp className="w-3 h-3" />
                        <span>평균 {course.avgPace}분/km</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* AI Recommendation Badge */}
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-[#03cfb4]/20 rounded-full flex items-center justify-center">
                      <Sparkles className="w-3 h-3 text-[#03cfb4]" />
                    </div>
                    <p className="text-xs text-[#787878]">
                      {getRecommendationReason(course)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}