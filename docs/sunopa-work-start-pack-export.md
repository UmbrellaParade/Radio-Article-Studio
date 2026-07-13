# Sunoパ！作業開始パック連携

Radio Article Studioで整理した正確なゲスト名、応募者名、楽曲名、AIアーティスト名、楽曲URL、音源URL、アイコンURL、記事ポイントを、Sunoパ！作業開始パックツールへ渡すためのJSONを書き出します。

## 使い方

1. Radio Article Studioの「Codexパック」タブを開く。
2. 「作業開始パック用JSONをコピー」を押す。
3. 作業開始パックツールのCSV/JSON取り込み欄へ貼り付ける。

作業開始パックツール:

```text
https://umbrellaparade.github.io/sunopa-work-start-pack-tool/
```

## songsのキー

`songs[]` には以下のキーを入れます。

```text
slot_no
song_type
name
title
ai_artist
song_url
url_type
audio_path
icon_path
thumbnail_source
article_points
x_url
```

## song_type

`song_type` は以下の4種類に揃えます。

```text
ゲスト曲
かなめ🦐曲
べるぼ☂曲
応募者曲
```

判定できない曲は `応募者曲` として出力し、JSONの `warnings` に元情報を残します。

## SE_Pon登録リスト

「SE_Pon登録リストをコピー」は、Codexまたは人間がSE_Ponへ登録しやすいテキストをコピーします。

- 登録先は `🎵 放送「曲・BGM」`
- 全曲リピートON
- 曲数は回ごとに可変
- 空の曲枠は出力しない

ゲスト回では、基本的に以下の順で出します。

1. ゲスト紹介曲1曲目
2. かなめ🦐の曲
3. べるぼ☂の曲
4. ゲスト紹介曲2曲目以降
5. 応募者楽曲（slot順）

リスナー応募楽曲オンエアー回など、ゲスト回以外ではslot順で出します。

## 安全ルール

このJSONには、WordPressアプリケーションパスワード、APIキー、ログイン情報などの秘密情報を含めません。記事作業に必要な公開/共有前提のURLと楽曲・応募者・ゲスト情報だけを入れます。
