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
    title: '天霧 澪 オフィシャルサイト',
    description:
      '仕事のことや、帰り道で気になったことを、無理のない言葉で残しているサイトです。',
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
    job: '都内IT企業の総務・業務管理寄り事務職',
    location: '東京',
    tone: 'calm, practical, observant, modern Tokyo office-worker',
    concept: 'daytime office worker keeping small notes about work, routines, and things noticed on the way home',
    worldRatio: {
      reality: 90,
      occult: 10,
    },
    bio: [
      '普段は、都内の会社で総務や業務管理に近い事務仕事をしています。会議室の手配や備品の確認、数字の抜け漏れの確認みたいな、表に出にくい仕事が多いです。',
      '仕事が終わったあとは、まっすぐ帰る日もあれば、駅前やオフィス街の空気が少し気になって、そのまま覚えておく日もあります。大げさな話ではないけれど、あとで書いておきたくなることがあります。',
      'このサイトには、そういう日々のことや、配信で話したことを少しずつ残しています。気負わず見てもらえたらうれしいです。',
    ],
  },
  featuredQuote: '仕事のあとに気になったことを、忘れないうちに書いておきたいだけです。',
  quickFacts: [
    {
      label: '呼び名',
      value: '澪 / Mio',
    },
    {
      label: '平日の顔',
      value: '都内オフィスで裏方の仕事をしている人',
    },
    {
      label: '帰り道に気になるもの',
      value: '駅前の空気、雨上がりの道、少し遅い時間の売り場',
    },
    {
      label: '好きなもの',
      value: '温かい飲み物、静かな店内、落ち着いた服',
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
      description: '日付ごとの記録一覧。',
    },
    {
      label: 'プロフィール',
      href: '/profile',
      description: '私の仕事や暮らしについて。',
    },
  ],
  tagDescriptions: [
    {
      tag: '仕事',
      description: '会議、書類、調整業務など、日中のオフィスワークに関する記録。',
    },
    {
      tag: '通勤',
      description: '電車、駅、ホーム、帰路の空気など移動中の断片。',
    },
    {
      tag: '雨',
      description: '天気や湿度で気分や帰り道の印象が変わる日の記録。',
    },
    {
      tag: '夜',
      description: '退勤後や少し遅い時間の出来事。',
    },
    {
      tag: '観測',
      description: 'あとで気になりそうだと思って、簡単に書き留めたもの。',
    },
    {
      tag: '生活',
      description: 'コンビニ、部屋、食事など、日常の手触りに寄った断片。',
    },
  ],
  socialLinks: [
    {
      label: 'X',
      href: 'https://x.com/amagiri_mio',
      icon: '𝕏',
      note: '短い近況やひとこと',
      external: true,
    },
    {
      label: 'YouTube',
      href: 'https://www.youtube.com/@amagirimio',
      icon: '▶',
      note: '配信とアーカイブ',
      external: true,
    },
  ],
};

export default siteData;
