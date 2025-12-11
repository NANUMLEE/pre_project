/**
 * Web Speech API를 사용한 TTS 헬퍼 함수
 * - 브라우저 네이티브 음성 합성 기능 활용
 * - 파일 다운로드 불필요
 * - 모바일(iOS/Android) 환경 최적화
 */

interface SpeechOptions {
  lang?: string;        // 기본값: 'ko-KR'
  rate?: number;        // 속도 (0.1 ~ 10, 기본 1)
  pitch?: number;       // 음높이 (0 ~ 2, 기본 1)
  volume?: number;      // 음량 (0 ~ 1, 기본 1)
  voiceName?: string;   // 특정 음성 선택 (선택사항)
}

/**
 * Web Speech API로 텍스트를 음성으로 재생
 */
export function speakWithWebSpeech(
  text: string,
  options: SpeechOptions = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    // 브라우저 지원 확인
    if (!('speechSynthesis' in window)) {
      console.error('❌ 이 브라우저는 Web Speech API를 지원하지 않습니다.');
      reject(new Error('Web Speech API not supported'));
      return;
    }

    // 기존 음성 중단
    window.speechSynthesis.cancel();

    // SpeechSynthesisUtterance 생성
    const utterance = new SpeechSynthesisUtterance(text);

    // 옵션 설정
    utterance.lang = options.lang || 'ko-KR';
    utterance.rate = options.rate || 1.0;
    utterance.pitch = options.pitch || 1.0;
    utterance.volume = options.volume || 1.0;

    // 특정 음성 선택 (옵션)
    if (options.voiceName) {
      const voices = window.speechSynthesis.getVoices();
      const selectedVoice = voices.find(v => v.name === options.voiceName);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
    }

    // 이벤트 핸들러
    utterance.onstart = () => {
      console.log('🔊 TTS 재생 시작:', text);
    };

    utterance.onend = () => {
      console.log('✅ TTS 재생 완료');
      resolve();
    };

    utterance.onerror = (event) => {
      console.error('❌ TTS 재생 오류:', event.error);
      reject(event);
    };

    // 재생 시작
    window.speechSynthesis.speak(utterance);
  });
}

/**
 * 현재 재생 중인 TTS 중단
 */
export function stopSpeech(): void {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    console.log('⏹️ TTS 재생 중단');
  }
}

/**
 * TTS가 재생 중인지 확인
 */
export function isSpeaking(): boolean {
  if ('speechSynthesis' in window) {
    return window.speechSynthesis.speaking;
  }
  return false;
}

/**
 * 사용 가능한 음성 목록 가져오기
 * - iOS Safari: 음성 목록 로드에 시간이 걸릴 수 있음
 */
export function getAvailableVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    let voices = window.speechSynthesis.getVoices();

    if (voices.length > 0) {
      resolve(voices);
      return;
    }

    // iOS Safari: voiceschanged 이벤트 대기
    window.speechSynthesis.onvoiceschanged = () => {
      voices = window.speechSynthesis.getVoices();
      resolve(voices);
    };
  });
}

/**
 * 한국어 음성 찾기
 */
export async function getKoreanVoice(): Promise<SpeechSynthesisVoice | null> {
  const voices = await getAvailableVoices();

  // 한국어 음성 우선순위
  const koreanVoice =
    voices.find(v => v.lang === 'ko-KR') ||
    voices.find(v => v.lang.startsWith('ko')) ||
    null;

  if (koreanVoice) {
    console.log('🇰🇷 한국어 음성 발견:', koreanVoice.name);
  } else {
    console.warn('⚠️ 한국어 음성이 없습니다. 기본 음성 사용');
  }

  return koreanVoice;
}

/**
 * 긴 텍스트를 문장 단위로 나눠서 재생
 * - Android Chrome에서 긴 텍스트 재생 시 끊김 방지
 */
export async function speakLongText(text: string, options: SpeechOptions = {}): Promise<void> {
  const maxLength = 100;

  if (text.length <= maxLength) {
    return speakWithWebSpeech(text, options);
  }

  // 문장 단위로 분할
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

  for (const sentence of sentences) {
    if (sentence.trim()) {
      await speakWithWebSpeech(sentence.trim(), options);
    }
  }
}
