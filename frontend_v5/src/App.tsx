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
import { fetchCourses, fetchPlaces, convertToCourse, convertToPlace } from './services/api';

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
          onRunAgain={() => setCurrentScreen('home')}
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