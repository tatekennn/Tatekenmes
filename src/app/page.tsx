import { JibunOsApp } from '@/components/jibun-os-app';

export const metadata = {
  title: '自分OS',
  description: '打刻、有料列車、ランチ、趣味をまとめて管理する自分用OS。',
};

export default function HomePage() {
  return <JibunOsApp view="home" />;
}
