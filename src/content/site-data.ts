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
    title: '天霧 澪 — Juice=Juice 日報',
    description:
      '最近Juice=Juiceにハマった天霧澪の日記サイト。「プラトニック・プラネット」から入って、他の曲も聴き始めています。',
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
      alt: '日記ページ用のヘッダー画像。窓辺の机で静かに過ごす天霧澪。',
      title: 'Diary header',
      note: '日記一覧・導入セクション向け。',
    },
    diaryDecor: {
      src: '/generated/mio-diary-decor.png',
      alt: 'ノートや文具をあしらった装飾背景。',
      title: 'Diary decor',
      note: '背景や区切り装飾に使うビジュアル。',
    },
  },
  profile: {
    name: '天霧 澪',
    ruby: 'あまぎり みお',
    age: 26,
    job: 'Juice=Juiceに最近ハマった日記VTuber',
    location: '東京',
    tone: 'calm, curious, still discovering',
    concept: '最近Juice=JuiceにハマったばかりのVTuber。「プラトニック・プラネット」から入って、他の曲も少しずつ聴いています。その発見の過程を日記に書いています。',
    worldRatio: {
      reality: 95,
      occult: 5,
    },
    bio: [
      '天霧澪です。最近Juice=Juiceにハマりました。きっかけは「プラトニック・プラネット」。この曲に惹かれて、他の曲も聴き始めています。',
      'まだライブには行ったことがなくて、まずは曲とMVを知るところから始めています。知らない曲に出会うたびに「なんで今まで聴かなかったんだろう」と思います。',
      'Juice=Juiceのことをもっと知りたい。そう思って始めた日記です。同じ気持ちの人と、少しでも共有できたらうれしいです。',
    ],
  },
  featuredQuote: 'プラトニック・プラネットに惹かれて、ここから先に進んでいる。',
  quickFacts: [
    {
      label: '呼び名',
      value: '澪 / Mio',
    },
    {
      label: '活動',
      value: 'Juice=Juice日記 / X',
    },
    {
      label: 'きっかけの曲',
      value: 'プラトニック・プラネット',
    },
    {
      label: '現在',
      value: '他の曲を少しずつ聴いている段階',
    },
  ],
  navigation: [
    {
      label: 'ホーム',
      href: '/',
      description: 'このサイトの入口と最新の更新。',
    },
    {
      label: '日記',
      href: '/diary',
      description: 'Juice=Juiceに関する日記の一覧。',
    },
    {
      label: 'プロフィール',
      href: '/profile',
      description: '私のことをもう少し知りたい人向け。',
    },
  ],
  tagDescriptions: [
    {
      tag: '楽曲',
      description: '曲への思い、歌詞の解釈、初めて聴いたときの記憶。',
    },
    {
      tag: 'MV',
      description: 'MVの発見、映像の细节、初めて見たときの印象。',
    },
    {
      tag: 'ニュース',
      description: '新曲告知、イベント、メディア出演などの情報。',
    },
    {
      tag: '日常',
      description: 'Juice=Juiceと暮らす日常の断片。',
    },
    {
      tag: '発見',
      description: '知らない曲に出会ったときの記録。',
    },
    {
      tag: 'グッズ',
      description: '手に入れたグッズ、欲しいもの、思い出。',
    },
    {
      tag: 'メンバー',
      description: 'メンバーのパフォーマンス、衣装、気になるところ。',
    },
  ],
  socialLinks: [
    {
      label: 'X',
      href: 'https://x.com/amagiri_mio',
      icon: '𝕏',
      note: 'Juice=Juice日報',
      external: true,
    },
  ],
};

export default siteData;
