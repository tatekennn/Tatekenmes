export type NavigationItem = {
  label: string;
  href: string;
  description: string;
};

export type QuickFact = {
  label: string;
  value: string;
};

export type WorldFragment = {
  title: string;
  text: string;
};

export type TagDescription = {
  tag: string;
  description: string;
};

export type SiteData = {
  metadata: {
    title: string;
    description: string;
    locale: string;
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
  worldFragments: WorldFragment[];
  navigation: NavigationItem[];
  tagDescriptions: TagDescription[];
};

export const siteData: SiteData = {
  metadata: {
    title: "天霧 澪の観測記録",
    description:
      "都内で働く天霧 澪が、昼の事務仕事と夜のささやかな違和感を静かに綴る個人サイト。",
    locale: "ja-JP",
  },
  profile: {
    name: "天霧 澪",
    ruby: "あまぎり みお",
    age: 26,
    job: "都内IT企業の総務・業務管理寄り事務職",
    location: "東京",
    tone: "quiet, observant, slightly poetic, modern Tokyo office-worker",
    concept: "daytime office worker, nighttime observer of subtle distortions in the city",
    worldRatio: {
      reality: 90,
      occult: 10,
    },
    bio: [
      "私の仕事は、会議室の予約を整えたり、備品の残数を見たり、数字の抜けを静かに埋めたりすることが多い。目立たないけれど、何も滞らせないための位置にいる。",
      "退勤後は寄り道をせず帰る日もあれば、駅前の明かりやビルのガラスに映る街の癖を少しだけ観察する日もある。誰にも説明しにくい小さな違和感は、たいてい翌朝には薄くなる。",
      "大げさな出来事は求めていない。ただ、東京の夜がたまに見せる余白を、忘れないうちに言葉へ置き換えておきたいと思っている。",
    ],
  },
  featuredQuote:
    "昼の書類はきれいに揃うのに、夜の街だけは、ときどき端が合わない。",
  quickFacts: [
    {
      label: "一人称",
      value: "私",
    },
    {
      label: "勤務時間帯",
      value: "平日日中、都内オフィス勤務",
    },
    {
      label: "観測の起点",
      value: "電車、ガラス、雨上がりの路面、無人の廊下",
    },
    {
      label: "生活圏",
      value: "オフィス、駅、コンビニ、ワンルームの部屋",
    },
  ],
  worldFragments: [
    {
      title: "窓面の遅れ",
      text: "ビルのガラスに映る人影が、たまに半歩だけ遅れて動くことがある。見間違いで済ませられる程度の差だから、たぶん誰も立ち止まらない。",
    },
    {
      title: "終電前の静けさ",
      text: "駅のホームが少し空く時間帯になると、アナウンスの切れ目にだけ妙に深い静けさが落ちる。その沈黙は、都内にしては整いすぎている。",
    },
    {
      title: "雨粒の癖",
      text: "雨の日の窓には街の輪郭が溶ける。けれど、ごくまれに、流れ落ちるはずの雫が同じ位置で踏みとどまる夜がある。",
    },
  ],
  navigation: [
    {
      label: "ホーム",
      href: "/",
      description: "サイトの導入と最新の観測記録。",
    },
    {
      label: "日記",
      href: "/diary",
      description: "日付ごとの短い記録一覧。",
    },
    {
      label: "プロフィール",
      href: "/profile",
      description: "天霧 澪の基本情報と暮らしの輪郭。",
    },
    {
      label: "世界観",
      href: "/world",
      description: "現実に混じる小さな違和感の断片。",
    },
  ],
  tagDescriptions: [
    {
      tag: "仕事",
      description: "会議、書類、調整業務など、日中のオフィスワークに関する記録。",
    },
    {
      tag: "通勤",
      description: "電車、駅、ホーム、帰路の空気など移動中の断片。",
    },
    {
      tag: "雨",
      description: "天気や湿度が景色の印象を変える日の観測。",
    },
    {
      tag: "夜",
      description: "退勤後や深夜、街の表情が少し緩む時間帯の記録。",
    },
    {
      tag: "観測",
      description: "説明しきれない違和感を、見たままの温度で書き留めたもの。",
    },
    {
      tag: "生活",
      description: "コンビニ、部屋、食事など、日常の手触りに寄った断片。",
    },
  ],
};

export default siteData;
