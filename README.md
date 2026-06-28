# 覇気.com

`覇気.com` 用の最小ランディングページです。

- 表示内容: 大きく「覇気」、下部に `coming soon`
- ゲーム: `game.覇気.com` / `/game` で遊べる2Dアーケード「覇気ラン」
- 技術構成: Next.js 15 App Router / TypeScript
- デプロイ: GitHub `main` への push を契機に Vercel が自動デプロイ
- 現在確認済みの公開URL: <https://tatekenmes.vercel.app>
- 独自ドメイン: `覇気.com` / Punycode `xn--7qwx14d.com`

## 現在の構成

```text
src/app/
  page.tsx          # トップページ / gameサブドメイン判定
  game/page.tsx     # 覇気ラン
  globals.css       # 覇気.com の全面ビジュアル / ゲームUI
  layout.tsx        # metadata / viewport
  manifest.ts       # PWA manifest
  icon.tsx          # 512px icon
  apple-icon.tsx    # 180px icon
  not-found.tsx     # 404
src/components/
  HakiGame.tsx      # 2D覇気アーケードゲーム本体
```

旧 Juice=Juice / 天霧澪 / 自分OS 関連のページ・日記・画像・生成スクリプトは削除済みです。

## Local setup

```bash
cd /opt/data/Tatekenmes
npm install
npm run lint
npm run build
```

開発サーバー:

```bash
npm run dev
```

## Deployment

```bash
git add .
git commit -m "docs: update haki domain readme"
git push origin main
```

Vercel 側で GitHub リポジトリと `main` ブランチが接続されていれば、自動で本番反映されます。

## Domain setup TODO

`覇気.com` を本番URLにするには、DNS側とVercel側の両方が必要です。

### 1. Vercel側

Vercel Project Settings → Domains に以下を追加します。

- `xn--7qwx14d.com`（= 覇気.com）
- 必要なら `www.xn--7qwx14d.com`

### 2. ムームードメイン / DNS側

Vercel標準構成の場合:

| Host | Type | Value |
| --- | --- | --- |
| `@` | `A` | `216.198.79.1` |
| `game` | `CNAME` | `cname.vercel-dns.com` |
| `www` | `CNAME` | `cname.vercel-dns.com` |

注意:

- メール利用予定がある場合、MX / SPF / DKIM / DMARC などの既存レコードは消さないこと。
- 日本語ドメインは管理画面やCLIでは Punycode の `xn--7qwx14d.com` として扱う場面があります。
- DNS設定後、SSL/TLS発行と反映に数分〜数十分かかることがあります。

## Verification

DNS設定後に確認するコマンド:

```bash
dig xn--7qwx14d.com A +short
dig game.xn--7qwx14d.com CNAME +short
dig www.xn--7qwx14d.com CNAME +short
curl -I https://xn--7qwx14d.com
curl -L https://xn--7qwx14d.com | grep '覇気'
curl -L https://game.xn--7qwx14d.com | grep '覇気ラン'
```

期待値:

- apex `xn--7qwx14d.com` が Vercel の `216.198.79.1` へ向く
- `game` / `www` が `cname.vercel-dns.com` へ向く
- HTTPSでアクセスできる
- apex HTML内に `覇気` / `coming soon` が含まれる
- `game.xn--7qwx14d.com` または `/game` HTML内に `覇気ラン` が含まれる
