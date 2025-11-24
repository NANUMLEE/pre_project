import { Sparkles, MapPin, TrendingUp } from 'lucide-react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { useState, useEffect } from 'react';
import type { Course } from '../../types';
import { fetchRecommendedCourses, convertToCourse } from '../../services/api';

type RecommendedCoursesProps = {
  courses: Course[];
  onCourseClick: (course: Course) => void;
};

export function RecommendedCourses({ courses, onCourseClick }: RecommendedCoursesProps) {
  const [showAllRecommended, setShowAllRecommended] = useState(false);
  const [recommendedCourses, setRecommendedCourses] = useState<Course[]>([]);
  const [allRecommendedCourses, setAllRecommendedCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 추천 코스 데이터 로드
  useEffect(() => {
    const loadRecommendedCourses = async () => {
      try {
        setIsLoading(true);
        // API에서 추천 코스 조회 (상위 5개)
        const recommendedData = await fetchRecommendedCourses(1, 5);

        // CSV 데이터를 Course 타입으로 변환
        const convertedCourses = recommendedData.map((course, index) =>
          convertToCourse(course, index)
        );

        // 상위 3개는 홈 화면에, 전체는 모달에 표시
        setRecommendedCourses(convertedCourses.slice(0, 3));
        setAllRecommendedCourses(convertedCourses);
      } catch (error) {
        console.error('추천 코스 로드 실패:', error);
        // 실패 시 기존 데이터 사용
        setRecommendedCourses(courses.slice(0, 3));
        setAllRecommendedCourses(courses);
      } finally {
        setIsLoading(false);
      }
    };

    loadRecommendedCourses();
  }, [courses]);

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

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-2 w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded mb-3 w-full"></div>
                <div className="flex gap-4">
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {recommendedCourses.length > 0 ? (
              recommendedCourses.map((course) => (
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
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-[#787878]">추천 코스를 불러올 수 없습니다</p>
              </div>
            )}
          </div>
        )}

        {recommendedCourses.length > 0 && !isLoading && (
          <Button
            onClick={() => setShowAllRecommended(true)}
            className="w-full mt-3 bg-gray-50 hover:bg-gray-100 text-[#2e2d52] border-none"
          >
            더 많은 추천 보기
          </Button>
        )}
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
            {allRecommendedCourses.map((course) => (
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
