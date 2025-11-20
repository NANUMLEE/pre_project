import L from 'leaflet';

// Leaflet 기본 아이콘이 React에서 깨지는 문제를 해결하는 코드
// bundler가 이미지를 제대로 해석하지 못해서 발생하는 문제
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default L;
