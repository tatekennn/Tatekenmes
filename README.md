# 覇気.com

`覇気.com` 用の最小ランディングページと、`game.覇気.com` / `/game` で遊べるブラウザゲームを含む Next.js プロジェクトです。

## ゲーム: 覇気二十試練

**覇気二十試練** は、インストール不要で遊べるインディー風 Canvas ゲームです。

> 二十の試練を越え、覇王門を割れ。

### 概要

- 20ステージ制
- 残機3で開始
- ステージ失敗で残機が減り、残機が残っていれば同じステージを再挑戦
- 残機0なら必ず STAGE 01 からやり直し
- STAGE 01〜03 はチュートリアル扱い
- 後半ほど難度が上がり、STAGE 18〜20 は高難度
- 敵や障害物は文字ではなく、色・形・動きで判断
- あだ名登録、localStorageランキング、SNS共有対応

### 操作方法

ステージごとに操作が変わります。画面下部に短いヒントが出ます。

- `TAP`: タップ / Space / Enter でジャンプ
- `SLASH`: ドラッグまたはスワイプで斬撃ライン
- `DODGE`: 指/マウスで左右移動
- `REFLECT`: 円が重なる瞬間にタップ
- `HOLD`: 長押しして金色ゾーンで離す
- `FINAL`: TAP / DODGE / HOLD / TIMING の複合

### ランキング

ランキングは現在 `localStorage` 保存です。

- `haki_twenty_trials_nickname`: あだ名
- `haki_twenty_trials_ranking`: TOP5ランキング

将来的に Supabase / Vercel KV などへ移行しやすいよう、保存処理は `saveRanking()` / `loadRanking()` に分離しています。

## 技術構成

- Next.js 15 App Router
- TypeScript
- Canvas
- 依存追加なし

## 現在の構成

```text
src/app/
  page.tsx          # トップページ / gameサブドメイン判定
  game/page.tsx     # 覇気二十試練 metadata / page
  globals.css       # 覇気.com の全面ビジュアル / ゲームUI
  layout.tsx        # metadata / viewport
  manifest.ts       # PWA manifest
  icon.tsx          # 512px icon
  apple-icon.tsx    # 180px icon
  not-found.tsx     # 404
src/components/
  HakiGame.tsx      # 覇気二十試練ゲーム本体
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
git commit -m "feat: implement haki twenty trials"
git push origin main
```

Vercel 側で GitHub リポジトリと `main` ブランチが接続されていれば、自動で本番反映されます。

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
curl -L https://game.xn--7qwx14d.com | grep '覇気二十試練'
```

期待値:

- apex `xn--7qwx14d.com` が Vercel の `216.198.79.1` へ向く
- `game` / `www` が `cname.vercel-dns.com` へ向く
- HTTPSでアクセスできる
- apex HTML内に `覇気` / `coming soon` が含まれる
- `game.xn--7qwx14d.com` または `/game` HTML内に `覇気二十試練` が含まれる
