import { SectionCard } from '@/components/section-card';
import { SiteShell } from '@/components/site-shell';

export const metadata = {
  title: '世界観 | 天霧 澪',
};

export default function WorldPage() {
  const rules = [
    {
      title: '違和感は説明しすぎない',
      body: '澪が書き留めるのは、誰にでも怪異だと断言できるものではなく、見過ごせる程度の小さな綻びだけ。',
    },
    {
      title: '昼は現実の重さを優先する',
      body: '会議、申請、備品、通勤。日記の中心は社会人の生活であり、異界はその端ににじむ程度で留まる。',
    },
    {
      title: '観測は救済ではなく記録',
      body: '何かを退治したり解決したりするのではなく、言葉にして忘れないための行為として扱われる。',
    },
  ];
  const glossary = [
    { term: 'ゆがみ', definition: '鏡やガラス、路面、空気の端に現れる説明のつかない小さな乱れ。' },
    { term: '観測', definition: '見えたものを大げさにせず、その温度のまま記録に置くこと。' },
    { term: '夜の余白', definition: '退勤後、街の輪郭が少し緩んだ時にだけ見える静かな異質さ。' },
  ];

  return (
    <SiteShell>
      <section className="hero-card compact-hero">
        <p className="eyebrow">世界観</p>
        <h1>観測メモ</h1>
        <p className="hero-summary">この日記を取り巻く、境界線の薄い世界のための小さなメモ。</p>
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
