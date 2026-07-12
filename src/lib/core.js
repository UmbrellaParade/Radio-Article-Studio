// 純粋ヘルパー・定数・サンプルデータ・データ移行（React非依存）
import LZString from "lz-string";
import { postToGasEndpoint, getFromGasEndpoint, loadAppConfig } from "./gas.js";

export const STORAGE_KEY = "radio-article-studio:v1";
export const STORAGE_COMPRESSED_PREFIX = "lz16:";
export const THUMBNAIL_IMAGE_DB_NAME = "radio-article-studio-thumbnails";
export const THUMBNAIL_IMAGE_STORE = "generated";
export const SHARED_FORMS_DIR = "shared-forms";
export const DEFAULT_OBSIDIAN_PATH = "C:\\Users\\myabe\\OneDrive\\Desktop\\Obsidian Folder\\Umbrella Parade\\Sunoパ！記事";
export const DEFAULT_BELLBO_X_HANDLE = "bellbo13";
export const DEFAULT_KANAME_X_HANDLE = "kaname_mbembe";
export const DEFAULT_X_CONTACT_MESSAGE =
  "Xでご連絡するため、べるぼ☂とかなめ🦐のアカウントをフォローお願いします。フォローいただいていない場合、こちらからDMをお送りできないことがあります。";
export const DEFAULT_RESPONSE_ENDPOINT_URL = "";
export const DEFAULT_RESPONSE_DRIVE_FOLDER_URL = "https://drive.google.com/drive/folders/1FnQ0knOIUKnTOYisf7JdKJNORsTgDwza";
export const DEFAULT_ATTACHMENT_LIMIT_MB = 200;
export const MAX_ATTACHMENT_LIMIT_MB = 200;
export const GAS_DIRECT_UPLOAD_LIMIT_MB = 35;
// 旧コード互換用。公開フォームではフォームごとの添付上限を優先する。
export const MAX_SUBMISSION_BYTES = DEFAULT_ATTACHMENT_LIMIT_MB * 1024 * 1024;
export const DEFAULT_THUMBNAIL_DRIVE_ENDPOINT_URL = "";
export const DEFAULT_THUMBNAIL_DRIVE_FOLDER_URL = "";
export const DEFAULT_AUDIO_SAVE_MEMO = "PC: デスクトップのポン出し音源一覧 / Drive: 指定フォルダー";
export const publicAsset = (path) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;
export const GUEST_BADGE_ASSET_URL = publicAsset("thumbnail-overlays/guest-in-badge.png");

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(publicAsset("sw.js"), { scope: import.meta.env.BASE_URL }).catch(() => {
      console.warn("Radio Article Studio: service worker registration failed.");
    });
  });
}

export const openThumbnailImageDb = () =>
  new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("indexeddb-unavailable"));
      return;
    }
    const request = window.indexedDB.open(THUMBNAIL_IMAGE_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(THUMBNAIL_IMAGE_STORE)) {
        db.createObjectStore(THUMBNAIL_IMAGE_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

export const saveGeneratedThumbnailImage = async (id, dataUrl) => {
  const db = await openThumbnailImageDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(THUMBNAIL_IMAGE_STORE, "readwrite");
    transaction.objectStore(THUMBNAIL_IMAGE_STORE).put({ id, dataUrl, savedAt: new Date().toISOString() });
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
};

export const deleteGeneratedThumbnailImage = async (id) => {
  if (!id) return;
  const db = await openThumbnailImageDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(THUMBNAIL_IMAGE_STORE, "readwrite");
    transaction.objectStore(THUMBNAIL_IMAGE_STORE).delete(id);
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
};

export const loadGeneratedThumbnailImage = async (id) => {
  if (!id) return "";
  const db = await openThumbnailImageDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(THUMBNAIL_IMAGE_STORE, "readonly");
    const request = transaction.objectStore(THUMBNAIL_IMAGE_STORE).get(id);
    request.onsuccess = () => {
      db.close();
      resolve(request.result?.dataUrl || "");
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
};

export const QUESTION_USE_OPTIONS = [
  ["public", "公開してOKなプロフィール"],
  ["article", "記事で紹介してほしい内容"],
  ["constraint", "記事/SNSで触れないこと・表記ルール"],
  ["internal", "制作側だけに共有するメモ"],
  ["sns", "SNS投稿に使ってOK"],
  ["manga", "漫画/画像案に使ってOK"]
];

export const QUESTION_USE_LABELS = Object.fromEntries(QUESTION_USE_OPTIONS);

export const QUESTION_KIND_OPTIONS = [
  ["short", "短文"],
  ["long", "長文"],
  ["url", "URL"],
  ["track", "楽曲"],
  ["image", "画像"],
  ["x_contact", "X連絡ブロック"],
  ["choice", "選択式"],
  ["file", "音源ファイル単体"]
];

export const TRACK_FIELD_TYPE_OPTIONS = [
  ["audio", "音源アップロード"],
  ["audioUrl", "大容量音源URL"],
  ["title", "楽曲名"],
  ["artist", "アーティスト名"],
  ["aiArtist", "AIアーティスト名"],
  ["url", "楽曲URL"]
];

export const DEFAULT_TRACK_FIELDS = [
  {
    id: "audio",
    type: "audio",
    label: "楽曲をWAVかMP3でアップロード",
    help: "WAVはフォーム上でMP3へ変換して送信します。MP3はそのまま送信します。",
    note: "MP3変換後も35MBを超える音源は、下の大容量音源URLにDriveなどの共有リンクを貼ってください。",
    placeholder: ""
  },
  {
    id: "audioUrl",
    type: "audioUrl",
    label: "大容量音源URL（Driveなど）",
    help: "35MBを超えるWAV/MP3はGoogle Driveなどにアップロードし、共有リンクを貼ってください。",
    note: "",
    placeholder: "https://drive.google.com/..."
  },
  {
    id: "title",
    type: "title",
    label: "楽曲名",
    help: "正式な楽曲名を入力してください。あとから修正できます。",
    note: "",
    placeholder: ""
  },
  {
    id: "artist",
    type: "artist",
    label: "アーティスト名",
    help: "記事や紹介欄に載せる正式表記を入力してください。",
    note: "",
    placeholder: ""
  },
  {
    id: "aiArtist",
    type: "aiArtist",
    label: "AIアーティスト名",
    help: "Sunoなどで使っているAIアーティスト名や名義があれば入力してください。",
    note: "",
    placeholder: ""
  },
  {
    id: "url",
    type: "url",
    label: "楽曲URL（YouTube / Suno）",
    help: "YouTubeまたはSunoの共有URLだけ受け付けます。",
    note: "",
    placeholder: "https://youtu.be/... または https://suno.com/..."
  }
];

export const FORM_COLOR_PALETTE = [
  "#8bd7df",
  "#f4b6c2",
  "#b8d98f",
  "#f3c96b",
  "#bfa7f2",
  "#f5a56f",
  "#9ec5ff",
  "#d7b78a"
];

export const DEFAULT_FORM_COLOR = FORM_COLOR_PALETTE[0];

export const normalizeFormColor = (value = "", fallback = DEFAULT_FORM_COLOR) => {
  const color = String(value || "").trim();
  if (/^#[0-9a-f]{6}$/i.test(color)) return color.toLowerCase();
  return /^#[0-9a-f]{6}$/i.test(fallback) ? fallback.toLowerCase() : DEFAULT_FORM_COLOR;
};

const TRACK_FIELD_DEFAULTS_BY_TYPE = Object.fromEntries(DEFAULT_TRACK_FIELDS.map((field) => [field.type, field]));

export const normalizeTrackFields = (fields) => {
  // 未設定（旧データ）は既定の全項目にする。配列で保存されている場合は
  // 「入っている項目だけ」を尊重し、削除した項目を勝手に復活させない。
  if (!Array.isArray(fields)) return DEFAULT_TRACK_FIELDS.map((field) => ({ ...field }));
  const usedTypes = new Set();
  const normalized = [];

  fields.forEach((field) => {
    const type = String(field?.type || field?.id || "").trim();
    const defaults = TRACK_FIELD_DEFAULTS_BY_TYPE[type];
    if (!defaults || usedTypes.has(type)) return;
    normalized.push({ ...defaults, ...field, id: defaults.id, type });
    usedTypes.add(type);
  });

  return normalized;
};

export const normalizeSubmissionLimit = (value) => {
  const limit = Math.floor(Number(value || 0));
  return Number.isFinite(limit) && limit > 0 ? limit : 0;
};

export const normalizeAttachmentLimitMb = (value, fallback = DEFAULT_ATTACHMENT_LIMIT_MB) => {
  const limit = Math.floor(Number(value || 0));
  if (Number.isFinite(limit) && limit > 0) return Math.min(limit, MAX_ATTACHMENT_LIMIT_MB);
  const fallbackLimit = Math.floor(Number(fallback || DEFAULT_ATTACHMENT_LIMIT_MB));
  return Number.isFinite(fallbackLimit) && fallbackLimit > 0
    ? Math.min(fallbackLimit, MAX_ATTACHMENT_LIMIT_MB)
    : DEFAULT_ATTACHMENT_LIMIT_MB;
};

export const TRACK_URL_ERROR_MESSAGE = "楽曲URLはYouTubeまたはSunoのURLを入力してください。";
export const TRACK_URL_PATTERN = "https?://([A-Za-z0-9-]+\\.)?(youtube\\.com|suno\\.com)(/.*)?|https?://youtu\\.be(/.*)?";

export const detectUrlType = (url = "") => {
  const normalized = url.toLowerCase();
  if (normalized.includes("suno.com")) return "Suno";
  if (normalized.includes("youtube.com") || normalized.includes("youtu.be")) return "YouTube";
  if (normalized.includes("spotify.com")) return "Spotify";
  if (normalized.match(/\.(mp3|wav)(\?|#|$)/)) return "Audio";
  return "Other";
};

export const AUDIO_FILE_ACCEPT = "audio/mpeg,audio/mp3,audio/wav,audio/x-wav,.mp3,.wav";
export const IMAGE_FILE_ACCEPT = "image/png,image/jpeg,image/webp,image/gif,.png,.jpg,.jpeg,.webp,.gif";

export const isAudioUpload = (file) => {
  const name = file?.name?.toLowerCase() ?? "";
  return name.endsWith(".mp3") || name.endsWith(".wav") || ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav"].includes(file?.type);
};

export const isImageUpload = (file) => {
  const name = file?.name?.toLowerCase() ?? "";
  return /\.(png|jpe?g|webp|gif)$/.test(name) || String(file?.type ?? "").startsWith("image/");
};

export const isAudioAttachment = (attachment) => {
  const name = attachment?.fileName?.toLowerCase() ?? "";
  const mime = attachment?.mimeType?.toLowerCase() ?? "";
  return name.endsWith(".mp3") || name.endsWith(".wav") || mime.includes("audio/");
};

export const isImageAttachment = (attachment) => {
  const name = attachment?.fileName?.toLowerCase() ?? "";
  const mime = attachment?.mimeType?.toLowerCase() ?? "";
  const src = String(attachment?.dataUrl || attachment?.sourceUrl || attachment?.url || "").toLowerCase();
  return /\.(png|jpe?g|webp|gif)(\?|#|$)/.test(name) || mime.startsWith("image/") || src.startsWith("data:image/");
};

export const isGuestIconAttachment = (attachment) => {
  if (!isImageAttachment(attachment)) return false;
  const text = `${attachment.questionLabel || ""} ${attachment.questionId || ""} ${attachment.fileName || ""}`.toLowerCase();
  return /ゲスト|アイコン|icon|avatar|profile|プロフィール|画像/.test(text);
};

export const findGuestIconAttachment = (attachments = []) =>
  attachments.find(isGuestIconAttachment) || attachments.find(isImageAttachment) || null;

export const makeGuestIconFromAttachment = (attachment, fallbackName = "guest-icon") =>
  attachment
    ? {
        name: attachment.fileName || attachment.questionLabel || fallbackName,
        dataUrl: makeImagePreviewUrl(attachment.dataUrl || attachment.sourceUrl || attachment.url || ""),
        cropX: 50,
        cropY: 50,
        cropZoom: 100,
        source: "response",
        updatedAt: new Date().toISOString()
      }
    : null;

export const mergeGuestIcons = (currentStudio = defaultThumbnailStudio, incomingIcon) => {
  const existingIcons = normalizeGuestIconList(currentStudio.guestIcon, currentStudio.guestIcons);
  const nextIcons = normalizeGuestIconList(incomingIcon, incomingIcon ? [...existingIcons, incomingIcon] : existingIcons);
  return {
    ...defaultThumbnailStudio,
    ...currentStudio,
    guestIcon: nextIcons[0] ?? { ...defaultThumbnailStudio.guestIcon },
    guestIcons: nextIcons
  };
};

export const normalizeXHandle = (value = "") =>
  String(value)
    .trim()
    .replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//i, "")
    .replace(/^@/, "")
    .split(/[/?#]/)[0]
    .replace(/[^A-Za-z0-9_]/g, "");

export const makeXUrl = (value = "") => {
  const handle = normalizeXHandle(value);
  return handle ? `https://x.com/${handle}` : "";
};

export const formatXHandle = (value = "") => {
  const handle = normalizeXHandle(value);
  return handle ? `@${handle}` : "";
};

export const extractXHandleFromText = (value = "") => {
  const text = String(value || "");
  const handleMatch = text.match(/@([A-Za-z0-9_]{1,15})/);
  if (handleMatch) return normalizeXHandle(handleMatch[1]);
  const urlMatch = text.match(/https?:\/\/(?:www\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})/i);
  if (urlMatch) return normalizeXHandle(urlMatch[1]);
  return "";
};

export const formatJapaneseDate = (dateString = "") => {
  if (!dateString) return "配信日未定";
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateString;
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日（${weekdays[date.getDay()]}）`;
};

export const normalizeAdditionalXAccounts = (accounts = []) =>
  accounts
    .map((account, index) => {
      const handle = normalizeXHandle(account?.handle || account?.xHandle || account?.url || "");
      const label = String(account?.label || account?.name || handle || `追加アカウント${index + 1}`).trim();
      return handle
        ? {
            id: account?.id || `x_extra_${index}_${handle}`,
            label,
            handle
          }
        : null;
    })
    .filter(Boolean);

export const getContactAccountList = (source = {}) => {
  const accounts = [];
  const bellbo = normalizeXHandle(source.bellboXHandle || source.contactAccounts?.bellbo || DEFAULT_BELLBO_X_HANDLE);
  const kaname = normalizeXHandle(source.kanameXHandle || source.contactAccounts?.kaname || DEFAULT_KANAME_X_HANDLE);
  if (bellbo) accounts.push({ id: "bellbo", label: "べるぼ☂", handle: bellbo });
  if (kaname) accounts.push({ id: "kaname", label: "かなめ🦐", handle: kaname });
  normalizeAdditionalXAccounts(source.additionalXAccounts || source.contactAccounts?.additional || []).forEach((account) => {
    if (!accounts.some((item) => item.handle.toLowerCase() === account.handle.toLowerCase())) {
      accounts.push(account);
    }
  });
  return accounts;
};

export const isWebUrl = (url = "") => /^https?:\/\//i.test(String(url).trim());

export const getGoogleDriveFileId = (url = "") => {
  const trimmed = String(url).trim();
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    if (!host.includes("drive.google.com") && !host.includes("docs.google.com")) return "";
    const idParam = parsed.searchParams.get("id");
    if (idParam) return idParam;
    return parsed.pathname.match(/\/file\/d\/([^/]+)/)?.[1] ?? "";
  } catch {
    return trimmed.match(/(?:id=|\/file\/d\/)([A-Za-z0-9_-]+)/)?.[1] ?? "";
  }
};

export const makeDirectAudioDownloadUrl = (url = "") => {
  const trimmed = String(url).trim();
  if (!isWebUrl(trimmed)) return "";
  const driveFileId = getGoogleDriveFileId(trimmed);
  if (driveFileId) return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(driveFileId)}`;
  return trimmed;
};

export const makeImagePreviewUrl = (url = "") => {
  const trimmed = String(url).trim();
  const driveFileId = getGoogleDriveFileId(trimmed);
  if (driveFileId) return `https://drive.google.com/thumbnail?id=${encodeURIComponent(driveFileId)}&sz=w1200`;
  return trimmed;
};

export const getGoogleDriveImageUrls = (url = "") => {
  const driveFileId = getGoogleDriveFileId(url);
  if (!driveFileId) return [];
  const id = encodeURIComponent(driveFileId);
  return [
    `https://drive.google.com/thumbnail?id=${id}&sz=w1200`,
    `https://lh3.googleusercontent.com/d/${id}=w1200`,
    `https://drive.google.com/uc?export=view&id=${id}`,
    `https://drive.google.com/uc?export=download&id=${id}`,
    `https://drive.usercontent.google.com/download?id=${id}&export=view&authuser=0`
  ];
};

export const makeCanvasImageProxyUrl = (url = "") => {
  const trimmed = String(url).trim();
  if (!isWebUrl(trimmed) || /(?:^|\/\/)(?:images\.weserv\.nl|wsrv\.nl)\//i.test(trimmed)) return "";
  const withoutProtocol = trimmed.replace(/^https?:\/\//i, "");
  return `https://images.weserv.nl/?url=${encodeURIComponent(withoutProtocol)}`;
};

export const getCanvasImageSourceCandidates = (src = "") => {
  const trimmed = String(src || "").trim();
  const candidates = [];
  const add = (value) => {
    const candidate = String(value || "").trim();
    if (candidate && !candidates.includes(candidate)) candidates.push(candidate);
  };
  add(trimmed);
  if (!trimmed || trimmed.startsWith("data:")) return candidates;

  const previewUrl = makeImagePreviewUrl(trimmed);
  add(previewUrl);
  getGoogleDriveImageUrls(trimmed).forEach(add);

  [...candidates].forEach((candidate) => add(makeCanvasImageProxyUrl(candidate)));
  return candidates;
};

export const sanitizeDownloadName = (value = "") =>
  String(value)
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, " ")
    .slice(0, 90);

export const getUrlFileExtension = (url = "") => {
  try {
    return new URL(url).pathname.match(/\.(mp3|wav|m4a|aac|flac|ogg)$/i)?.[0] ?? "";
  } catch {
    return String(url).match(/\.(mp3|wav|m4a|aac|flac|ogg)(?:[?#]|$)/i)?.[0] ?? "";
  }
};

export const makeTrackAudioDownloadName = (track) => {
  const extension = getUrlFileExtension(track.audioFile) || ".mp3";
  const base = sanitizeDownloadName([track.slotNo, track.artist, track.title].filter(Boolean).join("_")) || "audio-file";
  return base.toLowerCase().endsWith(extension.toLowerCase()) ? base : `${base}${extension}`;
};

export const downloadTrackAudioFromUrl = (track) => {
  const url = makeDirectAudioDownloadUrl(track.audioFile);
  if (!url) return;
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  anchor.download = makeTrackAudioDownloadName(track);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
};

export const isSupportedTrackUrl = (url = "") => {
  const trimmed = String(url).trim();
  if (!trimmed) return true;
  try {
    const host = new URL(trimmed).hostname.toLowerCase().replace(/^www\./, "");
    return host === "youtu.be" || host === "youtube.com" || host.endsWith(".youtube.com") || host === "suno.com" || host.endsWith(".suno.com");
  } catch {
    return false;
  }
};

export const makePlayableEmbedUrl = (url = "") => {
  const trimmed = String(url).trim();
  const youtube = trimmed.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/shorts\/)([A-Za-z0-9_-]+)/);
  if (youtube) return `https://www.youtube.com/embed/${youtube[1]}`;
  const suno = trimmed.match(/suno\.com\/(?:song|embed)\/([a-f0-9-]{36})/i);
  if (suno) return `https://suno.com/embed/${suno[1]}`;
  return "";
};

export const isSunoShortUrl = (url = "") => /suno\.com\/s\/[A-Za-z0-9_-]+/i.test(String(url).trim());

export const formatAnswerValue = (value) => {
  if (!value) return "-";
  if (typeof value === "object" && value.fileName) return `${value.fileName} (${Math.round((value.size || 0) / 1024 / 1024 * 10) / 10}MB)`;
  if (typeof value === "object" && ("title" in value || "artist" in value || "aiArtist" in value || "url" in value || "audio" in value || "audioUrl" in value)) {
    return compactLines([
      `楽曲名: ${value.title || "-"}`,
      `アーティスト名: ${value.artist || "-"}`,
      `AIアーティスト名: ${value.aiArtist || "-"}`,
      `楽曲URL: ${value.url || "-"}`,
      `音源ファイル: ${formatAnswerValue(value.audio)}`,
      `大容量音源URL: ${value.audioUrl || "-"}`
    ]);
  }
  if (typeof value === "object" && ("xHandle" in value || "xUrl" in value || "dmOk" in value)) {
    return compactLines([
      `Xアカウント: ${value.xHandle || "-"}`,
      `X URL: ${value.xUrl || "-"}`
    ]);
  }
  return String(value);
};

export const THUMBNAIL_PRESETS = [
  {
    key: "article16x9",
    label: "記事サムネ 16:9",
    width: 1280,
    height: 720,
    fileName: "article-thumbnail.png",
    baseName: "初期ベース 16:9",
    baseUrl: publicAsset("thumbnail-templates/sunopa-article-16x9.png"),
    dateBadge: { x: 50, y: 10.4, year: 24, date: 39, weekday: 26, offsets: [-24, 6, 38] }
  },
  {
    key: "standfm1x1",
    label: "stand.fm 正方形 1:1",
    width: 1080,
    height: 1080,
    fileName: "standfm-thumbnail.png",
    baseName: "初期ベース 1:1",
    baseUrl: publicAsset("thumbnail-templates/sunopa-standfm-1x1.png"),
    dateBadge: { x: 50, y: 15.2, year: 34, date: 54, weekday: 34, offsets: [-48, 1, 56] }
  },
  {
    key: "stream9x16",
    label: "配信背景 9:16",
    width: 1080,
    height: 1920,
    fileName: "stream-background.png",
    baseName: "初期ベース 9:16",
    baseUrl: publicAsset("thumbnail-templates/sunopa-stream-9x16.png"),
    dateBadge: { x: 50, y: 23.2, year: 42, date: 66, weekday: 42, offsets: [-62, 0, 72] }
  }
];
export const ARTICLE_THUMBNAIL_KEY = "article16x9";
export const CODEX_THUMBNAIL_PRESETS = THUMBNAIL_PRESETS.filter((preset) => preset.key === ARTICLE_THUMBNAIL_KEY);

export const IMPORT_PREVIEW_FIELDS = [
  {
    key: "ownerName",
    label: "名前/応募者",
    canonical: {
      guest: "ゲスト名",
      listener: "応募者名",
      personality: "パーソナリティ名"
    }
  },
  { key: "aiArtist", label: "AIアーティスト", canonical: "AIアーティスト名" },
  { key: "trackTitle", label: "曲名", canonical: "曲名" },
  { key: "trackUrl", label: "楽曲URL", canonical: "楽曲URL" },
  { key: "audioFile", label: "音源", canonical: "音源ファイル" },
  { key: "articlePoint", label: "曲への想い", canonical: "曲に込めた想い" },
  {
    key: "iconUrl",
    label: "アイコン",
    canonical: {
      guest: "ゲストアイコン画像",
      listener: "応募者アイコン画像",
      personality: "アイコン画像"
    }
  },
  { key: "constraints", label: "NG事項", canonical: "表記注意" }
];

export const IMPORT_KIND_LABELS = {
  guest: "ゲストアンケート",
  listener: "リスナー応募曲",
  personality: "パーソナリティ曲"
};

export const getImportPreviewKey = (kind, periodId = "") => (periodId ? `${kind}:${periodId}` : kind);

export const getImportCanonicalColumn = (field, kind) =>
  typeof field.canonical === "string" ? field.canonical : field.canonical?.[kind] || field.label;

export const applyColumnMappingToRows = (rows = [], kind = "", mapping = {}) =>
  rows.map((row) => {
    const mapped = { ...row };
    IMPORT_PREVIEW_FIELDS.forEach((field) => {
      const sourceColumn = mapping?.[field.key];
      if (!sourceColumn) return;
      mapped[getImportCanonicalColumn(field, kind)] = row[sourceColumn] ?? "";
    });
    return mapped;
  });

export const THUMBNAIL_ICON_LAYOUT_PRESETS = [
  {
    id: "single",
    name: "1人用",
    templates: {
      article16x9: { iconX: 50, iconY: 76, iconSize: 23, iconSlots: [{ x: 50, y: 76, size: 23 }], guestNameVisible: true, guestNameX: 50, guestNameY: 93, guestNameSize: 7, guestBadgeVisible: true, guestBadgeX: 42, guestBadgeY: 71, guestBadgeSize: 16 },
      standfm1x1: { iconX: 50, iconY: 79, iconSize: 18, iconSlots: [{ x: 50, y: 79, size: 18 }], guestNameVisible: true, guestNameX: 50, guestNameY: 92, guestNameSize: 5, guestBadgeVisible: true, guestBadgeX: 40, guestBadgeY: 73, guestBadgeSize: 12 },
      stream9x16: { iconX: 50, iconY: 75, iconSize: 34, iconSlots: [{ x: 50, y: 75, size: 34 }], guestNameVisible: true, guestNameX: 50, guestNameY: 91, guestNameSize: 8, guestBadgeVisible: true, guestBadgeX: 31, guestBadgeY: 70, guestBadgeSize: 19 }
    }
  },
  {
    id: "dual",
    name: "2人用",
    templates: {
      article16x9: { iconX: 43, iconY: 77, iconSize: 23, iconSlots: [{ x: 43, y: 77, size: 23 }, { x: 57, y: 77, size: 23 }], guestNameVisible: true, guestNameX: 50, guestNameY: 91, guestNameSize: 5, guestBadgeVisible: true, guestBadgeX: 35, guestBadgeY: 78, guestBadgeSize: 10 },
      standfm1x1: { iconX: 42, iconY: 82, iconSize: 20, iconSlots: [{ x: 42, y: 82, size: 20 }, { x: 58, y: 82, size: 20 }], guestNameVisible: true, guestNameX: 50, guestNameY: 92, guestNameSize: 5, guestBadgeVisible: true, guestBadgeX: 34, guestBadgeY: 82, guestBadgeSize: 9 },
      stream9x16: { iconX: 42, iconY: 78, iconSize: 24, iconSlots: [{ x: 42, y: 78, size: 24 }, { x: 58, y: 78, size: 24 }], guestNameVisible: true, guestNameX: 50, guestNameY: 88, guestNameSize: 5, guestBadgeVisible: true, guestBadgeX: 34, guestBadgeY: 79, guestBadgeSize: 8 }
    }
  },
  {
    id: "triple",
    name: "3人用",
    templates: {
      article16x9: { iconX: 38, iconY: 78, iconSize: 20, iconSlots: [{ x: 38, y: 78, size: 20 }, { x: 50, y: 75, size: 20 }, { x: 62, y: 78, size: 20 }], guestNameVisible: true, guestNameX: 50, guestNameY: 91, guestNameSize: 5, guestBadgeVisible: true, guestBadgeX: 31, guestBadgeY: 79, guestBadgeSize: 9 },
      standfm1x1: { iconX: 38, iconY: 82, iconSize: 17, iconSlots: [{ x: 38, y: 82, size: 17 }, { x: 50, y: 79, size: 17 }, { x: 62, y: 82, size: 17 }], guestNameVisible: true, guestNameX: 50, guestNameY: 92, guestNameSize: 4, guestBadgeVisible: true, guestBadgeX: 31, guestBadgeY: 83, guestBadgeSize: 8 },
      stream9x16: { iconX: 38, iconY: 78, iconSize: 20, iconSlots: [{ x: 38, y: 78, size: 20 }, { x: 50, y: 75, size: 20 }, { x: 62, y: 78, size: 20 }], guestNameVisible: true, guestNameX: 50, guestNameY: 88, guestNameSize: 4, guestBadgeVisible: true, guestBadgeX: 31, guestBadgeY: 79, guestBadgeSize: 7 }
    }
  }
];

export const THUMBNAIL_LAYOUT_PRESET_VERSION = 3;
export const getIconLayoutPresetTemplates = (preset) => preset?.templates ?? THUMBNAIL_ICON_LAYOUT_PRESETS[0].templates;

export const applyIconLayoutPresetToTemplates = (templates = defaultThumbnailStudio.templates, preset) => {
  const presetTemplates = getIconLayoutPresetTemplates(preset);
  return Object.fromEntries(
    THUMBNAIL_PRESETS.map((thumbnailPreset) => {
      const key = thumbnailPreset.key;
      return [
        key,
        {
          ...defaultThumbnailStudio.templates[key],
          ...(templates?.[key] ?? {}),
          ...(presetTemplates[key] ?? {})
        }
      ];
    })
  );
};

export const defaultThumbnailStudio = {
  date: "",
  guestIcon: { name: "", dataUrl: "", cropX: 50, cropY: 50, cropZoom: 100 },
  guestIcons: [],
  activeLayoutPreset: "single",
  layoutPresetVersion: THUMBNAIL_LAYOUT_PRESET_VERSION,
  layoutPresetOverrides: {},
  customLayoutPresets: [],
  generated: {},
  autoGenerateRequestedAt: "",
  templates: Object.fromEntries(
    THUMBNAIL_PRESETS.map((preset) => [
      preset.key,
      {
        name: preset.baseName,
        source: "fixed",
        assetUrl: preset.baseUrl,
        dataUrl: "",
        ...(THUMBNAIL_ICON_LAYOUT_PRESETS[0].templates[preset.key] ?? {})
      }
    ])
  )
};

export const clampNumber = (value, fallback, min, max) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
};

export const normalizeGuestIconList = (guestIcon = defaultThumbnailStudio.guestIcon, guestIcons = []) => {
  const sourceIcons = Array.isArray(guestIcons) && guestIcons.length ? guestIcons : guestIcon?.dataUrl ? [guestIcon] : [];
  const seen = new Set();
  return sourceIcons
    .filter((icon) => icon?.dataUrl)
    .map((icon, index) => ({
      id: icon.id || `guest_icon_${index}`,
      name: icon.name || `guest-icon-${index + 1}`,
      dataUrl: icon.dataUrl,
      cropX: clampNumber(icon.cropX, 50, 0, 100),
      cropY: clampNumber(icon.cropY, 50, 0, 100),
      cropZoom: clampNumber(icon.cropZoom ?? icon.zoom, 100, 100, 300)
    }))
    .filter((icon) => {
      const key = `${icon.name}:${icon.dataUrl.slice(0, 80)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

export const getThumbnailIconSlots = (template = {}) => {
  const slots = Array.isArray(template.iconSlots) ? template.iconSlots : [];
  if (slots.length) {
    return slots.map((slot, index) => ({
      x: Number(slot.x ?? (index === 0 ? template.iconX : 50)),
      y: Number(slot.y ?? (index === 0 ? template.iconY : 50)),
      size: Number(slot.size ?? (index === 0 ? template.iconSize : 28))
    }));
  }
  return [
    {
      x: Number(template.iconX ?? 50),
      y: Number(template.iconY ?? 50),
      size: Number(template.iconSize ?? 28)
    }
  ];
};

export const countGuestsFromText = (guestName = "") => {
  const names = String(guestName || "")
    .replace(/さん/g, "")
    .split(/[,、，/&＆＋+・]|と| and /i)
    .map((name) => name.trim())
    .filter(Boolean);
  return names.length || 1;
};

export const getLayoutPresetForGuestCount = (count = 1) => {
  if (count >= 3) return THUMBNAIL_ICON_LAYOUT_PRESETS.find((preset) => preset.id === "triple") ?? THUMBNAIL_ICON_LAYOUT_PRESETS[0];
  if (count === 2) return THUMBNAIL_ICON_LAYOUT_PRESETS.find((preset) => preset.id === "dual") ?? THUMBNAIL_ICON_LAYOUT_PRESETS[0];
  return THUMBNAIL_ICON_LAYOUT_PRESETS[0];
};

export const defaultImports = {
  guestCsvUrl: "",
  listenerCsvUrl: "",
  personalityCsvUrl: "",
  bellboTrackUrl: "",
  lastLog: []
};

export const defaultSocialPromo = {
  guestName: "",
  guestXHandle: "",
  talkTheme: "",
  postText: "",
  comicTemplate: "",
  comicPrompt: "",
  comicImage: { name: "", dataUrl: "" }
};

export const getShortTheme = (theme = "") => {
  const normalized = String(theme || "").replace(/\s+/g, " ").trim();
  if (!normalized) return "音楽づくりの裏側";
  return normalized.length > 32 ? `${normalized.slice(0, 32)}...` : normalized;
};

export const buildSocialPostText = ({ guestName, guestXHandle, date, talkTheme }) => {
  const handle = formatXHandle(guestXHandle);
  const guestLine = [guestName || "ゲストさん", handle].filter(Boolean).join(" ");
  const dateLabel = formatJapaneseDate(date);
  const theme = getShortTheme(talkTheme);
  return compactLines([
    "【Sunoパ！告知☂】",
    `${dateLabel}のSunoパ！は、${guestLine}をお迎えします。`,
    `今回は「${theme}」について語っていきます。`,
    "音楽づくりの裏側や、作品に込めた想いをじっくり聞いていく回です。",
    "リアタイでもアーカイブでも、ぜひ遊びに来てください＾＾",
    "#Sunoパ #AI音楽 #standfm"
  ]);
};

export const buildComicTemplateText = ({ guestName, guestXHandle, date, talkTheme }) => {
  const handle = formatXHandle(guestXHandle);
  const guestLabel = [guestName || "ゲストさん", handle].filter(Boolean).join(" ");
  const dateLabel = formatJapaneseDate(date);
  const theme = getShortTheme(talkTheme);
  return `タイトル：${theme}を、Sunoパ！でゆっくり聞いてみる夜
サブコピー：Sunoパ！ ${dateLabel} 告知4コマ
テーマ：${guestLabel}を迎えて、「${theme}」について語る配信告知
狙い：ゲストの魅力とトークテーマの気になるポイントを、やわらかく伝えて配信への参加・アーカイブ視聴につなげる
1コマ目：べるぼが配信準備をしている。テーブルにはマイク、ヘッドホン、Sunoパ！のロゴ、メモが置かれている。
セリフ：べるぼ「次回のSunoパ！は、${guestName || "ゲストさん"}をお迎えします＾＾」
2コマ目：ゲストの雰囲気を表す音符や光、作品イメージがふわっと広がる。Xアカウント${handle || "未設定"}の表示が小さく入っている。
セリフ：べるぼ「今回は『${theme}』について、じっくり聞いていきます☂」
3コマ目：トークテーマに関する象徴的な場面。制作メモ、音源波形、サムネ、歌詞の断片などが重なり、話が深まっていく。
セリフ：ゲスト「そこは、作品を作る時にすごく大事にしているところなんです。」
4コマ目：べるぼとゲストが配信画面の前で笑顔。背景にSunoパ！らしい夜景と花火、傘、音符がある。明るく楽しそうな締め。
セリフ：べるぼ「${dateLabel}、Sunoパ！で一緒に楽しみましょう＾＾」`;
};

export const sanitizeSnsComicTemplateText = (text = "") =>
  String(text || "")
    .replace(/かなめとべるぼ/g, "べるぼ")
    .replace(/3人が配信画面の前で笑顔/g, "べるぼとゲストが配信画面の前で笑顔")
    .replace(/かなめちゃん/g, "べるぼ")
    .replace(/かなめ🦐/g, "べるぼ☂")
    .replace(/かなめ「/g, "べるぼ「");

export const buildComicPromptText = ({ guestName, guestXHandle, date, talkTheme, comicTemplate }) => {
  const handle = formatXHandle(guestXHandle);
  const safeComicTemplate = sanitizeSnsComicTemplateText(
    comicTemplate || buildComicTemplateText({ guestName, guestXHandle, date, talkTheme })
  );
  return `以下の4コマ漫画テンプレをもとに、SNS告知用の4コマ漫画画像を作ってください。

条件：
- 日本語の4コマ漫画
- 明るく親しみやすいSunoパ！告知
- ゲスト名: ${guestName || "未設定"}
- Xアカウント: ${handle || "未設定"}
- 配信日: ${formatJapaneseDate(date)}
- トークテーマ: ${talkTheme || "未設定"}
- かなめ🦐、かなめちゃんは漫画内に登場させない
- 登場人物は基本的にべるぼ☂とゲストのみ
- 文字は読みやすく、1コマあたり短め
- 4コマの順番が分かるレイアウト
- できればSunoパ！らしい音楽、ラジオ、夜景、傘、花火の雰囲気

テンプレ：
${safeComicTemplate}`;
};

export const newId = (prefix) => {
  if (crypto?.randomUUID) return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
};

export const WEEKDAY_LABELS = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"];
export const WEEKDAY_SHORT_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

export const getBroadcastSlot = (dateString = "") => {
  if (!dateString) return "";
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  const weekNumber = Math.floor((date.getDate() - 1) / 7) + 1;
  return `第${weekNumber}${WEEKDAY_LABELS[date.getDay()]}`;
};

export const formatLocalDate = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export const formatThumbnailDateLines = (dateString = "") => {
  const match = String(dateString).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(`${year}-${month}-${day}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return [year, `${Number(month)}/${Number(day)}`, `(${WEEKDAY_SHORT_LABELS[date.getDay()]})`];
};

export const ensureGuestHonorific = (guestName = "") => {
  const trimmed = String(guestName).trim();
  if (!trimmed) return "";
  return trimmed.endsWith("さん") ? trimmed : `${trimmed}さん`;
};

export const makeGuestEpisodeTitle = (guestName = "") => {
  const titledName = ensureGuestHonorific(guestName);
  return titledName ? `${titledName}ゲスト回🌟` : "";
};

export const slugify = (value = "") =>
  String(value)
    .trim()
    .replace(/さん$/, "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

export const extractSlugFromUrl = (url = "") => {
  try {
    const pathname = new URL(url).pathname;
    return pathname.split("/").filter(Boolean).pop() ?? "";
  } catch {
    return "";
  }
};

export const buildArticleUrl = (site = "", slug = "") => {
  const normalizedSite = String(site).trim().replace(/\/+$/, "");
  const normalizedSlug = String(slug).trim().replace(/^\/+|\/+$/g, "");
  if (!normalizedSite || !normalizedSlug) return "";
  return `${normalizedSite}/${normalizedSlug}/`;
};

export const normalizeKey = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[ 　_\-・:：/／（）()［\][\].。!！?？]/g, "");

export const compactLines = (items) => items.filter(Boolean).join("\n");

export const isExcludedImportLabel = (label = "", excludePatterns = []) =>
  excludePatterns.some((pattern) => pattern.test(String(label || "")));

export const pick = (row, aliases, excludePatterns = []) => {
  const entries = Object.entries(row).map(([key, value]) => ({
    label: String(key || ""),
    key: normalizeKey(key),
    value
  }));
  for (const alias of aliases) {
    const normalizedAlias = normalizeKey(alias);
    const match = entries.find(
      ({ label, key, value }) =>
        key === normalizedAlias &&
        !isExcludedImportLabel(label, excludePatterns) &&
        value != null &&
        String(value).trim() !== ""
    );
    if (match) return String(match.value).trim();
  }
  for (const alias of aliases) {
    const normalizedAlias = normalizeKey(alias);
    if (normalizedAlias.length < 4 || ["url", "xurl", "wav", "mp3"].includes(normalizedAlias)) continue;
    const match = entries.find(
      ({ label, key, value }) =>
        key.includes(normalizedAlias) &&
        !isExcludedImportLabel(label, excludePatterns) &&
        value != null &&
        String(value).trim() !== ""
    );
    if (match) return String(match.value).trim();
  }
  return "";
};

export const pickByLabelPattern = (row, patterns, excludePatterns = []) => {
  for (const [key, value] of Object.entries(row)) {
    const text = String(value ?? "").trim();
    if (!text) continue;
    const label = String(key || "");
    if (excludePatterns.some((pattern) => pattern.test(label))) continue;
    if (patterns.some((pattern) => pattern.test(label))) return text;
  }
  return "";
};

export const pickImportValue = (row, aliases, patterns = [], excludePatterns = []) =>
  pick(row, aliases, excludePatterns) || pickByLabelPattern(row, patterns, excludePatterns);

export const isImportMetadataColumn = (key = "") => {
  const normalized = normalizeKey(key);
  return [
    "タイムスタンプ",
    "timestamp",
    "メールアドレス",
    "emailaddress",
    "username",
    "ユーザー名",
    "スコア",
    "score"
  ].includes(normalized);
};

export const meaningfulRowEntries = (row) =>
  Object.entries(row)
    .map(([label, value]) => ({ label: String(label || "").trim(), value: String(value ?? "").trim() }))
    .filter(({ label, value }) => label && value && !isImportMetadataColumn(label));

export const formatRemainingAnswers = (row, usedValues = []) => {
  const used = new Set(usedValues.filter(Boolean).map((value) => String(value).trim()));
  return meaningfulRowEntries(row)
    .filter(({ value }) => !used.has(value))
    .map(({ label, value }) => `${label}: ${value}`)
    .join("\n");
};

export const summarizeImportColumns = (rows = []) => {
  const labels = meaningfulRowEntries(rows[0] ?? {}).map(({ label }) => label).slice(0, 8);
  return labels.length ? ` 取得した列: ${labels.join(" / ")}` : "";
};

export const makeUniqueHeaders = (headers = []) => {
  const seen = new Map();
  return headers.map((header, index) => {
    const base = String(header || "").trim() || `column_${index + 1}`;
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return count === 1 ? base : `${base}_${count}`;
  });
};

export const parseCsv = (text) => {
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

  const headers = makeUniqueHeaders(rows[0]);
  return rows.slice(1).map((cells) =>
    Object.fromEntries(headers.map((header, index) => [header || `column_${index + 1}`, cells[index]?.trim() ?? ""]))
  );
};

export const GOOGLE_SHEETS_JSONP_TIMEOUT_MS = 12000;

export const getUrlParam = (url, key, { preferHash = false } = {}) => {
  const trimmed = String(url).trim();
  try {
    const parsed = new URL(trimmed);
    const searchValue = parsed.searchParams.get(key) || "";
    const hashValue = new URLSearchParams(parsed.hash.replace(/^#/, "")).get(key) || "";
    return preferHash ? hashValue || searchValue : searchValue || hashValue;
  } catch {
    return trimmed.match(new RegExp(`[?&#]${key}=([^&#]+)`))?.[1] ?? "";
  }
};

export const makeGoogleSheetExportUrl = (spreadsheetId, gid = "0") =>
  `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;

export const makeGoogleSheetPublishedCsvUrl = (publishedId, gid = "0") =>
  `https://docs.google.com/spreadsheets/d/e/${publishedId}/pub?gid=${gid}&single=true&output=csv`;

export const makeGoogleSheetJsonpUrl = (spreadsheetId, gid, callbackName) => {
  const params = new URLSearchParams({
    gid: gid || "0",
    headers: "1",
    tqx: `out:json;responseHandler:${callbackName}`
  });
  return `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/gviz/tq?${params.toString()}`;
};

export const gvizCellToText = (cell) => {
  if (!cell) return "";
  const value = cell.f ?? cell.v;
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
};

export const gvizResponseToRows = (response) => {
  if (!response || response.status !== "ok") {
    const detail = response?.errors?.map((error) => error.detailed_message || error.message || error.reason).filter(Boolean).join(" / ");
    throw new Error(detail || "GVIZ_RESPONSE_ERROR");
  }

  const columns = response.table?.cols ?? [];
  const headers = makeUniqueHeaders(columns.map((column, index) => String(column?.label || "").trim() || `column_${index + 1}`));
  return (response.table?.rows ?? [])
    .map((row) =>
      Object.fromEntries(headers.map((header, index) => [header, gvizCellToText(row.c?.[index])]))
    )
    .filter((row) => Object.values(row).some((value) => String(value).trim() !== ""));
};

export const fetchGoogleSheetRowsWithJsonp = ({ spreadsheetId, gid }) => {
  if (!spreadsheetId || typeof window === "undefined" || typeof document === "undefined") {
    return Promise.reject(new Error("JSONP_UNAVAILABLE"));
  }

  return new Promise((resolve, reject) => {
    const callbackName = `__radioArticleStudioSheet_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement("script");
    let settled = false;

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      delete window[callbackName];
      script.remove();
    };

    const fail = (error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };

    const timeoutId = window.setTimeout(() => fail(new Error("JSONP_TIMEOUT")), GOOGLE_SHEETS_JSONP_TIMEOUT_MS);

    window[callbackName] = (response) => {
      if (settled) return;
      settled = true;
      try {
        const rows = gvizResponseToRows(response);
        cleanup();
        resolve(rows);
      } catch (error) {
        cleanup();
        reject(error);
      }
    };

    script.async = true;
    script.src = makeGoogleSheetJsonpUrl(spreadsheetId, gid, callbackName);
    script.onerror = () => fail(new Error("JSONP_LOAD_ERROR"));
    document.head.appendChild(script);
  });
};

export const getCsvImportTarget = (url = "") => {
  const trimmed = String(url).trim();
  if (!trimmed) return { url: "", error: "URLが未入力です。" };
  if (/docs\.google\.com\/forms\/d\//i.test(trimmed)) {
    return { url: "", error: "GoogleフォームURLではなく、回答先のGoogleスプレッドシートURLを入れてください。" };
  }

  const gid = getUrlParam(trimmed, "gid", { preferHash: true }) || "0";
  const publishedSpreadsheetMatch = trimmed.match(/\/spreadsheets(?:\/u\/\d+)?\/d\/e\/([^/?#]+)/);
  if (publishedSpreadsheetMatch) {
    return {
      url: makeGoogleSheetPublishedCsvUrl(publishedSpreadsheetMatch[1], gid),
      error: ""
    };
  }

  const spreadsheetId = trimmed.match(/\/spreadsheets(?:\/u\/\d+)?\/d\/([^/?#]+)/)?.[1] || getUrlParam(trimmed, "key");
  if (spreadsheetId) {
    return {
      url: makeGoogleSheetExportUrl(spreadsheetId, gid),
      spreadsheetId,
      gid,
      error: ""
    };
  }

  return { url: trimmed, error: "" };
};

export const toGoogleCsvUrl = (url) => getCsvImportTarget(url).url;

export const looksLikeHtml = (text = "") => /^\s*<!doctype html|^\s*<html[\s>]/i.test(text);
export const makeImportFailureMessage = (label, error) =>
  error?.message === "EMPTY_CSV"
    ? `${label}: CSVが空でした。フォームに回答があるか、入力URLのgidが「フォームの回答」タブか確認してください。`
    : `${label}: 読み込みに失敗しました。回答先スプレッドシートを「リンクを知っている全員が閲覧可」にするか、CSVファイルで取り込んでください。`;

export const makeEmbedUrl = (url = "") => {
  const playableEmbedUrl = makePlayableEmbedUrl(url);
  if (playableEmbedUrl) return playableEmbedUrl;
  if (url.includes("suno.com/")) return url;
  return "";
};

export const cleanFetchedTrackTitle = (title = "", sourceType = "") => {
  const trimmed = String(title).replace(/\s+/g, " ").trim();
  if (!trimmed) return "";
  if (sourceType === "Suno") {
    return trimmed
      .replace(/\s*\|\s*Suno\s*$/i, "")
      .replace(/\s+by\s+[^|]+$/i, "")
      .trim();
  }
  return trimmed;
};

export const fetchTrackTitleFromUrl = async (url = "") => {
  const sourceType = detectUrlType(url);
  if (!url || sourceType === "Other") return "";

  if (sourceType === "YouTube") {
    try {
      const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
      if (response.ok) {
        const data = await response.json();
        return cleanFetchedTrackTitle(data.title, sourceType);
      }
    } catch {
      // Fall through to the generic reader below.
    }
  }

  if (sourceType === "Suno") {
    try {
      const response = await fetch(`https://r.jina.ai/http://${url}`);
      if (response.ok) {
        const text = await response.text();
        const title = text.match(/^Title:\s*(.+)$/m)?.[1] ?? "";
        return cleanFetchedTrackTitle(title, sourceType);
      }
    } catch {
      return "";
    }
  }

  return "";
};

export const nextSlotNo = (tracks, episodeId) => {
  const values = tracks.filter((track) => track.episodeId === episodeId).map((track) => Number(track.slotNo) || 0);
  return Math.max(0, ...values) + 1;
};

export const appendTrack = (tracks, nextTrack) => [...tracks, nextTrack];

export const normalizeTrackUrlKey = (url = "") => {
  const trimmed = String(url || "").trim();
  if (!trimmed) return "";
  const driveFileId = getGoogleDriveFileId(trimmed);
  if (driveFileId) return `drive:${driveFileId}`;
  try {
    const parsed = new URL(trimmed);
    parsed.hash = "";
    parsed.searchParams.sort();
    return parsed.href.replace(/\/$/, "").toLowerCase();
  } catch {
    return normalizeKey(trimmed);
  }
};

export const makeTrackImportKey = (track = {}) =>
  [
    track.episodeId || "",
    track.periodId || "",
    track.source || "",
    normalizeTrackUrlKey(track.url) || normalizeTrackUrlKey(track.audioFile) || normalizeKey(track.title),
    normalizeKey(track.artist),
    normalizeKey(track.aiArtist)
  ].join("|");

export const upsertImportedTrack = (tracks, incomingTrack) => {
  const incomingKey = makeTrackImportKey(incomingTrack);
  const existingIndex = tracks.findIndex((track) => makeTrackImportKey(track) === incomingKey);
  if (existingIndex < 0 || !incomingKey.replace(/\|/g, "")) {
    return { tracks: appendTrack(tracks, incomingTrack), created: true };
  }
  return {
    tracks: tracks.map((track, index) =>
      index === existingIndex
        ? {
            ...track,
            ...incomingTrack,
            id: track.id,
            slotNo: track.slotNo || incomingTrack.slotNo,
            status: "取り込み済み"
          }
        : track
    ),
    created: false
  };
};

export const getDefaultOwnerHonorific = (source = "") => (source === "パーソナリティ曲" ? "さんなし" : "さん");

export const buildResponseFromRow = (row, episodeId, formId, fallbackRespondent = "") => {
  const hasMeaningfulAnswers = meaningfulRowEntries(row).length > 0;
  const respondent =
    pickImportValue(
      row,
      [
        "ゲスト名",
        "ゲスト名 正式表記",
        "お名前",
        "お名前 正式表記",
        "名前",
        "活動名",
        "活動名義",
        "クリエイター名",
        "ハンドルネーム",
        "ラジオネーム",
        "ニックネーム",
        "アーティスト名",
        "回答者",
        "応募者名"
      ],
      [/ゲスト.*(名|名前|表記)/, /お名前|名前|活動名|活動名義|名義|クリエイター名|ハンドルネーム|ラジオネーム|ニックネーム|呼び名|アーティスト名/],
      [/AI\s*アーティスト|AI artist|AI名義/i]
    ) || (hasMeaningfulAnswers ? fallbackRespondent : "");
  const xUrl = pickImportValue(row, ["X URL", "Twitter URL", "Xアカウント", "Twitterアカウント", "X", "Twitter"], [/((X|Twitter|旧Twitter).*(URL|アカウント|ID|ユーザー名|リンク))|((URL|リンク).*(X|Twitter|旧Twitter))/i]);
  const iconUrl = pickImportValue(
    row,
    ["ゲストアイコン画像", "アイコン画像", "プロフィール画像", "サムネ用画像", "画像URL", "アイコンURL", "icon", "avatar", "profile image"],
    [/アイコン|プロフィール画像|サムネ|画像|icon|avatar|profile image/i],
    [/音源|楽曲|曲|mp3|wav/i]
  );
  const profile = pickImportValue(row, ["活動紹介文", "プロフィール", "紹介文", "自己紹介", "公開プロフィール", "活動内容"], [/プロフィール|自己紹介|活動紹介|紹介文|公開プロフィール|活動内容|どんな活動/]);
  const topics = pickImportValue(row, ["今回話したいこと", "記事で紹介してほしい内容", "話したいこと", "トピック", "トークテーマ"], [/話したい|語りたい|トークテーマ|テーマ|聞いてほしい|取り上げてほしい|記事で紹介/]);
  const songThought = pickImportValue(row, ["曲に込めた想い", "楽曲への想い", "曲紹介", "紹介文", "記事で触れてほしいポイント"], [/曲.*(想い|思い|紹介|こだわり|ポイント|メッセージ)|楽曲.*(想い|思い|紹介|こだわり|ポイント|メッセージ)/]);
  const internal = pickImportValue(row, ["制作側だけに共有するメモ", "内部確認", "運営メモ", "非公開メモ"], [/制作側|内部|運営|非公開|メモ|補足/]);
  const constraints = pickImportValue(row, ["触れないでほしいこと", "NG質問", "表記注意", "注意事項", "記事/SNSで触れないこと・表記ルール"], [/触れない|NG|表記注意|注意事項|伏せたい|非公開|禁止|避けて|表記ルール/]);
  const remainingAnswers = formatRemainingAnswers(row, [respondent, xUrl, iconUrl, profile, topics, songThought, internal, constraints]);

  return {
    id: newId("res"),
    episodeId,
    periodId: "",
    formId,
    respondent,
    status: "未確認",
    publicInfo: compactLines([profile, xUrl && `X: ${xUrl}`]),
    articleUse: compactLines([topics, songThought, remainingAnswers && `その他の回答:\n${remainingAnswers}`]),
    internalOnly: internal,
    constraints,
    attachments: iconUrl
      ? [
          {
            questionId: "q_guest_icon",
            questionLabel: "ゲストアイコン画像",
            fileName: iconUrl.split("/").filter(Boolean).pop()?.split(/[?#]/)[0] || "guest-icon",
            mimeType: "image/*",
            size: 0,
            dataUrl: makeImagePreviewUrl(iconUrl),
            sourceUrl: iconUrl
          }
        ]
      : []
  };
};

export const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object ?? {}, key);
export const pickOverride = (overrides, key, fallback) => (hasOwn(overrides, key) ? overrides[key] : fallback);

export const TRACK_COLUMN_PATTERNS = {
  aiArtist: [/AI\s*(アーティスト|名義|名前|活動名)|AI artist/i],
  url: [/(楽曲|曲|Suno|YouTube|Youtube|ユーチューブ).*(URL|リンク)|(URL|リンク).*(楽曲|曲|Suno|YouTube|Youtube|ユーチューブ)/i],
  audioFile: [/音源|楽曲.*アップロード|曲.*アップロード|mp3|wav|Drive|ドライブ/i],
  articlePoint: [/想い|思い|曲紹介|楽曲紹介|こだわり|おすすめ|ポイント|メッセージ|コメント|制作意図|記事で触れて/],
  title: [/曲名|楽曲名|楽曲.*タイトル|曲.*タイトル|紹介曲|タイトル/]
};

export const getTrackColumnField = (label = "") => {
  if (/アイコン|画像|プロフィール|サムネ/i.test(label)) return "";
  if (TRACK_COLUMN_PATTERNS.aiArtist.some((pattern) => pattern.test(label))) return "aiArtist";
  if (TRACK_COLUMN_PATTERNS.url.some((pattern) => pattern.test(label))) return "url";
  if (TRACK_COLUMN_PATTERNS.audioFile.some((pattern) => pattern.test(label))) return "audioFile";
  if (TRACK_COLUMN_PATTERNS.articlePoint.some((pattern) => pattern.test(label))) return "articlePoint";
  if (TRACK_COLUMN_PATTERNS.title.some((pattern) => pattern.test(label))) return "title";
  return "";
};

export const getTrackColumnGroup = (label = "") => {
  const rawText = String(label || "");
  const text = rawText.normalize("NFKC");
  const introSongMatch = text.match(/紹介\s*曲\s*(\d+)/i);
  if (introSongMatch) return Number(introSongMatch[1]) || 1;
  const selectionMatch = text.match(/(?:選曲|曲|楽曲|song|track)\s*(\d+)/i);
  if (selectionMatch) return Number(selectionMatch[1]) || 1;
  const bracketNumberMatch = text.match(/[【［\[\(（]\s*(\d+)\s*[】］\]\)）]/);
  if (bracketNumberMatch) return Number(bracketNumberMatch[1]) || 1;
  const circledNumberMap = {
    "①": 1,
    "❶": 1,
    "➀": 1,
    "②": 2,
    "❷": 2,
    "➁": 2,
    "③": 3,
    "❸": 3,
    "➂": 3,
    "④": 4,
    "❹": 4,
    "➃": 4,
    "⑤": 5,
    "❺": 5,
    "➄": 5
  };
  const circledMatch = rawText.match(/[①②③④⑤❶❷❸❹❺➀➁➂➃➄]/);
  if (circledMatch) return circledNumberMap[circledMatch[0]] || 1;
  const suffixMatch = text.match(/_(\d+)$/);
  if (suffixMatch) return Number(suffixMatch[1]) || 1;
  if (/五曲|5曲|５曲|五つ目|5つ目|５つ目|5番|５番|fifth/i.test(text)) return 5;
  if (/四曲|4曲|４曲|四つ目|4つ目|４つ目|4番|４番|fourth/i.test(text)) return 4;
  if (/三曲|3曲|３曲|三つ目|3つ目|３つ目|3番|３番|third/i.test(text)) return 3;
  if (/二曲|2曲|２曲|二つ目|2つ目|２つ目|2番|２番|second/i.test(text)) return 2;
  return 1;
};

export const collectTrackFieldGroups = (row = {}) => {
  const groups = new Map();
  meaningfulRowEntries(row).forEach(({ label, value }) => {
    const field = getTrackColumnField(label);
    if (!field) return;
    const group = getTrackColumnGroup(label);
    const current = groups.get(group) ?? {};
    if (!current[field]) current[field] = value;
    groups.set(group, current);
  });
  return Array.from(groups.entries())
    .sort(([left], [right]) => left - right)
    .map(([group, values]) => ({ group, values }));
};

export const buildTrackFromRow = (row, episodeId, source, fallbackArtist = "", periodId = "", overrides = {}) => {
  const ownerName =
    pickOverride(
      overrides,
      "artist",
      pickImportValue(
        row,
        [
          "ゲスト名",
          "活動名",
          "活動名義",
          "応募者名",
          "応募者のお名前",
          "お名前",
          "お名前 よみかた",
          "クリエイター名",
          "ハンドルネーム",
          "ラジオネーム",
          "パーソナリティ名",
          "回答者",
          "担当",
          "アーティスト名",
          "アーティスト名 正式表記"
        ],
        [/ゲスト.*(名|名前|表記)/, /応募者|お名前|名前|活動名|活動名義|名義|クリエイター名|ハンドルネーム|ラジオネーム|パーソナリティ名|担当|アーティスト名/],
        [/AI\s*アーティスト|AI artist|AI名義/i]
      )
    ) || fallbackArtist;
  const aiArtist = pickOverride(
    overrides,
    "aiArtist",
    pickImportValue(
      row,
      [
        "AIアーティスト名",
        "AIアーティストの名前",
        "AIアーティスト",
        "AI artist",
        "AI Artist",
        "AI名義",
        "AIアーティスト名 正式表記",
        "AIアーティスト名（正式表記）",
        "AIアーティスト名(正式表記)"
      ],
      TRACK_COLUMN_PATTERNS.aiArtist
    )
  );
  const artist = ownerName;
  const title = pickOverride(
    overrides,
    "title",
    pickImportValue(row, ["曲名", "楽曲名", "楽曲のタイトル", "楽曲のタイトル オススメの一曲", "紹介曲", "タイトル"], TRACK_COLUMN_PATTERNS.title)
  );
  const url = pickOverride(
    overrides,
    "url",
    pickImportValue(row, ["楽曲URL", "楽曲のURL", "曲URL", "曲のURL", "URL", "Suno URL", "YouTube URL"], TRACK_COLUMN_PATTERNS.url)
  );
  const audioFile = pickOverride(
    overrides,
    "audioFile",
    pickImportValue(
      row,
      ["音源ファイル", "音源ファイルURL", "楽曲のアップロード", "楽曲のアップロード オススメの一曲", "WAV", "mp3", "音源URL", "Drive URL"],
      TRACK_COLUMN_PATTERNS.audioFile,
      [/アイコン|画像|プロフィール|サムネ/i]
    )
  );
  const ownerIconUrl = pickOverride(
    overrides,
    "ownerIconUrl",
    pickImportValue(
      row,
      [
        "応募者アイコン画像",
        "応募者アイコン",
        "応募者さんのアイコン",
        "ゲストアイコン画像",
        "アイコン画像",
        "プロフィール画像",
        "サムネ用画像",
        "見出しサムネ画像",
        "画像URL",
        "アイコンURL",
        "icon",
        "avatar",
        "profile image"
      ],
      [/アイコン|プロフィール画像|サムネ|見出し.*画像|画像URL|アイコンURL|icon|avatar|profile image/i],
      [/音源|楽曲|曲|mp3|wav/i]
    )
  );
  const articlePoint = pickOverride(
    overrides,
    "articlePoint",
    pickImportValue(row, ["曲に込めた想い", "曲紹介", "こだわりポイント", "おすすめポイント", "記事で触れてほしいポイント", "紹介文", "メッセージ"], TRACK_COLUMN_PATTERNS.articlePoint)
  );
  const honorific = pickOverride(
    overrides,
    "honorific",
    pickImportValue(row, ["敬称ルール", "表記注意", "クレジット", "クレジット表記"], [/敬称|表記注意|クレジット|呼び方|名前の出し方/]) || getDefaultOwnerHonorific(source)
  );

  if (!title && !url && !audioFile) return null;

  return {
    id: newId("tr"),
    episodeId,
    periodId,
    slotNo: 0,
    source,
    artist,
    aiArtist,
    title: title || `${artist || aiArtist || source} 紹介曲`,
    urlType: detectUrlType(url),
    url,
    audioFile,
    ownerIconUrl,
    embedUrl: makeEmbedUrl(url),
    honorific,
    articlePoint,
    status: "取り込み済み"
  };
};

export const buildTracksFromRow = (row, episodeId, source, fallbackArtist = "", periodId = "") => {
  const groups = collectTrackFieldGroups(row);
  if (groups.length <= 1) {
    return [buildTrackFromRow(row, episodeId, source, fallbackArtist, periodId)].filter(Boolean);
  }

  const commonAiArtist = pickImportValue(
    row,
    [
      "AIアーティスト名",
      "AIアーティストの名前",
      "AIアーティスト",
      "AI artist",
      "AI Artist",
      "AI名義"
    ],
    TRACK_COLUMN_PATTERNS.aiArtist
  );
  return groups
    .map(({ values }) =>
      buildTrackFromRow(row, episodeId, source, fallbackArtist, periodId, {
        title: values.title || "",
        url: values.url || "",
        audioFile: values.audioFile || "",
        articlePoint: values.articlePoint || "",
        aiArtist: values.aiArtist || commonAiArtist || ""
      })
    )
    .filter(Boolean);
};

export const getPreviewTrackSource = (kind = "") =>
  kind === "listener" ? "リスナー応募曲" : kind === "personality" ? "パーソナリティ曲" : "ゲスト曲";

export const pickPreviewOwnerName = (row, kind, fallback = "") =>
  pickImportValue(
    row,
    kind === "listener"
      ? ["応募者名", "応募者のお名前", "お名前", "名前", "活動名", "ラジオネーム", "クリエイター名"]
      : kind === "personality"
        ? ["パーソナリティ名", "担当", "お名前", "名前", "活動名"]
        : ["ゲスト名", "ゲスト名 正式表記", "お名前", "名前", "活動名", "クリエイター名", "アーティスト名"],
    kind === "listener"
      ? [/応募者|お名前|名前|活動名|名義|ラジオネーム|クリエイター名/]
      : kind === "personality"
        ? [/パーソナリティ|担当|お名前|名前|活動名/]
        : [/ゲスト.*(名|名前|表記)|お名前|名前|活動名|名義|クリエイター名|アーティスト名/],
    [/AI\s*アーティスト|AI artist|AI名義/i]
  ) || fallback;

export const shortenPreviewValue = (value = "", max = 72) => {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};

export const buildImportPreviewRows = (rows = [], kind = "", mapping = {}) => {
  const mappedRows = applyColumnMappingToRows(rows, kind, mapping);
  return mappedRows.flatMap((row, index) => {
    const response =
      kind === "guest"
        ? buildResponseFromRow(row, "preview", "form_guest", `ゲスト回答${index + 1}`)
        : null;
    const tracks = buildTracksFromRow(row, "preview", getPreviewTrackSource(kind), response?.respondent || "");
    const iconFromResponse = response?.attachments?.[0]?.sourceUrl || response?.attachments?.[0]?.dataUrl || "";
    const previewTracks = tracks.length ? tracks : [null];
    return previewTracks.map((track, trackIndex) => ({
      rowNo: previewTracks.length > 1 ? `${index + 1}-${trackIndex + 1}` : index + 1,
      ownerName: response?.respondent || track?.artist || pickPreviewOwnerName(row, kind),
      aiArtist: track?.aiArtist || pickImportValue(row, ["AIアーティスト名", "AIアーティスト"], TRACK_COLUMN_PATTERNS.aiArtist),
      trackTitle: track?.title || pickImportValue(row, ["曲名", "楽曲名", "紹介曲"], TRACK_COLUMN_PATTERNS.title),
      trackUrl: track?.url || pickImportValue(row, ["楽曲URL", "曲URL", "URL", "Suno URL", "YouTube URL"], TRACK_COLUMN_PATTERNS.url),
      audioFile: track?.audioFile || pickImportValue(row, ["音源ファイル", "音源URL", "Drive URL"], TRACK_COLUMN_PATTERNS.audioFile),
      articlePoint: track?.articlePoint || pickImportValue(row, ["曲に込めた想い", "楽曲への想い", "曲紹介", "記事で触れてほしいポイント"], TRACK_COLUMN_PATTERNS.articlePoint),
      iconUrl: track?.ownerIconUrl || iconFromResponse,
      constraints: response?.constraints || pickImportValue(row, ["触れないでほしいこと", "NG質問", "表記注意", "注意事項"], [/触れない|NG|表記注意|注意事項|伏せたい|非公開|禁止|避けて|表記ルール/])
    }));
  });
};

export const importRowsIntoData = (current, selectedEpisode, rows, kind, periodId = "") => {
  if (!selectedEpisode || rows.length === 0) {
    return { data: current, result: { responses: 0, tracks: 0 } };
  }

  let nextResponses = current.responses;
  let nextTracks = current.tracks;
  let nextThumbnailStudio = current.thumbnailStudio ?? defaultThumbnailStudio;
  let responseCount = 0;
  let trackCount = 0;
  let trackCreateCount = 0;
  let trackUpdateCount = 0;
  const importedGuestNames = [];
  const reflectTrack = (track) => {
    track.slotNo = nextSlotNo(nextTracks, selectedEpisode.id);
    const result = upsertImportedTrack(nextTracks, track);
    nextTracks = result.tracks;
    trackCount += 1;
    if (result.created) trackCreateCount += 1;
    else trackUpdateCount += 1;
  };

  rows.forEach((row, rowIndex) => {
    if (kind === "guest") {
      const response = buildResponseFromRow(row, selectedEpisode.id, "form_guest", `ゲスト回答${rowIndex + 1}`);
      if (response.respondent || response.publicInfo || response.articleUse || response.constraints || response.attachments?.length) {
        const guestIcon = makeGuestIconFromAttachment(findGuestIconAttachment(response.attachments), `${response.respondent || "guest"}-icon`);
        if (guestIcon) {
          nextThumbnailStudio = mergeGuestIcons(nextThumbnailStudio, guestIcon);
        }
        if (response.respondent) importedGuestNames.push(response.respondent);
        nextResponses = [
          response,
          ...nextResponses.filter(
            (item) => !(item.episodeId === selectedEpisode.id && item.formId === "form_guest" && item.respondent === response.respondent)
          )
        ];
        responseCount += 1;
      }
      const tracks = buildTracksFromRow(row, selectedEpisode.id, "ゲスト曲", response.respondent);
      tracks.forEach((track) => {
        reflectTrack(track);
      });
    }

    if (kind === "listener") {
      const tracks = buildTracksFromRow(row, selectedEpisode.id, "リスナー応募曲", "", periodId);
      tracks.forEach((track) => {
        reflectTrack(track);
      });
    }

    if (kind === "personality") {
      const tracks = buildTracksFromRow(row, selectedEpisode.id, "パーソナリティ曲");
      tracks.forEach((track) => {
        reflectTrack(track);
      });
    }
  });

  if (kind === "guest" && responseCount > 0) {
    const guestCount = Math.max(importedGuestNames.length, countGuestsFromText(selectedEpisode.guestName), normalizeGuestIconList(nextThumbnailStudio.guestIcon, nextThumbnailStudio.guestIcons).length, 1);
    const preset = getLayoutPresetForGuestCount(guestCount);
    nextThumbnailStudio = {
      ...defaultThumbnailStudio,
      ...nextThumbnailStudio,
      activeLayoutPreset: preset.id,
      templates: applyIconLayoutPresetToTemplates(nextThumbnailStudio.templates, preset),
      generated: {},
      autoGenerateRequestedAt: new Date().toISOString()
    };
  }

  return {
    data: { ...current, responses: nextResponses, tracks: nextTracks, thumbnailStudio: nextThumbnailStudio },
    result: { responses: responseCount, tracks: trackCount, trackCreates: trackCreateCount, trackUpdates: trackUpdateCount }
  };
};

export const buildTracksFromRawAnswers = (rawAnswers = [], episodeId = "", formId = "", respondent = "", periodId = "") => {
  const source =
    formId === "form_listener" ? "リスナー応募曲" : formId === "form_personality" ? "パーソナリティ曲" : "ゲスト曲";
  const artistAnswer =
    rawAnswers.find((answer) => /AIアーティスト|AI artist|AI名義/.test(answer.label))?.answer ?? "";
  const ownerAnswer =
    rawAnswers.find((answer) => /ゲスト名|活動名|応募者|担当|名前|パーソナリティ|アーティスト名/.test(answer.label) && !/AIアーティスト|AI artist|AI名義/.test(answer.label))?.answer ?? "";
  const artist = ownerAnswer && ownerAnswer !== "-" ? ownerAnswer : respondent;
  const ownerIconAnswer = rawAnswers.find((answer) => answer.kind === "image" && /アイコン|プロフィール|画像|icon|avatar/i.test(answer.label))?.attachment;
  const ownerIconUrl = ownerIconAnswer?.dataUrl || ownerIconAnswer?.sourceUrl || ownerIconAnswer?.url || "";

  return rawAnswers
    .filter((answer) => answer.kind === "track" && answer.track)
    .map((answer) => {
      const track = answer.track;
      if (!track.title && !track.url && !track.audio?.fileName && !track.audioUrl) return null;
      const trackArtist = artist;
      const aiArtist = track.aiArtist || track.artist || (artistAnswer && artistAnswer !== "-" ? artistAnswer : "");
      return {
        id: newId("tr"),
        episodeId,
        periodId,
        slotNo: 0,
        source,
        artist: trackArtist,
        aiArtist,
        title: track.title || `${trackArtist || aiArtist || source} 紹介曲`,
        urlType: detectUrlType(track.url),
        url: track.url || "",
        audioFile: track.audio?.fileName || track.audioUrl || "",
        audio: track.audio || null,
        ownerIconUrl,
        embedUrl: makeEmbedUrl(track.url || ""),
        honorific: getDefaultOwnerHonorific(source),
        articlePoint: `${answer.label}から取り込み`,
        status: "回答JSONから取り込み"
      };
    })
    .filter(Boolean);
};

export const encodeSharePayload = (payload) => {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

export const decodeSharePayload = (value) => {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
};

export const encodeCompressedSharePayload = (payload) => LZString.compressToEncodedURIComponent(JSON.stringify(payload));

export const decodeCompressedSharePayload = (value) => {
  const json = LZString.decompressFromEncodedURIComponent(value);
  if (!json) throw new Error("share-payload-decode-failed");
  return JSON.parse(json);
};

export const encodeStoredData = (payload) => `${STORAGE_COMPRESSED_PREFIX}${LZString.compressToUTF16(JSON.stringify(payload))}`;

export const decodeStoredData = (value) => {
  const stored = String(value || "");
  if (stored.startsWith(STORAGE_COMPRESSED_PREFIX)) {
    const json = LZString.decompressFromUTF16(stored.slice(STORAGE_COMPRESSED_PREFIX.length));
    if (!json) throw new Error("stored-data-decode-failed");
    return JSON.parse(json);
  }
  return JSON.parse(stored);
};

export const saveStoredData = (payload) => {
  localStorage.setItem(STORAGE_KEY, encodeStoredData(payload));
};

export const normalizeShareSlug = (value = "", fallback = "form") => {
  const fallbackSlug =
    String(fallback || "form")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "form";
  return (
    String(value || fallbackSlug)
      .trim()
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || fallbackSlug
  );
};

export const getFormPublishedSlug = (form) => normalizeShareSlug(form?.shareSlug || form?.id, form?.id || "form");

export const getPeriodPublishedSlug = (period, episode, form) =>
  normalizeShareSlug(
    period?.shareSlug || [episode?.date, form?.id || period?.formId, period?.id].filter(Boolean).join("-"),
    period?.id || "period"
  );

export const getPublishedSharePayloadUrl = (slug) => publicAsset(`${SHARED_FORMS_DIR}/${normalizeShareSlug(slug)}.json`);

export const makePublishedShareUrl = (slug) =>
  `${window.location.origin}${window.location.pathname}#/r/${encodeURIComponent(normalizeShareSlug(slug))}`;

export const makeShortUrlActivationRequest = (slug, payload) => {
  const shareSlug = normalizeShareSlug(slug);
  return `Radio Article Studioの短いURLを有効化してください。

短いURL:
${makePublishedShareUrl(shareSlug)}

配置先:
public/${SHARED_FORMS_DIR}/${shareSlug}.json

配置するJSON:
${JSON.stringify(payload, null, 2)}
`;
};

export const downloadTextFile = (content, fileName, type = "text/plain") => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const downloadDataUrlFile = (dataUrl, fileName = "download") => {
  if (!dataUrl) return;
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = fileName;
  anchor.click();
};

export const saveDataUrlWithPicker = async (dataUrl, fileName = "download") => {
  if (!dataUrl) return false;
  if (!window.showSaveFilePicker) {
    downloadDataUrlFile(dataUrl, fileName);
    return false;
  }
  const blob = await fetch(dataUrl).then((response) => response.blob());
  const handle = await window.showSaveFilePicker({ suggestedName: fileName });
  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();
  return true;
};

export const writeDataUrlToDirectory = async (directoryHandle, fileName, dataUrl) => {
  const blob = await fetch(dataUrl).then((response) => response.blob());
  const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
};

export const getRawStoredDataForShare = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? { ...sampleData, ...decodeStoredData(stored) } : sampleData;
  } catch {
    return sampleData;
  }
};

export const resolveFormReferencePayload = (formId) => {
  const data = getRawStoredDataForShare();
  const form = (data.forms ?? []).find((item) => item.id === formId);
  return form ? makeSharePayload(form, { ...sampleData.settings, ...(data.settings ?? {}) }) : { error: true };
};

export const resolvePeriodReferencePayload = (periodId) => {
  const data = getRawStoredDataForShare();
  const period = (data.applicationPeriods ?? []).find((item) => item.id === periodId);
  if (!period) return { error: true };
  const form = (data.forms ?? []).find((item) => item.id === period.formId);
  if (!form) return { error: true };
  const episode = (data.episodes ?? []).find((item) => item.id === period.episodeId);
  return makeSharePayload(form, { ...sampleData.settings, ...(data.settings ?? {}) }, { period, episode });
};

export const readSharedFormPayload = () => {
  const publishedMatch = window.location.hash.match(/^#\/r\/([^/?#]+)$/);
  if (publishedMatch) {
    return {
      loading: true,
      publishedSlug: normalizeShareSlug(decodeURIComponent(publishedMatch[1]))
    };
  }

  const periodReferenceMatch = window.location.hash.match(/^#\/p\/([^/?#]+)$/);
  if (periodReferenceMatch) return resolvePeriodReferencePayload(decodeURIComponent(periodReferenceMatch[1]));

  const formReferenceMatch = window.location.hash.match(/^#\/f\/([^/?#]+)$/);
  if (formReferenceMatch) return resolveFormReferencePayload(decodeURIComponent(formReferenceMatch[1]));

  const compressedMatch = window.location.hash.match(/^#\/s\/(.+)$/);
  if (compressedMatch) {
    try {
      return decodeCompressedSharePayload(compressedMatch[1]);
    } catch {
      return { error: true };
    }
  }

  const match = window.location.hash.match(/^#\/submit\/(.+)$/);
  if (!match) return null;
  try {
    return decodeSharePayload(match[1]);
  } catch {
    return { error: true };
  }
};

export const isValidSharePayload = (payload) => payload?.type === "radio-article-studio-form" && Boolean(payload?.form);

export const loadPublishedSharePayload = async (slug) => {
  // まずGAS受信口からフォーム定義を取得する（ツールから即時公開できる主経路）。
  // 受信口URLはリポジトリのapp-config.jsonに一度だけ設定する。
  const config = await loadAppConfig(import.meta.env.BASE_URL);
  const endpointUrl = String(config.formEndpointUrl || "").trim();
  if (endpointUrl) {
    try {
      const result = await getFromGasEndpoint(endpointUrl, { action: "getForm", slug: normalizeShareSlug(slug) });
      if (isValidSharePayload(result.payload)) return result.payload;
    } catch {
      // GASに未公開のフォームは、従来のリポジトリ同梱JSONへフォールバックする。
    }
  }
  const response = await fetch(getPublishedSharePayloadUrl(slug), { cache: "no-store" });
  if (!response.ok) throw new Error(`published-share-not-found:${response.status}`);
  const payload = await response.json();
  if (!isValidSharePayload(payload)) {
    throw new Error("published-share-invalid");
  }
  return payload;
};

export const publishSharePayloadToGas = async (settings, slug, payload) => {
  const endpointUrl = String(settings.responseEndpointUrl || "").trim();
  if (!endpointUrl) throw new Error("設定で「回答保存Webhook URL」を入力してください。");
  return postToGasEndpoint(endpointUrl, {
    action: "publishForm",
    token: String(settings.responseSyncToken || "").trim(),
    slug: normalizeShareSlug(slug),
    payload
  });
};

export const readRestorePayload = () => {
  const match = window.location.hash.match(/^#\/restore\/(.+)$/);
  if (!match) return null;
  try {
    return { data: migrateData(decodeCompressedSharePayload(match[1])) };
  } catch {
    return { error: true };
  }
};

export const makeSharePayload = (form, settings = sampleData.settings, context = {}) => {
  const payload = {
    version: 1,
    type: "radio-article-studio-form",
    contactAccounts: {
      bellbo: normalizeXHandle(settings.bellboXHandle || DEFAULT_BELLBO_X_HANDLE),
      kaname: normalizeXHandle(settings.kanameXHandle || ""),
      additional: normalizeAdditionalXAccounts(settings.additionalXAccounts || [])
    },
    xContactMessage: settings.xContactMessage || DEFAULT_X_CONTACT_MESSAGE,
    submission: {
      endpointUrl: settings.responseEndpointUrl || "",
      driveFolderUrl: settings.responseDriveFolderUrl || "",
      audioSaveMemo: settings.audioSaveMemo || ""
    },
    form: {
      id: form.id,
      name: form.name,
      type: form.type,
      description: form.description,
      receptionStartDate: form.receptionStartDate || "",
      receptionEndDate: form.receptionEndDate || "",
      submissionLimit: normalizeSubmissionLimit(form.submissionLimit),
      attachmentLimitMb: normalizeAttachmentLimitMb(form.attachmentLimitMb),
      questions: (form.questions ?? []).map((question) =>
        question.kind === "track" ? { ...question, trackFields: normalizeTrackFields(question.trackFields) } : question
      )
    }
  };
  if (context.period) {
    payload.period = {
      id: context.period.id,
      title: context.period.title,
      type: context.period.type,
      startDate: context.period.startDate,
      endDate: context.period.endDate,
      episodeId: context.period.episodeId
    };
  }
  if (context.episode) {
    payload.episode = {
      id: context.episode.id,
      title: context.episode.title,
      date: context.episode.date,
      slot: context.episode.slot
    };
  }
  return payload;
};

export const makeShareUrl = (form, settings = sampleData.settings, context = {}) =>
  context.period?.id
    ? `${window.location.origin}${window.location.pathname}#/p/${encodeURIComponent(context.period.id)}`
    : `${window.location.origin}${window.location.pathname}#/f/${encodeURIComponent(form.id)}`;

export const makePortableShareUrl = (form, settings = sampleData.settings, context = {}) =>
  `${window.location.origin}${window.location.pathname}#/s/${encodeCompressedSharePayload(makeSharePayload(form, settings, context))}`;

export const makeLegacyShareUrl = (form, settings = sampleData.settings, context = {}) =>
  `${window.location.origin}${window.location.pathname}#/submit/${encodeSharePayload(makeSharePayload(form, settings, context))}`;

export const makeRestoreUrl = (data) =>
  `${window.location.origin}${window.location.pathname}#/restore/${encodeCompressedSharePayload(data)}`;

export const downloadPublishedShareJson = (form, settings = sampleData.settings, context = {}, slug) => {
  const shareSlug = normalizeShareSlug(slug);
  downloadTextFile(
    JSON.stringify(makeSharePayload(form, settings, context), null, 2),
    `${shareSlug}.json`,
    "application/json"
  );
};

export const formatDateRange = (startDate = "", endDate = "") => {
  if (startDate && endDate) return `${startDate} - ${endDate}`;
  return startDate || endDate || "期間未設定";
};

export const sampleData = {
  settings: {
    obsidianPath: DEFAULT_OBSIDIAN_PATH,
    obsidianFolderName: "Sunoパ！記事",
    wordpressSite: "https://ai-music.noiseinmysoul.com/",
    sePonUrl: "https://umbrellaparade.github.io/SE_Pon/",
    bellboXHandle: DEFAULT_BELLBO_X_HANDLE,
    kanameXHandle: DEFAULT_KANAME_X_HANDLE,
    additionalXAccounts: [],
    xContactMessage: DEFAULT_X_CONTACT_MESSAGE,
    responseEndpointUrl: DEFAULT_RESPONSE_ENDPOINT_URL,
    responseDriveFolderUrl: DEFAULT_RESPONSE_DRIVE_FOLDER_URL,
    thumbnailDriveEndpointUrl: DEFAULT_THUMBNAIL_DRIVE_ENDPOINT_URL,
    thumbnailDriveFolderUrl: DEFAULT_THUMBNAIL_DRIVE_FOLDER_URL,
    audioSaveMemo: DEFAULT_AUDIO_SAVE_MEMO,
    trackFieldDefaults: DEFAULT_TRACK_FIELDS,
    responseSyncToken: "",
    lastResponseSyncAt: ""
  },
  imports: defaultImports,
  thumbnailStudio: defaultThumbnailStudio,
  socialPromos: {},
  episodes: [
    {
      id: "ep_yui_2026_07_10",
      title: "結音さんゲスト回🌟",
      date: "2026-07-10",
      slot: "第2木曜日",
      time: "21:30-23:00",
      type: "ゲスト回",
      guestName: "結音さん",
      standfmUrl: "https://stand.fm/episodes/6a4fa398337119d74b6669ff",
      status: "公開済み",
      articleSlug: "sunopa-yui-silfira-guest",
      articleUrl: "https://ai-music.noiseinmysoul.com/sunopa-yui-silfira-guest/",
      notes: "AI音楽制作と作品に込めた想い",
      extraInfo: "サンプル。実運用では放送後にstand.fm URLを入れる。"
    }
  ],
  forms: [
    {
      id: "form_guest",
      name: "ゲスト回アンケート",
      type: "ゲスト",
      status: "受付中",
      shareSlug: "guest-form",
      color: "#8bd7df",
      description: "ゲスト紹介、紹介楽曲、NG/注意事項を集めるフォーム。",
      attachmentLimitMb: DEFAULT_ATTACHMENT_LIMIT_MB,
      questions: [
        { id: "q_guest_name", label: "ゲスト名 正式表記", kind: "short", required: true, use: "public" },
        { id: "q_guest_x", label: "X URL", kind: "url", required: true, use: "public" },
        { id: "q_guest_icon", label: "ゲストアイコン画像", kind: "image", required: false, use: "internal" },
        { id: "q_contact_x", label: "連絡用Xアカウント", kind: "x_contact", required: false, use: "public" },
        { id: "q_profile", label: "活動紹介文", kind: "long", required: true, use: "public" },
        { id: "q_topics", label: "今回話したいこと", kind: "long", required: false, use: "article" },
        { id: "q_guest_track", label: "紹介する楽曲", kind: "track", required: false, use: "article" },
        { id: "q_ng", label: "触れないでほしいこと/NG質問", kind: "long", required: false, use: "constraint" }
      ]
    },
    {
      id: "form_listener",
      name: "リスナー楽曲応募フォーム",
      type: "リスナー",
      status: "準備中",
      shareSlug: "listener-tracks",
      color: "#f3c96b",
      description: "送って頂く楽曲の楽曲名、楽曲URL、WAV/MP3音源、記事掲載可否を集めるフォーム。",
      attachmentLimitMb: DEFAULT_ATTACHMENT_LIMIT_MB,
      questions: [
        { id: "q_artist", label: "アーティスト名 正式表記", kind: "short", required: true, use: "article" },
        { id: "q_contact_x", label: "連絡用Xアカウント", kind: "x_contact", required: true, use: "public" },
        { id: "q_track", label: "送って頂く楽曲", kind: "track", required: true, use: "article" },
        { id: "q_credit", label: "クレジット/表記注意", kind: "long", required: false, use: "constraint" }
      ]
    },
    {
      id: "form_personality",
      name: "パーソナリティ曲入力",
      type: "運営",
      status: "運用中",
      shareSlug: "personality-tracks",
      color: "#bfa7f2",
      description: "かなめ🦐/べるぼ☂の紹介曲を運営側で入力するフォーム。",
      attachmentLimitMb: DEFAULT_ATTACHMENT_LIMIT_MB,
      questions: [
        { id: "q_owner", label: "担当", kind: "choice", required: true, use: "article" },
        { id: "q_track", label: "送って頂く楽曲", kind: "track", required: true, use: "article" },
        { id: "q_point", label: "記事で触れてほしいポイント", kind: "long", required: false, use: "article" }
      ]
    }
  ],
  formPresets: [],
  formPresetOverrides: {},
  applicationPeriods: [
    {
      id: "period_listener_2026_07_10",
      title: "7月リスナー応募曲",
      type: "リスナー応募曲",
      episodeId: "ep_yui_2026_07_10",
      formId: "form_listener",
      startDate: "2026-07-01",
      endDate: "2026-07-09",
      status: "受付終了",
      shareSlug: "listener-2026-07-10",
      csvUrl: "",
      notes: "放送回に載せるリスナー応募曲を期間でまとめるサンプル。"
    }
  ],
  responses: [
    {
      id: "res_yui",
      episodeId: "ep_yui_2026_07_10",
      periodId: "",
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
      periodId: "",
      slotNo: 1,
      source: "ゲスト曲",
      artist: "結音さん",
      aiArtist: "Silfira",
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
      periodId: "",
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
      periodId: "",
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
      periodId: "period_listener_2026_07_10",
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

export function migrateData(input) {
  const isLegacyTrackQuestion = (question) => {
    const label = question.label ?? "";
    return (
      ["q_song", "q_music_url", "q_title", "q_url", "q_audio"].includes(question.id) ||
      /^(曲名|楽曲名|楽曲URL|音源ファイル|送って頂く楽曲|紹介する楽曲)/.test(label) ||
      (/(YouTube|Suno|WAV|MP3|mp3|wav)/.test(label) && /(楽曲|音源|アップロード)/.test(label))
    );
  };

  const normalizePresetQuestions = (questions = []) =>
    (Array.isArray(questions) ? questions : []).map((question) => {
      const normalizedQuestion = { ...question, help: question?.help || "" };
      return normalizedQuestion.kind === "track"
        ? { ...normalizedQuestion, trackFields: normalizeTrackFields(normalizedQuestion.trackFields) }
        : normalizedQuestion;
    });

  const forms = (input.forms ?? sampleData.forms).map((form, formIndex) => {
    let questions = form.questions ?? [];
    const formName = form.name ?? "";
    const isGuestForm = form.id === "form_guest" || formName.includes("ゲスト");
    const isListenerForm = form.id === "form_listener" || formName.includes("リスナー");
    const isPersonalityForm = form.id === "form_personality" || formName.includes("パーソナリティ");

    if ((isGuestForm || isListenerForm) && !questions.some((question) => question.kind === "x_contact" || question.id === "q_contact_x")) {
      const insertAfterId = isGuestForm ? "q_guest_x" : "q_artist";
      const insertIndex = questions.findIndex((question) => question.id === insertAfterId);
      const contactQuestion = {
        id: "q_contact_x",
        label: "連絡用Xアカウント",
        kind: "x_contact",
        required: isListenerForm,
        use: "public"
      };
      questions = [...questions];
      if (insertIndex >= 0) {
        questions.splice(insertIndex + 1, 0, contactQuestion);
      } else {
        questions.push(contactQuestion);
      }
    }

    if (isGuestForm && !questions.some((question) => question.kind === "image" || /アイコン|プロフィール画像|icon|avatar/i.test(question.label ?? ""))) {
      const insertIndex = questions.findIndex((question) => question.id === "q_guest_x");
      const iconQuestion = { id: "q_guest_icon", label: "ゲストアイコン画像", kind: "image", required: false, use: "internal" };
      questions = [...questions];
      if (insertIndex >= 0) {
        questions.splice(insertIndex + 1, 0, iconQuestion);
      } else {
        questions.push(iconQuestion);
      }
    }

    if (isGuestForm && !questions.some((question) => question.kind === "track")) {
      const topicsIndex = questions.findIndex((question) => question.id === "q_topics");
      const trackQuestion = { id: "q_guest_track", label: "紹介する楽曲", kind: "track", required: false, use: "article" };
      questions = [...questions];
      if (topicsIndex >= 0) {
        questions.splice(topicsIndex + 1, 0, trackQuestion);
      } else {
        questions.push(trackQuestion);
      }
    }

    if (isListenerForm || isPersonalityForm) {
      const existingTrack = questions.find((question) => question.kind === "track" || question.id === "q_track" || isLegacyTrackQuestion(question));
      const shouldKeepExistingTrackShape = existingTrack?.kind === "track" || existingTrack?.id === "q_track";
      const trackQuestion = {
        id: shouldKeepExistingTrackShape ? existingTrack.id : "q_track",
        label: existingTrack?.kind === "track" ? existingTrack.label : "送って頂く楽曲",
        kind: "track",
        required: existingTrack?.required ?? true,
        use: existingTrack?.use || "article",
        help: existingTrack?.help || "",
        trackFields: normalizeTrackFields(existingTrack?.trackFields)
      };
      const rest = questions.filter((question) => question.id !== trackQuestion.id && !isLegacyTrackQuestion(question));
      const insertAfterId = isListenerForm ? "q_artist" : "q_owner";
      const insertIndex = rest.findIndex((question) => question.id === insertAfterId);
      questions = [...rest];
      if (!questions.some((question) => question.kind === "track")) {
        if (insertIndex >= 0) {
          questions.splice(insertIndex + 1, 0, trackQuestion);
        } else {
          questions.push(trackQuestion);
        }
      }
    }

    questions = questions.map((question) => {
      const nextQuestion = question.kind === "x_contact" && question.use === "internal" ? { ...question, use: "public" } : question;
      const normalizedQuestion = { ...nextQuestion, help: nextQuestion.help || "" };
      return normalizedQuestion.kind === "track"
        ? { ...normalizedQuestion, trackFields: normalizeTrackFields(normalizedQuestion.trackFields) }
        : normalizedQuestion;
    });

    return {
      ...form,
      receptionStartDate: form.receptionStartDate || "",
      receptionEndDate: form.receptionEndDate || "",
      submissionLimit: normalizeSubmissionLimit(form.submissionLimit) || "",
      attachmentLimitMb: normalizeAttachmentLimitMb(form.attachmentLimitMb),
      shareSlug: form.shareSlug || getFormPublishedSlug(form),
      color: normalizeFormColor(form.color, FORM_COLOR_PALETTE[formIndex % FORM_COLOR_PALETTE.length]),
      questions
    };
  });

  const formPresets = (input.formPresets ?? []).map((preset, presetIndex) => {
    const presetForm = preset.form ?? {};
    return {
      id: preset.id || `preset_${presetIndex + 1}`,
      name: preset.name || presetForm.name || "フォームプリセット",
      createdAt: preset.createdAt || "",
      form: {
        id: presetForm.id || `preset_form_${presetIndex + 1}`,
        name: presetForm.name || preset.name || "フォームプリセット",
        type: presetForm.type || "自由フォーム",
        status: presetForm.status || "準備中",
        shareSlug: "",
        description: presetForm.description || "",
        receptionStartDate: presetForm.receptionStartDate || "",
        receptionEndDate: presetForm.receptionEndDate || "",
        submissionLimit: normalizeSubmissionLimit(presetForm.submissionLimit) || "",
        attachmentLimitMb: normalizeAttachmentLimitMb(presetForm.attachmentLimitMb),
        color: normalizeFormColor(presetForm.color, FORM_COLOR_PALETTE[presetIndex % FORM_COLOR_PALETTE.length]),
        questions: normalizePresetQuestions(presetForm.questions)
      }
    };
  });

  const formPresetOverrides = Object.fromEntries(
    Object.entries(input.formPresetOverrides ?? {}).map(([formId, presetForm], presetIndex) => [
      formId,
      {
        name: presetForm?.name || "フォームプリセット",
        type: presetForm?.type || "自由フォーム",
        status: presetForm?.status || "準備中",
        shareSlug: "",
        description: presetForm?.description || "",
        receptionStartDate: presetForm?.receptionStartDate || "",
        receptionEndDate: presetForm?.receptionEndDate || "",
        submissionLimit: normalizeSubmissionLimit(presetForm?.submissionLimit) || "",
        attachmentLimitMb: normalizeAttachmentLimitMb(presetForm?.attachmentLimitMb),
        color: normalizeFormColor(presetForm?.color, FORM_COLOR_PALETTE[presetIndex % FORM_COLOR_PALETTE.length]),
        questions: normalizePresetQuestions(presetForm?.questions)
      }
    ])
  );

  const settings = { ...sampleData.settings, ...(input.settings ?? {}) };
  if (!settings.bellboXHandle) settings.bellboXHandle = DEFAULT_BELLBO_X_HANDLE;
  if (!settings.kanameXHandle) settings.kanameXHandle = DEFAULT_KANAME_X_HANDLE;
  settings.additionalXAccounts = normalizeAdditionalXAccounts(settings.additionalXAccounts || []);
  if (!settings.xContactMessage) settings.xContactMessage = DEFAULT_X_CONTACT_MESSAGE;
  if (!("responseEndpointUrl" in settings)) settings.responseEndpointUrl = DEFAULT_RESPONSE_ENDPOINT_URL;
  if (!("responseDriveFolderUrl" in settings)) settings.responseDriveFolderUrl = DEFAULT_RESPONSE_DRIVE_FOLDER_URL;
  if (!("thumbnailDriveEndpointUrl" in settings)) settings.thumbnailDriveEndpointUrl = DEFAULT_THUMBNAIL_DRIVE_ENDPOINT_URL;
  if (!("thumbnailDriveFolderUrl" in settings)) settings.thumbnailDriveFolderUrl = DEFAULT_THUMBNAIL_DRIVE_FOLDER_URL;
  if (!settings.audioSaveMemo) settings.audioSaveMemo = DEFAULT_AUDIO_SAVE_MEMO;
  settings.trackFieldDefaults = normalizeTrackFields(settings.trackFieldDefaults);
  if (!("responseSyncToken" in settings)) settings.responseSyncToken = "";
  if (!("lastResponseSyncAt" in settings)) settings.lastResponseSyncAt = "";
  if (!settings.responseDriveFolderUrl) settings.responseDriveFolderUrl = DEFAULT_RESPONSE_DRIVE_FOLDER_URL;
  const episodes = (input.episodes ?? sampleData.episodes).map((episode) => {
    const articleSlug = episode.articleSlug || extractSlugFromUrl(episode.articleUrl);
    return {
      ...episode,
      slot: episode.slot || getBroadcastSlot(episode.date),
      notes: episode.notes || input.socialPromos?.[episode.id]?.talkTheme || "",
      extraInfo: episode.extraInfo ?? "",
      articleSlug,
      articleUrl: episode.articleUrl || buildArticleUrl(settings.wordpressSite, articleSlug)
    };
  });
  const rawThumbnailStudio = input.thumbnailStudio ?? {};
  const activeLayoutPresetId = rawThumbnailStudio.activeLayoutPreset ?? defaultThumbnailStudio.activeLayoutPreset;
  const layoutPresetOverrides = rawThumbnailStudio.layoutPresetOverrides ?? {};
  const customLayoutPresets = rawThumbnailStudio.customLayoutPresets ?? [];
  const builtInLayoutPreset = THUMBNAIL_ICON_LAYOUT_PRESETS.find((preset) => preset.id === activeLayoutPresetId);
  const storedActiveLayoutPreset =
    layoutPresetOverrides[activeLayoutPresetId] ?? customLayoutPresets.find((preset) => preset.id === activeLayoutPresetId);
  const hasBuiltInLayoutOverride = Boolean(layoutPresetOverrides[activeLayoutPresetId]);
  const hasSavedThumbnailTemplates = Boolean(
    rawThumbnailStudio.templates && Object.values(rawThumbnailStudio.templates).some((template) => template && Object.keys(template).length)
  );
  const normalizedThumbnailTemplates = Object.fromEntries(
    THUMBNAIL_PRESETS.map((preset) => [
      preset.key,
      {
        ...defaultThumbnailStudio.templates[preset.key],
        ...(rawThumbnailStudio.templates?.[preset.key] ?? {})
      }
    ])
  );
  const shouldRefreshBuiltInLayout =
    Boolean(builtInLayoutPreset) &&
    !hasBuiltInLayoutOverride &&
    !hasSavedThumbnailTemplates &&
    rawThumbnailStudio.layoutPresetVersion !== THUMBNAIL_LAYOUT_PRESET_VERSION;
  const thumbnailTemplates = shouldRefreshBuiltInLayout
    ? applyIconLayoutPresetToTemplates(normalizedThumbnailTemplates, builtInLayoutPreset)
    : storedActiveLayoutPreset
      ? applyIconLayoutPresetToTemplates(normalizedThumbnailTemplates, storedActiveLayoutPreset)
    : normalizedThumbnailTemplates;

  return {
    ...sampleData,
    ...input,
    settings,
    imports: { ...defaultImports, ...(input.imports ?? {}) },
    socialPromos: Object.fromEntries(
      Object.entries(input.socialPromos ?? {}).map(([episodeId, promo]) => {
        const comicTemplate = sanitizeSnsComicTemplateText(promo?.comicTemplate ?? "");
        const comicPrompt = /かなめ|kaname/i.test(promo?.comicPrompt ?? "") ? "" : promo?.comicPrompt ?? "";
        return [
          episodeId,
          {
            ...defaultSocialPromo,
            ...(promo ?? {}),
            comicTemplate,
            comicPrompt,
            comicImage: {
              ...defaultSocialPromo.comicImage,
              ...(promo?.comicImage ?? {})
            }
          }
        ];
      })
    ),
    thumbnailStudio: {
      ...defaultThumbnailStudio,
      ...rawThumbnailStudio,
      layoutPresetVersion: THUMBNAIL_LAYOUT_PRESET_VERSION,
      templates: thumbnailTemplates,
      guestIcon: {
        ...defaultThumbnailStudio.guestIcon,
        ...(rawThumbnailStudio.guestIcon ?? {})
      },
      guestIcons: normalizeGuestIconList(rawThumbnailStudio.guestIcon, rawThumbnailStudio.guestIcons),
      activeLayoutPreset: activeLayoutPresetId,
      layoutPresetOverrides,
      customLayoutPresets,
      generated: shouldRefreshBuiltInLayout ? {} : rawThumbnailStudio.generated ?? {},
      autoGenerateRequestedAt: shouldRefreshBuiltInLayout ? "" : rawThumbnailStudio.autoGenerateRequestedAt ?? ""
    },
    episodes,
    forms,
    formPresets,
    formPresetOverrides,
    applicationPeriods: (input.applicationPeriods ?? sampleData.applicationPeriods).map((period) => ({
      title: "",
      type: "リスナー応募曲",
      episodeId: episodes[0]?.id ?? "",
      formId: forms.find((form) => form.id === "form_listener")?.id ?? forms[0]?.id ?? "",
      startDate: "",
      endDate: "",
      status: "準備中",
      csvUrl: "",
      notes: "",
      ...period,
      shareSlug: period.shareSlug || getPeriodPublishedSlug(period, episodes.find((episode) => episode.id === period.episodeId), forms.find((form) => form.id === period.formId))
    })),
    responses: (input.responses ?? sampleData.responses).map((response) => ({
      attachments: [],
      periodId: "",
      ...response
    })),
    tracks: (input.tracks ?? sampleData.tracks).map((track) => ({
      audioFile: "",
      audio: null,
      periodId: "",
      aiArtist: "",
      ownerIconUrl: "",
      ...track,
      honorific: track.honorific || getDefaultOwnerHonorific(track.source),
      urlType: track.urlType || detectUrlType(track.url)
    }))
  };
}

export function loadData() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return migrateData(stored ? decodeStoredData(stored) : sampleData);
  } catch {
    return migrateData(sampleData);
  }
}

