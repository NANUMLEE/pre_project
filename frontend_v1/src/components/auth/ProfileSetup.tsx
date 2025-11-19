import { useState } from 'react';
import { Ruler, Weight } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import type { User } from '../../types';

type ProfileSetupProps = {
  user: User;
  onComplete: (user: User) => void;
};

export function ProfileSetup({ user, onComplete }: ProfileSetupProps) {
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');

  const handleComplete = () => {
    const updatedUser: User = {
      ...user,
      height: height ? parseFloat(height) : undefined,
      weight: weight ? parseFloat(weight) : undefined
    };
    onComplete(updatedUser);
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
        <div className="space-y-4 mb-8">
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
          className="w-full h-14 bg-[#f89305] hover:bg-[#e08504] text-white rounded-xl mb-3"
        >
          완료
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
