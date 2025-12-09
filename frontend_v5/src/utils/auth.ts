// API 기본 URL
import { API_BASE_URL } from '../config/api';

// 사용자 데이터 타입
export type StoredUser = {
  user_id: number;
  email: string;
  nickname: string;
  name: string;
  totalDistance: number;
  totalRuns: number;
  level?: number;
  gender?: string;
  age?: number;
  height?: number;
  weight?: number;
};

// 회원가입 (백엔드 API)
export async function signUp(email: string, password: string, nickname: string): Promise<StoredUser | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify({
        email,
        name: nickname,
        password // 실제로는 백엔드에서 암호화됨
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('회원가입 실패:', error);
      return null;
    }

    const data = await response.json();
    if (data.success) {
      const user: StoredUser = {
        user_id: data.user_id,
        email: data.email,
        nickname: data.nickname,
        name: data.name,
        totalDistance: 0,
        totalRuns: 0,
        level: 1
      };

      // 로컬스토리지에 저장
      localStorage.setItem('currentUser', JSON.stringify(user));
      localStorage.setItem('userId', data.user_id.toString());

      return user;
    }

    return null;
  } catch (error) {
    console.error('회원가입 요청 실패:', error);
    return null;
  }
}

// 로그인 (백엔드 API)
export async function login(email: string, password: string): Promise<StoredUser | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify({
        email,
        password
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('로그인 실패:', error);
      return null;
    }

    const data = await response.json();
    if (data.success) {
      const user: StoredUser = {
        user_id: data.user_id,
        email: data.email,
        nickname: data.nickname,
        name: data.name,
        totalDistance: data.totalDistance,
        totalRuns: data.totalRuns,
        level: 1,
        gender: data.gender,
        age: data.age,
        height: data.height,
        weight: data.weight
      };

      // 로컬스토리지에 저장
      localStorage.setItem('currentUser', JSON.stringify(user));
      localStorage.setItem('userId', data.user_id.toString());

      return user;
    }

    return null;
  } catch (error) {
    console.error('로그인 요청 실패:', error);
    return null;
  }
}

// 로그아웃
export function logout(): void {
  localStorage.removeItem('currentUser');
  localStorage.removeItem('userId');
}

// 현재 로그인한 사용자 가져오기
export function getCurrentUser(): StoredUser | null {
  try {
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
}

// 사용자 ID 가져오기
export function getUserId(): number | null {
  const userStr = localStorage.getItem('currentUser');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      return user.user_id;
    } catch {
      return null;
    }
  }
  return null;
}