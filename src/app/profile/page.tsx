import { SectionCard } from '@/components/section-card';
import { SiteShell } from '@/components/site-shell';
import { siteData } from '@/content/site-data';

export const metadata = {
  title: 'プロフィール | 天霧 澪',
};

export default function ProfilePage() {
  const profile = siteData.profile;
  const assets = siteData.generatedAssets;
  const facts = [
    { label: '名前', value: `${profile.name}（${profile.ruby}）` },
    { label: '年齢', value: `${profile.age}歳` },
    { label: '仕事', value: profile.job },
    { label: '居住圏', value: `${profile.location} / 一人暮らし` },
    { label: '現実と異界', value: `${profile.worldRatio.reality} : ${profile.worldRatio.occult}` },
  ];
  const traits = ['静か', '観察的', '少し詩的', '感情を大きく出さない', '仕事は丁寧'];
  const timeline = [
    { title: '平日の昼', body: '平日は都内のIT企業で、総務や業務管理に近い事務仕事をしています。会議室や備品や申請や、細かな数字がちゃんと流れるように見ていることが多いです。' },
    { title: '退勤後', body: 'まっすぐ帰る日もあります。でも、駅前やガラス越しの街に違和感が残る夜は、少しだけ足を止めて見ています。' },
    { title: '記録する理由', body: '大きな事件のためではなくて、見過ごして消えていく小さなほつれを、忘れないうちに言葉へ置いておきたいからです。' },
  ];

  return (
    <SiteShell>
      <section className="hero-card compact-hero profile-hero">
        <div className="profile-hero__copy">
          <p className="eyebrow">プロフィール</p>
          <h1>{profile.name}</h1>
          <p className="hero-summary">{profile.bio[1]}</p>
        </div>
        <img className="profile-hero__icon" src={assets.profileIcon.src} alt={assets.profileIcon.alt} />
      </section>

      <section className="content-grid two-up profile-stage">
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

        <section className="section-card profile-figure-card" aria-label="天霧澪の立ち絵">
          <p className="eyebrow">Visual</p>
          <img className="profile-figure-card__image" src={assets.profileFull.src} alt={assets.profileFull.alt} />
        </section>
      </section>

      <section className="content-grid two-up">
        <SectionCard title="気質" eyebrow="ふるまい">
          <ul className="tag-list">
            {traits.map((trait) => (
              <li key={trait}>{trait}</li>
            ))}
          </ul>
        </SectionCard>

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
      </section>
    </SiteShell>
  );
}
