# ぜよぴあアプリ

「ぜよぴあ」の待ち時間表示と、2階会議室の予約をスマホからできるスマホ専用PWAです。
[久礼カツオ待ち時間ガイド](../) と同じ構成（外部npmパッケージに依存しない静的PWA + Service Worker + Google Apps Script連携）で作っています。

## 機能

- **待ち時間表示**: 各窓口の待ち時間の目安をカード表示。1分ごとに自動更新（手動更新も可能）。
- **2階会議室の予約フォーム + Googleカレンダー連携**: 利用日を選ぶと空き状況を時間帯ごとに表示。予約時にサーバー側（Apps Script）でカレンダーを再確認し、**ダブルブッキング（二重予約）を防止**します。
- **PWA**: ホーム画面に追加でき、一度開いた画面はオフラインでも表示できます。

## ディレクトリ構成

```
zeyopia-app/
├─ index.html                  # エントリーポイント
├─ package.json                # build / dev / preview スクリプト
├─ src/
│  ├─ main.js                  # ルーティング・待ち時間・予約のロジック
│  └─ styles/global.css        # デザインシステム
├─ public/
│  ├─ manifest.webmanifest     # PWAマニフェスト
│  ├─ sw.js                    # Service Worker（APIはネットワーク優先）
│  └─ icons/icon.svg
├─ apps-script/
│  └─ Code.gs                  # Googleカレンダー連携バックエンド
└─ .github/workflows/pages.yml # GitHub Pagesへの自動デプロイ
```

## ローカルで確認する

```bash
cd zeyopia-app
npm run dev          # http://localhost:5174 を開く
```

`API_ENDPOINT` 未設定でも動作します（待ち時間はデモ表示、予約は端末内に仮記録）。

## 本番ビルド

```bash
npm run build        # dist/ に静的ファイルを出力（SWのキャッシュ名も自動更新）
npm run preview      # http://localhost:4174 でビルド結果を確認
```

## Googleカレンダー連携（ダブルブッキング防止）のセットアップ

カレンダー連携はフロントだけでは完結しません。`apps-script/Code.gs` をGoogle Apps Scriptのウェブアプリとして公開し、そのURLをフロントに設定します。

1. [script.google.com](https://script.google.com) で新規プロジェクトを作成し、`apps-script/Code.gs` の内容を貼り付けます。
2. プロジェクトのタイムゾーンを **Asia/Tokyo** に設定します。
3. 必要に応じて以下を編集します。
   - `CALENDAR_ID`: 予約を書き込むカレンダー（既定はメインカレンダー）。専用カレンダーを使う場合はそのIDに。
   - `WAIT_SHEET_ID`: 待ち時間をスプレッドシートで管理する場合のシートID（A列:窓口名 / B列:待ち分、1行目は見出し）。
   - `LOG_SHEET_ID`: 予約ログを残す場合のシートID。
4. **デプロイ → 新しいデプロイ → 種類「ウェブアプリ」**
   - 実行ユーザー: 自分
   - アクセスできるユーザー: 全員
5. 発行されたウェブアプリURLを、`src/main.js` 冒頭の `API_ENDPOINT` に貼り付けます。

```js
const API_ENDPOINT = 'https://script.google.com/macros/s/XXXXXXXX/exec';
```

### しくみ（ダブルブッキング防止）

- フロントは利用日ごとに `?action=reservations&date=...` でカレンダー上の予約済み区間を取得し、空き状況を表示します（UX向上のための事前表示）。
- 予約送信時、Apps Script 側で `LockService` で排他制御しつつ、登録直前にもう一度カレンダーの該当時間帯を確認します。すでに2階会議室の予定があれば登録せず `{ ok:false, reason:'conflict' }` を返します。これにより、複数の人が同時に予約しても二重予約になりません。

## API仕様（Apps Script）

| メソッド | パラメータ / ボディ | 返り値 |
| --- | --- | --- |
| GET | `?action=waits` | `{ ok, items:[{name,minutes}], updatedAt }` |
| GET | `?action=reservations&date=YYYY-MM-DD` | `{ ok, date, busy:[{start,end,title}] }` |
| POST | `{ formType:'reservation', date, startTime, endTime, start, end, name, org, phone, headcount, purpose }` | 成功 `{ ok:true, eventId }` / 競合 `{ ok:false, reason:'conflict' }` |

## GitHub Pagesで公開する

`.github/workflows/pages.yml` を含めています。このディレクトリを独立したリポジトリのルートに置き、`main` へpushしたうえで、リポジトリの **Settings → Pages → Source** を **GitHub Actions** にすると、`main` への push ごとに `npm run build` が走り、`dist/` が公開されます。

> このプロジェクトは現在 `kure-katsuo-guide` リポジトリ内の `zeyopia-app/` として開発しています。独立した「ぜよぴあアプリ」リポジトリにする場合は、この `zeyopia-app/` の中身をそのまま新リポジトリのルートにコピーしてください。自己完結しているため、追加の修正なしで動きます。

## 設定値の早見表

| 場所 | 変数 | 用途 |
| --- | --- | --- |
| `src/main.js` | `API_ENDPOINT` | Apps ScriptウェブアプリURL |
| `src/main.js` | `OPEN_HOUR` / `CLOSE_HOUR` | 予約受付時間 |
| `src/main.js` | `ROOM_NAME` | 予約対象の部屋名 |
| `apps-script/Code.gs` | `CALENDAR_ID` | 予約先カレンダー |
| `apps-script/Code.gs` | `ROOM_TITLE_PREFIX` | 会議室予約イベントの判別接頭辞 |
