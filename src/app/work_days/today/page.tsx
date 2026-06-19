import { JibunOsApp } from '@/components/jibun-os-app';

export const metadata = {
  title: '今日の打刻 - 自分OS',
};

export default function WorkTodayPage() {
  return <JibunOsApp view="work" />;
}
