import { SectionCard } from '@/components/section-card';
import { SiteShell } from '@/components/site-shell';
import { siteData } from '@/content/site-data';

export const metadata = {
  title: '世界観 | 天霧 澪',
};

export default function WorldPage() {
  const assets = siteData.generatedAssets;
  const rules = [
    {
      title: '違和感は説明しすぎない',
      body: '私が書き留めるのは、誰にでも怪異だと断言できるものではなくて、見過ごせる程度の小さな綻びだけです。',
    },
    {
      title: '昼は現実の重さを優先する',
      body: '会議や申請や備品や通勤みたいな、ちゃんと現実の側にあるものを先に見ています。違和感は、その端ににじむくらいで十分だと思っています。',
    },
    {
      title: '観測は救済ではなく記録',
      body: '何かを退治したり解決したりするためではなくて、言葉にして忘れないために書いています。',
    },
  ];
  const glossary = [
    { term: 'ゆがみ', definition: '鏡やガラス、路面、空気の端に現れる説明のつかない小さな乱れ。' },
    { term: '観測', definition: '見えたものを大げさにせず、その温度のまま記録に置くこと。' },
    { term: '夜の余白', definition: '退勤後、街の輪郭が少し緩んだ時にだけ見える静かな異質さ。' },
  ];

  return (
    <SiteShell>
      <section className="hero-card compact-hero diary-hero world-hero">
        <div className="diary-hero__copy">
          <p className="eyebrow">世界観</p>
          <h1>観測メモ</h1>
          <p className="hero-summary">私がふだん見ている違和感や、そのまわりの小さなルールを、ここにまとめています。</p>
        </div>
        <img className="diary-hero__image" src={assets.diaryDecor.src} alt={assets.diaryDecor.alt} />
      </section>

      <section className="content-grid two-up">
        <SectionCard title="観測の規則" eyebrow="境界線">
          <div className="stack-list compact">
            {rules.map((rule) => (
              <article key={rule.title} className="stack-item">
                <h3>{rule.title}</h3>
                <p>{rule.body}</p>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="用語" eyebrow="参照">
          <div className="stack-list compact">
            {glossary.map((item) => (
              <article key={item.term} className="stack-item">
                <h3>{item.term}</h3>
                <p>{item.definition}</p>
              </article>
            ))}
          </div>
        </SectionCard>
      </section>
    </SiteShell>
  );
}
