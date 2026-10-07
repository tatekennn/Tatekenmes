# 覇気.com

`覇気.com` 用の最小ランディングページと、`game.覇気.com` / `/game` で遊べるブラウザゲームを含む Next.js プロジェクトです。

## ゲーム: 覇気ラッシュ

**覇気ラッシュ** は、人気Webゲームの型を参考にした横画面ブラウザゲームです。

> 金色ゾーンでタップ。覇気100で、画面を黙らせる。

### 参考にしたWebゲームの型

調査時に確認した要素:

- Poki popular: `Subway Surfers`, `Drive Mad`, `Stickman Hook`, `Slice Master`, `Level Devil` など。短い失敗→即リトライ、見た瞬間わかる操作、コンボ/スキル感が強い。
- CrazyGames hot: `.io`, idle/merge, ragdoll/sandbox, survival/arena系。即座に状況が動き、成長/全消し/ボスの気持ちよさがある。
- Wordle型: 結果を共有しやすい短いプレイ単位。

このため、前の「ただタイミングを押すだけ」から、以下の中毒性を追加しています。

- 45秒の短いラン
- 即リトライ
- 金色ゾーンでタップする明快なルール
- コンボ
- 覇気100で全消しする **覇王色バースト**
- たまに出る覇気玉
- 15秒ごとのボス
- スワイプ一閃は任意の上級操作
- localStorageランキングとSNS共有

### 操作方法

- タップ / Space / Enter: 金色ゾーン内の相手を覇気で止める
- 覇気100の時にタップ: 画面全体をバーストで一掃
- スワイプ: 任意の一閃攻撃。使わなくても成立する

### 現在の方針

直近のユーザー意見を最優先します。

- 横画面
- 覇気と直接関係するテーマ
- 操作の主軸はタップ
- スラッシュは可能なら入れる、ただし必須にしない
- つまらない場合は仕様書よりユーザーの実感を優先して作り直す

## 技術構成

- Next.js 15 App Router
- TypeScript
- Canvas
- 依存追加なし

## 現在の構成

```text
src/app/
  page.tsx          # トップページ / gameサブドメイン判定
  game/page.tsx     # 覇気ラッシュ metadata / page
  globals.css       # 覇気.com の全面ビジュアル / ゲームUI
  layout.tsx        # metadata / viewport
  manifest.ts       # PWA manifest
  icon.tsx          # 512px icon
  apple-icon.tsx    # 180px icon
  not-found.tsx     # 404
src/components/
  HakiGame.tsx      # 覇気ラッシュゲーム本体
```

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

### 無料取得フロー

本番サービスへ接続せず、購入者向けの一連の動作を確認できます。

1. `http://127.0.0.1:3000/login` でメールアドレスとパスワードを登録
2. `http://127.0.0.1:3000/apply` で空き確認して無料取得
3. `http://127.0.0.1:3000/dashboard` で入居ページとカスタムDNSを管理

カスタムDNSでは、購入区画の直下とその配下にA・AAAA・CNAME・TXT・MX・CAAを
複数登録できます。CNAMEの共存禁止、公開IP制限、MX優先度、所有区画の境界も
ローカルAPIで検証します。1区画あたりの上限は25レコードです。

パスワードはscryptでハッシュ化します。無料取得は1アカウントにつき1区画です。
ユーザー、セッション、所有ドメイン、DNS設定、監査履歴は
`.data/haki-local.sqlite` に保存され、開発サーバーを再起動しても残ります。
`DATABASE_URL` がある環境ではNeon PostgreSQLへ自動的に切り替わります。Vercel本番では
取得時にMuu DNSへAレコードを作成し、対象ドメインをVercelプロジェクトへ追加します。
ローカルでは公開DNSを変更しません。

## Deployment

```bash
git add .
git commit -m "feat: rebuild haki game as arcade rush"
git push origin main
```

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

```bash
dig xn--7qwx14d.com A +short
dig game.xn--7qwx14d.com CNAME +short
curl -L https://game.xn--7qwx14d.com | grep '覇気ラッシュ'
```
