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
  Share2,
  Trash2,
  Upload
} from "lucide-react";
import "./styles.css";

const STORAGE_KEY = "radio-article-studio:v1";

const QUESTION_USE_OPTIONS = [
  ["public", "公開してOKなプロフィール"],
  ["article", "記事で紹介してほしい内容"],
  ["constraint", "記事/SNSで触れないこと・表記ルール"],
  ["internal", "制作側だけに共有するメモ"],
  ["sns", "SNS投稿に使ってOK"],
  ["manga", "漫画/画像案に使ってOK"]
];

const QUESTION_USE_LABELS = Object.fromEntries(QUESTION_USE_OPTIONS);

const QUESTION_KIND_OPTIONS = [
  ["short", "短文"],
  ["long", "長文"],
  ["url", "URL"],
  ["choice", "選択式"],
  ["file", "ファイル"]
];

const detectUrlType = (url = "") => {
  const normalized = url.toLowerCase();
  if (normalized.includes("suno.com")) return "Suno";
  if (normalized.includes("youtube.com") || normalized.includes("youtu.be")) return "YouTube";
  if (normalized.includes("spotify.com")) return "Spotify";
  if (normalized.match(/\.(mp3|wav)(\?|#|$)/)) return "Audio";
  return "Other";
};

const AUDIO_FILE_ACCEPT = "audio/mpeg,audio/mp3,audio/wav,audio/x-wav,.mp3,.wav";

const isAudioUpload = (file) => {
  const name = file?.name?.toLowerCase() ?? "";
  return name.endsWith(".mp3") || name.endsWith(".wav") || ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav"].includes(file?.type);
};

const formatAnswerValue = (value) => {
  if (!value) return "-";
  if (typeof value === "object" && value.fileName) return `${value.fileName} (${Math.round((value.size || 0) / 1024 / 1024 * 10) / 10}MB)`;
  return String(value);
};

const THUMBNAIL_PRESETS = [
  { key: "article16x9", label: "記事サムネ 16:9", width: 1280, height: 720, fileName: "article-thumbnail.png" },
  { key: "standfm1x1", label: "stand.fm 正方形 1:1", width: 1080, height: 1080, fileName: "standfm-thumbnail.png" },
  { key: "stream9x16", label: "配信背景 9:16", width: 1080, height: 1920, fileName: "stream-background.png" }
];

const defaultThumbnailStudio = {
  guestIcon: { name: "", dataUrl: "" },
  templates: Object.fromEntries(
    THUMBNAIL_PRESETS.map((preset) => [
      preset.key,
      {
        name: "",
        dataUrl: "",
        iconX: preset.key === "stream9x16" ? 50 : 74,
        iconY: preset.key === "stream9x16" ? 38 : 52,
        iconSize: preset.key === "stream9x16" ? 30 : 28
      }
    ])
  )
};

const defaultImports = {
  guestCsvUrl: "",
  listenerCsvUrl: "",
  personalityCsvUrl: "",
  bellboTrackUrl: "",
  lastLog: []
};

const newId = (prefix) => {
  if (crypto?.randomUUID) return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
};

const normalizeKey = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[ 　_\-・:：/／（）()［\][\].。]/g, "");

const compactLines = (items) => items.filter(Boolean).join("\n");

const pick = (row, aliases) => {
  const normalized = Object.fromEntries(Object.entries(row).map(([key, value]) => [normalizeKey(key), value]));
  for (const alias of aliases) {
    const value = normalized[normalizeKey(alias)];
    if (value != null && String(value).trim() !== "") return String(value).trim();
  }
  return "";
};

const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  row.push(value);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  if (rows.length < 2) return [];

  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1).map((cells) =>
    Object.fromEntries(headers.map((header, index) => [header || `column_${index + 1}`, cells[index]?.trim() ?? ""]))
  );
};

const toGoogleCsvUrl = (url) => {
  const trimmed = url.trim();
  if (!trimmed) return "";
  const spreadsheetMatch = trimmed.match(/\/spreadsheets\/d\/([^/]+)/);
  if (!spreadsheetMatch) return trimmed;
  const gidMatch = trimmed.match(/[?&#]gid=([^&#]+)/);
  const gid = gidMatch?.[1] ?? "0";
  return `https://docs.google.com/spreadsheets/d/${spreadsheetMatch[1]}/export?format=csv&gid=${gid}`;
};

const makeEmbedUrl = (url) => {
  const youtube = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/shorts\/)([A-Za-z0-9_-]+)/);
  if (youtube) return `https://www.youtube.com/embed/${youtube[1]}`;
  return "";
};

const nextSlotNo = (tracks, episodeId) => {
  const values = tracks.filter((track) => track.episodeId === episodeId).map((track) => Number(track.slotNo) || 0);
  return Math.max(0, ...values) + 1;
};

const upsertTrack = (tracks, nextTrack) => {
  const existingIndex = tracks.findIndex(
    (track) =>
      track.episodeId === nextTrack.episodeId &&
      ((nextTrack.url && track.url === nextTrack.url) ||
        (track.source === nextTrack.source && track.artist === nextTrack.artist && track.title === nextTrack.title))
  );
  if (existingIndex === -1) return [...tracks, nextTrack];
  return tracks.map((track, index) => (index === existingIndex ? { ...track, ...nextTrack, id: track.id, slotNo: track.slotNo } : track));
};

const buildResponseFromRow = (row, episodeId, formId) => {
  const respondent = pick(row, ["ゲスト名", "お名前", "名前", "活動名", "アーティスト名", "回答者", "応募者名"]);
  const xUrl = pick(row, ["X URL", "Twitter URL", "X", "Twitter"]);
  const profile = pick(row, ["活動紹介文", "プロフィール", "紹介文", "自己紹介", "公開プロフィール"]);
  const topics = pick(row, ["今回話したいこと", "記事で紹介してほしい内容", "話したいこと", "トピック"]);
  const songThought = pick(row, ["曲に込めた想い", "楽曲への想い", "曲紹介", "紹介文", "記事で触れてほしいポイント"]);
  const internal = pick(row, ["制作側だけに共有するメモ", "内部確認", "運営メモ", "非公開メモ"]);
  const constraints = pick(row, ["触れないでほしいこと", "NG質問", "表記注意", "注意事項", "記事/SNSで触れないこと・表記ルール"]);

  return {
    id: newId("res"),
    episodeId,
    formId,
    respondent,
    status: "未確認",
    publicInfo: compactLines([profile, xUrl && `X: ${xUrl}`]),
    articleUse: compactLines([topics, songThought]),
    internalOnly: internal,
    constraints
  };
};

const buildTrackFromRow = (row, episodeId, source, fallbackArtist = "") => {
  const artist = pick(row, ["アーティスト名", "ゲスト名", "活動名", "応募者名", "担当"]) || fallbackArtist;
  const title = pick(row, ["曲名", "楽曲名", "紹介曲", "タイトル"]);
  const url = pick(row, ["楽曲URL", "曲URL", "URL", "Suno URL", "YouTube URL"]);
  const audioFile = pick(row, ["音源ファイル", "音源ファイルURL", "WAV", "mp3", "音源URL", "Drive URL"]);
  const articlePoint = pick(row, ["曲に込めた想い", "曲紹介", "記事で触れてほしいポイント", "紹介文", "メッセージ"]);
  const honorific = pick(row, ["敬称ルール", "表記注意", "クレジット", "クレジット表記"]);

  if (!title && !url && !audioFile) return null;

  return {
    id: newId("tr"),
    episodeId,
    slotNo: 0,
    source,
    artist,
    title: title || `${artist || source} 紹介曲`,
    urlType: detectUrlType(url),
    url,
    audioFile,
    embedUrl: makeEmbedUrl(url),
    honorific,
    articlePoint,
    status: "取り込み済み"
  };
};

const importRowsIntoData = (current, selectedEpisode, rows, kind) => {
  if (!selectedEpisode || rows.length === 0) {
    return { data: current, result: { responses: 0, tracks: 0 } };
  }

  let nextResponses = current.responses;
  let nextTracks = current.tracks;
  let responseCount = 0;
  let trackCount = 0;

  rows.forEach((row) => {
    if (kind === "guest") {
      const response = buildResponseFromRow(row, selectedEpisode.id, "form_guest");
      if (response.respondent || response.publicInfo || response.articleUse || response.constraints) {
        nextResponses = [
          response,
          ...nextResponses.filter(
            (item) => !(item.episodeId === selectedEpisode.id && item.formId === "form_guest" && item.respondent === response.respondent)
          )
        ];
        responseCount += 1;
      }
      const track = buildTrackFromRow(row, selectedEpisode.id, "ゲスト曲", response.respondent);
      if (track) {
        track.slotNo = nextSlotNo(nextTracks, selectedEpisode.id);
        nextTracks = upsertTrack(nextTracks, track);
        trackCount += 1;
      }
    }

    if (kind === "listener") {
      const track = buildTrackFromRow(row, selectedEpisode.id, "リスナー応募曲");
      if (track) {
        track.slotNo = nextSlotNo(nextTracks, selectedEpisode.id);
        nextTracks = upsertTrack(nextTracks, track);
        trackCount += 1;
      }
    }

    if (kind === "personality") {
      const track = buildTrackFromRow(row, selectedEpisode.id, "パーソナリティ曲");
      if (track) {
        track.slotNo = nextSlotNo(nextTracks, selectedEpisode.id);
        nextTracks = upsertTrack(nextTracks, track);
        trackCount += 1;
      }
    }
  });

  return {
    data: { ...current, responses: nextResponses, tracks: nextTracks },
    result: { responses: responseCount, tracks: trackCount }
  };
};

const encodeSharePayload = (payload) => {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const decodeSharePayload = (value) => {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
};

const readSharedFormPayload = () => {
  const match = window.location.hash.match(/^#\/submit\/(.+)$/);
  if (!match) return null;
  try {
    return decodeSharePayload(match[1]);
  } catch {
    return { error: true };
  }
};

const makeShareUrl = (form) => {
  const payload = {
    version: 1,
    type: "radio-article-studio-form",
    form: {
      id: form.id,
      name: form.name,
      type: form.type,
      description: form.description,
      questions: form.questions
    }
  };
  return `${window.location.origin}${window.location.pathname}#/submit/${encodeSharePayload(payload)}`;
};

const sampleData = {
  settings: {
    obsidianPath: "C:\\Users\\myabe\\OneDrive\\Desktop\\Obsidian Folder\\Umbrella Parade\\Sunoパ！記事",
    wordpressSite: "https://ai-music.noiseinmysoul.com/",
    sePonUrl: "https://umbrellaparade.github.io/SE_Pon/"
  },
  imports: defaultImports,
  thumbnailStudio: defaultThumbnailStudio,
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
        { id: "q_guest_name", label: "ゲスト名 正式表記", kind: "short", required: true, use: "public" },
        { id: "q_guest_x", label: "X URL", kind: "url", required: true, use: "public" },
        { id: "q_profile", label: "活動紹介文", kind: "long", required: true, use: "public" },
        { id: "q_topics", label: "今回話したいこと", kind: "long", required: false, use: "article" },
        { id: "q_ng", label: "触れないでほしいこと/NG質問", kind: "long", required: false, use: "constraint" }
      ]
    },
    {
      id: "form_listener",
      name: "リスナー楽曲応募フォーム",
      type: "リスナー",
      status: "準備中",
      description: "送って頂く楽曲の楽曲名、楽曲URL、WAV/MP3音源、記事掲載可否を集めるフォーム。",
      questions: [
        { id: "q_artist", label: "アーティスト名 正式表記", kind: "short", required: true, use: "article" },
        { id: "q_song", label: "送って頂く楽曲: 楽曲名", kind: "short", required: true, use: "article" },
        { id: "q_music_url", label: "送って頂く楽曲: 楽曲URL（YouTube / Suno）", kind: "url", required: true, use: "article" },
        { id: "q_audio", label: "送って頂く楽曲: WAV/MP3アップロード", kind: "file", required: true, use: "internal" },
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
        { id: "q_title", label: "送って頂く楽曲: 楽曲名", kind: "short", required: true, use: "article" },
        { id: "q_url", label: "送って頂く楽曲: 楽曲URL（YouTube / Suno）", kind: "url", required: true, use: "article" },
        { id: "q_audio", label: "送って頂く楽曲: WAV/MP3アップロード", kind: "file", required: false, use: "internal" },
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
        "Silfiraは参加ではなくプロデュース。TEN6/天ロックフェス主催は深海魚（フカミカトト）さん。",
      attachments: []
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
      audioFile: "",
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
      audioFile: "",
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
      audioFile: "",
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
      audioFile: "",
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

function migrateData(input) {
  const forms = (input.forms ?? sampleData.forms).map((form) => {
    const questions = (form.questions ?? []).map((question) => {
      if (form.id === "form_personality" && question.id === "q_title") {
        return { ...question, label: "送って頂く楽曲: 楽曲名" };
      }
      if (form.id === "form_personality" && question.id === "q_url") {
        return { ...question, label: "送って頂く楽曲: 楽曲URL（YouTube / Suno）" };
      }
      if (question.id === "q_song") {
        return { ...question, label: "送って頂く楽曲: 楽曲名" };
      }
      if (question.id === "q_music_url") {
        return { ...question, label: "送って頂く楽曲: 楽曲URL（YouTube / Suno）" };
      }
      if (question.id === "q_audio") {
        return { ...question, label: "送って頂く楽曲: WAV/MP3アップロード", required: form.id === "form_listener" ? true : question.required };
      }
      return question;
    });

    if (form.id === "form_personality" && !questions.some((question) => question.id === "q_audio")) {
      const urlIndex = questions.findIndex((question) => question.id === "q_url");
      const audioQuestion = {
        id: "q_audio",
        label: "送って頂く楽曲: WAV/MP3アップロード",
        kind: "file",
        required: false,
        use: "internal"
      };
      if (urlIndex >= 0) {
        questions.splice(urlIndex + 1, 0, audioQuestion);
      } else {
        questions.push(audioQuestion);
      }
    }

    return { ...form, questions };
  });

  return {
    ...sampleData,
    ...input,
    imports: { ...defaultImports, ...(input.imports ?? {}) },
    thumbnailStudio: {
      ...defaultThumbnailStudio,
      ...(input.thumbnailStudio ?? {}),
      templates: {
        ...defaultThumbnailStudio.templates,
        ...(input.thumbnailStudio?.templates ?? {})
      },
      guestIcon: {
        ...defaultThumbnailStudio.guestIcon,
        ...(input.thumbnailStudio?.guestIcon ?? {})
      }
    },
    forms,
    responses: (input.responses ?? sampleData.responses).map((response) => ({
      attachments: [],
      ...response
    })),
    tracks: (input.tracks ?? sampleData.tracks).map((track) => ({
      audioFile: "",
      ...track,
      urlType: track.urlType || detectUrlType(track.url)
    }))
  };
}

function loadData() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return migrateData(stored ? JSON.parse(stored) : sampleData);
  } catch {
    return migrateData(sampleData);
  }
}

function App() {
  const logoSrc = `${import.meta.env.BASE_URL}assets/umbrella-parade-logo.png`;
  const [data, setData] = useState(loadData);
  const [active, setActive] = useState("dashboard");
  const [selectedEpisodeId, setSelectedEpisodeId] = useState(data.episodes[0]?.id ?? "");
  const [copied, setCopied] = useState(false);
  const [sharedPayload, setSharedPayload] = useState(readSharedFormPayload);

  useEffect(() => {
    if (sharedPayload) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      console.warn("Radio Article Studio: browser storage quota exceeded. Export JSON to preserve current data.");
    }
  }, [data, sharedPayload]);

  useEffect(() => {
    const onHashChange = () => setSharedPayload(readSharedFormPayload());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

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
        audioFile: "",
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

  const removeQuestion = (formId, questionId) => {
    updateData("forms", (forms) =>
      forms.map((form) =>
        form.id === formId
          ? {
              ...form,
              questions: form.questions.filter((question) => question.id !== questionId)
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
        constraints: "",
        attachments: []
      }
    ]);
    setActive("responses");
  };

  const updateSettings = (patch) => {
    setData((current) => ({ ...current, settings: { ...current.settings, ...patch } }));
  };

  const updateImports = (patch) => {
    setData((current) => ({ ...current, imports: { ...defaultImports, ...current.imports, ...patch } }));
  };

  const appendImportLog = (message) => {
    setData((current) => ({
      ...current,
      imports: {
        ...defaultImports,
        ...current.imports,
        lastLog: [`${new Date().toLocaleString("ja-JP")} ${message}`, ...(current.imports?.lastLog ?? [])].slice(0, 8)
      }
    }));
  };

  const importCsvText = (text, kind, label = "CSV") => {
    const rows = parseCsv(text);
    setData((current) => {
      const { data: next, result } = importRowsIntoData(current, selectedEpisode, rows, kind);
      return next;
    });
    appendImportLog(`${label}: ${rows.length}行を読み込みました。`);
  };

  const importCsvUrl = async (kind, url, label) => {
    const csvUrl = toGoogleCsvUrl(url);
    if (!csvUrl) {
      appendImportLog(`${label}: URLが未入力です。`);
      return;
    }
    try {
      const response = await fetch(csvUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      importCsvText(text, kind, label);
    } catch (error) {
      appendImportLog(`${label}: 読み込みに失敗しました。公開CSV URLまたは共有設定を確認してください。`);
    }
  };

  const importCsvFile = (event, kind, label) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      importCsvText(String(reader.result), kind, `${label}: ${file.name}`);
      event.target.value = "";
    };
    reader.readAsText(file, "utf-8");
  };

  const applyBellboTrackUrl = () => {
    const url = data.imports?.bellboTrackUrl?.trim();
    if (!selectedEpisode || !url) {
      appendImportLog("べるぼ☂曲URL: 放送回またはURLが未入力です。");
      return;
    }

    setData((current) => {
      const existing = current.tracks.find(
        (track) => track.episodeId === selectedEpisode.id && track.source === "パーソナリティ曲" && track.artist === "べるぼ☂"
      );
      const nextTrack = {
        id: existing?.id ?? newId("tr"),
        episodeId: selectedEpisode.id,
        slotNo: existing?.slotNo ?? nextSlotNo(current.tracks, selectedEpisode.id),
        source: "パーソナリティ曲",
        artist: "べるぼ☂",
        title: existing?.title || "べるぼ☂ 紹介曲",
        urlType: detectUrlType(url),
        url,
        audioFile: existing?.audioFile ?? "",
        embedUrl: existing?.embedUrl || makeEmbedUrl(url),
        honorific: "さんなし",
        articlePoint: existing?.articlePoint ?? "",
        status: "URL反映済み"
      };
      return { ...current, tracks: upsertTrack(current.tracks, nextTrack) };
    });
    appendImportLog("べるぼ☂曲URLを今回の放送回に反映しました。");
  };

  const updateThumbnailStudio = (updater) => {
    setData((current) => ({
      ...current,
      thumbnailStudio: typeof updater === "function" ? updater(current.thumbnailStudio ?? defaultThumbnailStudio) : updater
    }));
  };

  const codexPack = useMemo(() => {
    if (!selectedEpisode) return "";
    const responseBlocks = episodeResponses
      .map(
        (response) => `### ${response.respondent || "回答者未入力"}
公開してOKなプロフィール:
${response.publicInfo || "-"}

記事で紹介してほしい内容:
${response.articleUse || "-"}

記事/SNSで触れないこと・表記ルール:
${response.constraints || "-"}`
      )
      .join("\n\n");

    const trackRows = episodeTracks
      .map(
        (track) =>
          `${track.slotNo}. ${track.title || "曲名未入力"} / ${track.artist || "アーティスト未入力"}\n` +
          `   種別: ${track.source} / 楽曲URL: ${track.url || "-"} / 音源ファイル: ${track.audioFile || "-"} / 埋め込み: ${track.embedUrl || "-"}\n` +
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
        const next = migrateData(JSON.parse(String(reader.result)));
        setData(next);
        setSelectedEpisodeId(next.episodes?.[0]?.id ?? "");
      } catch {
        alert("JSONを読み込めませんでした。");
      }
    };
    reader.readAsText(file, "utf-8");
  };

  const importResponseJson = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const response = parsed.response ?? parsed;
        const attachments =
          response.attachments ??
          parsed.attachments ??
          (parsed.rawAnswers ?? [])
            .map((answer) => answer.attachment)
            .filter(Boolean);
        const normalized = {
          id: response.id || newId("res"),
          episodeId: response.episodeId || selectedEpisode?.id || data.episodes[0]?.id || "",
          formId: response.formId || data.forms[0]?.id || "",
          respondent: response.respondent || "",
          status: response.status || "未確認",
          publicInfo: response.publicInfo || "",
          articleUse: response.articleUse || "",
          internalOnly: response.internalOnly || "",
          constraints: response.constraints || "",
          attachments
        };
        updateData("responses", (responses) => [normalized, ...responses]);
        setActive("responses");
      } catch {
        alert("回答JSONを読み込めませんでした。");
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsText(file, "utf-8");
  };

  const resetSample = () => {
    if (!confirm("サンプルデータに戻しますか？現在のブラウザ内データは上書きされます。")) return;
    setData(sampleData);
    setSelectedEpisodeId(sampleData.episodes[0].id);
  };

  if (sharedPayload) {
    return <PublicSubmissionForm logoSrc={logoSrc} payload={sharedPayload} />;
  }

  return (
    <main className="app-shell">
      <Header logoSrc={logoSrc} />

      <nav className="app-nav" aria-label="Main navigation">
        {[
          ["dashboard", "ダッシュボード", Radio],
          ["imports", "取り込み", Upload],
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
          {active === "imports" && (
            <ImportsPanel
              imports={data.imports ?? defaultImports}
              selectedEpisode={selectedEpisode}
              updateImports={updateImports}
              importCsvUrl={importCsvUrl}
              importCsvFile={importCsvFile}
              applyBellboTrackUrl={applyBellboTrackUrl}
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
              removeQuestion={removeQuestion}
            />
          )}
          {active === "responses" && (
            <Responses
              forms={data.forms}
              responses={episodeResponses}
              patchItem={patchItem}
              removeItem={removeItem}
              addResponse={addResponse}
              importResponseJson={importResponseJson}
            />
          )}
          {active === "tracks" && (
            <Tracks tracks={episodeTracks} patchItem={patchItem} removeItem={removeItem} addTrack={addTrack} />
          )}
          {active === "assets" && (
            <Assets
              assets={episodeAssets}
              patchItem={patchItem}
              removeItem={removeItem}
              addAsset={addAsset}
              thumbnailStudio={data.thumbnailStudio ?? defaultThumbnailStudio}
              updateThumbnailStudio={updateThumbnailStudio}
              guestName={selectedEpisode?.guestName ?? ""}
            />
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

function PublicSubmissionForm({ logoSrc, payload }) {
  const form = payload?.form;
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState("");
  const [copied, setCopied] = useState(false);

  if (payload?.error || !form) {
    return (
      <main className="app-shell public-shell">
        <Header logoSrc={logoSrc} />
        <article className="panel">
          <h2>共有フォームを開けませんでした</h2>
          <p className="muted">URLが途中で切れている可能性があります。管理画面から共有リンクを作り直してください。</p>
          <button className="secondary" onClick={() => { window.location.hash = ""; }}>管理画面へ戻る</button>
        </article>
      </main>
    );
  }

  const updateAnswer = (questionId, value) => {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  };

  const updateFileAnswer = async (questionId, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!isAudioUpload(file)) {
      alert("WAVまたはMP3ファイルを選んでください。");
      event.target.value = "";
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    updateAnswer(questionId, {
      fileName: file.name,
      mimeType: file.type || (file.name.toLowerCase().endsWith(".wav") ? "audio/wav" : "audio/mpeg"),
      size: file.size,
      dataUrl
    });
  };

  const formatAnswers = (uses) =>
    form.questions
      .filter((question) => uses.includes(question.use))
      .map((question) => `${question.label}: ${formatAnswerValue(answers[question.id])}`)
      .join("\n");

  const inferRespondent = () => {
    const nameQuestion = form.questions.find((question) => /名前|名|アーティスト|ゲスト/i.test(question.label));
    return (nameQuestion && answers[nameQuestion.id]) || "";
  };

  const buildResponsePayload = () => {
    const attachments = form.questions
      .filter((question) => question.kind === "file" && answers[question.id]?.dataUrl)
      .map((question) => ({
        questionId: question.id,
        questionLabel: question.label,
        fileName: answers[question.id].fileName,
        mimeType: answers[question.id].mimeType,
        size: answers[question.id].size,
        dataUrl: answers[question.id].dataUrl
      }));

    return {
      version: 1,
      type: "radio-article-studio-response",
      exportedAt: new Date().toISOString(),
      response: {
        id: newId("res"),
        episodeId: "",
        formId: form.id,
        respondent: inferRespondent(),
        status: "未確認",
        publicInfo: formatAnswers(["public"]),
        articleUse: formatAnswers(["article", "sns", "manga"]),
        internalOnly: formatAnswers(["internal"]),
        constraints: formatAnswers(["constraint"]),
        attachments
      },
      rawAnswers: form.questions.map((question) => ({
        id: question.id,
        label: question.label,
        use: question.use,
        useLabel: QUESTION_USE_LABELS[question.use] ?? question.use,
        answer: formatAnswerValue(answers[question.id]),
        attachment: question.kind === "file" ? answers[question.id] || null : null
      }))
    };
  };

  const submit = (event) => {
    event.preventDefault();
    setResult(JSON.stringify(buildResponsePayload(), null, 2));
  };

  const copyResult = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const downloadResult = () => {
    if (!result) return;
    const blob = new Blob([result], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${form.id}-response.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="app-shell public-shell">
      <Header logoSrc={logoSrc} />
      <article className="panel">
        <div className="public-head">
          <div>
            <p className="eyebrow slim">Shared Form</p>
            <h2>{form.name}</h2>
            {form.description && <p className="muted">{form.description}</p>}
          </div>
          <button className="secondary" onClick={() => { window.location.hash = ""; }}>管理画面へ戻る</button>
        </div>

        <form className="public-form" onSubmit={submit}>
          {form.questions.map((question) => (
            <label className="field wide" key={question.id}>
              <span>{question.label}{question.required ? " *" : ""}</span>
              <small>{QUESTION_USE_LABELS[question.use] ?? question.use}</small>
              {question.kind === "file" ? (
                <div className="upload-field">
                  <input
                    type="file"
                    required={Boolean(question.required)}
                    accept={AUDIO_FILE_ACCEPT}
                    onChange={(event) => updateFileAnswer(question.id, event)}
                  />
                  <small>{answers[question.id]?.fileName ? `選択済み: ${formatAnswerValue(answers[question.id])}` : "WAVまたはMP3をアップロード"}</small>
                </div>
              ) : question.kind === "long" ? (
                <textarea
                  required={Boolean(question.required)}
                  value={answers[question.id] ?? ""}
                  onChange={(event) => updateAnswer(question.id, event.target.value)}
                />
              ) : (
                <input
                  type={question.kind === "url" ? "url" : "text"}
                  required={Boolean(question.required)}
                  value={answers[question.id] ?? ""}
                  onChange={(event) => updateAnswer(question.id, event.target.value)}
                />
              )}
            </label>
          ))}
          <button className="primary" type="submit"><Send size={16} />回答データを作成</button>
        </form>

        {result && (
          <div className="result-box">
            <div className="record-head">
              <strong>回答JSON</strong>
              <div className="inline-actions">
                <button className="secondary" onClick={copyResult}><ClipboardCopy size={16} />{copied ? "コピー済み" : "コピー"}</button>
                <button className="secondary" onClick={downloadResult}><Download size={16} />ダウンロード</button>
              </div>
            </div>
            <textarea className="pack-output compact" value={result} readOnly />
          </div>
        )}
      </article>
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

function ImportsPanel({ imports, selectedEpisode, updateImports, importCsvUrl, importCsvFile, applyBellboTrackUrl }) {
  return (
    <div className="view-stack">
      <SectionTitle
        title="自動取り込み"
        subtitle="アンケートや応募フォームのスプレッドシートを取り込みます。べるぼ☂が手で入れるのは基本的に自分の曲URLだけです。"
      />

      <article className="panel">
        <h2>今回の放送回</h2>
        <dl className="detail-list">
          <div><dt>タイトル</dt><dd>{selectedEpisode?.title || "未選択"}</dd></div>
          <div><dt>放送日</dt><dd>{selectedEpisode?.date || "-"}</dd></div>
          <div><dt>ゲスト</dt><dd>{selectedEpisode?.guestName || "-"}</dd></div>
        </dl>
      </article>

      <div className="import-grid">
        <SourceImportCard
          title="ゲストアンケート"
          description="ゲスト情報、紹介曲、NG事項、アイコンURLなどを取り込みます。"
          value={imports.guestCsvUrl}
          onChange={(value) => updateImports({ guestCsvUrl: value })}
          onImportUrl={() => importCsvUrl("guest", imports.guestCsvUrl, "ゲストアンケート")}
          onImportFile={(event) => importCsvFile(event, "guest", "ゲストアンケート")}
        />
        <SourceImportCard
          title="リスナー応募曲"
          description="応募者名、曲名、楽曲URL、音源ファイル、表記注意を取り込みます。"
          value={imports.listenerCsvUrl}
          onChange={(value) => updateImports({ listenerCsvUrl: value })}
          onImportUrl={() => importCsvUrl("listener", imports.listenerCsvUrl, "リスナー応募曲")}
          onImportFile={(event) => importCsvFile(event, "listener", "リスナー応募曲")}
        />
        <SourceImportCard
          title="パーソナリティ曲シート"
          description="かなめ🦐曲など、運営側で別シート管理している曲情報を取り込みます。"
          value={imports.personalityCsvUrl}
          onChange={(value) => updateImports({ personalityCsvUrl: value })}
          onImportUrl={() => importCsvUrl("personality", imports.personalityCsvUrl, "パーソナリティ曲")}
          onImportFile={(event) => importCsvFile(event, "personality", "パーソナリティ曲")}
        />
      </div>

      <article className="panel focus-panel">
        <div>
          <h2>べるぼ☂の今回の曲</h2>
          <p className="muted">ここだけ手入力。URLを入れると、今回の放送回のパーソナリティ曲として反映します。</p>
        </div>
        <div className="bellbo-url-row">
          <Field label="べるぼ☂ 曲URL（Suno / YouTube）" value={imports.bellboTrackUrl} onChange={(value) => updateImports({ bellboTrackUrl: value })} />
          <button className="primary" onClick={applyBellboTrackUrl}><Save size={16} />曲URLを反映</button>
        </div>
      </article>

      <article className="panel">
        <h2>取り込みログ</h2>
        <div className="log-list">
          {(imports.lastLog ?? []).length ? (
            imports.lastLog.map((line) => <div key={line}>{line}</div>)
          ) : (
            <p className="muted">まだ取り込みはありません。</p>
          )}
        </div>
      </article>

      <article className="panel">
        <h2>対応しやすい列名</h2>
        <p className="muted">
          ゲスト名、活動紹介文、今回話したいこと、触れないでほしいこと、曲名、アーティスト名、楽曲URL、音源ファイル、記事で触れてほしいポイント、表記注意。
        </p>
      </article>
    </div>
  );
}

function SourceImportCard({ title, description, value, onChange, onImportUrl, onImportFile }) {
  return (
    <article className="record import-card">
      <h2>{title}</h2>
      <p className="muted">{description}</p>
      <Field label="Google Sheets / CSV URL" value={value} onChange={onChange} />
      <div className="button-row">
        <button className="primary" onClick={onImportUrl}><Upload size={16} />URLから取り込み</button>
        <label className="secondary file-button">
          <Upload size={16} />CSVファイル
          <input type="file" accept=".csv,text/csv" onChange={onImportFile} />
        </label>
      </div>
    </article>
  );
}

function downloadAttachment(attachment) {
  if (!attachment?.dataUrl) return;
  const anchor = document.createElement("a");
  anchor.href = attachment.dataUrl;
  anchor.download = attachment.fileName || "audio-file";
  anchor.click();
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

function Forms({ forms, patchItem, removeItem, addForm, addQuestion, patchQuestion, removeQuestion }) {
  const [copiedFormId, setCopiedFormId] = useState("");

  const copyShareUrl = async (form) => {
    await navigator.clipboard.writeText(makeShareUrl(form));
    setCopiedFormId(form.id);
    window.setTimeout(() => setCopiedFormId(""), 1800);
  };

  return (
    <div className="view-stack">
      <SectionTitle title="フォーム管理" subtitle="質問テンプレートを作り、共有フォームURLから回答してもらえます。現時点の回答回収はJSON受け取り方式です。" action={<button className="primary" onClick={addForm}><Plus size={16} />フォーム追加</button>} />
      <div className="records">
        {forms.map((form) => (
          <article className="record" key={form.id}>
            <div className="record-head">
              <strong>{form.name}</strong>
              <button className="icon-danger" onClick={() => removeItem("forms", form.id)}><Trash2 size={16} /></button>
            </div>
            <div className="form-grid">
              <Field label="フォーム名" value={form.name} onChange={(value) => patchItem("forms", form.id, { name: value })} />
              <TextArea label="説明" value={form.description} onChange={(value) => patchItem("forms", form.id, { description: value })} />
            </div>
            <div className="share-box">
              <div>
                <strong><Share2 size={16} />共有フォーム</strong>
                <span>回答者は入力後、回答JSONをコピーまたはダウンロードします。自動回収はGoogle Sheets/Drive連携で追加予定。</span>
              </div>
              <input readOnly value={makeShareUrl(form)} onFocus={(event) => event.target.select()} />
              <button className="secondary" onClick={() => copyShareUrl(form)}>
                <ClipboardCopy size={16} />{copiedFormId === form.id ? "コピー済み" : "リンクをコピー"}
              </button>
            </div>
            <div className="question-list">
              <div className="subhead">質問項目</div>
              <p className="hint-text">入力形式: 短文は1行、長文は複数行、URLはリンク、選択式は決まった候補から選ぶ項目です。</p>
              {form.questions.map((question) => (
                <div className="question-row" key={question.id}>
                  <input value={question.label} onChange={(event) => patchQuestion(form.id, question.id, { label: event.target.value })} />
                  <select value={question.kind} onChange={(event) => patchQuestion(form.id, question.id, { kind: event.target.value })}>
                    {QUESTION_KIND_OPTIONS.map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  <select value={question.use} onChange={(event) => patchQuestion(form.id, question.id, { use: event.target.value })}>
                    {QUESTION_USE_OPTIONS.map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  <label className="mini-check">
                    <input type="checkbox" checked={Boolean(question.required)} onChange={(event) => patchQuestion(form.id, question.id, { required: event.target.checked })} />
                    必須
                  </label>
                  <button className="icon-danger" onClick={() => removeQuestion(form.id, question.id)} aria-label="質問を削除"><Trash2 size={16} /></button>
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

function Responses({ forms, responses, patchItem, removeItem, addResponse, importResponseJson }) {
  return (
    <div className="view-stack">
      <SectionTitle
        title="回答管理"
        subtitle="公開できる情報、記事に使う内容、制作メモ、掲載NG/表記ルールを分けて保持します。"
        action={
          <div className="inline-actions">
            <label className="secondary file-button">
              <Upload size={16} />回答JSONを読み込み
              <input type="file" accept="application/json" onChange={importResponseJson} />
            </label>
            <button className="primary" onClick={addResponse}><Plus size={16} />回答追加</button>
          </div>
        }
      />
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
              <TextArea label="公開してOKなプロフィール" value={response.publicInfo} onChange={(value) => patchItem("responses", response.id, { publicInfo: value })} />
              <TextArea label="記事で紹介してほしい内容" value={response.articleUse} onChange={(value) => patchItem("responses", response.id, { articleUse: value })} />
              <TextArea label="制作側だけに共有するメモ" value={response.internalOnly} onChange={(value) => patchItem("responses", response.id, { internalOnly: value })} />
              <TextArea label="記事/SNSで触れないこと・表記ルール" value={response.constraints} onChange={(value) => patchItem("responses", response.id, { constraints: value })} />
            </div>
            {response.attachments?.length > 0 && (
              <div className="attachment-list">
                <div className="subhead">添付音源</div>
                {response.attachments.map((attachment, index) => (
                  <div className="attachment-item" key={`${attachment.fileName}-${index}`}>
                    <span>{attachment.fileName}</span>
                    <small>{Math.round((attachment.size || 0) / 1024 / 1024 * 10) / 10}MB</small>
                    <button className="secondary" onClick={() => downloadAttachment(attachment)}><Download size={16} />ダウンロード</button>
                  </div>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

function Tracks({ tracks, patchItem, removeItem, addTrack }) {
  const updateTrackUrl = (track, url) => {
    patchItem("tracks", track.id, { url, urlType: detectUrlType(url) });
  };

  return (
    <div className="view-stack">
      <SectionTitle title="楽曲/音源管理" subtitle="1曲を1ブロックで管理します。楽曲名、楽曲URL、音源ファイルをまとめて入力します。" action={<button className="primary" onClick={addTrack}><Plus size={16} />楽曲追加</button>} />
      <div className="records">
        {tracks.map((track) => (
          <article className="record" key={track.id}>
            <div className="record-head">
              <strong>{track.slotNo}. {track.title || "楽曲名未入力"} / {track.artist || "アーティスト未入力"}</strong>
              <button className="icon-danger" onClick={() => removeItem("tracks", track.id)}><Trash2 size={16} /></button>
            </div>
            <div className="track-meta-grid">
              <Field label="曲順" type="number" value={track.slotNo} onChange={(value) => patchItem("tracks", track.id, { slotNo: value })} />
              <SelectField label="紹介枠" value={track.source} options={["ゲスト曲", "パーソナリティ曲", "リスナー応募曲"]} onChange={(value) => patchItem("tracks", track.id, { source: value })} />
              <Field label="アーティスト名" value={track.artist} onChange={(value) => patchItem("tracks", track.id, { artist: value })} />
            </div>
            <div className="song-card">
              <div className="song-card-title">
                <Music size={17} />
                <span>1曲分の情報</span>
                <b>{track.url ? detectUrlType(track.url) : "URL未入力"}</b>
              </div>
              <div className="form-grid">
                <Field label="楽曲名" value={track.title} onChange={(value) => patchItem("tracks", track.id, { title: value })} />
                <Field label="楽曲URL（YouTube / Suno）" value={track.url} onChange={(value) => updateTrackUrl(track, value)} />
                <Field label="音源ファイル（WAV / mp3）" value={track.audioFile} onChange={(value) => patchItem("tracks", track.id, { audioFile: value })} />
                <Field label="埋め込みURL（必要なら）" value={track.embedUrl} onChange={(value) => patchItem("tracks", track.id, { embedUrl: value })} />
                <Field label="敬称ルール" value={track.honorific} onChange={(value) => patchItem("tracks", track.id, { honorific: value })} />
                <TextArea label="記事で触れるポイント" value={track.articlePoint} onChange={(value) => patchItem("tracks", track.id, { articlePoint: value })} />
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const loadCanvasImage = (src) =>
  new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });

function drawCoverAt(ctx, image, x, y, width, height) {
  const scale = Math.max(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const drawX = x + (width - drawWidth) / 2;
  const drawY = y + (height - drawHeight) / 2;
  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
}

function drawCover(ctx, image, width, height) {
  drawCoverAt(ctx, image, 0, 0, width, height);
}

async function renderThumbnail({ preset, template, icon }) {
  if (!template?.dataUrl || !icon?.dataUrl) throw new Error("template-or-icon-missing");
  const canvas = document.createElement("canvas");
  canvas.width = preset.width;
  canvas.height = preset.height;
  const ctx = canvas.getContext("2d");
  const [baseImage, iconImage] = await Promise.all([loadCanvasImage(template.dataUrl), loadCanvasImage(icon.dataUrl)]);

  drawCover(ctx, baseImage, preset.width, preset.height);

  const diameter = Math.round((Math.min(preset.width, preset.height) * Number(template.iconSize || 28)) / 100);
  const centerX = Math.round((preset.width * Number(template.iconX || 50)) / 100);
  const centerY = Math.round((preset.height * Number(template.iconY || 50)) / 100);
  const x = centerX - diameter / 2;
  const y = centerY - diameter / 2;

  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, diameter / 2, 0, Math.PI * 2);
  ctx.clip();
  drawCoverAt(ctx, iconImage, x, y, diameter, diameter);
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, diameter / 2, 0, Math.PI * 2);
  ctx.lineWidth = Math.max(6, Math.round(diameter * 0.035));
  ctx.strokeStyle = "rgba(255,255,255,.94)";
  ctx.stroke();
  ctx.restore();

  return canvas.toDataURL("image/png");
}

function ThumbnailComposer({ studio, updateStudio, guestName }) {
  const [preview, setPreview] = useState({});
  const [message, setMessage] = useState("");

  const handleTemplateFile = async (presetKey, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    updateStudio((current) => ({
      ...defaultThumbnailStudio,
      ...current,
      templates: {
        ...defaultThumbnailStudio.templates,
        ...current.templates,
        [presetKey]: {
          ...defaultThumbnailStudio.templates[presetKey],
          ...current.templates?.[presetKey],
          name: file.name,
          dataUrl
        }
      }
    }));
    event.target.value = "";
  };

  const handleIconFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    updateStudio((current) => ({ ...defaultThumbnailStudio, ...current, guestIcon: { name: file.name, dataUrl } }));
    event.target.value = "";
  };

  const patchTemplate = (presetKey, patch) => {
    updateStudio((current) => ({
      ...defaultThumbnailStudio,
      ...current,
      templates: {
        ...defaultThumbnailStudio.templates,
        ...current.templates,
        [presetKey]: {
          ...defaultThumbnailStudio.templates[presetKey],
          ...current.templates?.[presetKey],
          ...patch
        }
      }
    }));
  };

  const generateOne = async (preset) => {
    try {
      const dataUrl = await renderThumbnail({
        preset,
        template: studio.templates?.[preset.key],
        icon: studio.guestIcon
      });
      setPreview((current) => ({ ...current, [preset.key]: dataUrl }));
      setMessage(`${preset.label} を生成しました。`);
    } catch {
      setMessage("ベース画像とゲストアイコンを先にセットしてください。");
    }
  };

  const downloadOne = (preset) => {
    const dataUrl = preview[preset.key];
    if (!dataUrl) return;
    const anchor = document.createElement("a");
    anchor.href = dataUrl;
    anchor.download = `${guestName || "guest"}-${preset.fileName}`;
    anchor.click();
  };

  return (
    <article className="panel thumbnail-studio">
      <div className="record-head">
        <div>
          <h2>サムネ自動合成</h2>
          <p className="muted">3サイズのベース画像に、ゲストアイコンを指定位置で重ねます。</p>
        </div>
        <label className="secondary file-button">
          <Upload size={16} />ゲストアイコン
          <input type="file" accept="image/*" onChange={handleIconFile} />
        </label>
      </div>

      {studio.guestIcon?.name && <p className="muted">ゲストアイコン: {studio.guestIcon.name}</p>}
      {message && <p className="hint-text">{message}</p>}

      <div className="thumbnail-grid">
        {THUMBNAIL_PRESETS.map((preset) => {
          const template = studio.templates?.[preset.key] ?? defaultThumbnailStudio.templates[preset.key];
          return (
            <section className="thumbnail-card" key={preset.key}>
              <div className="thumbnail-card-head">
                <strong>{preset.label}</strong>
                <span>{preset.width} x {preset.height}</span>
              </div>
              <label className="secondary file-button">
                <Upload size={16} />ベース画像
                <input type="file" accept="image/*" onChange={(event) => handleTemplateFile(preset.key, event)} />
              </label>
              <p className="muted">{template.name || "未セット"}</p>
              <div className="slider-grid">
                <SliderField label="横位置" value={template.iconX} onChange={(value) => patchTemplate(preset.key, { iconX: value })} />
                <SliderField label="縦位置" value={template.iconY} onChange={(value) => patchTemplate(preset.key, { iconY: value })} />
                <SliderField label="サイズ" value={template.iconSize} onChange={(value) => patchTemplate(preset.key, { iconSize: value })} min="10" max="60" />
              </div>
              <div className="button-row">
                <button className="primary" onClick={() => generateOne(preset)}>生成</button>
                <button className="secondary" onClick={() => downloadOne(preset)} disabled={!preview[preset.key]}>PNG保存</button>
              </div>
              {preview[preset.key] && <img className="thumbnail-preview" src={preview[preset.key]} alt={`${preset.label} preview`} />}
            </section>
          );
        })}
      </div>
    </article>
  );
}

function Assets({ assets, patchItem, removeItem, addAsset, thumbnailStudio, updateThumbnailStudio, guestName }) {
  return (
    <div className="view-stack">
      <SectionTitle title="サムネ/素材管理" subtitle="記事16:9、stand.fm 1:1、配信背景9:16、音源フォルダーなどを放送回に紐づけます。" action={<button className="primary" onClick={addAsset}><Plus size={16} />素材追加</button>} />
      <ThumbnailComposer studio={thumbnailStudio} updateStudio={updateThumbnailStudio} guestName={guestName} />
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

function SliderField({ label, value, onChange, min = "0", max = "100" }) {
  return (
    <label className="field">
      <span>{label}: {value}%</span>
      <input type="range" min={min} max={max} value={value ?? 50} onChange={(event) => onChange(Number(event.target.value))} />
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
