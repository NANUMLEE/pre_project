import { useEffect, useRef, useState, useCallback } from 'react';
import { WS_ENDPOINT } from '../config/api';

export interface UserLocation {
  id: string;
  userId?: string;
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
          console.log('📥 WebSocket 수신:', data);

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
              to: data.to,
              emoji: data.emoji,
              현재userId: userId,
              일치여부: data.to === userId
            });

            if (data.to === userId) {
              console.log(`😀 이모티콘 수신: ${data.from} → ${data.emoji}`);
              // 새로운 객체로 매번 업데이트 (React 감지용)
              setOnEmojiReceived({
                type: 'emoji',
                from: data.from,
                to: data.to,
                emoji: data.emoji,
                timestamp: data.timestamp
              });
              // 3초 후 초기화 (애니메이션 종료)
              setTimeout(() => setOnEmojiReceived(null), 3000);
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
      const emojiData: WebSocketMessage = {
        type: 'emoji',
        from: userId,
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