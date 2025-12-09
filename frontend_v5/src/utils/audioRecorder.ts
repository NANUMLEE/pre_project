/**
 * 오디오 녹음 유틸리티
 * - MediaRecorder 래퍼
 * - Wakeword / Command 녹음 공통 로직
 */

export interface RecordingOptions {
  maxDuration?: number;  // 최대 녹음 시간 (ms)
  mimeType?: string;     // 오디오 포맷
}

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private timeoutId: number | null = null;
  private recordedMimeType: string = 'audio/webm'; // 실제 녹음된 포맷 저장

  /**
   * 녹음 시작
   */
  async start(options: RecordingOptions = {}): Promise<void> {
    const {
      maxDuration = 5000,
      mimeType
    } = options;

    // 기존 녹음 정리
    this.stop();

    try {
      // 마이크 스트림 확보
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // 🔍 마이크 스트림 상태 확인
      const audioTracks = this.stream.getAudioTracks();
      console.log('🎙️ 마이크 트랙 정보:', {
        트랙수: audioTracks.length,
        트랙상태: audioTracks.map(track => ({
          label: track.label,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
          settings: track.getSettings()
        }))
      });

      // ✨ 모바일 호환 mimeType 자동 선택
      let selectedMimeType = mimeType;
      if (!selectedMimeType) {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          selectedMimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          selectedMimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          selectedMimeType = 'audio/webm';
        } else {
          selectedMimeType = ''; // 브라우저 기본값 사용
        }
        console.log('🎤 선택된 오디오 포맷:', selectedMimeType || '기본값');
      }

      // MediaRecorder 생성
      const recorderOptions = selectedMimeType ? { mimeType: selectedMimeType } : {};
      this.mediaRecorder = new MediaRecorder(this.stream, recorderOptions);
      this.audioChunks = [];

      // 실제 사용된 MIME 타입 저장 (Blob 생성 시 사용)
      this.recordedMimeType = selectedMimeType || this.mediaRecorder.mimeType || 'audio/webm';

      // 데이터 수집
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log(`📦 오디오 청크 수집: ${(event.data.size / 1024).toFixed(2)} KB`);
          this.audioChunks.push(event.data);
        } else {
          console.warn('⚠️ 빈 오디오 청크 수신 (0 bytes)');
        }
      };

      // 녹음 시작 (timeslice: 100ms마다 데이터 수집)
      // 모바일 브라우저에서 timeslice를 지정하지 않으면 데이터가 제대로 수집되지 않을 수 있음
      this.mediaRecorder.start(100);
      console.log(`🎤 녹음 시작 (최대 ${maxDuration}ms, 포맷: ${selectedMimeType || '기본값'}, timeslice: 100ms)`);

      // 🔍 녹음 시작 직후 상태 확인
      setTimeout(() => {
        if (this.mediaRecorder) {
          console.log('📊 MediaRecorder 상태 (100ms 후):', {
            state: this.mediaRecorder.state,
            mimeType: this.mediaRecorder.mimeType,
            수집된청크수: this.audioChunks.length
          });
        }
      }, 100);

      // 🔍 녹음 중간 상태 확인
      setTimeout(() => {
        if (this.mediaRecorder) {
          console.log('📊 MediaRecorder 상태 (1000ms 후):', {
            state: this.mediaRecorder.state,
            수집된청크수: this.audioChunks.length
          });
        }
      }, 1000);

      // ✅ 자동 종료 타이머 제거 (useWakewordDetection에서 수동으로 stop() 호출)
      // 타이머와 수동 호출이 충돌하여 null 반환 문제가 발생함
      // if (maxDuration > 0) {
      //   this.timeoutId = window.setTimeout(() => {
      //     this.stop();
      //   }, maxDuration);
      // }
    } catch (error) {
      console.error('❌ 녹음 시작 실패:', error);
      if (error instanceof Error) {
        console.error('   - 에러 메시지:', error.message);
        console.error('   - 에러 이름:', error.name);
      }
      throw error;
    }
  }

  /**
   * 녹음 종료 및 Blob 반환
   */
  async stop(): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        resolve(null);
        return;
      }

      // 종료 이벤트 리스너
      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: this.recordedMimeType });
        const sizeKB = (audioBlob.size / 1024).toFixed(2);
        console.log(`✅ 녹음 완료: ${sizeKB} KB (${this.audioChunks.length} chunks), 포맷: ${this.recordedMimeType}`);

        if (audioBlob.size === 0) {
          console.warn('⚠️ 경고: 녹음된 오디오 크기가 0 바이트입니다!');
          console.warn('   → 마이크가 음소거되었거나 권한이 없을 수 있습니다.');
        }

        // 스트림 정리
        this.cleanup();

        resolve(audioBlob);
      };

      // 타임아웃 해제
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
        this.timeoutId = null;
      }

      // 녹음 중지
      this.mediaRecorder.stop();
    });
  }

  /**
   * 리소스 정리
   */
  private cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.mediaRecorder = null;
    this.audioChunks = [];
  }

  /**
   * 녹음 중인지 확인
   */
  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }
}

/**
 * 간단한 VAD (Voice Activity Detection)
 * - Web Audio API로 음량 분석
 * - 임계값 이상이면 음성 감지
 */
export class SimpleVAD {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;

  async init(stream: MediaStream): Promise<void> {
    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;

    const source = this.audioContext.createMediaStreamSource(stream);
    source.connect(this.analyser);

    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
  }

  /**
   * 현재 음량 레벨 (0-255)
   */
  getVolume(): number {
    if (!this.analyser || !this.dataArray) return 0;

    this.analyser.getByteFrequencyData(this.dataArray);

    // 평균 음량 계산
    const sum = this.dataArray.reduce((a, b) => a + b, 0);
    return sum / this.dataArray.length;
  }

  /**
   * 음성 활동 감지
   */
  isSpeaking(threshold: number = 30): boolean {
    return this.getVolume() > threshold;
  }

  cleanup(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.analyser = null;
    this.dataArray = null;
  }
}
