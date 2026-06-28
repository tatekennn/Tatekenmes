# 覇気.com

`覇気.com` 用の最小ランディングページと、`game.覇気.com` / `/game` で遊べるブラウザゲームを含む Next.js プロジェクトです。

## ゲーム: 覇気解放

**覇気解放** は、覇気そのものをテーマにした横画面ブラウザゲームです。

> 長押しで覇気を溜め、金色の間で離す。それだけです。

### 現在の方針

直近のユーザー意見を最優先しています。

- 覇気と直接関係するテーマにする
- 横画面で遊ぶ
- 操作を増やさない
- 操作は **長押し → 離す** の一種類だけ
- 敵を避ける・斬る・反射する等の複数アクションは使わない
- 迫る相手を「覇気の圧」で止めるゲームにする

### 概要

- 30秒制
- 迫る相手が赤い危険線に入る前に覇気を解放する
- 長押しで覇気ゲージが上昇
- 金色ゾーンで離すと高得点
- 弱すぎると届かない
- 強すぎると少し減点
- あだ名登録、localStorageランキング、SNS共有対応

### 操作方法

- 画面を長押し: 覇気を溜める
- 指/マウスを離す: 覇気を解放する

## 技術構成

- Next.js 15 App Router
- TypeScript
- Canvas
- 依存追加なし

## 現在の構成

```text
src/app/
  page.tsx          # トップページ / gameサブドメイン判定
  game/page.tsx     # 覇気解放 metadata / page
  globals.css       # 覇気.com の全面ビジュアル / ゲームUI
  layout.tsx        # metadata / viewport
  manifest.ts       # PWA manifest
  icon.tsx          # 512px icon
  apple-icon.tsx    # 180px icon
  not-found.tsx     # 404
src/components/
  HakiGame.tsx      # 覇気解放ゲーム本体
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
git commit -m "feat: simplify haki game into pressure release"
git push origin main
```

Vercel 側で GitHubリポジトリと `main` ブランチが接続されていれば、自動で本番反映されます。

## Domain setup TODO

`覇気.com` / `game.覇気.com` を本番URLにするには、DNS側とVercel側の両方が必要です。

### 1. Vercel側

Vercel Project Settings → Domains に以下を追加します。

- `xn--7qwx14d.com`（= 覇気.com）
- `game.xn--7qwx14d.com`
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
curl -L https://game.xn--7qwx14d.com | grep '覇気解放'
```
