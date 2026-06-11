# 久礼カツオ待ち時間ガイド

高知県中土佐町久礼の大正町市場で、カツオを待つ時間を楽しむためのスマホ専用PWAです。

## MVP機能

- ホーム画面
- 待ち時間選択
- ゲーム/SNS感覚で答えられる旅の声アンケート
- 久礼のカツオ豆知識
- 大正町市場紹介
- 防災タワー紹介
- 将来の音声ガイド枠


## アンケート機能

`src/main.js` の `surveyQuestions` でアンケート項目を管理します。現時点ではバックエンドを持たない静的PWAのため、回答は端末内の `localStorage` に保存されます。外部集計を行う場合は `SURVEY_ENDPOINT` に送信先URLを設定すると、回答JSONをPOSTできます。

収集項目は、来訪地、来訪理由、食体験、認知経路、同行者・旅の形、満足度・SNS投稿意向、要望です。感想だけでなく、PR施策や機能改善に使いやすいマーケティング要素も含めています。ホーム画面にもアンケート内容の一覧カードを表示し、下部ナビの「アンケート」から回答画面へ移動できます。

## アプリQRコードとSubstackリンク

アプリ内のホーム画面とアンケート画面に、このアプリを開くQRコードを表示しています。公開URLは `src/main.js` の `APP_URL`、QR画像は `public/qr-kure-katsuo-guide.svg` で管理します。

QRコードはアプリの公開URL（`APP_URL`）を開くためのものです。今後このアプリの内容を更新しても、公開URLが変わらなければ印刷済みのQRコードは変更不要です。公開先のドメイン、GitHubユーザー名、リポジトリ名、パスを変える場合だけQRコードの作り直しが必要です。

大正町市場のSubstackリンク（https://substack.com/@taishomachi）は、アプリQRカード内のボタンに加えて、ホーム画面とアンケート画面の専用Substackリンクカードでも案内します。URLは `src/main.js` の `SUBSTACK_URL` で管理します。

公開後は、ホーム画面でアンケート内容カード、アプリQRカード、Substackリンクカードが表示されることを確認します。これらは `src/main.js` の `surveyPreviewCard`、`appQrCard`、`substackLinkCard` で管理しています。

PR #3 の競合解消時は、main側の既存ガイド構成を残したうえで、`surveyQuestions`、`surveyPage`、`surveyPreviewCard`、`appQrCard`、`substackLinkCard`、`qr-kure-katsuo-guide.svg`、Service WorkerのQRキャッシュ設定を削除しないようにします。

## 音声ガイドの拡張方針

`src/main.js` の `audioGuides` で各ページの音声データを管理します。現時点では仮データですが、将来的に以下の形式を差し替えるだけで各ページの再生エリアに反映できます。

- `sources.mp3`: MP3ファイルのURL
- `sources.spotify`: Spotify埋め込みURL
- `sources.substack`: Substack音声投稿の埋め込みURL

## 必要環境

- Node.js 18以上
- npm
- Python 3（ローカル確認用の簡易サーバーで使います）

このプロジェクトは外部npmパッケージに依存しない静的PWAです。`npm install` は必須ではありません。

## ローカルでブラウザ確認する手順

1. リポジトリを取得します。

   ```bash
   git clone <repository-url>
   cd kure-katsuo-guide
   ```

2. 開発サーバーを起動します。

   ```bash
   npm run dev
   ```

3. ブラウザで以下を開きます。

   ```text
   http://localhost:5173
   ```

4. スマホ表示を確認したい場合は、ブラウザの開発者ツールでモバイル表示に切り替えます。

5. 終了するときは、ターミナルで `Ctrl + C` を押します。

## 本番ビルドとプレビュー

1. 静的ファイルを `dist/` に出力（PRには含めません）します。

   ```bash
   npm run build
   ```

2. ビルド結果をローカルで確認します。

   ```bash
   npm run preview
   ```

3. ブラウザで以下を開きます。

   ```text
   http://localhost:4173
   ```

## GitHub Pagesで公開する手順（初心者向け）

このリポジトリには、GitHub Pagesへ自動公開するための設定ファイル `.github/workflows/pages.yml` が入っています。GitHub側でPagesの公開元を一度設定すると、以後は `main` ブランチにpushするたびに `npm run build` が実行され、`dist/` の中身が公開されます。PRにはzipファイルを含めず、GitHub Pagesに必要なソースファイルだけを含めます。

### 1. GitHubにリポジトリを作る

1. GitHubにログインします。
2. 右上の `+` → `New repository` を押します。
3. Repository name に例として `kure-katsuo-guide` と入力します。
4. 公開URLを誰でも見られるようにする場合は `Public` を選びます。
5. `Create repository` を押します。

### 2. このコードをGitHubへpushする

ローカルPCで以下を実行します。`<your-name>` は自分のGitHubユーザー名に置き換えてください。

```bash
git remote add origin https://github.com/<your-name>/kure-katsuo-guide.git
git branch -M main
git push -u origin main
```

すでに `origin` が設定済みの場合は、次のようにURLを差し替えてからpushします。

```bash
git remote set-url origin https://github.com/<your-name>/kure-katsuo-guide.git
git branch -M main
git push -u origin main
```

### 3. GitHub Pagesの公開元をGitHub Actionsにする

1. GitHubで作成したリポジトリを開きます。
2. 上部メニューの `Settings` を開きます。
3. 左メニューの `Pages` を開きます。
4. `Build and deployment` の `Source` で `GitHub Actions` を選びます。

### 4. デプロイ完了を確認する

1. 上部メニューの `Actions` を開きます。
2. `Deploy static PWA to GitHub Pages` というworkflowを開きます。
3. 緑のチェックが表示されるまで待ちます。通常は数分かかります。
4. 完了後、`Settings` → `Pages` に公開URLが表示されます。

公開URLは通常、以下の形式になります。

```text
https://<your-name>.github.io/kure-katsuo-guide/
```

例：GitHubユーザー名が `nakatoshi-demo` の場合

```text
https://nakatoshi-demo.github.io/kure-katsuo-guide/
```

### 5. スマホで確認する

公開URLをスマホのブラウザで開きます。ホーム画面追加やPWAの挙動を確認する場合は、HTTPSの公開URLで確認してください。

### うまく公開されない場合

- `Actions` のworkflowが赤い場合は、失敗したjobを開いてエラーログを確認します。
- `Settings` → `Pages` の `Source` が `GitHub Actions` になっているか確認します。
- pushしたブランチ名が `main` か確認します。
- 初回公開直後は反映まで数分かかることがあります。

## Vercelで公開する手順

1. Vercelで `Add New...` → `Project` を選び、このGitHubリポジトリをImportします。
2. Framework Presetは `Other` を選びます。
3. Build and Output Settingsを以下にします。

   ```text
   Build Command: npm run build
   Output Directory: dist
   Install Command: （空欄または npm install）
   ```

4. `Deploy` を押します。
5. 発行されたVercel URLをスマホまたはブラウザのモバイル表示で確認します。

## Scripts

- `npm run dev` - 開発サーバー起動
- `npm run build` - 静的PWAを `dist/` に出力（PRには含めません）
- `npm run preview` - ビルド結果のプレビュー
