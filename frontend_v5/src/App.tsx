import { Login } from './components/auth/Login';
import { useState, useEffect } from 'react';
// 추가
import { OnboardingLogo } from './components/OnboardingLogo';
import { Onboarding } from './components/Onboarding';
// 변경
import { SimpleSignUp as SignUp } from './components/auth/SimpleSignUp';
import { Home } from './components/home/Home';
import { CourseList } from './components/course/CourseList';
import { CourseDetail } from './components/course/CourseDetail';
import { Running } from './components/running/Running';
import { RunResult } from './components/running/RunResult';
import { Community } from './components/community/Community';
import { MyPage } from './components/mypage/MyPage';
import { ProfileSetup } from './components/auth/ProfileSetup';
import type { User, Run, Course } from './types';
import { fetchCourses, fetchPlaces, convertToCourse, convertToPlace, fetchCourseCalories } from './services/api';

type Screen =
  | 'onboardingLogo'
  | 'onboarding'
  | 'login'
  | 'signup'
  | 'home'
  | 'course'
  | 'courseDetail'
  | 'running'
  | 'result'
  | 'community'
  | 'mypage'
  | 'profileSetup';

type Place = {
  id: string;
  name: string;
  description: string;
  distance: number;
  location: string;
  isFavorite?: boolean;
};

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('onboardingLogo');
  const [user, setUser] = useState<User | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [currentRun, setCurrentRun] = useState<Run | null>(null);

  // Courses and Places state
  const [coursesData, setCoursesData] = useState<Course[]>([]);
  const [placesData, setPlacesData] = useState<Place[]>([]);

  // 주변 러닝 코스 state (홈 화면에서 특정 시점에만 로드되고 고정됨)
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
  const [nearbyLocations, setNearbyLocations] = useState<NearbyLocation[]>([]);

  // API 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      try {
        // 코스 데이터 로드
        const coursesResponse = await fetchCourses();
        const convertedCourses = coursesResponse.map((course, index) => convertToCourse(course, index));
        setCoursesData(convertedCourses);

        // 장소 데이터 로드
        const placesResponse = await fetchPlaces();
        const convertedPlaces = placesResponse.map((place, index) => convertToPlace(place, index));
        setPlacesData(convertedPlaces);
      } catch (error) {
        console.error('데이터 로드 실패:', error);
        // 오류 시 빈 배열로 유지
        setCoursesData([]);
        setPlacesData([]);
      }
    };

    loadData();
  }, []);

  // 사용자 로그인 후 칼로리 정보 로드
  useEffect(() => {
    const loadCaloriesForCourses = async () => {
      if (user && user.id && coursesData.length > 0) {
        // 이미 칼로리 정보가 있는 코스는 스킵
        const hasCalories = coursesData.some(course => course.expectedCalories !== undefined);
        if (hasCalories) {
          console.log('칼로리 정보 이미 로드됨, 스킵');
          return;
        }

        try {
          const userId = parseInt(user.id, 10);
          console.log('칼로리 정보 로드 시작:', userId, 'user_id, 코스 개수:', coursesData.length);

          const coursesWithCalories = await Promise.all(
            coursesData.map(async (course, index) => {
              const calories = await fetchCourseCalories(userId, index);
              return {
                ...course,
                expectedCalories: calories || 250 // 기본값 250kcal
              };
            })
          );

          setCoursesData(coursesWithCalories);
          console.log('칼로리 정보 로드 완료');
        } catch (error) {
          console.error('칼로리 정보 로드 실패:', error);
        }
      }
    };

    loadCaloriesForCourses();
  }, [user, coursesData]);

  // 온보딩 완료 시
  const handleOnboardingComplete = () => {
    setCurrentScreen('login');
  };

  // 로그인 완료 시
  const handleLogin = (userData: User) => {
    setUser(userData);
    setCurrentScreen('home');
  };

  // 회원가입 완료 시
  const handleSignUp = (userData: User) => {
    setUser(userData);
    setCurrentScreen('profileSetup');
  };

  // 프로필 설정 완료 시
  const handleProfileSetup = (userData: User) => {
    setUser(userData);
    setCurrentScreen('home');
  };

  // 코스 선택 시
  const handleCourseSelect = (course: Course) => {
    setSelectedCourse(course);
    setCurrentScreen('courseDetail');
  };

  // 러닝 시작
  const handleStartRunning = (course?: Course) => {
    setSelectedCourse(course || null);
    setCurrentScreen('running');
  };

  // 러닝 완료
  const handleRunComplete = (run: Run) => {
    setCurrentRun(run);
    setCurrentScreen('result');

    // user 정보 업데이트
    if (user) {
      const updatedUser = {
        ...user,
        totalRuns: user.totalRuns + 1,
        totalDistance: user.totalDistance + run.distance
      };
      setUser(updatedUser);
    }
  };

  // 결과 화면에서 완료
  const handleResultComplete = () => {
    setCurrentRun(null);
    setSelectedCourse(null);
    setCurrentScreen('home');
  };

  // 하단 네비게이션
  const handleNavigation = (screen: 'home' | 'course' | 'community' | 'mypage') => {
    setCurrentScreen(screen);
  };

  // Update user profile
  const handleUpdateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  // Toggle favorite functions
  const toggleCourseFavorite = (courseId: string) => {
    setCoursesData(prev =>
      prev.map(course =>
        course.id === courseId
          ? { ...course, isFavorite: !course.isFavorite }
          : course
      )
    );
  };

  const togglePlaceFavorite = (placeId: string) => {
    setPlacesData(prev =>
      prev.map(place =>
        place.id === placeId
          ? { ...place, isFavorite: !place.isFavorite }
          : place
      )
    );
  };

  return (
    <div className="h-screen bg-background overflow-hidden">
      {currentScreen === 'onboardingLogo' && (
        <OnboardingLogo onComplete={() => setCurrentScreen('onboarding')} />
      )}

      {currentScreen === 'onboarding' && (
        <Onboarding onComplete={handleOnboardingComplete} />
      )}
      
      {currentScreen === 'login' && (
        <Login 
          onLogin={handleLogin}
          onSignUpClick={() => setCurrentScreen('signup')}
        />
      )}
      
      {currentScreen === 'signup' && (
        <SignUp 
          onSignUp={handleSignUp}
          onLoginClick={() => setCurrentScreen('login')}
        />
      )}
      
      {currentScreen === 'profileSetup' && user && (
        <ProfileSetup 
          user={user}
          onComplete={handleProfileSetup}
        />
      )}
      
      {currentScreen === 'home' && user && (
        <Home
          user={user}
          onStartRunning={handleStartRunning}
          onCourseClick={handleCourseSelect}
          onNavigate={handleNavigation}
          courses={coursesData}
          nearbyLocations={nearbyLocations}
          setNearbyLocations={setNearbyLocations}
        />
      )}
      
      {currentScreen === 'course' && (
        <CourseList
          onCourseSelect={handleCourseSelect}
          onNavigate={handleNavigation}
          onStartRunning={handleStartRunning}
          coursesData={coursesData}
          placesData={placesData}
          toggleCourseFavorite={toggleCourseFavorite}
          togglePlaceFavorite={togglePlaceFavorite}
        />
      )}

      {currentScreen === 'courseDetail' && selectedCourse && (
        <CourseDetail
          course={selectedCourse}
          onStartRunning={handleStartRunning}
          onBack={() => setCurrentScreen('course')}
        />
      )}

      {currentScreen === 'running' && (
        <Running 
          course={selectedCourse}
          onComplete={handleRunComplete}
          onBack={() => setCurrentScreen('home')}
        />
      )}
      
      {currentScreen === 'result' && currentRun && (
        <RunResult
          run={currentRun}
          onComplete={handleResultComplete}
          onRunAgain={() => setCurrentScreen('running')}
        />
      )}
      
      {currentScreen === 'community' && (
        <Community onNavigate={handleNavigation} />
      )}
      
      {currentScreen === 'mypage' && user && (
        <MyPage
          user={user}
          onNavigate={handleNavigation}
          onLogout={() => setCurrentScreen('login')}
          onUpdateUser={handleUpdateUser}
          coursesData={coursesData}
          placesData={placesData}
          toggleCourseFavorite={toggleCourseFavorite}
          togglePlaceFavorite={togglePlaceFavorite}
        />
      )}
    </div>
  );
}