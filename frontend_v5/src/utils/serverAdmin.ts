import { API_BASE_URL } from '../config/api';

/**
 * 서버 관리 함수들
 * WebSocket 서버에서 유효하지 않은 사용자 데이터를 정리합니다.
 */

/**
 * 특정 사용자를 서버에서 삭제
 * @param userId - 삭제할 사용자 ID (예: "user_17634")
 */
export async function deleteUser(userId: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    console.log(`🗑️  사용자 '${userId}' 삭제 요청:`, data);
    return data;
  } catch (error) {
    console.error(`❌ 사용자 '${userId}' 삭제 실패:`, error);
    throw error;
  }
}

/**
 * 유효하지 않은 모든 사용자 삭제
 * (clientId 형식으로 저장된 사용자들 = 로그인하지 않은 사용자)
 *
 * 사용 예:
 * - 브라우저 콘솔에서: deleteAllInvalidUsers()
 * - 또는 개발자 도구에서 Network 탭으로 확인
 */
export async function deleteAllInvalidUsers() {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/users`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    console.log('🗑️  유효하지 않은 사용자 모두 삭제:', data);

    if (data.deleted_count > 0) {
      console.log(`✅ ${data.deleted_count}명 삭제됨:`, data.deleted_users);
    } else {
      console.log('✅ 삭제할 사용자가 없습니다.');
    }

    return data;
  } catch (error) {
    console.error('❌ 유효하지 않은 사용자 삭제 실패:', error);
    throw error;
  }
}

/**
 * 서버 통계 조회
 */
export async function getServerStats() {
  try {
    const response = await fetch(`${API_BASE_URL}/stats`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    console.log('📊 서버 통계:', data);
    return data;
  } catch (error) {
    console.error('❌ 서버 통계 조회 실패:', error);
    throw error;
  }
}
