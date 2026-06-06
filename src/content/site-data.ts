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
      'Juice=Juiceを静かに追い続けている天霧澪のオフィシャルサイト。日記とメモをまとめています。',
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
      src: '/generated/mio-profile-full.png',
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
    job: 'Juice=Juice を追い続ける日記VTuber',
    location: '東京',
    tone: 'calm, soft-spoken, but passionate about Juice=Juice',
    concept: 'Juice=Juice専門の日記を書くVTuber。最新ニュースから歴史の深掘りまで、毎日Juice=Juiceについて記録している。',
    worldRatio: {
      reality: 90,
      occult: 10,
    },
    bio: [
      '天霧澪です。Juice=Juiceのことが好きで、日々の出来事や思い出を日記にまとめています。',
      '最新のニュースも、昔のライブの記憶も、曲への思いも、全部ここに置いていきます。',
      'Juice=Juiceのことが好きな人と、ちょっと気になった人のために書いているので、ゆっくり見てください。',
    ],
  },
  featuredQuote: 'Juice=Juiceのこと、ちゃんと残しておきたい。',
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
      label: '推し',
      value: 'Juice=Juice',
    },
    {
      label: '好きなもの',
      value: 'Juice=Juice、ライブ映像、グッズ整理',
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
      tag: 'ライブ',
      description: 'ライブに行った記録や、セットリストへの感想。',
    },
    {
      tag: '楽曲',
      description: '曲への思い、歌詞の解釈、リピート記録。',
    },
    {
      tag: 'メンバー',
      description: 'メンバーのパフォーマンス、衣装、変化へのメモ。',
    },
    {
      tag: 'MV',
      description: 'MVの発見、映像の细节、衣装の話。',
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
      tag: '歴史',
      description: '過去の名場面、結成から現在までの流れ。',
    },
    {
      tag: 'グッズ',
      description: '手に入れたグッズ、保管方法、思い出。',
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
