// 非秘密の設定値（秘密はすべて環境変数）。
export const BASE_ZONE_ASCII = 'xn--7qwx14d.com'; // 覇気.com
export const SUFFIX = 'の'; // <name>の.覇気.com
export const MUU_DOMAIN_ID = 'MU17941622';
export const MUU_API_BASE = process.env.MUU_API_BASE ?? 'https://api.muumuu-domain.com/api/v2';

export const VERCEL_PROJECT_ID = 'prj_mZV8UcEzozEL3gAQqjm8UZK3t6D7';
export const VERCEL_TEAM_ID = 'team_ntiQk3x8KYG4oV5U7ealWvzl';
export const VERCEL_A_IP = '76.76.21.21'; // Vercel を指す A レコード

// コスト・暴走対策のハード上限（生成できるサブドメイン総数）
export const MAX_SUBDOMAINS = 30;
export const MAX_NAME_LEN = 20;

// 乗っ取り・混乱防止のため使わせない名前
export const RESERVED = new Set([
  'www', 'api', 'mail', 'admin', 'root', 'ftp', 'ns', 'ns1', 'ns2', 'smtp', 'pop', 'imap',
  'dev', 'staging', 'stg', 'app', 'vercel', 'test', 'null', 'undefined',
  'たてけん', 'たてけんの',
]);
