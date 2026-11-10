# ISP-Ⅰ Ver.0.10.1 — Android Web Push 第2段階（導入用パッケージ）

**重要：ZIPの公開だけではWeb Pushは使えません。** Supabase側の設定・デプロイが必要です。現時点ではサーバーへの変更・Android実機試験は行っていません。

## 手順
1. Ver.0.10.0のJSONバックアップを保存。現在のGitHub Pages公開ファイルを別途保存。
2. Supabase SQL Editorで `supabase/push-schema.sql` を確認・実行。`ispi_snapshots`には変更しません。
3. `npx web-push generate-vapid-keys` などでVAPID鍵を生成（web-push CLIを信頼できる環境で実行）。**秘密鍵はGitHub Pages/ZIP/チャットに記載しない。**
4. Supabase Edge FunctionのSecretsに `VAPID_PUBLIC_KEY`、`VAPID_PRIVATE_KEY`、`VAPID_SUBJECT`（例 `mailto:admin@example.com` を実際の管理者アドレスに変更）、`ALLOWED_ORIGIN`（GitHub Pagesの正確なオリジン、例 `https://example.github.io`）を登録。既定の `SUPABASE_URL`、`SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY` の提供状態を確認。
5. `supabase/functions/ispi-push-test/index.ts` を `ispi-push-test` という名前でデプロイ。**JWT検証ON**、CORSの許可オリジンを確認。
6. ZIPの `index.html`、`sw.js`、`manifest.webmanifest`、`icon.svg` をGitHub Pages公開フォルダへ配置（supabaseフォルダと説明書は公開不要）。
7. AndroidのPWAを更新→Supabaseログイン→通知権限を許可→「この端末でWeb Pushを有効にする」→「サーバーからテスト通知を送る」。その後60秒以上待ち、別の端末・PCからログインして送信操作し、PWAを閉じたAndroidで受信を確認（送信操作にはログインしたブラウザが必要）。
8. 不要になったら「この端末の登録を解除」。

## 制限と注意
- 第2段階は**手動のサーバー送信テスト**のみ。ToDo/授業の予約配信は未実装。
- `ispi_push_subscriptions` は端末購読情報を保存します。ユーザーごとにRLSを適用。
- 同一アカウントの登録端末のうち新しい最大3件へ送信。60秒以内の再送信は制限。
- ログアウトだけではPush購読が解除されません。共有端末では解除してからログアウトしてください。
- Androidの通信状態・省電力制御により通知が遅れる場合があります。ICS方式を残しています。
- `web-push` のDeno互換性・Supabase Edge Runtime上での実送信は未検証です。デプロイ後にログで確認してください。
- `ALLOWED_ORIGIN` はオリジンのみ（末尾のスラッシュやリポジトリパスは付けない）。
