import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Slider } from '../ui/slider';

type CourseFilterProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CourseFilter({ open, onOpenChange }: CourseFilterProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>코스 필터</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Distance */}
          <div>
            <label className="block text-sm text-[#2e2d52] mb-3">거리 (km)</label>
            <Slider defaultValue={[5]} max={20} step={0.5} />
            <div className="flex justify-between text-sm text-[#787878] mt-2">
              <span>0km</span>
              <span>20km</span>
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-sm text-[#2e2d52] mb-3">난이도</label>
            <div className="flex gap-3">
              <button className="flex-1 py-2 px-4 border-2 border-[#03cfb4] text-[#03cfb4] rounded-lg">
                초급
              </button>
              <button className="flex-1 py-2 px-4 border border-gray-300 text-[#787878] rounded-lg hover:border-[#f89305] hover:text-[#f89305]">
                중급
              </button>
              <button className="flex-1 py-2 px-4 border border-gray-300 text-[#787878] rounded-lg hover:border-[#2e2d52] hover:text-[#2e2d52]">
                고급
              </button>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm text-[#2e2d52] mb-3">위치</label>
            <div className="grid grid-cols-3 gap-2">
              {['여의도', '송파구', '중구', '종로구', '강남구', '마포구'].map((location) => (
                <button
                  key={location}
                  className="py-2 px-3 border border-gray-300 text-[#787878] rounded-lg text-sm hover:border-[#f89305] hover:text-[#f89305]"
                >
                  {location}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={() => onOpenChange(false)}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-[#2e2d52]"
          >
            초기화
          </Button>
          <Button
            onClick={() => onOpenChange(false)}
            className="flex-1 bg-[#f89305] hover:bg-[#e08504] text-white"
          >
            적용하기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
