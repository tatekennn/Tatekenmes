export const metadata = {
  title: 'たてけん | 覇気.com',
  description: '覇気を、たてけんの名のもとに。',
  alternates: {
    canonical: 'https://xn--08j1av7a2n.xn--7qwx14d.com',
  },
  openGraph: {
    title: 'たてけん | 覇気.com',
    description: '覇気を、たてけんの名のもとに。',
    url: 'https://xn--08j1av7a2n.xn--7qwx14d.com',
    siteName: '覇気.com',
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'たてけん | 覇気.com',
    description: '覇気を、たてけんの名のもとに。',
  },
};

export default function TatekenPage() {
  return (
    <main className="haki-stage" aria-label="たてけん | 覇気.com">
      <div className="aura aura-one" />
      <div className="aura aura-two" />
      <h1 className="haki haki--name" aria-label="たてけん">
        たてけん
      </h1>
    </main>
  );
}
