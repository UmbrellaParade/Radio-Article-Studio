# Radio Article Studio 運用・トラブル時の指示書

このメモは、フォーム回答・Google Apps Script・Google Drive保存まわりで「何か起きた時」に最初に見るための指示書です。

## まず守ること

- `SECRET_TOKEN` やGoogleアカウントの認証情報は、GitHub・チャット・スクショに載せない。
- Driveの `_responses/`、`_forms/`、放送回フォルダーは削除しない。消す前に必ず別フォルダーへコピーする。
- GASを「新しいデプロイ」で作り直すとWebアプリURLが変わる場合がある。URLが変わったら、ツール設定と `public/app-config.json` も更新する。
- 回答保存先DriveフォルダーURLを変えたら、使用中フォームの「短いURLを公開/更新」を押し直す。
- 迷ったら、まずツールの「設定」からJSONを書き出してバックアップを取る。

## 全体の仕組み

Radio Article StudioはGitHub Pages上で動く静的アプリです。回答の受信・保存はGoogle Apps ScriptのWebアプリが担当します。

主な保存先:

- 回答JSON: Google Driveの `_responses/`
- 音源WAV/MP3・画像: Google Driveの放送回ごとのフォルダー
- 短縮URL用フォーム定義: Google Driveの `_forms/`
- 回答ログ: Google Drive上のスプレッドシート
- サムネPNG: Google Driveのサムネ用フォルダー

関係するファイル:

- GAS本体: `docs/google-apps-script/Code.gs`
- GASセットアップ説明: `docs/google-drive-response-endpoint.md`
- 公開版が読むGAS URL: `public/app-config.json`
- ツール内の保存先設定: 設定 → `回答保存Webhook URL`、`回答同期トークン`、`回答保存先Google DriveフォルダーURL`

## 正常時の確認

1. 公開版を開く。
   - `https://umbrellaparade.github.io/Radio-Article-Studio/`
2. 設定画面で以下が入っていることを確認する。
   - 回答保存Webhook URL
   - 回答同期トークン
   - 回答保存先Google DriveフォルダーURL
3. フォーム管理で対象フォームを開く。
4. 「短いURLを公開/更新」を押す。
5. 公開フォームをシークレットウィンドウで開き、テスト回答を送る。
6. Driveに `_responses/` のJSONと添付ファイルができているか見る。
7. ツールの「回答」画面で「新着回答を同期」を押す。

## フォームが開かない時

見るところ:

- URLが `#/r/{slug}` または `#/s/...` になっているか
- GitHub Pagesが最新か
- `public/app-config.json` に現在のGAS WebアプリURLが入っているか
- GASのWebアプリURLを直接開いて `{"ok":true,...}` のようなJSONが返るか

対応:

1. まずブラウザでハードリロードする。
2. フォーム管理で「短いURLを公開/更新」を押し直す。
3. それでもだめなら、長い共有URL `#/s/...` を一時的な代替として使う。
4. GAS URLが変わっていたら `public/app-config.json` とツール設定を更新してpushする。

## 回答送信に失敗する時

よくある原因:

- GAS WebアプリURLが違う、古い、未デプロイ
- GASのアクセス権が「全員」になっていない
- GASの承認が終わっていない
- DriveフォルダーURLが間違っている、またはGAS実行ユーザーがそのフォルダーを開けない
- 音源ファイルが大きすぎる
- 受付期間外、または応募上限に達している

対応:

1. GAS WebアプリURLをブラウザで直接開く。
   - 正常なら `ok: true` を含むJSONが出る。
2. Apps Scriptでデプロイ設定を確認する。
   - 種類: ウェブアプリ
   - 次のユーザーとして実行: 自分
   - アクセスできるユーザー: 全員
3. Apps Scriptで承認が必要なら、画面の案内に沿って許可する。
4. ツール設定の `回答保存Webhook URL` が今のGAS URLと一致しているか確認する。
5. 対象フォームの受付期間・応募上限を確認する。
6. 音源が大きい場合はMP3にする。WAVで大きすぎる場合は送信に失敗しやすい。

## 回答は送れたのにツールへ同期されない時

見るところ:

- Driveの `_responses/` にJSONがあるか
- ツール設定の `回答同期トークン` がGASの `SECRET_TOKEN` と一致しているか
- ツール設定の `回答保存先Google DriveフォルダーURL` と、実際に保存されたDriveフォルダーが同じか

対応:

1. Driveで `_responses/` を開いて、回答JSONが増えているか確認する。
2. 増えている場合は、ツール側の同期トークンか保存先フォルダーURLの問題を疑う。
3. 増えていない場合は、GAS側の保存失敗を疑う。
4. 保存先フォルダーを変更した後なら、フォーム管理で「短いURLを公開/更新」を押し直す。

## 音源や画像がDriveに保存されない時

見るところ:

- 回答完了メッセージに「添付ファイル○件保存済み」が出たか
- Driveの放送回フォルダーにファイルがあるか
- `_responses/` のJSON内に `driveUrl` や `driveFileId` があるか

対応:

1. ファイルサイズを小さくして再送する。
2. MP3で試す。
3. Driveの空き容量を確認する。
4. 保存先フォルダーURLが間違っていないか確認する。

## 受付期間・応募上限でフォームが表示されない時

見るところ:

- フォーム管理の受付開始日・受付終了日
- フォーム管理の応募上限
- 応募期間に紐づく期間設定

対応:

1. 期間指定が不要なら、開始日・終了日を空欄にする。
2. 応募上限が不要なら空欄にする。
3. 変更後、公開フォームを開き直す。
4. 短いURLを使っている場合は「短いURLを公開/更新」を押し直す。

## GASを更新した時

1. Apps Scriptで `Code.gs` を更新する。
2. 保存する。
3. 「デプロイ」→「デプロイを管理」→既存デプロイを編集、または必要に応じて新しいデプロイを作る。
4. WebアプリURLが変わった場合:
   - ツール設定の `回答保存Webhook URL` を更新する。
   - `public/app-config.json` の `formEndpointUrl` を更新する。
   - GitHubへcommit/pushする。
   - 使用中フォームの「短いURLを公開/更新」を押し直す。

## GitHub Pagesに反映されない時

見るところ:

- GitHub Actionsの `Deploy GitHub Pages`
- ブラウザキャッシュ
- Service Workerの古いキャッシュ

対応:

1. GitHub Actionsがsuccessになるまで待つ。
2. 公開版をハードリロードする。
3. それでも古い場合は、ブラウザのサイトデータを削除して開き直す。
4. 数分待っても変わらない場合は、最新commitがmainにpushされているか確認する。

## ローカル/ブラウザ内データが消えた時

Radio Article Studioの管理データはブラウザのlocalStorageに保存されます。PCやブラウザを変えると見えなくなることがあります。

対応:

1. 手元にJSONバックアップがある場合は、設定 → JSONを読み込み。
2. 回答だけなら、Driveの `_responses/` から「回答」画面の同期で戻せる。
3. フォーム定義は、短いURL公開済みならGASの `_forms/` に残っている。
4. 画像や音源の大きいデータは、Drive側の保存ファイルを正本として扱う。

## Codexや開発者へ依頼する時のコピペ

```text
Radio Article Studioでトラブルが起きました。以下を確認して修正してください。

起きていること:

操作した画面:

使ったURL:

表示されたエラー文:

発生日時:

試したこと:

確認してほしいこと:
- GAS WebアプリURLが生きているか
- public/app-config.json の formEndpointUrl が正しいか
- Driveの _responses/ に回答JSONが保存されているか
- 回答保存先DriveフォルダーURLと短いURL公開済みフォームの保存先が一致しているか
- GitHub Pagesのデプロイがsuccessか
```

## 最後の逃げ道

- 公開フォームが短いURLで開かない場合は、長い共有URL `#/s/...` を一時的に使う。
- 自動同期できない場合は、Driveの `_responses/` からJSONを手動でダウンロードして、ツールの「回答JSONを読み込み」で取り込む。
- 音源送信が不安定な場合は、フォームでは楽曲URLだけ受け取り、音源はDrive共有リンクで別送してもらう。
- GASが壊れた場合は、`docs/google-apps-script/Code.gs` を新しいApps Scriptプロジェクトへ貼り直して、Webアプリとして再デプロイする。
