import { useEffect, useRef, useState, useCallback } from 'react';
import { WS_ENDPOINT, API_BASE_URL } from '../config/api';
import { speakWithWebSpeech } from '../utils/webSpeech';

export interface UserLocation {
  id: string;
  userId?: string;
  name?: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  distance?: number;
}

export interface WebSocketMessage {
  type: 'location' | 'locations' | 'emoji';
  id?: string;
  userId?: string;
  latitude?: number;
  longitude?: number;
  locations?: UserLocation[];
  // emoji 타입용
  from?: string;
  fromUserName?: string;  // ✨ 보낸 사람 이름 추가
  to?: string;
  emoji?: string;
  timestamp?: string;
}

export function useWebSocket(
  clientId: string,
  wsUrl: string = WS_ENDPOINT,
  userId?: string
) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [otherUsers, setOtherUsers] = useState<UserLocation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [onEmojiReceived, setOnEmojiReceived] = useState<WebSocketMessage | null>(null);

  const connect = useCallback(() => {
    console.log(`🔌 WebSocket 연결 시도: ${wsUrl}`);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }

    try {

      // 🔧 수정됨: userId를 WebSocket URL에 포함시키기
      const fullUrl = `${wsUrl}?userId=${userId}`;
      const ws = new WebSocket(fullUrl);

      ws.onopen = () => {
        console.log('✅ WebSocket 연결 성공!');
        console.log('👤 연결된 userId:', userId);
        setIsConnected(true);
        setError(null);
      };

      ws.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);

          // 위치 업데이트는 로그하지 않음 (너무 빈번함)
          // emoji 같은 중요한 메시지만 로그 출력
          if (data.type !== 'locations') {
            console.log('📥 WebSocket 수신:', data);
          }

          if (data.type === 'locations') {

            // 🔧 수정됨: 항상 userId로 본인 제외
            const otherUsersList = (data.locations || []).filter(
              (loc) => loc.userId !== userId
            );

            setOtherUsers(otherUsersList);
          }

          // ✨ 이모티콘 메시지 처리 (신규)
          if (data.type === 'emoji') {
            console.log(`🎯 이모티콘 메시지 받음:`, {
              from: data.from,
              fromUserName: data.fromUserName,
              to: data.to,
              emoji: data.emoji,
              현재userId: userId,
              to타입: typeof data.to,
              userId타입: typeof userId,
              엄격비교: data.to === userId,
              문자열비교: String(data.to) === String(userId)
            });

            // 타입 불일치 문제 해결: 문자열로 변환하여 비교
            if (String(data.to) === String(userId)) {
              console.log(`😀 이모티콘 수신: ${data.fromUserName || data.from} → ${data.emoji}`);

              // ✨ Web Speech API로 TTS 재생
              const senderName = data.fromUserName || `러너${data.from}` || '익명';
              const emojiType = data.emoji || 'FIGHTING';

              console.log(`🔊 TTS 텍스트 생성: senderName="${senderName}", emojiType="${emojiType}"`);

              // 서버에서 TTS 텍스트 가져오기
              fetch(`${API_BASE_URL}/api/emoji-tts?from_name=${encodeURIComponent(senderName)}&emoji_type=${encodeURIComponent(emojiType)}`, {
                headers: {
                  'ngrok-skip-browser-warning': 'true',
                  'Accept': 'application/json'
                }
              })
                .then(res => res.json())
                .then(result => {
                  if (result.success && result.text) {
                    console.log(`✅ TTS 텍스트 받음: ${result.text}`);

                    // Web Speech API로 직접 재생
                    speakWithWebSpeech(result.text)
                      .then(() => {
                        console.log('✅ TTS 재생 완료');
                      })
                      .catch(err => {
                        console.error('❌ TTS 재생 실패:', err);
                      });
                  }
                })
                .catch(err => {
                  console.error('❌ TTS 텍스트 가져오기 실패:', err);
                });

              // 새로운 객체로 매번 업데이트 (React 감지용)
              // ✨ 고유한 timestamp 생성 (React 리렌더링 보장)
              const uniqueTimestamp = `${Date.now()}_${Math.random()}`;
              setOnEmojiReceived({
                type: 'emoji',
                from: data.from,
                fromUserName: data.fromUserName,  // ✨ fromUserName 추가
                to: data.to,
                emoji: data.emoji,
                timestamp: uniqueTimestamp  // ✨ 매번 새로운 값
              });

              console.log(`✅ onEmojiReceived 상태 업데이트: ${uniqueTimestamp}`);

              // 2초 후 초기화 (애니메이션 종료)
              setTimeout(() => {
                console.log('🔄 onEmojiReceived 초기화 (2초 후)');
                setOnEmojiReceived(null);
              }, 2000);
            } else {
              console.log(`⚠️ 다른 사용자의 이모티콘입니다. 무시됨.`);
            }
          }

          setLastMessage(data);

        } catch (parseError) {
          console.error('❌ JSON 파싱 오류:', parseError);
          setError('데이터 파싱 오류');
        }
      };

      ws.onerror = (event) => {
        console.error('❌ WebSocket 오류:', event);
        setError('WebSocket 연결 오류');
        setIsConnected(false);
      };

      ws.onclose = () => {
        console.log('🔴 WebSocket 연결 종료');
        setIsConnected(false);

        setTimeout(() => {
          connect();
        }, 3000);
      };

      wsRef.current = ws;

    } catch (err) {
      console.error('❌ WebSocket 연결 실패:', err);
      setError('WebSocket 연결 실패');
    }
  }, [wsUrl, clientId, userId]);

  const sendLocation = useCallback((latitude: number, longitude: number) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const locationData: WebSocketMessage = {
        type: 'location',
        id: clientId,
        userId: userId,
        latitude,
        longitude,
      };

      try {
        wsRef.current.send(JSON.stringify(locationData));
        console.log('📤 위치 데이터 전송:', locationData);
      } catch (err) {
        console.error('❌ 위치 데이터 전송 실패:', err);
      }
    }
  }, [clientId, userId]);

  // ✨ 이모티콘 전송 함수 (신규)
  const sendEmoji = useCallback((to_user_id: string, emoji: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      // 🔧 발신자 이름 가져오기 (currentUser에서 name 추출)
      let fromUserName = '익명';
      try {
        const currentUserStr = localStorage.getItem('currentUser');
        if (currentUserStr) {
          const currentUser = JSON.parse(currentUserStr);
          fromUserName = currentUser.name || currentUser.nickname || '익명';
        }
      } catch (err) {
        console.error('❌ currentUser 파싱 실패:', err);
      }

      const emojiData: WebSocketMessage = {
        type: 'emoji',
        from: userId,
        fromUserName: fromUserName,  // ✨ 발신자 이름 추가
        to: to_user_id,
        emoji: emoji,
      };

      try {
        wsRef.current.send(JSON.stringify(emojiData));
        console.log('📤 이모티콘 전송:', emojiData);
      } catch (err) {
        console.error('❌ 이모티콘 전송 실패:', err);
      }
    }
  }, [userId]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    isConnected,
    otherUsers,
    error,
    lastMessage,
    onEmojiReceived,
    sendLocation,
    sendEmoji,
    disconnect,
    connect,
  };
}