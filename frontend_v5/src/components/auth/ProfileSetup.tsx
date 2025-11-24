import { useState } from 'react';
import { Ruler, Weight } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { getUserId } from '../../utils/auth';
import type { User } from '../../types';

type ProfileSetupProps = {
  user: User;
  onComplete: (user: User) => void;
};

export function ProfileSetup({ user, onComplete }: ProfileSetupProps) {
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleComplete = async () => {
    if (!height || !weight || !age || !gender) {
      setError('모든 항목을 입력해주세요');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // 로컬스토리지에서 user_id 가져오기
      const userId = getUserId();

      if (!userId) {
        setError('사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요');
        setIsLoading(false);
        return;
      }

      console.log('📝 프로필 저장 요청:', {
        user_id: userId,
        age: parseInt(age),
        gender: gender,
        height_cm: parseInt(height),
        weight_kg: parseInt(weight)
      });

      // gender 값을 DB 형식(M/F/O)으로 변환
      const genderMap: { [key: string]: string } = {
        'M': 'M',
        'F': 'F',
        'O': 'O',
        'male': 'M',
        'female': 'F',
        'other': 'O'
      };
      const dbGender = genderMap[gender] || gender;

      const response = await fetch('https://nana-nondefiant-jodee.ngrok-free.dev/api/user/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({
          user_id: userId,
          age: parseInt(age),
          gender: dbGender,
          height_cm: parseInt(height),
          weight_kg: parseInt(weight)
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '프로필 저장 실패');
      }

      const updatedUser: User = {
        ...user,
        height: parseInt(height),
        weight: parseInt(weight),
        age: parseInt(age),
        gender: gender as 'male' | 'female' | 'other'
      };

      console.log('✅ 프로필 저장 성공:', updatedUser);
      onComplete(updatedUser);
    } catch (err) {
      console.error('프로필 저장 오류:', err);
      setError(err instanceof Error ? err.message : '프로필 저장 중 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    onComplete(user);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col px-6">
      {/* Header */}
      <div className="pt-20 pb-8">
        <h1 className="text-[#2e2d52] mb-3">
          프로필 설정
        </h1>
        <p className="text-[#787878]">
          더 정확한 칼로리 계산을 위해<br />
          신체 정보를 입력해주세요
        </p>
      </div>

      {/* Form */}
      <div className="flex-1 pb-8">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="space-y-4 mb-8">
          <div>
            <label className="block text-sm text-[#2e2d52] mb-2">성별</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full h-14 bg-[#f3f3f5] border-none rounded-xl px-4 text-[#2e2d52]"
            >
              <option value="">성별을 선택하세요</option>
              <option value="M">남성</option>
              <option value="F">여성</option>
              <option value="O">기타</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-[#2e2d52] mb-2">나이</label>
            <Input
              type="number"
              placeholder="예: 25"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="h-14 bg-[#f3f3f5] border-none rounded-xl"
            />
          </div>

          <div>
            <label className="block text-sm text-[#2e2d52] mb-2">키 (cm)</label>
            <div className="relative">
              <Ruler className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#787878]" />
              <Input
                type="number"
                placeholder="예: 170"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="pl-12 h-14 bg-[#f3f3f5] border-none rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-[#2e2d52] mb-2">몸무게 (kg)</label>
            <div className="relative">
              <Weight className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#787878]" />
              <Input
                type="number"
                placeholder="예: 65"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="pl-12 h-14 bg-[#f3f3f5] border-none rounded-xl"
              />
            </div>
          </div>
        </div>

        <Button
          onClick={handleComplete}
          disabled={isLoading}
          className="w-full h-14 bg-[#f89305] hover:bg-[#e08504] disabled:bg-[#ccc] text-white rounded-xl mb-3"
        >
          {isLoading ? '저장 중...' : '완료'}
        </Button>

        <Button
          onClick={handleSkip}
          variant="ghost"
          className="w-full h-14 text-[#787878] hover:bg-gray-50 rounded-xl"
        >
          나중에 입력하기
        </Button>
      </div>
    </div>
  );
}
