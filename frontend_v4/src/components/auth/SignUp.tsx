import { useState } from 'react';
import { Mail, Lock, User as UserIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { signUp } from '../../utils/auth';
// ... 나머지 import

export function SignUp({ onSignUp, onLoginClick }: SignUpProps) {
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showTerms, setShowTerms] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const [error, setError] = useState('');

  const handleSignUp = () => {
    // 유효성 검사
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
      setShowTerms(true);
      return;
    }

    // 회원가입 시도
    const success = signUp(email, password, nickname);

    if (success) {
      // 닉네임을 고정 userId로 사용
      const userId = nickname;
      localStorage.setItem('userId', userId);
      console.log('✅ userId 저장됨 (닉네임):', userId);

      const mockUser: User = {
        id: userId,
        email: email,
        nickname: nickname,
        totalDistance: 0,
        totalRuns: 0,
        level: 1
      };
      onSignUp(mockUser);
    } else {
      setError('이미 존재하는 이메일입니다');
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col px-6">
      {/* 나머지 JSX는 동일하되, error 메시지 추가 */}
      <div className="pt-20 pb-8">
        <h1 className="text-[#2e2d52] mb-3">
          회원가입
        </h1>
        <p className="text-[#787878]">
          러닝 여정을 시작해보세요
        </p>
      </div>

      <div className="flex-1 pb-8">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        
        {/* 나머지 폼 필드들... */}
      </div>
    </div>
  );
}