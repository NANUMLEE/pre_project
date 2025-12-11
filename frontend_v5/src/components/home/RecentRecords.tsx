import { Calendar, Clock, MapPin } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { useState } from 'react';

export function RecentRecords() {
  const [showAllRecords, setShowAllRecords] = useState(false);

  // Mock recent runs
  const recentRuns = [
    {
      id: '1',
      date: '11월 9일',
      distance: 5.2,
      duration: 30,
      pace: 5.77
    },
    {
      id: '2',
      date: '11월 7일',
      distance: 7.1,
      duration: 40,
      pace: 5.63
    }
  ];

  // All records for dialog
  const allRuns = [
    ...recentRuns,
    {
      id: '3',
      date: '11월 5일',
      distance: 4.2,
      duration: 25,
      pace: 5.95
    },
    {
      id: '4',
      date: '11월 3일',
      distance: 6.8,
      duration: 38,
      pace: 5.59
    },
    {
      id: '5',
      date: '11월 1일',
      distance: 5.5,
      duration: 32,
      pace: 5.82
    }
  ];

  return (
    <>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[#2e2d52]">최근 기록</h3>
          <button 
            onClick={() => setShowAllRecords(true)}
            className="text-sm text-[#f89305]"
          >
            전체보기
          </button>
        </div>

        <div className="space-y-3">
          {recentRuns.map((run) => (
            <div
              key={run.id}
              className="bg-white rounded-xl p-4 shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-[#787878]">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">{run.date}</span>
                </div>
                <div className="bg-[#f89305]/10 text-[#f89305] px-3 py-1 rounded-full text-sm">
                  {run.distance}km
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <div className="bg-[#03cfb4]/10 p-2 rounded-lg">
                    <Clock className="w-4 h-4 text-[#03cfb4]" />
                  </div>
                  <div>
                    <p className="text-xs text-[#787878]">시간</p>
                    <p className="text-sm text-[#2e2d52]">{run.duration}분</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="bg-[#2e2d52]/10 p-2 rounded-lg">
                    <MapPin className="w-4 h-4 text-[#2e2d52]" />
                  </div>
                  <div>
                    <p className="text-xs text-[#787878]">페이스</p>
                    <p className="text-sm text-[#2e2d52]">{run.pace.toFixed(1)}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* All Records Dialog */}
      <Dialog open={showAllRecords} onOpenChange={setShowAllRecords}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>전체 러닝 기록</DialogTitle>
            <DialogDescription>
              모든 러닝 기록을 확인할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-4">
            {allRuns.map((run) => (
              <div
                key={run.id}
                className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-[#787878]">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">{run.date}</span>
                  </div>
                  <div className="bg-[#f89305]/10 text-[#f89305] px-3 py-1 rounded-full text-sm">
                    {run.distance}km
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <div className="bg-[#03cfb4]/10 p-2 rounded-lg">
                      <Clock className="w-4 h-4 text-[#03cfb4]" />
                    </div>
                    <div>
                      <p className="text-xs text-[#787878]">시간</p>
                      <p className="text-sm text-[#2e2d52]">{run.duration}분</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="bg-[#2e2d52]/10 p-2 rounded-lg">
                      <MapPin className="w-4 h-4 text-[#2e2d52]" />
                    </div>
                    <div>
                      <p className="text-xs text-[#787878]">페이스</p>
                      <p className="text-sm text-[#2e2d52]">{run.pace.toFixed(1)}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}