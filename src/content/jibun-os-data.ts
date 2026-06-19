export type WorkState = {
  checkIn: boolean;
  checkOut: boolean;
};

export type PaidRide = {
  date: string;
  line: string;
  direction: string;
  reason: string;
  fare: number;
  fatigue: number;
};

export type LunchLog = {
  date: string;
  shop: string;
  area: string;
  price: number;
  rating: number;
  tags: string[];
};

export type HobbyItem = {
  title: string;
  type: '予定' | 'メモ';
  date?: string;
  category: string;
  status: string;
  rating?: number;
};

export const workState: WorkState = {
  checkIn: true,
  checkOut: true,
};

export const paidRides: PaidRide[] = [
  { date: '6/18', line: 'JR 湘南新宿ライン', direction: '渋谷方面', reason: '疲労回避', fare: 420, fatigue: 4 },
  { date: '6/17', line: '東急ライナー', direction: '帰宅', reason: '雨', fare: 500, fatigue: 3 },
  { date: '6/15', line: '小田急ロマンスカー', direction: '移動', reason: '時間優先', fare: 720, fatigue: 5 },
];

export const lunchLogs: LunchLog[] = [
  { date: '6/18', shop: '兆楽', area: '渋谷', price: 900, rating: 4, tags: ['一人OK', 'また行く'] },
  { date: '6/17', shop: '渋谷食堂', area: '道玄坂', price: 980, rating: 4, tags: ['1000円以下'] },
  { date: '6/14', shop: 'スパイス軒', area: '桜丘', price: 1200, rating: 5, tags: ['混雑少なめ'] },
];

export const hobbyItems: HobbyItem[] = [
  { title: 'ライブ', type: '予定', date: '6/22', category: '音楽', status: 'planned', rating: 5 },
  { title: '読みたい技術記事', type: 'メモ', category: '技術', status: 'archived' },
  { title: 'DJセット候補', type: 'メモ', category: '音楽', status: 'planned', rating: 4 },
];

export function yen(value: number) {
  return `${value.toLocaleString('ja-JP')}円`;
}

export function stars(value?: number) {
  return '★'.repeat(value ?? 0);
}

export const monthFare = paidRides.reduce((sum, ride) => sum + ride.fare, 0);
