import { useState, useRef, useCallback, useEffect } from 'react';
import { AudioRecorder } from '../utils/audioRecorder';
import { API_BASE_URL } from '../config/api';

export type VoiceState =
  | 'IDLE'
  | 'LISTENING_WAKEWORD'
  | 'RECORDING_COMMAND'
  | 'PROCESSING'
  | 'SPEAKING'
  | 'ERROR';

export interface WakewordConfig {
  wakewords: string[];           // 감지할 wakeword 목록 (예: ['리즘아', '리즈마'])
  wakewordDuration: number;      // wakeword 감지 녹음 시간 (ms)
  commandDuration: number;       // 명령어 녹음 시간 (ms)
  pollingInterval: number;       // wakeword 체크 주기 (ms)
  userId: string;                // 사용자 ID
}

export interface VoiceCommandResult {
  success: boolean;
  intent: string;
  rawText: string;
  ttsText: string;
  emojiType?: string;
  targetName?: string;
}

/**
 * Wakeword 기반 음성 인터랙션 Hook
 *
 * 사용법:
 * const { state, startListening, stopListening } = useWakewordDetection({
 *   wakewords: ['리즘아'],
 *   userId: 'user123',
 *   onCommandResult: (result) => console.log(result)
 * });
 */
export function useWakewordDetection(config: WakewordConfig & {
  onCommandResult?: (result: VoiceCommandResult) => void;
  onTTSStart?: () => void;
  onTTSEnd?: () => void;
}) {
  const {
    wakewords,
    wakewordDuration = 2500,      // 2.5초
    commandDuration = 4000,       // 4초
    pollingInterval = 3000,       // 3초마다 체크
    userId,
    onCommandResult,
    onTTSStart,
    onTTSEnd
  } = config;

  const [state, setState] = useState<VoiceState>('IDLE');
  const [statusMessage, setStatusMessage] = useState<string>('');

  const recorderRef = useRef<AudioRecorder>(new AudioRecorder());
  const loopTimerRef = useRef<number | null>(null);
  const isActiveRef = useRef<boolean>(false);

  /**
   * Whisper STT API 호출
   */
  const sendToWhisper = async (audioBlob: Blob): Promise<string> => {
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');

    const response = await fetch(`${API_BASE_URL}/api/stt`, {
      method: 'POST',
      headers: {
        'ngrok-skip-browser-warning': 'true',
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`STT 오류: ${response.status}`);
    }

    const data = await response.json();
    return data.text || '';
  };

  /**
   * 음성 명령 처리 API 호출
   */
  const processVoiceCommand = async (audioBlob: Blob): Promise<VoiceCommandResult> => {
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
      throw new Error(`명령 처리 오류: ${response.status}`);
    }

    return await response.json();
  };

  /**
   * Web Speech API로 TTS 재생
   */
  const speakText = (text: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        reject(new Error('Web Speech API 미지원'));
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ko-KR';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        console.log('🔊 TTS 시작:', text);
        onTTSStart?.();
      };

      utterance.onend = () => {
        console.log('✅ TTS 완료');
        onTTSEnd?.();
        resolve();
      };

      utterance.onerror = (event) => {
        console.error('❌ TTS 오류:', event);
        reject(event);
      };

      window.speechSynthesis.speak(utterance);
    });
  };

  /**
   * Wakeword 감지 체크
   */
  const checkWakeword = async (): Promise<boolean> => {
    console.log('🔍 checkWakeword 진입:', {
      isActive: isActiveRef.current,
      state: state,
      expectedState: 'LISTENING_WAKEWORD',
      match: state === 'LISTENING_WAKEWORD'
    });

    // ✅ state 체크 제거 (React setState는 비동기라서 즉시 반영 안 됨)
    // isActiveRef만 체크
    if (!isActiveRef.current) {
      console.log('⏸️ Wakeword 체크 중단 (isActive = false)');
      return false;
    }

    try {
      console.log('👂 Wakeword 감지 시도...');
      setState('LISTENING_WAKEWORD');
      setStatusMessage('음성을 듣고 있어요...');

      // 짧은 구간 녹음
      console.log(`🎤 녹음 시작 (${wakewordDuration}ms)`);
      await recorderRef.current.start({
        maxDuration: wakewordDuration
      });

      // ✅ maxDuration만큼 기다리기 (녹음이 완료될 때까지)
      console.log(`⏳ ${wakewordDuration}ms 동안 녹음 중...`);
      await new Promise(resolve => setTimeout(resolve, wakewordDuration));

      const audioBlob = await recorderRef.current.stop();
      console.log(`✅ 녹음 완료: ${audioBlob ? (audioBlob.size / 1024).toFixed(2) : 0} KB`);

      if (!audioBlob || audioBlob.size === 0) {
        console.warn('⚠️ 녹음된 오디오 없음 - 다음 체크로 이동');
        return false;
      }

      // Whisper STT로 텍스트 변환
      console.log('📡 Whisper STT 요청 중...');
      const text = await sendToWhisper(audioBlob);
      console.log('📝 인식된 텍스트:', `"${text}"`);

      // Wakeword 포함 여부 확인 (유사도 매칭 포함)
      const normalized = text.toLowerCase().replace(/\s/g, '');
      console.log('🔍 정규화된 텍스트:', `"${normalized}"`);
      console.log('🔍 찾을 Wakewords:', wakewords);

      // 편집 거리 계산 함수 (Levenshtein Distance)
      const levenshteinDistance = (a: string, b: string): number => {
        const matrix: number[][] = [];
        for (let i = 0; i <= b.length; i++) matrix[i] = [i];
        for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

        for (let i = 1; i <= b.length; i++) {
          for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
              matrix[i][j] = matrix[i - 1][j - 1];
            } else {
              matrix[i][j] = Math.min(
                matrix[i - 1][j - 1] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j] + 1
              );
            }
          }
        }
        return matrix[b.length][a.length];
      };

      const detected = wakewords.some(word => {
        const normalizedWord = word.toLowerCase().replace(/\s/g, '');

        // 1. 완전 포함 매칭 (기존 방식)
        if (normalized.includes(normalizedWord)) {
          console.log(`   - "${word}" → ✅ 완전 매칭`);
          return true;
        }

        // 2. 유사도 매칭 (편집 거리)
        const distance = levenshteinDistance(normalized, normalizedWord);
        const maxDistance = Math.max(2, Math.floor(normalizedWord.length * 0.3)); // 길이의 30% 또는 최소 2

        if (distance <= maxDistance) {
          console.log(`   - "${word}" → ✅ 유사 매칭 (거리: ${distance}/${maxDistance}, 인식: "${text}")`);
          return true;
        }

        console.log(`   - "${word}" → ❌ 불일치 (거리: ${distance}/${maxDistance})`);
        return false;
      });

      if (detected) {
        console.log('🎉🎉🎉 Wakeword 감지 성공! 🎉🎉🎉');
        setStatusMessage(`"${text}" 인식됨`);
        return true;
      } else {
        console.log('❌ Wakeword 감지 실패 - 다음 체크로 이동');
      }

      return false;
    } catch (error) {
      console.error('❌ Wakeword 체크 오류:', error);
      setStatusMessage('오류 발생');
      return false;
    }
  };

  /**
   * 명령어 녹음 및 처리
   */
  const handleCommand = async () => {
    setState('RECORDING_COMMAND');
    setStatusMessage('명령을 말씀해 주세요...');

    try {
      // 명령어 녹음
      await recorderRef.current.start({
        maxDuration: commandDuration
      });

      // ✅ commandDuration만큼 기다리기 (녹음이 완료될 때까지)
      await new Promise(resolve => setTimeout(resolve, commandDuration));

      const audioBlob = await recorderRef.current.stop();

      if (!audioBlob || audioBlob.size === 0) {
        throw new Error('녹음 실패');
      }

      // 서버로 전송 및 처리
      setState('PROCESSING');
      setStatusMessage('처리 중...');

      const result = await processVoiceCommand(audioBlob);
      console.log('✅ 명령 처리 결과:', result);

      // 콜백 호출
      if (onCommandResult) {
        onCommandResult(result);
      }

      // TTS 응답
      if (result.ttsText) {
        setState('SPEAKING');
        setStatusMessage(result.ttsText);
        await speakText(result.ttsText);
      }

      // 다시 wakeword listening으로 복귀
      if (isActiveRef.current) {
        setState('LISTENING_WAKEWORD');
        setStatusMessage('Wakeword 대기 중...');
        scheduleNextCheck();
      }
    } catch (error) {
      console.error('❌ 명령 처리 실패:', error);
      setState('ERROR');
      setStatusMessage('오류 발생');

      // 3초 후 재시작
      setTimeout(() => {
        if (isActiveRef.current) {
          setState('LISTENING_WAKEWORD');
          setStatusMessage('Wakeword 대기 중...');
          scheduleNextCheck();
        }
      }, 3000);
    }
  };

  /**
   * Wakeword Listening Loop
   */
  const wakewordLoop = async () => {
    if (!isActiveRef.current) {
      console.log('⏹️ Wakeword Loop 중단 (isActive = false)');
      return;
    }

    console.log('\n' + '='.repeat(60));
    console.log('🔄 Wakeword Loop 시작');
    console.log('📊 현재 상태:', {
      isActive: isActiveRef.current,
      state: state,
      stateCheck: state === 'LISTENING_WAKEWORD'
    });
    console.log('='.repeat(60));

    const detected = await checkWakeword();

    if (detected) {
      // Wakeword 감지 → 명령어 처리
      console.log('➡️ 명령어 처리 모드로 전환');
      await handleCommand();
    } else {
      // 감지 실패 → 다음 체크 예약
      console.log(`⏱️ ${pollingInterval}ms 후 다음 체크 예약`);
      scheduleNextCheck();
    }
  };

  /**
   * 다음 wakeword 체크 예약
   */
  const scheduleNextCheck = () => {
    if (loopTimerRef.current) {
      clearTimeout(loopTimerRef.current);
      loopTimerRef.current = null;
    }

    console.log(`⏰ 타이머 설정: ${pollingInterval}ms`);
    loopTimerRef.current = window.setTimeout(() => {
      console.log('⏰ 타이머 실행 → 다음 Wakeword Loop 시작');
      wakewordLoop();
    }, pollingInterval);
  };

  /**
   * Listening 시작 (사용자 제스처 필요)
   */
  const startListening = useCallback(() => {
    console.log('🎬 Wakeword Listening 시작');
    isActiveRef.current = true;
    setState('LISTENING_WAKEWORD');
    setStatusMessage('Wakeword 대기 중...');

    console.log('✅ startListening 완료:', {
      isActive: isActiveRef.current,
      state: 'LISTENING_WAKEWORD (방금 설정됨)'
    });

    // 첫 체크 시작
    console.log('🚀 wakewordLoop() 호출 예정...');
    wakewordLoop();
  }, [wakewords, pollingInterval]);

  /**
   * Listening 중지
   */
  const stopListening = useCallback(() => {
    console.log('⏹️ Wakeword Listening 중지');
    isActiveRef.current = false;

    if (loopTimerRef.current) {
      clearTimeout(loopTimerRef.current);
      loopTimerRef.current = null;
    }

    recorderRef.current.stop();
    window.speechSynthesis.cancel();

    setState('IDLE');
    setStatusMessage('');
  }, []);

  /**
   * 컴포넌트 언마운트 시 정리
   */
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    state,
    statusMessage,
    startListening,
    stopListening,
    isActive: isActiveRef.current,
  };
}
