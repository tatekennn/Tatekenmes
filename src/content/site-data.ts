export type NavigationItem = {
  label: string;
  href: string;
  description: string;
};

export type QuickFact = {
  label: string;
  value: string;
};

export type TagDescription = {
  tag: string;
  description: string;
};

export type VisualAsset = {
  src: string;
  alt: string;
  title: string;
  note: string;
};

export type SocialLink = {
  label: string;
  href: string;
  icon: string;
  note: string;
  external?: boolean;
};

export type SiteData = {
  metadata: {
    title: string;
    description: string;
    locale: string;
  };
  generatedAssets: {
    heroMain: VisualAsset;
    profileFull: VisualAsset;
    profileIcon: VisualAsset;
    diaryHeader: VisualAsset;
    diaryDecor: VisualAsset;
  };
  profile: {
    name: string;
    ruby: string;
    age: number;
    job: string;
    location: string;
    tone: string;
    concept: string;
    worldRatio: {
      reality: number;
      occult: number;
    };
    bio: string[];
  };
  featuredQuote: string;
  quickFacts: QuickFact[];
  navigation: NavigationItem[];
  tagDescriptions: TagDescription[];
  socialLinks: SocialLink[];
};

export const siteData: SiteData = {
  metadata: {
    title: '天霧 澪 — Juice=Juice案内ノート',
    description:
      'Juice=Juiceの魅力をもっと多くの人に届けるために、公式情報・メンバー・楽曲の入口を調べてまとめる天霧澪の案内ノート。',
    locale: 'ja-JP',
  },
  generatedAssets: {
    heroMain: {
      src: '/generated/mio-hero-home-20260606.png',
      alt: '天霧澪のホーム用トップビジュアル。夜のオフィスを背景に、右側に立つ紫髪の女性。',
      title: 'Hero visual',
      note: 'トップページのホームヒーロー用ビジュアル。',
    },
    profileFull: {
      src: '/generated/mio-profile-full-cutout.png',
      alt: '天霧澪の全身立ち絵。紫髪と落ち着いた表情、オフィスワーカーを思わせる衣装。',
      title: 'Profile full',
      note: 'プロフィール詳細ページ用の立ち絵。',
    },
    profileIcon: {
      src: '/generated/mio-profile-icon.png',
      alt: '天霧澪のプロフィールアイコン。肩上のポートレート。',
      title: 'Profile icon',
      note: 'アイコンや小さな紹介枠向け。',
    },
    diaryHeader: {
      src: '/generated/mio-diary-header.png',
      alt: '調査メモページ用のヘッダー画像。窓辺の机で資料を整理する天霧澪。',
      title: 'Research note header',
      note: '調査メモ一覧・導入セクション向け。',
    },
    diaryDecor: {
      src: '/generated/mio-diary-decor.png',
      alt: 'ノートや文具をあしらった装飾背景。',
      title: 'Research note decor',
      note: '背景や区切り装飾に使うビジュアル。',
    },
  },
  profile: {
    name: '天霧 澪',
    ruby: 'あまぎり みお',
    age: 26,
    job: 'Juice=Juiceの魅力を届けるリサーチナビゲーター',
    location: '東京',
    tone: 'calm, researched, welcoming, lightly human',
    concept: 'Juice=Juiceの魅力をもっと多くの人に届けるために、公式情報・メンバー・楽曲・ニュースを調べ、初めて見る人にも入りやすい言葉に整えて発信する存在。Xでは短く、サイトでは少し詳しくまとめる。',
    worldRatio: {
      reality: 98,
      occult: 2,
    },
    bio: [
      '天霧澪です。Juice=Juiceをまだ知らない人にも届くように、公式情報やメンバーのプロフィール、楽曲の入口を調べてまとめています。',
      '大事にしているのは、ただデータを並べることではなく、「どこから見ると好きになりやすいか」を見つけること。短い投稿では要点を、ブログでは少しだけ余白のある読み物にします。',
      '情報はできるだけ公式・複数ソースで確認します。すでに好きな人には再発見を、これから見る人には最初の一歩を渡せる場所にしていきます。',
    ],
  },
  featuredQuote: '好きになる入口は、ちゃんと調べると少し見つけやすくなる。',
  quickFacts: [
    {
      label: '役割',
      value: 'Juice=Juice案内係',
    },
    {
      label: '発信',
      value: 'X短文 / 調査メモ',
    },
    {
      label: '方針',
      value: '入口を作ってファンを増やす',
    },
    {
      label: '確認',
      value: '公式情報と複数ソース重視',
    },
  ],
  navigation: [
    {
      label: 'ホーム',
      href: '/',
      description: 'このサイトの入口と最新の更新。',
    },
    {
      label: 'メモ',
      href: '/diary',
      description: 'Juice=Juiceに関する調査メモの一覧。',
    },
    {
      label: 'プロフィール',
      href: '/profile',
      description: '天霧澪の役割と発信方針。',
    },
  ],
  tagDescriptions: [
    {
      tag: 'メンバー',
      description: 'プロフィール、経歴、呼び方、覚えやすい入口。',
    },
    {
      tag: '楽曲',
      description: '曲の基本情報、聴きどころ、最初に見るポイント。',
    },
    {
      tag: 'MV',
      description: '映像の入口、衣装、場面、初見でも掴みやすい見方。',
    },
    {
      tag: 'ニュース',
      description: '新曲告知、イベント、メディア出演などの要点整理。',
    },
    {
      tag: '豆知識',
      description: '短く話せるJuice=Juiceの背景情報。',
    },
    {
      tag: '入口メモ',
      description: 'まだ詳しくない人が好きになるための入口。',
    },
  ],
  socialLinks: [
    {
      label: 'X',
      href: 'https://x.com/amagiri_mio',
      icon: '𝕏',
      note: 'Juice=Juice案内ノート',
      external: true,
    },
  ],
};

export default siteData;
