import React, { useState, useEffect } from 'react';
import VoiceCommandButton from './VoiceCommandButton';

interface VoiceCommandPageProps {
  userId?: string;
}

const VoiceCommandPage: React.FC<VoiceCommandPageProps> = ({ userId: propUserId }) => {
  const [userId, setUserId] = useState<string>(propUserId || '');
  const [commandHistory, setCommandHistory] = useState<any[]>([]);

  // 로컬 스토리지에서 userId 가져오기 (로그인된 경우)
  useEffect(() => {
    if (!propUserId) {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          setUserId(userData.user_id || userData.userId || '');
        } catch (error) {
          console.error('사용자 정보 파싱 실패:', error);
        }
      }
    }
  }, [propUserId]);

  // 음성 명령 결과 처리
  const handleVoiceResult = (result: any) => {
    console.log('음성 명령 결과:', result);

    // 명령 히스토리에 추가
    setCommandHistory(prev => [
      {
        ...result,
        timestamp: new Date().toLocaleString('ko-KR')
      },
      ...prev.slice(0, 9) // 최대 10개까지만 저장
    ]);

    // Intent에 따른 추가 처리
    switch (result.intent) {
      case 'ASK_NEARBY_RUNNER_WHO':
      case 'ASK_NEARBY_RUNNER_COUNT':
        console.log('주변 러너 정보 조회:', result.ttsText);
        break;

      case 'SEND_EMOJI_BROADCAST':
        console.log('전체 이모티콘 전송:', result.emojiType);
        // 여기서 UI 업데이트나 알림 표시 가능
        break;

      case 'SEND_EMOJI_DIRECT':
        console.log(`${result.targetName}에게 이모티콘 전송:`, result.emojiType);
        // 여기서 UI 업데이트나 알림 표시 가능
        break;

      default:
        console.log('알 수 없는 명령:', result.intent);
    }
  };

  return (
    <div className="voice-command-page">
      <div className="page-header">
        <h1>🎤 음성 명령</h1>
        <p className="page-description">
          버튼을 누르고 말씀하세요. 주변 러너 확인, 이모티콘 전송 등을 할 수 있습니다.
        </p>
        {userId && (
          <div className="user-info">
            <span className="user-label">사용자 ID:</span>
            <span className="user-value">{userId}</span>
          </div>
        )}
      </div>

      {/* 음성 명령 버튼 */}
      <div className="voice-button-section">
        {userId ? (
          <VoiceCommandButton
            userId={userId}
            onResult={handleVoiceResult}
          />
        ) : (
          <div className="login-required">
            <p>음성 명령을 사용하려면 로그인이 필요합니다.</p>
          </div>
        )}
      </div>

      {/* 사용 가능한 명령어 안내 */}
      <div className="command-guide">
        <h3>📋 사용 가능한 명령어</h3>
        <div className="command-list">
          <div className="command-item">
            <span className="command-icon">👥</span>
            <div className="command-info">
              <strong>"주변에 누가 뛰고 있어?"</strong>
              <p>주변 러너 목록을 확인합니다</p>
            </div>
          </div>
          <div className="command-item">
            <span className="command-icon">🔢</span>
            <div className="command-info">
              <strong>"주변에 몇 명 있어?"</strong>
              <p>주변 러너 수를 확인합니다</p>
            </div>
          </div>
          <div className="command-item">
            <span className="command-icon">💪</span>
            <div className="command-info">
              <strong>"전체에게 화이팅 보내줘"</strong>
              <p>모든 러너에게 화이팅 이모티콘을 보냅니다</p>
            </div>
          </div>
          <div className="command-item">
            <span className="command-icon">🙌</span>
            <div className="command-info">
              <strong>"김시현한테 하이파이브 보내줘"</strong>
              <p>특정 러너에게 하이파이브 이모티콘을 보냅니다</p>
            </div>
          </div>
          <div className="command-item">
            <span className="command-icon">🔥</span>
            <div className="command-info">
              <strong>"박신혜한테 불꽃 이모티콘 보내줘"</strong>
              <p>특정 러너에게 불꽃 이모티콘을 보냅니다</p>
            </div>
          </div>
        </div>
      </div>

      {/* 명령 히스토리 */}
      {commandHistory.length > 0 && (
        <div className="command-history">
          <h3>📜 최근 명령 기록</h3>
          <div className="history-list">
            {commandHistory.map((item, index) => (
              <div key={index} className="history-item">
                <div className="history-header">
                  <span className="history-time">{item.timestamp}</span>
                  <span className={`history-intent intent-${item.intent}`}>
                    {item.intent}
                  </span>
                </div>
                <div className="history-content">
                  <div className="history-text">
                    <strong>입력:</strong> {item.rawText}
                  </div>
                  <div className="history-text">
                    <strong>응답:</strong> {item.ttsText}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .voice-command-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 20px;
        }

        .page-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .page-header h1 {
          font-size: 36px;
          margin-bottom: 12px;
          color: #333;
        }

        .page-description {
          font-size: 16px;
          color: #666;
          margin-bottom: 20px;
        }

        .user-info {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: #f0f0f0;
          border-radius: 20px;
          font-size: 14px;
        }

        .user-label {
          color: #666;
        }

        .user-value {
          font-weight: 600;
          color: #333;
        }

        .voice-button-section {
          display: flex;
          justify-content: center;
          margin-bottom: 60px;
        }

        .login-required {
          padding: 40px;
          background: #f9f9f9;
          border-radius: 12px;
          text-align: center;
        }

        .login-required p {
          color: #666;
          font-size: 16px;
        }

        .command-guide {
          background: white;
          border-radius: 16px;
          padding: 32px;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
          margin-bottom: 40px;
        }

        .command-guide h3 {
          font-size: 24px;
          margin-bottom: 24px;
          color: #333;
        }

        .command-list {
          display: grid;
          gap: 16px;
        }

        .command-item {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          padding: 16px;
          background: #f8f9fa;
          border-radius: 12px;
          transition: all 0.2s;
        }

        .command-item:hover {
          background: #e9ecef;
          transform: translateX(4px);
        }

        .command-icon {
          font-size: 32px;
          flex-shrink: 0;
        }

        .command-info {
          flex: 1;
        }

        .command-info strong {
          display: block;
          font-size: 16px;
          color: #333;
          margin-bottom: 4px;
        }

        .command-info p {
          font-size: 14px;
          color: #666;
          margin: 0;
        }

        .command-history {
          background: white;
          border-radius: 16px;
          padding: 32px;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
        }

        .command-history h3 {
          font-size: 24px;
          margin-bottom: 24px;
          color: #333;
        }

        .history-list {
          display: grid;
          gap: 16px;
        }

        .history-item {
          padding: 16px;
          background: #f8f9fa;
          border-radius: 12px;
          border-left: 4px solid #667eea;
        }

        .history-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .history-time {
          font-size: 12px;
          color: #999;
        }

        .history-intent {
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .intent-ASK_NEARBY_RUNNER_WHO,
        .intent-ASK_NEARBY_RUNNER_COUNT {
          background: #e3f2fd;
          color: #1976d2;
        }

        .intent-SEND_EMOJI_BROADCAST {
          background: #f3e5f5;
          color: #7b1fa2;
        }

        .intent-SEND_EMOJI_DIRECT {
          background: #fff3e0;
          color: #f57c00;
        }

        .intent-UNKNOWN {
          background: #ffebee;
          color: #c62828;
        }

        .history-content {
          display: grid;
          gap: 8px;
        }

        .history-text {
          font-size: 14px;
          color: #333;
        }

        .history-text strong {
          color: #666;
          margin-right: 8px;
        }
      `}</style>
    </div>
  );
};

export default VoiceCommandPage;
