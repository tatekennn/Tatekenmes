# Variant B: Velvet Nocturne

`sketches/002-velvet-nocturne/index.html` は、VTuber風ホームページ再設計の **Variant B** モックです。

## 方向性

- 既存の上品さとキャラクター前面の魅力を維持
- 夜・月・星・薄いオカルト感を Variant A より強める
- ただしホラー演出や不穏なニュース風UIには寄せない
- 明度を残した premium / luminous な印象を優先
- 透過カードと柔らかなグローで、静かな高級感を出す

## モック内容

- キャラクター主役のヒーロー
- 三日月・星環・星粒を使った装飾モチーフ
- レイヤードされた translucent card UI
- 日記セクション（最新 / テーマ別の最小切り替えあり）
- プロフィール
- 世界観 / worldview の約束
- gallery-like links 導線
- 完全静的・単一HTML・外部依存なし

## デザイン意図

Variant B は、"都会の夜を静かに観測する案内人" という印象を強めるため、背景を深いネイビー〜紫寄りにしつつ、月光のゴールドとラベンダーのハイライトで暗くなりすぎないバランスを取っています。

特に重視したのは以下です。

1. **キャラクターの第一印象**
   - 画面上部で即座に主役感が伝わること
   - 外部画像なしでも、CSSだけで立ち姿の印象を作ること
2. **夜 / occult undertone の深度**
   - 三日月、星、反射、静かな観測といった語彙に寄せること
   - horror ではなく "気品のある夜" に留めること
3. **情報の見せ方**
   - fake news や更新速報ブロックを置かないこと
   - diary / profile / worldview / gallery links を自然に横並びで見せること

## 使い方

ローカルで直接開けます。

```bash
xdg-open /opt/data/Tatekenmes/sketches/002-velvet-nocturne/index.html
```

またはブラウザでファイルを直接開いて確認してください。

## ファイル

- `/opt/data/Tatekenmes/sketches/002-velvet-nocturne/index.html`
- `/opt/data/Tatekenmes/sketches/002-velvet-nocturne/README.md`
