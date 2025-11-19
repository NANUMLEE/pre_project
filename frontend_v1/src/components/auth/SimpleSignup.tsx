// src/components/auth/SimpleSignUp.tsx
// UI 라이브러리 없이 작동하는 버전

import { useState } from 'react';
import { signUp } from '../../utils/auth';
import type { User } from '../../types';

type SignUpProps = {
  onSignUp: (user: User) => void;
  onLoginClick: () => void;
};

export function SimpleSignUp({ onSignUp, onLoginClick }: SignUpProps) {
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const [error, setError] = useState('');

  const handleSignUp = () => {
    console.log('회원가입 시도:', { nickname, email, password });
    
    if (!nickname || !email || !password || !confirmPassword) {
      setError('모든 항목을 입력해주세요');
      return;
    }

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다');
      return;
    }

    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다');
      return;
    }

    if (!agreedTerms || !agreedPrivacy) {
      setError('약관에 동의해주세요');
      return;
    }

    try {
      const success = signUp(email, password, nickname);
      console.log('회원가입 결과:', success);

      if (success) {
        // Generate profile image as SVG with first letter of nickname
        const firstLetter = nickname.charAt(0).toUpperCase();
        const bgColor = '#f89305'; // Orange color
        const profileImageSvg = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='${encodeURIComponent(bgColor)}' width='100' height='100'/%3E%3Ctext x='50' y='50' font-size='50' fill='white' text-anchor='middle' dominant-baseline='central' font-family='Arial, sans-serif' font-weight='bold'%3E${firstLetter}%3C/text%3E%3C/svg%3E`;

        const mockUser: User = {
          id: email,
          email: email,
          nickname: nickname,
          profileImage: profileImageSvg,
          totalDistance: 0,
          totalRuns: 0,
          level: 1
        };
        console.log('회원가입 성공!');
        onSignUp(mockUser);
      } else {
        setError('이미 존재하는 이메일입니다');
      }
    } catch (error) {
      console.error('회원가입 오류:', error);
      setError('회원가입 중 오류가 발생했습니다');
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: 'white', 
      padding: '20px',
      fontFamily: 'sans-serif'
    }}>
      <div style={{ paddingTop: '80px', paddingBottom: '30px' }}>
        <h1 style={{ color: '#2e2d52', marginBottom: '12px', fontSize: '28px' }}>
          회원가입
        </h1>
        <p style={{ color: '#787878' }}>
          러닝 여정을 시작해보세요
        </p>
      </div>

      {error && (
        <div style={{ 
          marginBottom: '16px', 
          padding: '16px', 
          backgroundColor: '#fee', 
          border: '1px solid #fcc',
          borderRadius: '8px',
          color: '#c00'
        }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', marginBottom: '8px', color: '#2e2d52' }}>
          닉네임
        </label>
        <input
          type="text"
          placeholder="닉네임을 입력하세요"
          value={nickname}
          onChange={(e) => {
            setNickname(e.target.value);
            setError('');
          }}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '16px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            backgroundColor: '#f3f3f5',
            boxSizing: 'border-box'
          }}
        />
      </div>

      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', marginBottom: '8px', color: '#2e2d52' }}>
          이메일
        </label>
        <input
          type="email"
          placeholder="이메일을 입력하세요"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError('');
          }}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '16px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            backgroundColor: '#f3f3f5',
            boxSizing: 'border-box'
          }}
        />
      </div>

      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', marginBottom: '8px', color: '#2e2d52' }}>
          비밀번호
        </label>
        <input
          type="password"
          placeholder="비밀번호를 입력하세요"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError('');
          }}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '16px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            backgroundColor: '#f3f3f5',
            boxSizing: 'border-box'
          }}
        />
      </div>

      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', marginBottom: '8px', color: '#2e2d52' }}>
          비밀번호 확인
        </label>
        <input
          type="password"
          placeholder="비밀번호를 다시 입력하세요"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            setError('');
          }}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '16px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            backgroundColor: '#f3f3f5',
            boxSizing: 'border-box'
          }}
        />
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={agreedTerms}
            onChange={(e) => {
              setAgreedTerms(e.target.checked);
              setError('');
            }}
          />
          <span style={{ fontSize: '14px', color: '#787878' }}>
            이용약관에 동의합니다 (필수)
          </span>
        </label>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={agreedPrivacy}
            onChange={(e) => {
              setAgreedPrivacy(e.target.checked);
              setError('');
            }}
          />
          <span style={{ fontSize: '14px', color: '#787878' }}>
            개인정보처리방침에 동의합니다 (필수)
          </span>
        </label>
      </div>

      <button
        onClick={handleSignUp}
        style={{
          width: '100%',
          padding: '16px',
          fontSize: '16px',
          fontWeight: '500',
          backgroundColor: '#f89305',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          cursor: 'pointer',
          marginBottom: '16px'
        }}
      >
        회원가입
      </button>

      <div style={{ textAlign: 'center' }}>
        <span style={{ color: '#787878' }}>이미 계정이 있으신가요? </span>
        <button
          onClick={onLoginClick}
          style={{
            background: 'none',
            border: 'none',
            color: '#f89305',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          로그인
        </button>
      </div>
    </div>
  );
}