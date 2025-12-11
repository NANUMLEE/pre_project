# GPS 지도 시스템 가이드

## 📋 전체 구조

```
src/
 ├─ utils/
 │  └─ leafletFix.ts          ← Leaflet 아이콘 깨짐 해결
 ├─ components/
 │  ├─ map/
 │  │  ├─ GPSMap.tsx          ← GPS 위치 추적 + 지도 통합 (핵심 컴포넌트)
 │  │  ├─ LeafletMap.tsx      ← Leaflet 기반 지도 렌더링
 │  │  └─ MAP_GUIDE.md        ← 이 파일
 │  └─ running/
 │     └─ Running.tsx         ← GPSMap 통합된 러닝 화면
 └─ App.tsx
```

---

## 🎯 각 파일의 역할

### 1. **leafletFix.ts** - Leaflet 아이콘 문제 해결
- React + Leaflet에서 기본 마커 아이콘이 깨지는 문제 해결
- CDN 이미지 URL을 직접 지정

### 2. **LeafletMap.tsx** - 지도 렌더링 전용
- **역할**: 순수하게 지도만 표시하는 프레젠테이션 컴포넌트
- **Props**:
  - `position`: GPS 좌표 `{ lat, lng }`
  - `zoom`: 줌 레벨 (기본값: 16)
  - `height`: 지도 높이 (기본값: 500px)
- **특징**:
  - 상태 관리 X (상태비수 컴포넌트)
  - GPS 데이터 수신만 담당

### 3. **GPSMap.tsx** - GPS + 지도 통합 (핵심)
- **역할**: GPS 실시간 추적 + 지도 렌더링
- **Props**:
  - `height`: 지도 높이
  - `zoom`: 줌 레벨
  - `onPositionChange`: 위치 변경 콜백 (Running에서 거리 계산용)
- **기능**:
  - `navigator.geolocation.watchPosition()` 사용
  - 실시간 GPS 위치 추적
  - 위치 변경 시 부모 컴포넌트에 콜백
  - 에러/로딩 상태 관리


### 5. **Running.tsx** - 러닝 화면
- **수정 사항**:
  - `GPSMap` 컴포넌트 추가
  - `handlePositionChange()` 콜백 추가
  - **Haversine 공식**으로 두 GPS 좌표 간 거리 계산
  - GPS 노이즈 필터링 (100m 이상만 인정)

---

## 🔄 데이터 흐름

```
GPSMap (GPS 추적)
    ↓
handlePositionChange() 콜백 (Running 컴포넌트)
    ↓
Haversine 공식으로 거리 계산
    ↓
distance 상태 업데이트
    ↓
화면에 거리/시간/페이스 표시
```

---

## 🛠️ 사용 방법

### Running 컴포넌트에서 사용

```tsx
import { GPSMap } from '../map/GPSMap';

export function Running({ ... }) {
  const [distance, setDistance] = useState(0);

  // GPS 위치 변경 시 거리 계산
  const handlePositionChange = (position) => {
    // 거리 계산 로직
  };

  return (
    <div>
      <GPSMap
        height="100%"
        zoom={18}
        onPositionChange={handlePositionChange}
      />
    </div>
  );
}
```

---

## 🎨 나중에 Kakao Map으로 변경하기

### 단계별 방법

**1단계: 패키지 설치**
```bash
npm install react-kakao-maps-sdk
```

**2단계: index.html에 API 추가**
```html
<head>
  <script
    type="text/javascript"
    src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=YOUR_KAKAO_APP_KEY"
  ></script>
</head>
```

**3단계: KakaoMap.tsx 구현**
- 파일에 포함된 템플릿 코드 참고
- LeafletMap과 동일한 Props 인터페이스 사용

**4단계: GPSMap.tsx 수정**
```tsx
// 변경 전:
import LeafletMap from './LeafletMap';

// 변경 후:
import KakaoMap from './KakaoMap';
```

**5단계: GPSMap에서 컴포넌트 변경**
```tsx
// 변경 전:
<LeafletMap position={position} zoom={zoom} height={height} />

// 변경 후:
<KakaoMap position={position} zoom={zoom} height={height} />
```

---

## 📦 의존성

현재 설치된 패키지:

```json
{
  "leaflet": "^1.9.4",
  "react-leaflet": "^4.2.1"
}
```

### Kakao Map 추가 시:
```bash
npm install react-kakao-maps-sdk
```

---

## ⚠️ 주의사항

1. **GPS 권한**: 브라우저가 위치 권한을 요청함 → 사용자가 허용해야 함
2. **HTTPS 필요**: 실제 기기에서는 HTTPS가 필요 (로컬 localhost는 제외)
3. **배터리 사용**: `enableHighAccuracy: true` 설정으로 배터리 많이 사용
4. **GPS 노이즈**: Haversine 공식에 100m 필터링 추가됨
5. **지도 높이**: `height` prop으로 동적 조정 가능

---

## 🐛 디버깅 팁

### GPS가 작동하지 않을 때:

1. **브라우저 설정 확인**
   - Chrome: 설정 → 개인정보 보호 및 보안 → 위치 → 허용

2. **HTTPS 확인**
   - 로컬 개발: localhost는 HTTP도 OK
   - 배포: 반드시 HTTPS 필요

3. **콘솔 확인**
   - 에러 메시지 확인
   - `navigator.geolocation` 지원 여부 확인

### 지도가 표시되지 않을 때:

1. **Leaflet CSS 확인**
   - LeafletMap.tsx에서 `import 'leaflet/dist/leaflet.css'` 포함 확인

2. **높이 설정 확인**
   - `height` prop이 제대로 전달되었는지 확인
   - 부모 컴포넌트 높이 설정 확인

3. **마커 아이콘 확인**
   - leafletFix.ts가 정상 import되었는지 확인
   - 콘솔에서 마커 에러 확인

---

## 📚 참고 자료

- [Leaflet 공식 문서](https://leafletjs.com/)
- [React Leaflet 문서](https://react-leaflet.js.org/)
- [Kakao Map API 문서](https://developers.kakao.com/docs/latest/ko/maps/common)
- [Haversine 공식 설명](https://en.wikipedia.org/wiki/Haversine_formula)

---

## ✅ 체크리스트

- [x] Leaflet + React Leaflet 설치
- [x] leafletFix.ts 생성 (아이콘 깨짐 해결)
- [x] LeafletMap.tsx 생성 (지도 렌더링)
- [x] GPSMap.tsx 생성 (GPS 추적)
- [x] Running.tsx에 GPSMap 통합
- [x] Haversine 공식으로 거리 계산 추가
- [x] KakaoMap.tsx 템플릿 생성 (나중에 구현할 때 참고)
- [ ] Kakao Map 구현 (필요할 때)

---

마지막 수정: 2025-11-14
