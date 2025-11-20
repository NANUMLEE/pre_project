import { useState } from "react";
import {
  ChevronRight,
  MapPin,
  TrendingUp,
  Award,
  Sparkles,
} from "lucide-react";
import { Button } from "./ui/button";

type OnboardingProps = {
  onComplete: () => void;
};

export function Onboarding({ onComplete }: OnboardingProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      icon: <MapPin className="w-20 h-20 text-[#f89305]" />,
      title: "스마트 러닝 플랫폼",
      description:
        "데이터 기반 러닝으로\n 더 나은 당신을 만나세요",
      color: "from-orange-500 to-orange-600",
    },
    {
      icon: <TrendingUp className="w-20 h-20 text-[#03cfb4]" />,
      title: "함께 달리는 즐거움",
      description:
        "근처에서 달리는 러너들을 실시간으로\n 확인하고 이모티콘으로 소통하세요",
      color: "from-teal-500 to-teal-600",
    },
    {
      icon: <Award className="w-20 h-20 text-[#2e2d52]" />,
      title: "나에게 맞는 코스 찾기",
      description:
        "당신의 러닝 패턴을 분석하여\n 최적의 코스를 추천합니다",
      color: "from-indigo-600 to-indigo-700",
    },
    {
      icon: <Sparkles className="w-20 h-20 text-[#f89305]" />,
      title: "지금 바로 시작하세요",
      description:
        "Runnerism과 함께\n 당신의 러닝 여정을 시작하세요",
      color: "from-orange-500 to-orange-600",
    },
  ];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Skip Button */}
      {currentSlide < slides.length - 1 && (
        <div className="absolute top-6 right-6 z-10">
          <button
            onClick={handleSkip}
            className="text-[#787878] hover:text-[#2e2d52] transition-colors"
          >
            건너뛰기
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div
          className={`w-40 h-40 rounded-full bg-gradient-to-br ${slides[currentSlide].color} flex items-center justify-center mb-12 shadow-2xl`}
        >
          {slides[currentSlide].icon}
        </div>

        <h1 className="mb-6 text-[#2e2d52]">
          {slides[currentSlide].title}
        </h1>

        <p className="text-[#787878] max-w-sm whitespace-pre-line leading-relaxed">
          {slides[currentSlide].description}
        </p>
      </div>

      {/* Indicators & Button */}
      <div className="pb-12 px-8">
        <div className="flex justify-center gap-2 mb-8">
          {slides.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all ${
                index === currentSlide
                  ? "w-8 bg-[#03cfb4]"
                  : "w-2 bg-gray-300"
              }`}
            />
          ))}
        </div>

        <Button
          onClick={handleNext}
          className="w-full h-14 bg-[#03cfb4] hover:bg-[#02b5a0] text-white rounded-xl"
        >
          {currentSlide < slides.length - 1 ? (
            <>
              다음
              <ChevronRight className="w-5 h-5 ml-2" />
            </>
          ) : (
            "시작하기"
          )}
        </Button>
      </div>
    </div>
  );
}