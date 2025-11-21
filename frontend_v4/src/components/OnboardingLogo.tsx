// src/components/OnboardingLogo.tsx
import { useEffect, useState } from 'react';

type OnboardingProps = {
  onComplete: () => void;
};

export function OnboardingLogo({ onComplete }: OnboardingProps) {
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    // 로고 페이드인 애니메이션
    setTimeout(() => setFadeIn(true), 100);
    
    // 3초 후 자동으로 다음 화면으로
    const timer = setTimeout(() => {
      onComplete();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div 
      style={{
        minHeight: '100vh',
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* 배경 장식 요소들 - 민트 & 오렌지 */}
      <div
        style={{
          position: 'absolute',
          top: '-100px',
          right: '-100px',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          backgroundColor: '#03cfb4',
          opacity: 0.08,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-120px',
          left: '-120px',
          width: '350px',
          height: '350px',
          borderRadius: '50%',
          backgroundColor: '#f89305',
          opacity: 0.08,
        }}
      />
      
      {/* 작은 장식 요소들 */}
      <div
        style={{
          position: 'absolute',
          top: '15%',
          left: '10%',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          backgroundColor: '#f89305',
          opacity: 0.12,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '20%',
          right: '15%',
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          backgroundColor: '#03cfb4',
          opacity: 0.12,
        }}
      />

      {/* 로고 컨테이너 */}
      <div
        style={{
          opacity: fadeIn ? 1 : 0,
          transform: fadeIn ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(20px)',
          transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2vw', // ✅ 화면 크기에 따라 유동적으로 간격 조정
          zIndex: 1
        }}
      >
        {/* 로고 아이콘 배경 */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40vw',     // ✅ 화면 너비의 40% (반응형)
            height: '40vw',    // ✅ 세로도 동일 비율
            maxWidth: '300px', // ✅ 너무 커지지 않게 제한
            maxHeight: '300px',
            minWidth: '180px', // ✅ 너무 작아지지 않게 최소 크기
            minHeight: '180px'
          }}
        >
          {/* 펄스 효과 배경 - 민트 */}
          <div
            style={{
              position: 'absolute',
              width: '260px',
              height: '260px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #7ee9dd 0%, #fbc27a 100%)',
              opacity: 0.12,
              animation: 'pulse 2.5s ease-in-out infinite'
            }}
          />
          
          {/* 두 번째 펄스 */}
          <div
            style={{
              position: 'absolute',
              width: '220px',
              height: '220px',
              borderRadius: '50%',
              backgroundColor: '#03cfb4',
              opacity: 0.17,
              animation: 'pulse 2s ease-in-out 0.3s infinite'
            }}
          />
          
          {/* 로고 아이콘 (R 심볼) */}
          <img
            className="logo-wrapper"
            src="/로고 아이콘.png" 
            alt="Runnerism"
            style={{
              width: '130px',
              height: '130px',
              objectFit: 'contain',
              position: 'relative',
              zIndex: 1,
              filter: `
                drop-shadow(0 0 6px rgba(255, 255, 255, 0.9))
                drop-shadow(0 0 12px rgba(255, 255, 255, 0.7))
                drop-shadow(0 0 20px rgba(255, 255, 255, 0.5))
              `
            }}
          />
        </div>

        {/* 로고 텍스트 이미지 */}
        <img 
          src="/로고 텍스트.png" 
          alt="Runnerism"
          className="logo-text"
          style={{
            width: '220px',
            height: '220px',
            objectFit: 'contain',
            filter: 'drop-shadow(0 2px 10px rgba(46, 45, 82, 0.1))'
          }}
        />

        {/* 서브 텍스트 */}
        <p
          style={{
            fontSize: '15px',
            color: '#787878',
            margin: '-50px',
            fontWeight: '400',
            textAlign: 'center',
            letterSpacing: '0.3px'
          }}
        >
          러닝으로 시작하는 건강한 하루
        </p>

        {/* 로딩 인디케이터 - 민트 & 오렌지 */}
        <div
          style={{
            position: 'absolute',
            bottom: '-180px',
            display: 'flex',
            gap: '10px'
          }}
        >
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: '#03cfb4',
              animation: 'bounce 1.4s ease-in-out 0s infinite'
            }}
          />
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: '#f89305',
              animation: 'bounce 1.4s ease-in-out 0.2s infinite'
            }}
          />
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: '#03cfb4',
              animation: 'bounce 1.4s ease-in-out 0.4s infinite'
            }}
          />
        </div>
      </div>

      {/* CSS 애니메이션 */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              transform: scale(1);
              opacity: 0.12;
            }
            50% {
              transform: scale(1.08);
              opacity: 0.18;
            }
          }

          @keyframes bounce {
            0%, 80%, 100% {
              transform: scale(0);
              opacity: 0.3;
            }
            40% {
              transform: scale(1);
              opacity: 1;
            }
          }
        `}
      </style>
    </div>
  );
}