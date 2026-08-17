// 非秘密の設定値（秘密はすべて環境変数）。
export const BASE_ZONE_ASCII = 'xn--7qwx14d.com'; // 覇気.com
export const SUFFIX = 'の'; // <name>の.覇気.com
export const MUU_DOMAIN_ID = 'MU17941622';
// 本番APIのベースURL（acme.sh 公式 muumuu 連携と同一。api.muumuu-domain.com は WAF で 403 になる）
export const MUU_API_BASE = process.env.MUU_API_BASE ?? 'https://muumuu-domain.com/api/v2';

export const VERCEL_PROJECT_ID = 'prj_mZV8UcEzozEL3gAQqjm8UZK3t6D7';
export const VERCEL_TEAM_ID = 'team_ntiQk3x8KYG4oV5U7ealWvzl';
export const VERCEL_A_IP = '76.76.21.21'; // Vercel を指す A レコード

// サブドメイン提供（新規作成）の受付を一時停止するフラグ。
// true にすると /apply のフォーム・トップの誘導・/api/create をまとめて停止する。
// 既存サブドメインの表示・middleware・generated は影響を受けない。
export const PROVISIONING_ENABLED = false;

// コスト・暴走対策のハード上限（生成できるサブドメイン総数）
export const MAX_SUBDOMAINS = 30;
export const MAX_NAME_LEN = 20;

// 乗っ取り・混乱防止のため使わせない名前
export const RESERVED = new Set([
  'www', 'api', 'mail', 'admin', 'root', 'ftp', 'ns', 'ns1', 'ns2', 'smtp', 'pop', 'imap',
  'dev', 'staging', 'stg', 'app', 'vercel', 'test', 'null', 'undefined',
  'たてけん', 'たてけんの',
  // LT デモ用に予約（分譲フォームからは作らせない）
  'shop', 'evil', 'alice', 'bob',
]);

// LT デモ用サブドメイン（「の」を付けない固定ラベル）。
// site/origin の非対称を、実際に生きた別サブドメインとして体験させる。
// 分譲フォーム経由では作れず、レコードは運用側が手動で用意する。
export const DEMO_HOSTS: Record<string, string> = {
  shop: '/demo/shop', // 本物っぽい店（セッションを持つ被害者）
  evil: '/demo/evil', // 悪意あるテナント（Cookie tossing を仕掛ける）
  alice: '/demo/alice', // origin/site 非対称の実験台 A
  bob: '/demo/bob', // origin/site 非対称の実験台 B
};
