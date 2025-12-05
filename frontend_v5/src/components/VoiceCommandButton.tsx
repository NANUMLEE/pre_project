import React, { useState, useRef, useCallback } from 'react';
import { API_BASE_URL } from '../config/api';

interface VoiceCommandButtonProps {
  userId: string;
  onResult?: (result: VoiceCommandResult) => void;
  compact?: boolean; // 플로팅 버튼 모드
}

interface VoiceCommandResult {
  intent: string;
  rawText: string;
  ttsText: string;
  audioUrl: string;
  emojiType?: string;
  targetName?: string;
}

const VoiceCommandButton: React.FC<VoiceCommandButtonProps> = ({ userId, onResult, compact = false }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [lastResult, setLastResult] = useState<VoiceCommandResult | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // 녹음 시작
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // MediaRecorder 설정
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // 녹음 종료 시 서버로 전송
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await sendAudioToServer(audioBlob);

        // 스트림 정리
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setStatusMessage('녹음 중...');
    } catch (error) {
      console.error('녹음 시작 실패:', error);
      setStatusMessage('마이크 접근 권한이 필요합니다');
    }
  }, []);

  // 녹음 종료
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setStatusMessage('처리 중...');
    }
  }, [isRecording]);

  // 서버로 음성 데이터 전송
  const sendAudioToServer = async (audioBlob: Blob) => {
    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('userId', userId);
      formData.append('file', audioBlob, 'audio.webm');

      const response = await fetch(`${API_BASE_URL}/api/voice-command`, {
        method: 'POST',
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`서버 오류: ${response.status}`);
      }

      const result: VoiceCommandResult = await response.json();

      console.log('음성 명령 결과:', result);
      setLastResult(result);
      setStatusMessage(`"${result.rawText}"`);

      // TTS 음성 재생
      if (result.audioUrl) {
        playAudio(`${API_BASE_URL}${result.audioUrl}`);
      }

      // 콜백 호출
      if (onResult) {
        onResult(result);
      }
    } catch (error) {
      console.error('음성 명령 처리 실패:', error);
      setStatusMessage('음성 처리에 실패했습니다');
    } finally {
      setIsProcessing(false);
    }
  };

  // TTS 음성 재생
  const playAudio = (audioUrl: string) => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }

    const audio = new Audio(audioUrl);
    audioPlayerRef.current = audio;

    audio.play().catch(error => {
      console.error('오디오 재생 실패:', error);
    });
  };

  // 클릭 이벤트 (Toggle 방식)
  const handleClick = () => {
    if (isProcessing) return;

    if (isRecording) {
      // 녹음 중이면 종료
      stopRecording();
    } else {
      // 녹음 중이 아니면 시작
      startRecording();
    }
  };

  // Compact 모드 (플로팅 버튼)
  if (compact) {
    return (
      <>
        <button
          className={`floating-voice-button ${isRecording ? 'recording' : ''} ${isProcessing ? 'processing' : ''}`}
          onClick={handleClick}
          disabled={isProcessing}
          title={isRecording ? '녹음 종료하려면 클릭' : isProcessing ? '처리 중...' : '녹음 시작하려면 클릭'}
        >
          {isRecording ? '🎤' : isProcessing ? '⏳' : '🎙️'}
        </button>

        <style>{`
          .floating-voice-button {
            position: fixed;
            bottom: 200px;
            right: 20px;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            border: none;
            background: linear-gradient(135deg, #34e6d0 0%, #02b89a 100%);
            color: white;
            font-size: 28px;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(3, 207, 180, 0.4);
            z-index: 1000;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            user-select: none;
            -webkit-user-select: none;
            touch-action: none;
          }

          .floating-voice-button:hover:not(:disabled) {
            transform: scale(1.1);
            box-shadow: 0 6px 16px rgba(3, 207, 180, 0.6);
          }

          .floating-voice-button:active:not(:disabled) {
            transform: scale(0.95);
          }

          .floating-voice-button.recording {
              background: linear-gradient(135deg, #f89305 0%, #e08504 100%);
              animation: pulse-floating 1.5s infinite;
              box-shadow: 0 4px 12px rgba(248, 147, 5, 0.4);
          }

          .floating-voice-button.processing {
            background: linear-gradient(135deg, #34e6d0 0%, #02b89a 100%);
            cursor: not-allowed;
            opacity: 0.8;
            box-shadow: 0 4px 12px rgba(3, 207, 180, 0.4);
          }

          .floating-voice-button:disabled {
            cursor: not-allowed;
            opacity: 0.7;
          }

          @keyframes pulse-floating {
            0%, 100% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.15);
            }
          }
        `}</style>
      </>
    );
  }

  // 일반 모드 (전체 페이지)
  return (
    <div className="voice-command-container">
      {/* 음성 명령 버튼 */}
      <button
        className={`voice-command-button ${isRecording ? 'recording' : ''} ${isProcessing ? 'processing' : ''}`}
        onClick={handleClick}
        disabled={isProcessing}
      >
        <div className="button-content">
          {isRecording ? (
            <>
              <span className="recording-icon">🎤</span>
              <span className="button-text">녹음 중... (클릭하면 종료)</span>
            </>
          ) : isProcessing ? (
            <>
              <span className="processing-icon">⏳</span>
              <span className="button-text">처리 중...</span>
            </>
          ) : (
            <>
              <span className="mic-icon">🎙️</span>
              <span className="button-text">클릭해서 녹음 시작</span>
            </>
          )}
        </div>
      </button>

      {/* 상태 메시지 */}
      {statusMessage && (
        <div className="status-message">
          {statusMessage}
        </div>
      )}

      {/* 결과 표시 */}
      {lastResult && (
        <div className="voice-result">
          <div className="result-item">
            <span className="result-label">인식 결과:</span>
            <span className="result-value">{lastResult.rawText}</span>
          </div>
          <div className="result-item">
            <span className="result-label">응답:</span>
            <span className="result-value">{lastResult.ttsText}</span>
          </div>
          {lastResult.emojiType && (
            <div className="result-item">
              <span className="result-label">이모티콘:</span>
              <span className="result-value">{lastResult.emojiType}</span>
            </div>
          )}
          {lastResult.targetName && (
            <div className="result-item">
              <span className="result-label">대상:</span>
              <span className="result-value">{lastResult.targetName}</span>
            </div>
          )}
        </div>
      )}

      <style>{`
        .voice-command-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 20px;
        }

        .voice-command-button {
          width: 200px;
          height: 200px;
          border-radius: 50%;
          border: 4px solid #f89305;
          background: linear-gradient(135deg, #f89305 0%, #e08504 100%);
          color: white;
          font-size: 18px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(248, 147, 5, 0.3);
          user-select: none;
          -webkit-user-select: none;
          touch-action: none;
        }

        .voice-command-button:hover:not(:disabled) {
          transform: scale(1.05);
          box-shadow: 0 6px 20px rgba(248, 147, 5, 0.5);
        }

        .voice-command-button:active:not(:disabled) {
          transform: scale(0.95);
        }

        .voice-command-button.recording {
          background: linear-gradient(135deg, #ff4757 0%, #ff6348 100%);
          animation: pulse 1.5s infinite;
          border-color: #ff4757;
          box-shadow: 0 4px 15px rgba(255, 71, 87, 0.3);
        }

        .voice-command-button.processing {
          background: linear-gradient(135deg, #03cfb4 0%, #02b89a 100%);
          cursor: not-allowed;
          opacity: 0.8;
          border-color: #03cfb4;
          box-shadow: 0 4px 15px rgba(3, 207, 180, 0.3);
        }

        .voice-command-button:disabled {
          cursor: not-allowed;
          opacity: 0.7;
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }

        .button-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }

        .mic-icon,
        .recording-icon,
        .processing-icon {
          font-size: 48px;
        }

        .button-text {
          font-size: 16px;
          font-weight: 600;
        }

        .status-message {
          padding: 12px 24px;
          background: rgba(255, 255, 255, 0.9);
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          font-size: 14px;
          color: #333;
          max-width: 400px;
          text-align: center;
        }

        .voice-result {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
          max-width: 500px;
          width: 100%;
        }

        .result-item {
          display: flex;
          gap: 12px;
          margin-bottom: 12px;
          padding-bottom: 12px;
          border-bottom: 1px solid #e0e0e0;
        }

        .result-item:last-child {
          margin-bottom: 0;
          padding-bottom: 0;
          border-bottom: none;
        }

        .result-label {
          font-weight: 600;
          color: #666;
          min-width: 80px;
        }

        .result-value {
          color: #333;
          flex: 1;
        }
      `}</style>
    </div>
  );
};

export default VoiceCommandButton;
