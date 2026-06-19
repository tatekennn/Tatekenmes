# 自分OS ハンドオフ資料

このドキュメントは、別エージェントや別開発者に現在のサイト目的・構成・挙動を渡すためのメモです。

## 目的

`自分OS` は、日常の小さな意思決定と記録をまとめる個人用Webアプリです。

現時点では、以下をひとつのホーム画面から見られることを重視しています。

- 今日の出勤・退勤チェック
- 有料列車の利用ログと月額合計
- 渋谷ランチの記録
- 趣味予定・メモ
- 将来的なAIチャット連動UI

まだ本格的なDB保存やAI実装は入っていません。現在はVercelで表示できる静的/クライアントUIとして、次の開発に渡せるプロトタイプになっています。

## 重要な前提

- リポジトリは Next.js 15 App Router 構成です。
- 現在GitHub/Vercelで公開している `自分OS` は Ruby/Rails ではありません。
- 最初にローカルで作っていた方向性はRuby/Rails寄りでしたが、既存のVercel連携リポジトリがNext.jsだったため、公開優先でNext.jsに移植しています。
- 既存の天霧澪サイトは消していません。
- ルート `/` は現在 `自分OS` に差し替えています。
- 以前のトップページは `/amagiri` に退避しています。
- 既存の `/diary` と `/profile` は維持しています。
- GitHub の `main` に push すると、連携済みVercelで反映される想定です。

## Ruby/Railsについて

Rubyを使うことがこのプロジェクトの目的なら、現状のNext.js実装はあくまで「見た目と体験の先行プロトタイプ」です。

VercelにはRuby Function runtimeはありますが、Railsアプリ全体を自然に動かす用途というより、単一HTTPハンドラ向けです。そのため、Ruby/Railsを主役にしたい場合は以下のどちらかを推奨します。

### 推奨A: Railsを本体にする

Railsでアプリ本体を作り直し、DB保存、フォーム処理、AIチャット連携もRails側で実装します。

この場合、デプロイ先はVercelよりも以下のようなRails向き環境が自然です。

- Render
- Fly.io
- Railway
- Heroku系
- VPS

メリット:

- Ruby/Railsの学習・実装目的に合う
- フォーム、DB、認証、バックグラウンド処理を素直に書ける
- Hotwire/Turboを使えばアプリ風UIもRuby中心で作れる

注意:

- 現在のVercel連携とは別のデプロイ設計になる可能性が高い
- Next.js版のUIは移植元デザインとして扱う

### 推奨B: Next.jsフロント + Ruby API

Vercel上のNext.js UIは残し、保存処理やAIチャットのバックエンドをRuby/Rails APIに分けます。

メリット:

- 今のVercel表示を維持できる
- Rubyも実プロダクトのバックエンドとして使える
- UI改善とRubyバックエンド開発を分離できる

注意:

- フロントとAPIの2サービス構成になる
- 認証、CORS、環境変数、デプロイ先を設計する必要がある

### 非推奨寄り: Vercel Ruby Functionだけで頑張る

小さなAPIなら可能ですが、Railsアプリとして育てたい目的には合いにくいです。

このリポジトリを次に触るエージェントは、まず「Rubyを主目的に戻すのか」「Vercel表示を主目的にするのか」を確認してください。

## 主要ルート

```text
/                         自分OS ホーム
/work_days/today          今日の打刻画面
/paid_rides               有料列車ログ
/paid_rides/new           有料列車の記録フォームUI
/lunch_logs               ランチログ
/lunch_logs/new           ランチ記録フォームUI
/hobby_items              趣味予定・メモ
/hobby_items/new          趣味記録フォームUI
/amagiri                  旧トップページ
/diary                    既存の日記一覧
/diary/[slug]             既存の日記詳細
/profile                  既存プロフィール
```

## 実装ファイル

```text
src/app/page.tsx
  ルートで自分OSホームを表示する。

src/components/jibun-os-app.tsx
  自分OSの共通シェル、画面切り替え、AIチャットUI、各ビューをまとめている。

src/components/jibun-os-app.module.css
  自分OSの見た目。スマホではアプリ風の縦画面、PCではメイン+右サイドの2カラムに切り替わる。

src/content/jibun-os-data.ts
  現在のサンプルデータ。打刻、有料列車、ランチ、趣味ログを静的配列で持つ。

src/app/manifest.ts
src/app/icon.tsx
src/app/apple-icon.tsx
  PWA/ホーム画面追加用の設定とアイコン生成。

src/app/amagiri/page.tsx
  旧トップページの退避先。
```

## 現在の挙動

### ホーム

`/` では「今日の管理」を表示します。

- 今月の有料列車合計を大きく表示
- 年間換算と記録数を表示
- 今日、打刻、列車、ランチ、趣味のチップナビを表示
- 管理中の項目として、出勤チェック、退勤チェック、有料列車、ランチ、趣味予定を表示

### AIチャットUI

右下、またはPC右サイドにAIチャット風の入力欄があります。

現時点では本物のAI API連携はありません。入力文字列に応じてUIの `data-mode` を切り替えるだけです。

```text
「早く」または「疲」を含む       rest
「節約」を含む                  budget
「ランチ」を含む                lunch
「趣味」を含む                  hobby
それ以外                        dashboard のまま
```

この `mode` は将来的に、AIの提案内容や画面の優先順位変更に使う想定です。

### 各ログ画面

`/paid_rides`、`/lunch_logs`、`/hobby_items` は `src/content/jibun-os-data.ts` の静的データを表示します。

`/new` 系の画面はフォームUIのみです。保存処理やDB登録は未実装です。

### レスポンシブ

- スマホ幅では、下部ナビとAI入力が固定表示されるアプリ風UIです。
- PC幅では、左にメイン画面、右にAIチャットとメニューが並ぶ2カラムUIです。
- PCで横スクロールが出ないように調整済みです。

### PWA

ホーム画面追加用に以下を設定しています。

- `manifest.webmanifest`
- `display: standalone`
- `theme_color`
- `apple-mobile-web-app` 系メタ情報
- `/icon`
- `/apple-icon`

スマホでは、Safari/Chromeで開いて「ホーム画面に追加」するとアプリ風に起動できます。

## 今後やると良いこと

優先度が高い順です。

1. 静的データをDBまたはAPI保存に置き換える
2. フォームの保存処理を実装する
3. AIチャットを実APIに接続する
4. AIの回答に応じて、ホームの表示順や強調カードを変える
5. ユーザー認証が必要か判断する
6. PWAのオフライン対応やキャッシュ戦略を検討する

## 開発コマンド

```bash
npm install
npm run lint
npm run build
npm run dev
```

`npm run lint` はこのリポジトリでは `tsc --noEmit` です。

## 注意点

- 既存の天霧澪コンテンツを消さないこと。
- `src/content/site-data.ts` と `content/diary` は既存サイト用です。
- 自分OSの表示データは `src/content/jibun-os-data.ts` です。
- UI改善はまず `src/components/jibun-os-app.module.css` を見ると早いです。
- AI機能はまだUIだけなので、実装時はAPIキーや個人情報をリポジトリに入れないこと。
