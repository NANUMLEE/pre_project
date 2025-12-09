import React, { useEffect } from 'react';
import { useWakewordDetection, VoiceState } from '../hooks/useWakewordDetection';
import type { VoiceCommandResult } from '../hooks/useWakewordDetection';

interface WakewordListenerProps {
  userId: string;
  wakewords?: string[];
  onCommandResult?: (result: VoiceCommandResult) => void;
  onTTSStart?: () => void;
  onTTSEnd?: () => void;
}

/**
 * Wakeword 자동 감지 리스너
 * - Running 화면에서 자동으로 wakeword 감지
 * - "러닝 시작" 버튼 클릭 시 활성화
 */
export const WakewordListener: React.FC<WakewordListenerProps> = ({
  userId,
  wakewords = ['헤이 리즘', '헤이리즘', '헤이 리즘아'],  // 더 긴 문구로 변경 (인식률 향상)
  onCommandResult,
  onTTSStart,
  onTTSEnd,
}) => {
  const { state, statusMessage, startListening, stopListening } = useWakewordDetection({
    wakewords,
    wakewordDuration: 3000,    // 3초 (더 긴 문구를 위해 증가)
    commandDuration: 4000,     // 4초
    pollingInterval: 3000,     // 3초마다 체크
    userId,
    onCommandResult,
    onTTSStart,
    onTTSEnd,
  });

  // ✨ 컴포넌트 마운트 시 자동으로 Wakeword listening 시작
  useEffect(() => {
    console.log('🎬 WakewordListener 마운트됨 - 자동 시작');
    startListening();

    return () => {
      console.log('⏹️ WakewordListener 언마운트됨 - 중지');
      stopListening();
    };
  }, []); // 빈 배열: 마운트 시 한 번만 실행

  // 상태별 이모지
  const getStateIcon = (state: VoiceState): string => {
    switch (state) {
      case 'IDLE':
        return '😴';
      case 'LISTENING_WAKEWORD':
        return '👂';
      case 'RECORDING_COMMAND':
        return '🎤';
      case 'PROCESSING':
        return '⏳';
      case 'SPEAKING':
        return '🔊';
      case 'ERROR':
        return '❌';
      default:
        return '🤖';
    }
  };

  // 상태별 메시지
  const getStateMessage = (state: VoiceState): string => {
    switch (state) {
      case 'IDLE':
        return '대기 중';
      case 'LISTENING_WAKEWORD':
        return '"헤이 리즘"이라고 불러보세요';
      case 'RECORDING_COMMAND':
        return '명령을 말씀해 주세요';
      case 'PROCESSING':
        return '처리 중...';
      case 'SPEAKING':
        return '응답 중...';
      case 'ERROR':
        return '오류 발생';
      default:
        return '';
    }
  };

  return (
    <div className="wakeword-listener-container">
      {/* 상태 표시 */}
      <div className={`wakeword-status ${state.toLowerCase()}`}>
        <div className="status-icon">{getStateIcon(state)}</div>
        <div className="status-text">
          <div className="status-title">{getStateMessage(state)}</div>
          {statusMessage && (
            <div className="status-detail">{statusMessage}</div>
          )}
        </div>
      </div>

      <style>{`
        .wakeword-listener-container {
          position: fixed;
          bottom: 280px;
          right: 20px;
          z-index: 999;
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-items: flex-end;
        }

        .wakeword-status {
          background: rgba(255, 255, 255, 0.95);
          border-radius: 12px;
          padding: 12px 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 200px;
          transition: all 0.3s ease;
        }

        .wakeword-status.listening_wakeword {
          background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
          animation: pulse-border 2s infinite;
        }

        .wakeword-status.recording_command {
          background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
        }

        .wakeword-status.speaking {
          background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
        }

        .wakeword-status.error {
          background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
        }

        @keyframes pulse-border {
          0%, 100% {
            box-shadow: 0 4px 12px rgba(3, 169, 244, 0.3);
          }
          50% {
            box-shadow: 0 4px 20px rgba(3, 169, 244, 0.6);
          }
        }

        .status-icon {
          font-size: 28px;
          line-height: 1;
        }

        .status-text {
          flex: 1;
        }

        .status-title {
          font-size: 14px;
          font-weight: 600;
          color: #333;
          margin-bottom: 2px;
        }

        .status-detail {
          font-size: 12px;
          color: #666;
        }

        /* 모바일 최적화 */
        @media (max-width: 768px) {
          .wakeword-listener-container {
            bottom: 240px;
            right: 16px;
          }

          .wakeword-status {
            min-width: 180px;
            padding: 10px 14px;
          }

          .status-icon {
            font-size: 24px;
          }

          .status-title {
            font-size: 13px;
          }

          .status-detail {
            font-size: 11px;
          }
        }
      `}</style>
    </div>
  );
};

export default WakewordListener;
