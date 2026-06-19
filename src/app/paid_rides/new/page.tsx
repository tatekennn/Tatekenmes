import { JibunOsApp } from '@/components/jibun-os-app';

export const metadata = {
  title: '有料列車を記録 - 自分OS',
};

export default function NewPaidRidePage() {
  return <JibunOsApp view="rideForm" />;
}
