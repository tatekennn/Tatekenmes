import { SectionCard } from '@/components/section-card';
import { SiteShell } from '@/components/site-shell';
import { siteData } from '@/content/site-data';

export const metadata = {
  title: 'プロフィール | 天霧 澪',
};

export default function ProfilePage() {
  const profile = siteData.profile;
  const facts = [
    { label: '名前', value: `${profile.name}（${profile.ruby}）` },
    { label: '年齢', value: `${profile.age}歳` },
    { label: '仕事', value: profile.job },
    { label: '居住圏', value: `${profile.location} / 一人暮らし` },
    { label: '現実と異界', value: `${profile.worldRatio.reality} : ${profile.worldRatio.occult}` },
  ];
  const traits = ['静か', '観察的', '少し詩的', '感情を大きく出さない', '仕事は丁寧'];
  const timeline = [
    { title: '平日の昼', body: '都内のIT企業で、総務・業務管理寄りの事務仕事をこなす。会議室、備品、申請、細かな数字の確認が主な領域。' },
    { title: '退勤後', body: '寄り道をせず帰る日もあるが、駅前やガラス越しの街に違和感が残る夜は、少しだけ足を止めて観測する。' },
    { title: '記録する理由', body: '大きな事件のためではなく、見過ごして消えていく小さなほつれを、言葉にして留めておくため。' },
  ];

  return (
    <SiteShell>
      <section className="hero-card compact-hero">
        <p className="eyebrow">プロフィール</p>
        <h1>{profile.name}</h1>
        <p className="hero-summary">{profile.bio[1]}</p>
      </section>

      <section className="content-grid two-up">
        <SectionCard title="基本情報" eyebrow="略歴">
          <dl className="detail-list">
            {facts.map((fact) => (
              <div key={fact.label} className="detail-row">
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
        </SectionCard>

        <SectionCard title="気質" eyebrow="ふるまい">
          <ul className="tag-list">
            {traits.map((trait) => (
              <li key={trait}>{trait}</li>
            ))}
          </ul>
        </SectionCard>
      </section>

      <SectionCard title="輪郭" eyebrow="背景">
        <div className="stack-list">
          {timeline.map((item) => (
            <article key={item.title} className="stack-item">
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </SectionCard>
    </SiteShell>
  );
}
