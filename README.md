# きょうの服 — タイムライン式コーデ提案（MVP）

体型・手持ち服・1日の予定（朝/昼/夕/夜）と天気から、今日のコーデと時間帯別のアドバイス、予算内の買い足し候補を出すスマホ向けWebアプリ。

## 起動

```bash
npm install
cp .env.example .env.local   # 任意: ANTHROPIC_API_KEY を入れるとタグ解析が本物になる
npm run dev                  # http://localhost:3000
```

- Node.js 24 以上（標準の `node:sqlite` を使用。DB は `./data/app.db` に自動作成・初期データ投入）
- 天気は Open-Meteo（APIキー不要）。取得できないときは平年値ベースの推定値で動作
- **完全無料で動く**: APIキーがなければ、タグは Tesseract.js でブラウザ内で文字認識（写真は外部に送らない）。素材・混率・サイズ・ブランド・取扱い注意の文章を読み取り、洗濯表示の記号とアイテム種別は手で選ぶ
- 任意（有料）: `ANTHROPIC_API_KEY` を設定すると Claude で解析（記号も読める）
- `RAKUTEN_APPLICATION_ID` と `RAKUTEN_ACCESS_KEY` を設定すると、買い足し候補を楽天市場の実商品から探す（未設定・エラー時はサンプルカタログ）

## タグ解析の精度

`/wardrobe/accuracy` で確認できます。

- **登録時の精度**: 登録時に「内容を確認」で直した項目を AI の間違いとして集計（直さずに保存した項目は正解扱い）
- **モデル比較**: 保存したタグ写真（`data/tag-images/`、ローカルのみ）を Opus 5.5 / Sonnet 5.5 で解析し直し、確定内容と比較。実行前に費用の目安を表示

## 構成

| パス | 役割 |
|---|---|
| `src/app/page.tsx` | 今日の結論（コーデ・タイムライン・買い足し） |
| `src/app/onboarding` | 体型・サイズ感・テイスト・予算の登録（スライダー/選択式） |
| `src/app/plan` | タイムライン入力（テンプレートをワンタップ） |
| `src/app/wardrobe` | クローゼット、タグ撮影→解析→確認→登録 |
| `src/app/api/tags/analyze` | Claude Vision でタグを構造化（`claude-opus-5-5`） |
| `src/lib/engine/` | 提案ロジック（純粋関数）: 体感温度・TPO・配色・体型・不足検出・レコメンド・ブランド学習 |
| `src/lib/db/` | SQLite スキーマと初期データ（シーン・ブランド・疑似カタログ） |
| `src/lib/repo.ts` | データアクセス |
| `src/lib/shop/` | 楽天市場商品検索API（2026-07-01版）の呼び出し・キャッシュ・間隔制御と、候補の取得 |
| `src/lib/ai/accuracy.ts`, `eval.ts` | AI の読み取り結果と確定内容の項目別比較、モデル再評価 |
