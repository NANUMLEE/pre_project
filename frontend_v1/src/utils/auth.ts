// 사용자 데이터 타입
type StoredUser = {
  email: string;
  password: string; // 실제로는 해시화해야 하지만 간단한 예시
  nickname: string;
  totalDistance: number;
  totalRuns: number;
  level: number;
};

// 회원가입
export function signUp(email: string, password: string, nickname: string): boolean {
  const users = getUsers();
  
  // 이메일 중복 체크
  if (users.find(u => u.email === email)) {
    return false;
  }
  
  // 새 사용자 추가
  const newUser: StoredUser = {
    email,
    password, // 실제로는 암호화 필요
    nickname,
    totalDistance: 0,
    totalRuns: 0,
    level: 1
  };
  
  users.push(newUser);
  localStorage.setItem('users', JSON.stringify(users));
  return true;
}

// 로그인
export function login(email: string, password: string): StoredUser | null {
  const users = getUsers();
  const user = users.find(u => u.email === email && u.password === password);
  
  if (user) {
    // 현재 로그인한 사용자 저장
    localStorage.setItem('currentUser', JSON.stringify(user));
    return user;
  }
  
  return null;
}

// 로그아웃
export function logout(): void {
  localStorage.removeItem('currentUser');
}

// 현재 로그인한 사용자 가져오기
export function getCurrentUser(): StoredUser | null {
  const userStr = localStorage.getItem('currentUser');
  return userStr ? JSON.parse(userStr) : null;
}

// 모든 사용자 가져오기
function getUsers(): StoredUser[] {
  const usersStr = localStorage.getItem('users');
  return usersStr ? JSON.parse(usersStr) : [];
}