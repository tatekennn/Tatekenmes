import { headers } from 'next/headers';
import HakiActionGame from '@/components/HakiActionGame';

export default async function HomePage() {
  const headerList = await headers();
  const host = headerList.get('host') ?? '';
  const isGameHost = host.startsWith('game.xn--7qwx14d.com') || host.startsWith('game.覇気.com');

  if (isGameHost) {
    return <HakiActionGame />;
  }

  return (
    <main className="haki-stage" aria-label="覇気.com">
      <div className="aura aura-one" />
      <div className="aura aura-two" />
      <p className="domain">覇気.com</p>
      <h1 className="haki" aria-label="覇気">
        覇気
      </h1>
      <p className="tagline">coming soon</p>
    </main>
  );
}
