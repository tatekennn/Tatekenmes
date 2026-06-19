import { JibunOsApp } from '@/components/jibun-os-app';

export const metadata = {
  title: 'ランチを記録 - 自分OS',
};

export default function NewLunchLogPage() {
  return <JibunOsApp view="lunchForm" />;
}
