import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  CalendarDays,
  ClipboardCopy,
  Database,
  Download,
  FileText,
  Image,
  Link,
  ListChecks,
  Mic2,
  Music,
  Plus,
  Radio,
  Save,
  Send,
  Settings,
  Trash2,
  Upload
} from "lucide-react";
import "./styles.css";

const STORAGE_KEY = "radio-article-studio:v1";

const newId = (prefix) => {
  if (crypto?.randomUUID) return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
};

const sampleData = {
  settings: {
    obsidianPath: "C:\\Users\\myabe\\OneDrive\\Desktop\\Obsidian Folder\\Umbrella Parade\\Sunoパ！記事",
    wordpressSite: "https://ai-music.noiseinmysoul.com/",
    sePonUrl: "https://umbrellaparade.github.io/SE_Pon/"
  },
  episodes: [
    {
      id: "ep_yui_2026_07_10",
      title: "結音さんゲスト回",
      date: "2026-07-10",
      slot: "第2木曜日",
      time: "21:30-23:00",
      type: "ゲスト回",
      guestName: "結音さん",
      standfmUrl: "https://stand.fm/episodes/6a4fa398337119d74b6669ff",
      status: "公開済み",
      articleUrl: "https://ai-music.noiseinmysoul.com/sunopa-yui-silfira-guest/",
      notes: "サンプル。実運用では放送後にstand.fm URLを入れる。"
    }
  ],
  forms: [
    {
      id: "form_guest",
      name: "ゲスト回アンケート",
      type: "ゲスト",
      status: "受付中",
      description: "ゲスト紹介、紹介楽曲、NG/注意事項を集めるフォーム。",
      questions: [
        { id: "q_guest_name", label: "ゲスト名 正式表記", kind: "short", required: true, use: "article" },
        { id: "q_guest_x", label: "X URL", kind: "url", required: true, use: "article" },
        { id: "q_profile", label: "活動紹介文", kind: "long", required: true, use: "article" },
        { id: "q_topics", label: "今回話したいこと", kind: "long", required: false, use: "article" },
        { id: "q_ng", label: "触れないでほしいこと/NG質問", kind: "long", required: false, use: "constraint" }
      ]
    },
    {
      id: "form_listener",
      name: "リスナー楽曲応募フォーム",
      type: "リスナー",
      status: "準備中",
      description: "楽曲URL、音源ファイル、記事掲載可否を集めるフォーム。",
      questions: [
        { id: "q_artist", label: "アーティスト名 正式表記", kind: "short", required: true, use: "article" },
        { id: "q_song", label: "曲名 正式表記", kind: "short", required: true, use: "article" },
        { id: "q_music_url", label: "楽曲URL", kind: "url", required: true, use: "article" },
        { id: "q_audio", label: "音源ファイル mp3/wav", kind: "file", required: false, use: "internal" },
        { id: "q_credit", label: "クレジット/表記注意", kind: "long", required: false, use: "constraint" }
      ]
    },
    {
      id: "form_personality",
      name: "パーソナリティ曲入力",
      type: "運営",
      status: "運用中",
      description: "かなめ🦐/べるぼ☂の紹介曲を運営側で入力するフォーム。",
      questions: [
        { id: "q_owner", label: "担当", kind: "choice", required: true, use: "article" },
        { id: "q_title", label: "曲名", kind: "short", required: true, use: "article" },
        { id: "q_url", label: "楽曲URL", kind: "url", required: true, use: "article" },
        { id: "q_point", label: "記事で触れてほしいポイント", kind: "long", required: false, use: "article" }
      ]
    }
  ],
  responses: [
    {
      id: "res_yui",
      episodeId: "ep_yui_2026_07_10",
      formId: "form_guest",
      respondent: "結音さん",
      status: "確認済み",
      publicInfo:
        "Emotional / Dark & Tender J-popを軸に、心の痛みに寄り添う物語を音楽へ変えるアーティスト。Silfiraをプロデュース。",
      articleUse:
        "TEN6/天ロックフェス、リアルライブ企画、スタートラインに込めた想いを中心に記事化。",
      internalOnly: "NG質問や触れない話題はここに残す。記事本文には出さない。",
      constraints:
        "Silfiraは参加ではなくプロデュース。TEN6/天ロックフェス主催は深海魚（フカミカトト）さん。"
    }
  ],
  tracks: [
    {
      id: "tr_startline",
      episodeId: "ep_yui_2026_07_10",
      slotNo: 1,
      source: "ゲスト曲",
      artist: "Silfira",
      title: "スタートライン",
      urlType: "YouTube",
      url: "https://youtu.be/bALQZxlngvI",
      embedUrl: "https://www.youtube.com/embed/bALQZxlngvI",
      honorific: "通常表記",
      articlePoint: "TEN6出演をきっかけに作られた、夢のスタートラインを感じる曲。",
      status: "記事反映済み"
    },
    {
      id: "tr_kaname",
      episodeId: "ep_yui_2026_07_10",
      slotNo: 2,
      source: "パーソナリティ曲",
      artist: "かなめ🦐",
      title: "Rainbound (Demo)",
      urlType: "Suno",
      url: "https://suno.com/s/6Kuki8xssObQnKWJ",
      embedUrl: "https://suno.com/embed/89f93041-4baf-4ed2-9c09-59d4ce25a2c1",
      honorific: "さんなし",
      articlePoint: "雨をテーマにしたロックチューン。",
      status: "記事反映済み"
    },
    {
      id: "tr_bellbo",
      episodeId: "ep_yui_2026_07_10",
      slotNo: 3,
      source: "パーソナリティ曲",
      artist: "べるぼ☂",
      title: "Bitter Pop Lemon",
      urlType: "Suno",
      url: "https://suno.com/s/oiwDlnZRpx09KoI5",
      embedUrl: "https://suno.com/embed/f0281aa9-40b3-4f35-9215-4751d3de97e9",
      honorific: "さんなし",
      articlePoint: "K-POPタッチのポップ感。",
      status: "記事反映済み"
    },
    {
      id: "tr_tiger",
      episodeId: "ep_yui_2026_07_10",
      slotNo: 5,
      source: "リスナー応募曲",
      artist: "GOKIGEN Tiger",
      title: "雨粒のシンコペーション",
      urlType: "Suno",
      url: "https://suno.com/s/SHzMOvCfu4xyCfli",
      embedUrl: "https://suno.com/embed/b4ea0b11-606e-4c10-bd42-c8c253485d13",
      honorific: "さん付け",
      articlePoint: "ミックスの美しさと雨テーマのグルーヴ。",
      status: "記事反映済み"
    }
  ],
  assets: [
    {
      id: "as_feature",
      episodeId: "ep_yui_2026_07_10",
      type: "記事アイキャッチ 16:9",
      title: "記事アイキャッチ",
      driveUrl: "",
      localPath: "",
      status: "制作済み",
      alt: "Sunoパ！結音さんゲスト回のアイキャッチ",
      credit: "かなめ🦐"
    },
    {
      id: "as_standfm",
      episodeId: "ep_yui_2026_07_10",
      type: "stand.fm正方形 1:1",
      title: "stand.fmサムネ",
      driveUrl: "",
      localPath: "",
      status: "制作待ち",
      alt: "",
      credit: "かなめ🦐"
    }
  ]
};

function loadData() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : sampleData;
  } catch {
    return sampleData;
  }
}

function App() {
  const logoSrc = `${import.meta.env.BASE_URL}assets/umbrella-parade-logo.png`;
  const [data, setData] = useState(loadData);
  const [active, setActive] = useState("dashboard");
  const [selectedEpisodeId, setSelectedEpisodeId] = useState(data.episodes[0]?.id ?? "");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const selectedEpisode = useMemo(
    () => data.episodes.find((episode) => episode.id === selectedEpisodeId) ?? data.episodes[0],
    [data.episodes, selectedEpisodeId]
  );

  const episodeTracks = data.tracks
    .filter((track) => track.episodeId === selectedEpisode?.id)
    .sort((a, b) => Number(a.slotNo) - Number(b.slotNo));

  const episodeResponses = data.responses.filter((response) => response.episodeId === selectedEpisode?.id);
  const episodeAssets = data.assets.filter((asset) => asset.episodeId === selectedEpisode?.id);

  const updateData = (key, updater) => {
    setData((current) => ({
      ...current,
      [key]: typeof updater === "function" ? updater(current[key]) : updater
    }));
  };

  const addEpisode = () => {
    const episode = {
      id: newId("ep"),
      title: "新しい放送回",
      date: new Date().toISOString().slice(0, 10),
      slot: "第2木曜日",
      time: "21:30-23:00",
      type: "ゲスト回",
      guestName: "",
      standfmUrl: "",
      status: "準備中",
      articleUrl: "",
      notes: ""
    };
    updateData("episodes", (episodes) => [episode, ...episodes]);
    setSelectedEpisodeId(episode.id);
    setActive("episodes");
  };

  const patchItem = (key, id, patch) => {
    updateData(key, (items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const removeItem = (key, id) => {
    updateData(key, (items) => items.filter((item) => item.id !== id));
  };

  const addTrack = () => {
    if (!selectedEpisode) return;
    updateData("tracks", (tracks) => [
      ...tracks,
      {
        id: newId("tr"),
        episodeId: selectedEpisode.id,
        slotNo: episodeTracks.length + 1,
        source: "ゲスト曲",
        artist: "",
        title: "",
        urlType: "Suno",
        url: "",
        embedUrl: "",
        honorific: "",
        articlePoint: "",
        status: "未確認"
      }
    ]);
    setActive("tracks");
  };

  const addAsset = () => {
    if (!selectedEpisode) return;
    updateData("assets", (assets) => [
      ...assets,
      {
        id: newId("as"),
        episodeId: selectedEpisode.id,
        type: "記事アイキャッチ 16:9",
        title: "",
        driveUrl: "",
        localPath: "",
        status: "制作待ち",
        alt: "",
        credit: "かなめ🦐"
      }
    ]);
    setActive("assets");
  };

  const addForm = () => {
    updateData("forms", (forms) => [
      ...forms,
      {
        id: newId("form"),
        name: "新しいフォーム",
        type: "自由フォーム",
        status: "準備中",
        description: "",
        questions: [
          { id: newId("q"), label: "質問文", kind: "short", required: false, use: "article" }
        ]
      }
    ]);
    setActive("forms");
  };

  const addQuestion = (formId) => {
    updateData("forms", (forms) =>
      forms.map((form) =>
        form.id === formId
          ? {
              ...form,
              questions: [
                ...form.questions,
                { id: newId("q"), label: "新しい質問", kind: "short", required: false, use: "article" }
              ]
            }
          : form
      )
    );
  };

  const patchQuestion = (formId, questionId, patch) => {
    updateData("forms", (forms) =>
      forms.map((form) =>
        form.id === formId
          ? {
              ...form,
              questions: form.questions.map((question) =>
                question.id === questionId ? { ...question, ...patch } : question
              )
            }
          : form
      )
    );
  };

  const addResponse = () => {
    if (!selectedEpisode) return;
    updateData("responses", (responses) => [
      ...responses,
      {
        id: newId("res"),
        episodeId: selectedEpisode.id,
        formId: data.forms[0]?.id ?? "",
        respondent: "",
        status: "未確認",
        publicInfo: "",
        articleUse: "",
        internalOnly: "",
        constraints: ""
      }
    ]);
    setActive("responses");
  };

  const updateSettings = (patch) => {
    setData((current) => ({ ...current, settings: { ...current.settings, ...patch } }));
  };

  const codexPack = useMemo(() => {
    if (!selectedEpisode) return "";
    const responseBlocks = episodeResponses
      .map(
        (response) => `### ${response.respondent || "回答者未入力"}
公開情報:
${response.publicInfo || "-"}

記事に使う内容:
${response.articleUse || "-"}

制約/注意:
${response.constraints || "-"}`
      )
      .join("\n\n");

    const trackRows = episodeTracks
      .map(
        (track) =>
          `${track.slotNo}. ${track.title || "曲名未入力"} / ${track.artist || "アーティスト未入力"}\n` +
          `   種別: ${track.source} / URL: ${track.url || "-"} / 埋め込み: ${track.embedUrl || "-"}\n` +
          `   記事ポイント: ${track.articlePoint || "-"}`
      )
      .join("\n");

    const assetRows = episodeAssets
      .map(
        (asset) =>
          `- ${asset.type}: ${asset.title || "-"} / Drive: ${asset.driveUrl || "-"} / local: ${asset.localPath || "-"} / credit: ${asset.credit || "-"}`
      )
      .join("\n");

    return `Obsidianの以下フォルダーを読んで、今回のラジオ放送回を記事化してください。

${data.settings.obsidianPath}

今回の放送回:
- episode_id: ${selectedEpisode.id}
- タイトル: ${selectedEpisode.title}
- 放送日: ${selectedEpisode.date}
- 開催枠: ${selectedEpisode.slot}
- 種別: ${selectedEpisode.type}
- ゲスト: ${selectedEpisode.guestName || "-"}
- stand.fm URL: ${selectedEpisode.standfmUrl || "-"}

投稿先:
${data.settings.wordpressSite}

作業範囲:
- stand.fm音声取得
- 文字起こし
- 音楽雑誌風の記事作成
- WordPressへまず下書き投稿
- 公開後のSNS投稿文
- 告知漫画案/画像プロンプト

ゲスト/回答情報:
${responseBlocks || "-"}

紹介楽曲:
${trackRows || "-"}

サムネ/画像素材:
${assetRows || "-"}

厳守ルール:
- かなめ🦐、べるぼ☂はパーソナリティなので原則「さん」なし。
- 記事本文に内部確認メモやNG回答そのものを載せない。
- 主催/出演/参加/プロデュースなどの関係性を混同しない。
- WordPress認証情報はチャットで別途共有する。`;
  }, [data.settings, episodeAssets, episodeResponses, episodeTracks, selectedEpisode]);

  const copyPack = async () => {
    await navigator.clipboard.writeText(codexPack);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `radio-article-studio-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importJson = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const next = JSON.parse(String(reader.result));
        setData(next);
        setSelectedEpisodeId(next.episodes?.[0]?.id ?? "");
      } catch {
        alert("JSONを読み込めませんでした。");
      }
    };
    reader.readAsText(file, "utf-8");
  };

  const resetSample = () => {
    if (!confirm("サンプルデータに戻しますか？現在のブラウザ内データは上書きされます。")) return;
    setData(sampleData);
    setSelectedEpisodeId(sampleData.episodes[0].id);
  };

  return (
    <main className="app-shell">
      <Header logoSrc={logoSrc} />

      <nav className="app-nav" aria-label="Main navigation">
        {[
          ["dashboard", "ダッシュボード", Radio],
          ["episodes", "放送回", CalendarDays],
          ["forms", "フォーム", ListChecks],
          ["responses", "回答", Database],
          ["tracks", "楽曲", Music],
          ["assets", "素材", Image],
          ["pack", "Codexパック", FileText],
          ["settings", "設定", Settings]
        ].map(([key, label, Icon]) => (
          <button className={active === key ? "active" : ""} key={key} onClick={() => setActive(key)}>
            <Icon size={17} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="workspace">
        <aside className="side-panel">
          <div className="side-title">放送回</div>
          <select value={selectedEpisode?.id ?? ""} onChange={(event) => setSelectedEpisodeId(event.target.value)}>
            {data.episodes.map((episode) => (
              <option key={episode.id} value={episode.id}>
                {episode.date} {episode.title}
              </option>
            ))}
          </select>
          <button className="primary full" onClick={addEpisode}>
            <Plus size={16} /> 放送回を追加
          </button>
          {selectedEpisode && (
            <div className="episode-mini">
              <b>{selectedEpisode.title}</b>
              <span>{selectedEpisode.date} / {selectedEpisode.slot}</span>
              <span>{selectedEpisode.status}</span>
            </div>
          )}
        </aside>

        <section className="content-panel">
          {active === "dashboard" && (
            <Dashboard
              data={data}
              selectedEpisode={selectedEpisode}
              episodeTracks={episodeTracks}
              episodeResponses={episodeResponses}
              episodeAssets={episodeAssets}
              setActive={setActive}
            />
          )}
          {active === "episodes" && (
            <Episodes
              episodes={data.episodes}
              selectedEpisodeId={selectedEpisodeId}
              setSelectedEpisodeId={setSelectedEpisodeId}
              patchItem={patchItem}
              removeItem={removeItem}
              addEpisode={addEpisode}
            />
          )}
          {active === "forms" && (
            <Forms
              forms={data.forms}
              patchItem={patchItem}
              removeItem={removeItem}
              addForm={addForm}
              addQuestion={addQuestion}
              patchQuestion={patchQuestion}
            />
          )}
          {active === "responses" && (
            <Responses
              forms={data.forms}
              responses={episodeResponses}
              patchItem={patchItem}
              removeItem={removeItem}
              addResponse={addResponse}
            />
          )}
          {active === "tracks" && (
            <Tracks tracks={episodeTracks} patchItem={patchItem} removeItem={removeItem} addTrack={addTrack} />
          )}
          {active === "assets" && (
            <Assets assets={episodeAssets} patchItem={patchItem} removeItem={removeItem} addAsset={addAsset} />
          )}
          {active === "pack" && (
            <CodexPack codexPack={codexPack} copyPack={copyPack} copied={copied} selectedEpisode={selectedEpisode} />
          )}
          {active === "settings" && (
            <SettingsPanel
              settings={data.settings}
              updateSettings={updateSettings}
              exportJson={exportJson}
              importJson={importJson}
              resetSample={resetSample}
            />
          )}
        </section>
      </div>
    </main>
  );
}

function Header({ logoSrc }) {
  return (
    <section className="hero">
      <img className="brand-logo" src={logoSrc} alt="Umbrella Parade" />
      <div className="title-block">
        <div className="eyebrow"><Radio size={16} /> Production Toolkit</div>
        <h1>Radio Article Studio</h1>
        <p>
          ラジオ放送から、記事・SNS・画像・音源管理まで。
          制作に必要な情報を放送回ごとにまとめ、Codexへ渡す制作パックを作ります。
        </p>
      </div>
    </section>
  );
}

function Dashboard({ data, selectedEpisode, episodeTracks, episodeResponses, episodeAssets, setActive }) {
  const stats = [
    ["放送回", data.episodes.length, CalendarDays],
    ["フォーム", data.forms.length, ListChecks],
    ["回答", data.responses.length, Database],
    ["楽曲", data.tracks.length, Music],
    ["素材", data.assets.length, Image]
  ];

  return (
    <div className="view-stack">
      <SectionTitle title="ダッシュボード" subtitle="いま準備中の放送回と、制作の詰まりどころを見ます。" />
      <div className="stat-grid">
        {stats.map(([label, value, Icon]) => (
          <button className="stat-card" key={label} onClick={() => setActive(label === "放送回" ? "episodes" : label === "素材" ? "assets" : label === "楽曲" ? "tracks" : label === "回答" ? "responses" : "forms")}>
            <Icon size={22} />
            <span>{label}</span>
            <strong>{value}</strong>
          </button>
        ))}
      </div>

      <div className="two-col">
        <article className="panel">
          <h2>選択中の放送回</h2>
          {selectedEpisode ? (
            <dl className="detail-list">
              <div><dt>タイトル</dt><dd>{selectedEpisode.title}</dd></div>
              <div><dt>放送日</dt><dd>{selectedEpisode.date}</dd></div>
              <div><dt>種別</dt><dd>{selectedEpisode.type}</dd></div>
              <div><dt>ゲスト</dt><dd>{selectedEpisode.guestName || "-"}</dd></div>
              <div><dt>記事</dt><dd>{selectedEpisode.articleUrl || "未設定"}</dd></div>
            </dl>
          ) : (
            <p>放送回を追加してください。</p>
          )}
        </article>

        <article className="panel">
          <h2>制作状況</h2>
          <div className="check-list">
            <StatusLine done={Boolean(selectedEpisode?.standfmUrl)} label="stand.fm URL" />
            <StatusLine done={episodeResponses.length > 0} label="ゲスト/回答情報" />
            <StatusLine done={episodeTracks.length > 0} label="紹介楽曲" />
            <StatusLine done={episodeAssets.some((asset) => asset.type.includes("16:9"))} label="記事アイキャッチ" />
            <StatusLine done={Boolean(selectedEpisode?.articleUrl)} label="公開記事URL" />
          </div>
        </article>
      </div>
    </div>
  );
}

function StatusLine({ done, label }) {
  return (
    <div className={done ? "status-line done" : "status-line"}>
      <span>{done ? "完了" : "未完"}</span>
      <b>{label}</b>
    </div>
  );
}

function Episodes({ episodes, selectedEpisodeId, setSelectedEpisodeId, patchItem, removeItem, addEpisode }) {
  return (
    <div className="view-stack">
      <SectionTitle title="放送回管理" subtitle="第2/第4木曜回、ゲスト回、通常回、stand.fm URL、記事URLを管理します。" action={<button className="primary" onClick={addEpisode}><Plus size={16} />追加</button>} />
      <div className="records">
        {episodes.map((episode) => (
          <article className={episode.id === selectedEpisodeId ? "record selected" : "record"} key={episode.id}>
            <div className="record-head">
              <button className="link-button" onClick={() => setSelectedEpisodeId(episode.id)}>{episode.date} / {episode.title}</button>
              <button className="icon-danger" onClick={() => removeItem("episodes", episode.id)} aria-label="delete"><Trash2 size={16} /></button>
            </div>
            <div className="form-grid">
              <Field label="タイトル" value={episode.title} onChange={(value) => patchItem("episodes", episode.id, { title: value })} />
              <Field label="放送日" type="date" value={episode.date} onChange={(value) => patchItem("episodes", episode.id, { date: value })} />
              <SelectField label="開催枠" value={episode.slot} options={["第2木曜日", "第4木曜日", "特別回"]} onChange={(value) => patchItem("episodes", episode.id, { slot: value })} />
              <Field label="放送時間" value={episode.time} onChange={(value) => patchItem("episodes", episode.id, { time: value })} />
              <SelectField label="種別" value={episode.type} options={["ゲスト回", "通常回", "リスナー曲回", "特別回"]} onChange={(value) => patchItem("episodes", episode.id, { type: value })} />
              <Field label="ゲスト名" value={episode.guestName} onChange={(value) => patchItem("episodes", episode.id, { guestName: value })} />
              <Field label="stand.fm URL" value={episode.standfmUrl} onChange={(value) => patchItem("episodes", episode.id, { standfmUrl: value })} />
              <SelectField label="ステータス" value={episode.status} options={["準備中", "素材待ち", "下書き作成済み", "確認待ち", "公開済み", "SNS投稿済み"]} onChange={(value) => patchItem("episodes", episode.id, { status: value })} />
              <Field label="記事URL" value={episode.articleUrl} onChange={(value) => patchItem("episodes", episode.id, { articleUrl: value })} />
              <TextArea label="メモ" value={episode.notes} onChange={(value) => patchItem("episodes", episode.id, { notes: value })} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function Forms({ forms, patchItem, removeItem, addForm, addQuestion, patchQuestion }) {
  return (
    <div className="view-stack">
      <SectionTitle title="フォーム管理" subtitle="ゲストアンケート、リスナー応募、パーソナリティ曲入力などを複数作れます。" action={<button className="primary" onClick={addForm}><Plus size={16} />フォーム追加</button>} />
      <div className="records">
        {forms.map((form) => (
          <article className="record" key={form.id}>
            <div className="record-head">
              <strong>{form.name}</strong>
              <button className="icon-danger" onClick={() => removeItem("forms", form.id)}><Trash2 size={16} /></button>
            </div>
            <div className="form-grid">
              <Field label="フォーム名" value={form.name} onChange={(value) => patchItem("forms", form.id, { name: value })} />
              <SelectField label="用途" value={form.type} options={["ゲスト", "リスナー", "運営", "自由フォーム"]} onChange={(value) => patchItem("forms", form.id, { type: value })} />
              <SelectField label="状態" value={form.status} options={["準備中", "受付中", "停止中", "運用中"]} onChange={(value) => patchItem("forms", form.id, { status: value })} />
              <TextArea label="説明" value={form.description} onChange={(value) => patchItem("forms", form.id, { description: value })} />
            </div>
            <div className="question-list">
              <div className="subhead">質問項目</div>
              {form.questions.map((question) => (
                <div className="question-row" key={question.id}>
                  <input value={question.label} onChange={(event) => patchQuestion(form.id, question.id, { label: event.target.value })} />
                  <select value={question.kind} onChange={(event) => patchQuestion(form.id, question.id, { kind: event.target.value })}>
                    <option>short</option>
                    <option>long</option>
                    <option>url</option>
                    <option>choice</option>
                    <option>file</option>
                  </select>
                  <select value={question.use} onChange={(event) => patchQuestion(form.id, question.id, { use: event.target.value })}>
                    <option value="article">記事に使う</option>
                    <option value="constraint">制約/NG</option>
                    <option value="internal">内部確認のみ</option>
                    <option value="sns">SNS</option>
                    <option value="manga">漫画</option>
                  </select>
                </div>
              ))}
              <button className="secondary" onClick={() => addQuestion(form.id)}><Plus size={16} />質問追加</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function Responses({ forms, responses, patchItem, removeItem, addResponse }) {
  return (
    <div className="view-stack">
      <SectionTitle title="回答管理" subtitle="記事に使う情報、内部確認のみ、NG/制約を分けて保持します。" action={<button className="primary" onClick={addResponse}><Plus size={16} />回答追加</button>} />
      <div className="records">
        {responses.map((response) => (
          <article className="record" key={response.id}>
            <div className="record-head">
              <strong>{response.respondent || "回答者未入力"}</strong>
              <button className="icon-danger" onClick={() => removeItem("responses", response.id)}><Trash2 size={16} /></button>
            </div>
            <div className="form-grid">
              <Field label="回答者" value={response.respondent} onChange={(value) => patchItem("responses", response.id, { respondent: value })} />
              <SelectField label="フォーム" value={response.formId} options={forms.map((form) => form.id)} labels={Object.fromEntries(forms.map((form) => [form.id, form.name]))} onChange={(value) => patchItem("responses", response.id, { formId: value })} />
              <SelectField label="状態" value={response.status} options={["未確認", "確認済み", "要確認"]} onChange={(value) => patchItem("responses", response.id, { status: value })} />
              <TextArea label="公開OK情報" value={response.publicInfo} onChange={(value) => patchItem("responses", response.id, { publicInfo: value })} />
              <TextArea label="記事に使う内容" value={response.articleUse} onChange={(value) => patchItem("responses", response.id, { articleUse: value })} />
              <TextArea label="内部確認のみ" value={response.internalOnly} onChange={(value) => patchItem("responses", response.id, { internalOnly: value })} />
              <TextArea label="制約/NG/注意事項" value={response.constraints} onChange={(value) => patchItem("responses", response.id, { constraints: value })} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function Tracks({ tracks, patchItem, removeItem, addTrack }) {
  return (
    <div className="view-stack">
      <SectionTitle title="楽曲/音源管理" subtitle="ゲスト曲、パーソナリティ曲、リスナー応募曲を同じ形式で管理します。" action={<button className="primary" onClick={addTrack}><Plus size={16} />楽曲追加</button>} />
      <div className="records">
        {tracks.map((track) => (
          <article className="record" key={track.id}>
            <div className="record-head">
              <strong>{track.slotNo}. {track.title || "曲名未入力"} / {track.artist || "アーティスト未入力"}</strong>
              <button className="icon-danger" onClick={() => removeItem("tracks", track.id)}><Trash2 size={16} /></button>
            </div>
            <div className="form-grid">
              <Field label="曲順" type="number" value={track.slotNo} onChange={(value) => patchItem("tracks", track.id, { slotNo: value })} />
              <SelectField label="種別" value={track.source} options={["ゲスト曲", "パーソナリティ曲", "リスナー応募曲"]} onChange={(value) => patchItem("tracks", track.id, { source: value })} />
              <Field label="アーティスト名" value={track.artist} onChange={(value) => patchItem("tracks", track.id, { artist: value })} />
              <Field label="曲名" value={track.title} onChange={(value) => patchItem("tracks", track.id, { title: value })} />
              <SelectField label="URL種別" value={track.urlType} options={["Suno", "YouTube", "Spotify", "Audio", "Other"]} onChange={(value) => patchItem("tracks", track.id, { urlType: value })} />
              <Field label="元URL" value={track.url} onChange={(value) => patchItem("tracks", track.id, { url: value })} />
              <Field label="埋め込みURL" value={track.embedUrl} onChange={(value) => patchItem("tracks", track.id, { embedUrl: value })} />
              <Field label="敬称ルール" value={track.honorific} onChange={(value) => patchItem("tracks", track.id, { honorific: value })} />
              <SelectField label="状態" value={track.status} options={["未確認", "URL確認済み", "埋め込み取得済み", "記事反映済み"]} onChange={(value) => patchItem("tracks", track.id, { status: value })} />
              <TextArea label="記事で触れるポイント" value={track.articlePoint} onChange={(value) => patchItem("tracks", track.id, { articlePoint: value })} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function Assets({ assets, patchItem, removeItem, addAsset }) {
  return (
    <div className="view-stack">
      <SectionTitle title="サムネ/素材管理" subtitle="記事16:9、stand.fm 1:1、配信背景9:16、音源フォルダーなどを放送回に紐づけます。" action={<button className="primary" onClick={addAsset}><Plus size={16} />素材追加</button>} />
      <div className="records">
        {assets.map((asset) => (
          <article className="record" key={asset.id}>
            <div className="record-head">
              <strong>{asset.type} / {asset.title || "素材名未入力"}</strong>
              <button className="icon-danger" onClick={() => removeItem("assets", asset.id)}><Trash2 size={16} /></button>
            </div>
            <div className="form-grid">
              <SelectField label="種別" value={asset.type} options={["記事アイキャッチ 16:9", "stand.fm正方形 1:1", "配信背景 9:16", "ゲストアイコン", "音源Driveフォルダー", "SE_Pon取り込み"]} onChange={(value) => patchItem("assets", asset.id, { type: value })} />
              <Field label="タイトル" value={asset.title} onChange={(value) => patchItem("assets", asset.id, { title: value })} />
              <Field label="Drive URL" value={asset.driveUrl} onChange={(value) => patchItem("assets", asset.id, { driveUrl: value })} />
              <Field label="ローカルパス" value={asset.localPath} onChange={(value) => patchItem("assets", asset.id, { localPath: value })} />
              <SelectField label="状態" value={asset.status} options={["制作待ち", "制作中", "制作済み", "確認済み", "使用済み"]} onChange={(value) => patchItem("assets", asset.id, { status: value })} />
              <Field label="alt文" value={asset.alt} onChange={(value) => patchItem("assets", asset.id, { alt: value })} />
              <Field label="クレジット" value={asset.credit} onChange={(value) => patchItem("assets", asset.id, { credit: value })} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function CodexPack({ codexPack, copyPack, copied, selectedEpisode }) {
  return (
    <div className="view-stack">
      <SectionTitle title="Codex記事作成パック" subtitle="ここをコピーしてCodexへ渡せば、記事化に必要な情報がまとまります。" action={<button className="primary" onClick={copyPack}><ClipboardCopy size={16} />{copied ? "コピー済み" : "コピー"}</button>} />
      <article className="panel">
        <h2>{selectedEpisode?.title || "放送回未選択"}</h2>
        <textarea className="pack-output" value={codexPack} readOnly />
      </article>
    </div>
  );
}

function SettingsPanel({ settings, updateSettings, exportJson, importJson, resetSample }) {
  return (
    <div className="view-stack">
      <SectionTitle title="設定/バックアップ" subtitle="ブラウザ内保存のエクスポート、インポート、主要パスを管理します。" />
      <article className="panel">
        <div className="form-grid">
          <Field label="Obsidian格納庫パス" value={settings.obsidianPath} onChange={(value) => updateSettings({ obsidianPath: value })} />
          <Field label="WordPressサイト" value={settings.wordpressSite} onChange={(value) => updateSettings({ wordpressSite: value })} />
          <Field label="SE_Pon URL" value={settings.sePonUrl} onChange={(value) => updateSettings({ sePonUrl: value })} />
        </div>
        <div className="button-row">
          <button className="secondary" onClick={exportJson}><Download size={16} />JSONを書き出し</button>
          <label className="secondary file-button">
            <Upload size={16} />JSONを読み込み
            <input type="file" accept="application/json" onChange={importJson} />
          </label>
          <button className="danger" onClick={resetSample}><Trash2 size={16} />サンプルに戻す</button>
        </div>
      </article>
    </div>
  );
}

function SectionTitle({ title, subtitle, action }) {
  return (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type={type} value={value ?? ""} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function TextArea({ label, value, onChange }) {
  return (
    <label className="field wide">
      <span>{label}</span>
      <textarea value={value ?? ""} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function SelectField({ label, value, onChange, options, labels = {} }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value ?? ""} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {labels[option] ?? option}
          </option>
        ))}
      </select>
    </label>
  );
}

createRoot(document.getElementById("root")).render(<App />);
