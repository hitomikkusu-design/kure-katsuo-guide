# 久礼カツオ待ち時間ガイド

高知県中土佐町久礼の大正町市場で、カツオを待つ時間を楽しむためのスマホ専用PWAです。

## MVP機能

- ホーム画面
- 待ち時間選択
- 久礼のカツオ豆知識
- 大正町市場紹介
- 防災タワー紹介
- 将来の音声ガイド枠

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

## 追加機能: アンケート・アプリQR・Substackリンク

PR #3 では、既存のガイド構成や音声ガイド方針を残したまま、以下の3つを追加しています。

- **アンケート機能**: `src/main.js` の `surveyQuestions` で設問を管理します。来訪地、来訪理由、食体験、認知経路、同行者・旅の形、満足度・SNS投稿意向、要望を収集します。回答は静的PWAでも動くよう端末内の `localStorage` に保存し、外部集計する場合は `SURVEY_ENDPOINT` に送信先URLを設定します。
- **アプリQRカード**: `APP_URL` と `APP_QR_SRC` を使い、`public/qr-kure-katsuo-guide.svg` からこのアプリの公開URLを開けるQRコードを表示します。公開URLが変わらなければ、アプリ内容を更新しても印刷済みQRはそのまま使えます。
- **Substackリンク**: `SUBSTACK_URL`（https://substack.com/@taishomachi）を使い、アプリQRカード内のボタンと専用Substackリンクカードから大正町市場のSubstackを開けます。

公開後は、ホーム画面でアンケート内容カード、アプリQRカード、Substackリンクカードが表示されることを確認してください。競合解消時は、main側の既存ガイド構成を残したうえで、`surveyQuestions`、`surveyPage`、`surveyPreviewCard`、`appQrCard`、`substackLinkCard`、`qr-kure-katsuo-guide.svg`、Service WorkerのQRキャッシュ設定を削除しないようにします。

## Tower Warrior の田中社長デフォルト写真

`tower-warrior.html` の田中社長写真をデフォルト表示にする場合は、写真ファイルを `public/tanaka-president.jpg` として追加してください。`npm run build` で `dist/tanaka-president.jpg` にコピーされ、ゲーム起動時に自動で顔写真として読み込まれます。画面上の「写真を一時差し替え」は端末内プレビュー用で、ファイルは送信されません。

## 追加機能: 2階会議室の予約（Googleカレンダー連携・ダブルブッキング防止）

ホームの「2階会議室、予約できます」バナー、またはメニューの「2階会議室の予約」から開けます。久礼アプリ本体に組み込んでいるため、既存の公開URL・QRコードはそのまま使えます。

- **空き状況表示**: 利用日を選ぶと、その日の予約済み時間帯が時間ごとに表示されます。
- **予約フォーム**: 日付・開始時間・利用時間（1〜3時間）・お名前・電話番号などを入力して送信します。
- **ダブルブッキング防止**: 予約確定時にサーバー側（Google Apps Script）でカレンダーを再確認し、`LockService` で同時実行も排他します。同じ時間帯にすでに予約があれば登録せず画面でお知らせします。

### しくみと設定

- フロント側は `src/main.js` の `RESERVE_ENDPOINT`（既定でアンケートと同じ `SURVEY_ENDPOINT`）へ、`?action=reservations&date=...`（GET・空き状況）と `formType:'reservation'` のPOST（予約）を送ります。
- 受付時間・部屋名は `src/main.js` の `RESERVE_OPEN_HOUR` / `RESERVE_CLOSE_HOUR` / `ROOM_NAME` で変更できます。
- **カレンダー連携を有効にするには、Apps Script側の対応が必要です。** 次の2通りがあります。
  - **全文を貼り替える（手早い）**: `apps-script/Code.gs` を、既存スクリプトを全選択して丸ごと置き換え。アンケート・車いす予約・会議室予約を1本で処理します（アンケート等は各シートへJSON記録）。
  - **必要分だけマージする**: 既存のアンケート集計レイアウトを保ちたい場合は、`apps-script/reservation.gs` の内容を既存スクリプトに追記（会議室予約の処理だけ追加）。
  - どちらも、編集後に「デプロイを管理 → 新しいバージョン」で再デプロイしてください。URLは変わらないのでフロント側の変更は不要です。
- Apps Scriptを更新するまでは、空き状況の取得や予約登録は反映されません（送信は行われますがカレンダーには登録されません）。

| 場所 | 変数 | 用途 |
| --- | --- | --- |
| `src/main.js` | `RESERVE_ENDPOINT` | 予約の送信先（既定はアンケートと同じApps Script） |
| `src/main.js` | `RESERVE_OPEN_HOUR` / `RESERVE_CLOSE_HOUR` | 予約受付時間 |
| `src/main.js` | `ROOM_NAME` | 予約対象の部屋名 |
| `apps-script/reservation.gs` | `RESERVE_CALENDAR_ID` | 予約先カレンダー |
| `apps-script/reservation.gs` | `RESERVE_TITLE_PREFIX` | 会議室予約イベントの判別接頭辞 |
