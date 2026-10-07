import HomeHaki from './HomeHaki';
import HomeCta from './HomeCta';

export default function HomePage() {
  return (
    <main className="haki-stage" aria-label="覇気.com">
      <div className="aura aura-one" />
      <div className="aura aura-two" />
      <HomeHaki />
      {process.env.NODE_ENV !== 'production' && <HomeCta />}
    </main>
  );
}
