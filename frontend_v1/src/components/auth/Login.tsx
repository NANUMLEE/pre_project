import { useState } from 'react';
import { Mail, Lock } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { login } from '../../utils/auth';
import type { User } from '../../types';

type LoginProps = {
  onLogin: (user: User) => void;
  onSignUpClick: () => void;
};

export function Login({ onLogin, onSignUpClick }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = () => {
    if (!email || !password) {
      setError('이메일과 비밀번호를 입력하세요');
      return;
    }

    const user = login(email, password);

    if (user) {
      // Generate profile image as SVG with first letter of nickname
      const firstLetter = user.nickname.charAt(0).toUpperCase();
      const bgColor = '#f89305'; // Orange color
      const profileImageSvg = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='${encodeURIComponent(bgColor)}' width='100' height='100'/%3E%3Ctext x='50' y='50' font-size='50' fill='white' text-anchor='middle' dominant-baseline='central' font-family='Arial, sans-serif' font-weight='bold'%3E${firstLetter}%3C/text%3E%3C/svg%3E`;

      // 닉네임을 고정 userId로 사용
      const userId = user.nickname;

      // localStorage에 저장 (재접속 시 재사용)
      localStorage.removeItem("userId");   // ✨ 추가된 코드
      localStorage.setItem('userId', userId);
      console.log('✅ userId 저장됨 (닉네임):', userId);

      const userData: User = {
        id: userId,
        email: user.email,
        nickname: user.nickname,
        profileImage: profileImageSvg,
        totalDistance: user.totalDistance,
        totalRuns: user.totalRuns,
        level: user.level
      };
      onLogin(userData);
    } else {
      setError('이메일 또는 비밀번호가 올바르지 않습니다');
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col px-6">
      {/* Header */}
      <div className="pt-20 pb-12">
        <h1 className="text-[#2e2d52] mb-3">
          반갑습니다!
        </h1>
        <p className="text-[#787878]">
          러닝으로 건강한 하루를 시작하세요
        </p>
      </div>

      {/* Form */}
      <div className="flex-1">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm text-[#2e2d52] mb-2">이메일</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#787878]" />
              <Input
                type="email"
                placeholder="이메일을 입력하세요"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                className="pl-12 h-14 bg-[#f3f3f5] border-none rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-[#2e2d52] mb-2">비밀번호</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#787878]" />
              <Input
                type="password"
                placeholder="비밀번호를 입력하세요"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                className="pl-12 h-14 bg-[#f3f3f5] border-none rounded-xl"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <Checkbox id="remember" />
            <label htmlFor="remember" className="text-sm text-[#787878]">
              로그인 상태 유지
            </label>
          </div>
          <button className="text-sm text-[#f89305]">
            비밀번호 찾기
          </button>
        </div>

        <Button
          onClick={handleLogin}
          className="w-full h-14 bg-[#f89305] hover:bg-[#e08504] text-white rounded-xl mb-4"
        >
          로그인
        </Button>

        <div className="text-center">
          <span className="text-[#787878]">계정이 없으신가요? </span>
          <button
            onClick={onSignUpClick}
            className="text-[#f89305]"
          >
            회원가입
          </button>
        </div>
      </div>
    </div>
  );
}
