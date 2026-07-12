import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import LZString from "lz-string";
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ClipboardCopy,
  Database,
  Download,
  FileText,
  FolderOpen,
  Image,
  Link,
  Mic2,
  Music,
  Plus,
  Radio,
  Save,
  Send,
  Settings,
  Share2,
  Trash2,
  Upload,
  X,
  ZoomIn
} from "lucide-react";
import "./styles.css";

const STORAGE_KEY = "radio-article-studio:v1";
const THUMBNAIL_IMAGE_DB_NAME = "radio-article-studio-thumbnails";
const THUMBNAIL_IMAGE_STORE = "generated";
const SHARED_FORMS_DIR = "shared-forms";
const DEFAULT_OBSIDIAN_PATH = "C:\\Users\\myabe\\OneDrive\\Desktop\\Obsidian Folder\\Umbrella Parade\\Sunoパ！記事";
const DEFAULT_BELLBO_X_HANDLE = "bellbo13";
const DEFAULT_KANAME_X_HANDLE = "kaname_mbembe";
const DEFAULT_X_CONTACT_MESSAGE =
  "Xでご連絡するため、べるぼ☂とかなめ🦐のアカウントをフォローお願いします。フォローいただいていない場合、こちらからDMをお送りできないことがあります。";
const DEFAULT_RESPONSE_ENDPOINT_URL = "";
const DEFAULT_RESPONSE_DRIVE_FOLDER_URL = "";
const DEFAULT_AUDIO_SAVE_MEMO = "PC: デスクトップのポン出し音源一覧 / Drive: 指定フォルダー";
const publicAsset = (path) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;
const GUEST_BADGE_ASSET_URL = publicAsset("thumbnail-overlays/guest-in-badge.png");

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(publicAsset("sw.js"), { scope: import.meta.env.BASE_URL }).catch(() => {
      console.warn("Radio Article Studio: service worker registration failed.");
    });
  });
}

const openThumbnailImageDb = () =>
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

const saveGeneratedThumbnailImage = async (id, dataUrl) => {
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

const deleteGeneratedThumbnailImage = async (id) => {
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

const loadGeneratedThumbnailImage = async (id) => {
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
  ["track", "楽曲"],
  ["image", "画像"],
  ["x_contact", "X連絡ブロック"],
  ["choice", "選択式"],
  ["file", "音源ファイル単体"]
];

const TRACK_URL_ERROR_MESSAGE = "楽曲URLはYouTubeまたはSunoのURLを入力してください。";
const TRACK_URL_PATTERN = "https?://([A-Za-z0-9-]+\\.)?(youtube\\.com|suno\\.com)(/.*)?|https?://youtu\\.be(/.*)?";

const detectUrlType = (url = "") => {
  const normalized = url.toLowerCase();
  if (normalized.includes("suno.com")) return "Suno";
  if (normalized.includes("youtube.com") || normalized.includes("youtu.be")) return "YouTube";
  if (normalized.includes("spotify.com")) return "Spotify";
  if (normalized.match(/\.(mp3|wav)(\?|#|$)/)) return "Audio";
  return "Other";
};

const AUDIO_FILE_ACCEPT = "audio/mpeg,audio/mp3,audio/wav,audio/x-wav,.mp3,.wav";
const IMAGE_FILE_ACCEPT = "image/png,image/jpeg,image/webp,image/gif,.png,.jpg,.jpeg,.webp,.gif";

const isAudioUpload = (file) => {
  const name = file?.name?.toLowerCase() ?? "";
  return name.endsWith(".mp3") || name.endsWith(".wav") || ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav"].includes(file?.type);
};

const isImageUpload = (file) => {
  const name = file?.name?.toLowerCase() ?? "";
  return /\.(png|jpe?g|webp|gif)$/.test(name) || String(file?.type ?? "").startsWith("image/");
};

const isAudioAttachment = (attachment) => {
  const name = attachment?.fileName?.toLowerCase() ?? "";
  const mime = attachment?.mimeType?.toLowerCase() ?? "";
  return name.endsWith(".mp3") || name.endsWith(".wav") || mime.includes("audio/");
};

const isImageAttachment = (attachment) => {
  const name = attachment?.fileName?.toLowerCase() ?? "";
  const mime = attachment?.mimeType?.toLowerCase() ?? "";
  const src = String(attachment?.dataUrl || attachment?.sourceUrl || attachment?.url || "").toLowerCase();
  return /\.(png|jpe?g|webp|gif)(\?|#|$)/.test(name) || mime.startsWith("image/") || src.startsWith("data:image/");
};

const isGuestIconAttachment = (attachment) => {
  if (!isImageAttachment(attachment)) return false;
  const text = `${attachment.questionLabel || ""} ${attachment.questionId || ""} ${attachment.fileName || ""}`.toLowerCase();
  return /ゲスト|アイコン|icon|avatar|profile|プロフィール|画像/.test(text);
};

const findGuestIconAttachment = (attachments = []) =>
  attachments.find(isGuestIconAttachment) || attachments.find(isImageAttachment) || null;

const makeGuestIconFromAttachment = (attachment, fallbackName = "guest-icon") =>
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

const mergeGuestIcons = (currentStudio = defaultThumbnailStudio, incomingIcon) => {
  const existingIcons = normalizeGuestIconList(currentStudio.guestIcon, currentStudio.guestIcons);
  const nextIcons = normalizeGuestIconList(incomingIcon, incomingIcon ? [...existingIcons, incomingIcon] : existingIcons);
  return {
    ...defaultThumbnailStudio,
    ...currentStudio,
    guestIcon: nextIcons[0] ?? { ...defaultThumbnailStudio.guestIcon },
    guestIcons: nextIcons
  };
};

const normalizeXHandle = (value = "") =>
  String(value)
    .trim()
    .replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//i, "")
    .replace(/^@/, "")
    .split(/[/?#]/)[0]
    .replace(/[^A-Za-z0-9_]/g, "");

const makeXUrl = (value = "") => {
  const handle = normalizeXHandle(value);
  return handle ? `https://x.com/${handle}` : "";
};

const formatXHandle = (value = "") => {
  const handle = normalizeXHandle(value);
  return handle ? `@${handle}` : "";
};

const extractXHandleFromText = (value = "") => {
  const text = String(value || "");
  const handleMatch = text.match(/@([A-Za-z0-9_]{1,15})/);
  if (handleMatch) return normalizeXHandle(handleMatch[1]);
  const urlMatch = text.match(/https?:\/\/(?:www\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})/i);
  if (urlMatch) return normalizeXHandle(urlMatch[1]);
  return "";
};

const formatJapaneseDate = (dateString = "") => {
  if (!dateString) return "配信日未定";
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateString;
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日（${weekdays[date.getDay()]}）`;
};

const normalizeAdditionalXAccounts = (accounts = []) =>
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

const getContactAccountList = (source = {}) => {
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

const isWebUrl = (url = "") => /^https?:\/\//i.test(String(url).trim());

const getGoogleDriveFileId = (url = "") => {
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

const makeDirectAudioDownloadUrl = (url = "") => {
  const trimmed = String(url).trim();
  if (!isWebUrl(trimmed)) return "";
  const driveFileId = getGoogleDriveFileId(trimmed);
  if (driveFileId) return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(driveFileId)}`;
  return trimmed;
};

const makeImagePreviewUrl = (url = "") => {
  const trimmed = String(url).trim();
  const driveFileId = getGoogleDriveFileId(trimmed);
  if (driveFileId) return `https://drive.google.com/thumbnail?id=${encodeURIComponent(driveFileId)}&sz=w1200`;
  return trimmed;
};

const makeCanvasImageProxyUrl = (url = "") => {
  const trimmed = String(url).trim();
  if (!isWebUrl(trimmed) || /(?:^|\/\/)(?:images\.weserv\.nl|wsrv\.nl)\//i.test(trimmed)) return "";
  const withoutProtocol = trimmed.replace(/^https?:\/\//i, "");
  return `https://images.weserv.nl/?url=${encodeURIComponent(withoutProtocol)}`;
};

const getCanvasImageSourceCandidates = (src = "") => {
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
  const driveFileId = getGoogleDriveFileId(trimmed);
  if (driveFileId) {
    add(`https://drive.google.com/uc?export=download&id=${encodeURIComponent(driveFileId)}`);
  }

  [...candidates].forEach((candidate) => add(makeCanvasImageProxyUrl(candidate)));
  return candidates;
};

const sanitizeDownloadName = (value = "") =>
  String(value)
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, " ")
    .slice(0, 90);

const getUrlFileExtension = (url = "") => {
  try {
    return new URL(url).pathname.match(/\.(mp3|wav|m4a|aac|flac|ogg)$/i)?.[0] ?? "";
  } catch {
    return String(url).match(/\.(mp3|wav|m4a|aac|flac|ogg)(?:[?#]|$)/i)?.[0] ?? "";
  }
};

const makeTrackAudioDownloadName = (track) => {
  const extension = getUrlFileExtension(track.audioFile) || ".mp3";
  const base = sanitizeDownloadName([track.slotNo, track.artist, track.title].filter(Boolean).join("_")) || "audio-file";
  return base.toLowerCase().endsWith(extension.toLowerCase()) ? base : `${base}${extension}`;
};

const downloadTrackAudioFromUrl = (track) => {
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

const isSupportedTrackUrl = (url = "") => {
  const trimmed = String(url).trim();
  if (!trimmed) return true;
  try {
    const host = new URL(trimmed).hostname.toLowerCase().replace(/^www\./, "");
    return host === "youtu.be" || host === "youtube.com" || host.endsWith(".youtube.com") || host === "suno.com" || host.endsWith(".suno.com");
  } catch {
    return false;
  }
};

const makePlayableEmbedUrl = (url = "") => {
  const trimmed = String(url).trim();
  const youtube = trimmed.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/shorts\/)([A-Za-z0-9_-]+)/);
  if (youtube) return `https://www.youtube.com/embed/${youtube[1]}`;
  const suno = trimmed.match(/suno\.com\/(?:song|embed)\/([a-f0-9-]{36})/i);
  if (suno) return `https://suno.com/embed/${suno[1]}`;
  return "";
};

const isSunoShortUrl = (url = "") => /suno\.com\/s\/[A-Za-z0-9_-]+/i.test(String(url).trim());

const formatAnswerValue = (value) => {
  if (!value) return "-";
  if (typeof value === "object" && value.fileName) return `${value.fileName} (${Math.round((value.size || 0) / 1024 / 1024 * 10) / 10}MB)`;
  if (typeof value === "object" && ("title" in value || "url" in value || "audio" in value)) {
    return compactLines([
      `楽曲名: ${value.title || "-"}`,
      `アーティスト名: ${value.artist || "-"}`,
      `楽曲URL: ${value.url || "-"}`,
      `音源ファイル: ${formatAnswerValue(value.audio)}`
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

const THUMBNAIL_PRESETS = [
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
const ARTICLE_THUMBNAIL_KEY = "article16x9";
const CODEX_THUMBNAIL_PRESETS = THUMBNAIL_PRESETS.filter((preset) => preset.key === ARTICLE_THUMBNAIL_KEY);

const IMPORT_PREVIEW_FIELDS = [
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

const IMPORT_KIND_LABELS = {
  guest: "ゲストアンケート",
  listener: "リスナー応募曲",
  personality: "パーソナリティ曲"
};

const getImportPreviewKey = (kind, periodId = "") => (periodId ? `${kind}:${periodId}` : kind);

const getImportCanonicalColumn = (field, kind) =>
  typeof field.canonical === "string" ? field.canonical : field.canonical?.[kind] || field.label;

const applyColumnMappingToRows = (rows = [], kind = "", mapping = {}) =>
  rows.map((row) => {
    const mapped = { ...row };
    IMPORT_PREVIEW_FIELDS.forEach((field) => {
      const sourceColumn = mapping?.[field.key];
      if (!sourceColumn) return;
      mapped[getImportCanonicalColumn(field, kind)] = row[sourceColumn] ?? "";
    });
    return mapped;
  });

const THUMBNAIL_ICON_LAYOUT_PRESETS = [
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

const THUMBNAIL_LAYOUT_PRESET_VERSION = 3;
const getIconLayoutPresetTemplates = (preset) => preset?.templates ?? THUMBNAIL_ICON_LAYOUT_PRESETS[0].templates;

const applyIconLayoutPresetToTemplates = (templates = defaultThumbnailStudio.templates, preset) => {
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

const defaultThumbnailStudio = {
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

const clampNumber = (value, fallback, min, max) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
};

const normalizeGuestIconList = (guestIcon = defaultThumbnailStudio.guestIcon, guestIcons = []) => {
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

const getThumbnailIconSlots = (template = {}) => {
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

const countGuestsFromText = (guestName = "") => {
  const names = String(guestName || "")
    .replace(/さん/g, "")
    .split(/[,、，/&＆＋+・]|と| and /i)
    .map((name) => name.trim())
    .filter(Boolean);
  return names.length || 1;
};

const getLayoutPresetForGuestCount = (count = 1) => {
  if (count >= 3) return THUMBNAIL_ICON_LAYOUT_PRESETS.find((preset) => preset.id === "triple") ?? THUMBNAIL_ICON_LAYOUT_PRESETS[0];
  if (count === 2) return THUMBNAIL_ICON_LAYOUT_PRESETS.find((preset) => preset.id === "dual") ?? THUMBNAIL_ICON_LAYOUT_PRESETS[0];
  return THUMBNAIL_ICON_LAYOUT_PRESETS[0];
};

const defaultImports = {
  guestCsvUrl: "",
  listenerCsvUrl: "",
  personalityCsvUrl: "",
  bellboTrackUrl: "",
  lastLog: []
};

const defaultSocialPromo = {
  guestName: "",
  guestXHandle: "",
  talkTheme: "",
  postText: "",
  comicTemplate: "",
  comicPrompt: "",
  comicImage: { name: "", dataUrl: "" }
};

const getShortTheme = (theme = "") => {
  const normalized = String(theme || "").replace(/\s+/g, " ").trim();
  if (!normalized) return "音楽づくりの裏側";
  return normalized.length > 32 ? `${normalized.slice(0, 32)}...` : normalized;
};

const buildSocialPostText = ({ guestName, guestXHandle, date, talkTheme }) => {
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

const buildComicTemplateText = ({ guestName, guestXHandle, date, talkTheme }) => {
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

const sanitizeSnsComicTemplateText = (text = "") =>
  String(text || "")
    .replace(/かなめとべるぼ/g, "べるぼ")
    .replace(/3人が配信画面の前で笑顔/g, "べるぼとゲストが配信画面の前で笑顔")
    .replace(/かなめちゃん/g, "べるぼ")
    .replace(/かなめ🦐/g, "べるぼ☂")
    .replace(/かなめ「/g, "べるぼ「");

const buildComicPromptText = ({ guestName, guestXHandle, date, talkTheme, comicTemplate }) => {
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

const newId = (prefix) => {
  if (crypto?.randomUUID) return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
};

const WEEKDAY_LABELS = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"];
const WEEKDAY_SHORT_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

const getBroadcastSlot = (dateString = "") => {
  if (!dateString) return "";
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  const weekNumber = Math.floor((date.getDate() - 1) / 7) + 1;
  return `第${weekNumber}${WEEKDAY_LABELS[date.getDay()]}`;
};

const formatLocalDate = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const formatThumbnailDateLines = (dateString = "") => {
  const match = String(dateString).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(`${year}-${month}-${day}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return [year, `${Number(month)}/${Number(day)}`, `(${WEEKDAY_SHORT_LABELS[date.getDay()]})`];
};

const ensureGuestHonorific = (guestName = "") => {
  const trimmed = String(guestName).trim();
  if (!trimmed) return "";
  return trimmed.endsWith("さん") ? trimmed : `${trimmed}さん`;
};

const makeGuestEpisodeTitle = (guestName = "") => {
  const titledName = ensureGuestHonorific(guestName);
  return titledName ? `${titledName}ゲスト回🌟` : "";
};

const slugify = (value = "") =>
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

const extractSlugFromUrl = (url = "") => {
  try {
    const pathname = new URL(url).pathname;
    return pathname.split("/").filter(Boolean).pop() ?? "";
  } catch {
    return "";
  }
};

const buildArticleUrl = (site = "", slug = "") => {
  const normalizedSite = String(site).trim().replace(/\/+$/, "");
  const normalizedSlug = String(slug).trim().replace(/^\/+|\/+$/g, "");
  if (!normalizedSite || !normalizedSlug) return "";
  return `${normalizedSite}/${normalizedSlug}/`;
};

const normalizeKey = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[ 　_\-・:：/／（）()［\][\].。!！?？]/g, "");

const compactLines = (items) => items.filter(Boolean).join("\n");

const isExcludedImportLabel = (label = "", excludePatterns = []) =>
  excludePatterns.some((pattern) => pattern.test(String(label || "")));

const pick = (row, aliases, excludePatterns = []) => {
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

const pickByLabelPattern = (row, patterns, excludePatterns = []) => {
  for (const [key, value] of Object.entries(row)) {
    const text = String(value ?? "").trim();
    if (!text) continue;
    const label = String(key || "");
    if (excludePatterns.some((pattern) => pattern.test(label))) continue;
    if (patterns.some((pattern) => pattern.test(label))) return text;
  }
  return "";
};

const pickImportValue = (row, aliases, patterns = [], excludePatterns = []) =>
  pick(row, aliases, excludePatterns) || pickByLabelPattern(row, patterns, excludePatterns);

const isImportMetadataColumn = (key = "") => {
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

const meaningfulRowEntries = (row) =>
  Object.entries(row)
    .map(([label, value]) => ({ label: String(label || "").trim(), value: String(value ?? "").trim() }))
    .filter(({ label, value }) => label && value && !isImportMetadataColumn(label));

const formatRemainingAnswers = (row, usedValues = []) => {
  const used = new Set(usedValues.filter(Boolean).map((value) => String(value).trim()));
  return meaningfulRowEntries(row)
    .filter(({ value }) => !used.has(value))
    .map(({ label, value }) => `${label}: ${value}`)
    .join("\n");
};

const summarizeImportColumns = (rows = []) => {
  const labels = meaningfulRowEntries(rows[0] ?? {}).map(({ label }) => label).slice(0, 8);
  return labels.length ? ` 取得した列: ${labels.join(" / ")}` : "";
};

const makeUniqueHeaders = (headers = []) => {
  const seen = new Map();
  return headers.map((header, index) => {
    const base = String(header || "").trim() || `column_${index + 1}`;
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return count === 1 ? base : `${base}_${count}`;
  });
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

  const headers = makeUniqueHeaders(rows[0]);
  return rows.slice(1).map((cells) =>
    Object.fromEntries(headers.map((header, index) => [header || `column_${index + 1}`, cells[index]?.trim() ?? ""]))
  );
};

const GOOGLE_SHEETS_JSONP_TIMEOUT_MS = 12000;

const getUrlParam = (url, key, { preferHash = false } = {}) => {
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

const makeGoogleSheetExportUrl = (spreadsheetId, gid = "0") =>
  `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;

const makeGoogleSheetPublishedCsvUrl = (publishedId, gid = "0") =>
  `https://docs.google.com/spreadsheets/d/e/${publishedId}/pub?gid=${gid}&single=true&output=csv`;

const makeGoogleSheetJsonpUrl = (spreadsheetId, gid, callbackName) => {
  const params = new URLSearchParams({
    gid: gid || "0",
    headers: "1",
    tqx: `out:json;responseHandler:${callbackName}`
  });
  return `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/gviz/tq?${params.toString()}`;
};

const gvizCellToText = (cell) => {
  if (!cell) return "";
  const value = cell.f ?? cell.v;
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
};

const gvizResponseToRows = (response) => {
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

const fetchGoogleSheetRowsWithJsonp = ({ spreadsheetId, gid }) => {
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

const getCsvImportTarget = (url = "") => {
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

const toGoogleCsvUrl = (url) => getCsvImportTarget(url).url;

const looksLikeHtml = (text = "") => /^\s*<!doctype html|^\s*<html[\s>]/i.test(text);
const makeImportFailureMessage = (label, error) =>
  error?.message === "EMPTY_CSV"
    ? `${label}: CSVが空でした。フォームに回答があるか、入力URLのgidが「フォームの回答」タブか確認してください。`
    : `${label}: 読み込みに失敗しました。回答先スプレッドシートを「リンクを知っている全員が閲覧可」にするか、CSVファイルで取り込んでください。`;

const makeEmbedUrl = (url = "") => {
  const playableEmbedUrl = makePlayableEmbedUrl(url);
  if (playableEmbedUrl) return playableEmbedUrl;
  if (url.includes("suno.com/")) return url;
  return "";
};

const cleanFetchedTrackTitle = (title = "", sourceType = "") => {
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

const fetchTrackTitleFromUrl = async (url = "") => {
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

const nextSlotNo = (tracks, episodeId) => {
  const values = tracks.filter((track) => track.episodeId === episodeId).map((track) => Number(track.slotNo) || 0);
  return Math.max(0, ...values) + 1;
};

const appendTrack = (tracks, nextTrack) => [...tracks, nextTrack];

const normalizeTrackUrlKey = (url = "") => {
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

const makeTrackImportKey = (track = {}) =>
  [
    track.episodeId || "",
    track.periodId || "",
    track.source || "",
    normalizeTrackUrlKey(track.url) || normalizeTrackUrlKey(track.audioFile) || normalizeKey(track.title),
    normalizeKey(track.artist),
    normalizeKey(track.aiArtist)
  ].join("|");

const upsertImportedTrack = (tracks, incomingTrack) => {
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

const getDefaultOwnerHonorific = (source = "") => (source === "パーソナリティ曲" ? "さんなし" : "さん");

const buildResponseFromRow = (row, episodeId, formId, fallbackRespondent = "") => {
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

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object ?? {}, key);
const pickOverride = (overrides, key, fallback) => (hasOwn(overrides, key) ? overrides[key] : fallback);

const TRACK_COLUMN_PATTERNS = {
  aiArtist: [/AI\s*(アーティスト|名義|名前|活動名)|AI artist/i],
  url: [/(楽曲|曲|Suno|YouTube|Youtube|ユーチューブ).*(URL|リンク)|(URL|リンク).*(楽曲|曲|Suno|YouTube|Youtube|ユーチューブ)/i],
  audioFile: [/音源|楽曲.*アップロード|曲.*アップロード|mp3|wav|Drive|ドライブ/i],
  articlePoint: [/想い|思い|曲紹介|楽曲紹介|こだわり|おすすめ|ポイント|メッセージ|コメント|制作意図|記事で触れて/],
  title: [/曲名|楽曲名|楽曲.*タイトル|曲.*タイトル|紹介曲|タイトル/]
};

const getTrackColumnField = (label = "") => {
  if (/アイコン|画像|プロフィール|サムネ/i.test(label)) return "";
  if (TRACK_COLUMN_PATTERNS.aiArtist.some((pattern) => pattern.test(label))) return "aiArtist";
  if (TRACK_COLUMN_PATTERNS.url.some((pattern) => pattern.test(label))) return "url";
  if (TRACK_COLUMN_PATTERNS.audioFile.some((pattern) => pattern.test(label))) return "audioFile";
  if (TRACK_COLUMN_PATTERNS.articlePoint.some((pattern) => pattern.test(label))) return "articlePoint";
  if (TRACK_COLUMN_PATTERNS.title.some((pattern) => pattern.test(label))) return "title";
  return "";
};

const getTrackColumnGroup = (label = "") => {
  const text = String(label || "");
  const suffixMatch = text.match(/_(\d+)$/);
  if (suffixMatch) return Number(suffixMatch[1]) || 1;
  if (/三曲|3曲|３曲|三つ目|3つ目|３つ目|3番|３番|third/i.test(text)) return 3;
  if (/二曲|2曲|２曲|二つ目|2つ目|２つ目|2番|２番|second/i.test(text)) return 2;
  return 1;
};

const collectTrackFieldGroups = (row = {}) => {
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

const buildTrackFromRow = (row, episodeId, source, fallbackArtist = "", periodId = "", overrides = {}) => {
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

const buildTracksFromRow = (row, episodeId, source, fallbackArtist = "", periodId = "") => {
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

const getPreviewTrackSource = (kind = "") =>
  kind === "listener" ? "リスナー応募曲" : kind === "personality" ? "パーソナリティ曲" : "ゲスト曲";

const pickPreviewOwnerName = (row, kind, fallback = "") =>
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

const shortenPreviewValue = (value = "", max = 72) => {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};

const buildImportPreviewRows = (rows = [], kind = "", mapping = {}) => {
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

const importRowsIntoData = (current, selectedEpisode, rows, kind, periodId = "") => {
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

const buildTracksFromRawAnswers = (rawAnswers = [], episodeId = "", formId = "", respondent = "", periodId = "") => {
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
      if (!track.title && !track.url && !track.audio?.fileName) return null;
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
        audioFile: track.audio?.fileName || "",
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

const encodeCompressedSharePayload = (payload) => LZString.compressToEncodedURIComponent(JSON.stringify(payload));

const decodeCompressedSharePayload = (value) => {
  const json = LZString.decompressFromEncodedURIComponent(value);
  if (!json) throw new Error("share-payload-decode-failed");
  return JSON.parse(json);
};

const normalizeShareSlug = (value = "", fallback = "form") => {
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

const getFormPublishedSlug = (form) => normalizeShareSlug(form?.shareSlug || form?.id, form?.id || "form");

const getPeriodPublishedSlug = (period, episode, form) =>
  normalizeShareSlug(
    period?.shareSlug || [episode?.date, form?.id || period?.formId, period?.id].filter(Boolean).join("-"),
    period?.id || "period"
  );

const getPublishedSharePayloadUrl = (slug) => publicAsset(`${SHARED_FORMS_DIR}/${normalizeShareSlug(slug)}.json`);

const makePublishedShareUrl = (slug) =>
  `${window.location.origin}${window.location.pathname}#/r/${encodeURIComponent(normalizeShareSlug(slug))}`;

const makeShortUrlActivationRequest = (slug, payload) => {
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

const downloadTextFile = (content, fileName, type = "text/plain") => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
};

const downloadDataUrlFile = (dataUrl, fileName = "download") => {
  if (!dataUrl) return;
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = fileName;
  anchor.click();
};

const saveDataUrlWithPicker = async (dataUrl, fileName = "download") => {
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

const getRawStoredDataForShare = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? { ...sampleData, ...JSON.parse(stored) } : sampleData;
  } catch {
    return sampleData;
  }
};

const resolveFormReferencePayload = (formId) => {
  const data = getRawStoredDataForShare();
  const form = (data.forms ?? []).find((item) => item.id === formId);
  return form ? makeSharePayload(form, { ...sampleData.settings, ...(data.settings ?? {}) }) : { error: true };
};

const resolvePeriodReferencePayload = (periodId) => {
  const data = getRawStoredDataForShare();
  const period = (data.applicationPeriods ?? []).find((item) => item.id === periodId);
  if (!period) return { error: true };
  const form = (data.forms ?? []).find((item) => item.id === period.formId);
  if (!form) return { error: true };
  const episode = (data.episodes ?? []).find((item) => item.id === period.episodeId);
  return makeSharePayload(form, { ...sampleData.settings, ...(data.settings ?? {}) }, { period, episode });
};

const readSharedFormPayload = () => {
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

const loadPublishedSharePayload = async (slug) => {
  const response = await fetch(getPublishedSharePayloadUrl(slug), { cache: "no-store" });
  if (!response.ok) throw new Error(`published-share-not-found:${response.status}`);
  const payload = await response.json();
  if (payload?.type !== "radio-article-studio-form" || !payload?.form) {
    throw new Error("published-share-invalid");
  }
  return payload;
};

const readRestorePayload = () => {
  const match = window.location.hash.match(/^#\/restore\/(.+)$/);
  if (!match) return null;
  try {
    return { data: migrateData(decodeCompressedSharePayload(match[1])) };
  } catch {
    return { error: true };
  }
};

const makeSharePayload = (form, settings = sampleData.settings, context = {}) => {
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
      questions: form.questions
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

const makeShareUrl = (form, settings = sampleData.settings, context = {}) =>
  context.period?.id
    ? `${window.location.origin}${window.location.pathname}#/p/${encodeURIComponent(context.period.id)}`
    : `${window.location.origin}${window.location.pathname}#/f/${encodeURIComponent(form.id)}`;

const makePortableShareUrl = (form, settings = sampleData.settings, context = {}) =>
  `${window.location.origin}${window.location.pathname}#/s/${encodeCompressedSharePayload(makeSharePayload(form, settings, context))}`;

const makeLegacyShareUrl = (form, settings = sampleData.settings, context = {}) =>
  `${window.location.origin}${window.location.pathname}#/submit/${encodeSharePayload(makeSharePayload(form, settings, context))}`;

const makeRestoreUrl = (data) =>
  `${window.location.origin}${window.location.pathname}#/restore/${encodeCompressedSharePayload(data)}`;

const downloadPublishedShareJson = (form, settings = sampleData.settings, context = {}, slug) => {
  const shareSlug = normalizeShareSlug(slug);
  downloadTextFile(
    JSON.stringify(makeSharePayload(form, settings, context), null, 2),
    `${shareSlug}.json`,
    "application/json"
  );
};

const formatDateRange = (startDate = "", endDate = "") => {
  if (startDate && endDate) return `${startDate} - ${endDate}`;
  return startDate || endDate || "期間未設定";
};

const sampleData = {
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
    audioSaveMemo: DEFAULT_AUDIO_SAVE_MEMO
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
      description: "ゲスト紹介、紹介楽曲、NG/注意事項を集めるフォーム。",
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
      description: "送って頂く楽曲の楽曲名、楽曲URL、WAV/MP3音源、記事掲載可否を集めるフォーム。",
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
      description: "かなめ🦐/べるぼ☂の紹介曲を運営側で入力するフォーム。",
      questions: [
        { id: "q_owner", label: "担当", kind: "choice", required: true, use: "article" },
        { id: "q_track", label: "送って頂く楽曲", kind: "track", required: true, use: "article" },
        { id: "q_point", label: "記事で触れてほしいポイント", kind: "long", required: false, use: "article" }
      ]
    }
  ],
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

function migrateData(input) {
  const isLegacyTrackQuestion = (question) => {
    const label = question.label ?? "";
    return (
      ["q_song", "q_music_url", "q_title", "q_url", "q_audio"].includes(question.id) ||
      /^(曲名|楽曲名|楽曲URL|音源ファイル|送って頂く楽曲|紹介する楽曲)/.test(label) ||
      (/(YouTube|Suno|WAV|MP3|mp3|wav)/.test(label) && /(楽曲|音源|アップロード)/.test(label))
    );
  };

  const forms = (input.forms ?? sampleData.forms).map((form) => {
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
        use: existingTrack?.use || "article"
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

    questions = questions.map((question) =>
      question.kind === "x_contact" && question.use === "internal" ? { ...question, use: "public" } : question
    );

    return { ...form, shareSlug: form.shareSlug || getFormPublishedSlug(form), questions };
  });

  const settings = { ...sampleData.settings, ...(input.settings ?? {}) };
  if (!settings.bellboXHandle) settings.bellboXHandle = DEFAULT_BELLBO_X_HANDLE;
  if (!settings.kanameXHandle) settings.kanameXHandle = DEFAULT_KANAME_X_HANDLE;
  settings.additionalXAccounts = normalizeAdditionalXAccounts(settings.additionalXAccounts || []);
  if (!settings.xContactMessage) settings.xContactMessage = DEFAULT_X_CONTACT_MESSAGE;
  if (!("responseEndpointUrl" in settings)) settings.responseEndpointUrl = DEFAULT_RESPONSE_ENDPOINT_URL;
  if (!("responseDriveFolderUrl" in settings)) settings.responseDriveFolderUrl = DEFAULT_RESPONSE_DRIVE_FOLDER_URL;
  if (!settings.audioSaveMemo) settings.audioSaveMemo = DEFAULT_AUDIO_SAVE_MEMO;
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
    Boolean(builtInLayoutPreset) && !hasBuiltInLayoutOverride && rawThumbnailStudio.layoutPresetVersion !== THUMBNAIL_LAYOUT_PRESET_VERSION;
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
  const [thumbnailBundleCopied, setThumbnailBundleCopied] = useState(false);
  const [fullPackCopied, setFullPackCopied] = useState(false);
  const [thumbnailTransferText, setThumbnailTransferText] = useState("");
  const [transferCopied, setTransferCopied] = useState(false);
  const [sharedPayload, setSharedPayload] = useState(readSharedFormPayload);
  const [restorePayload, setRestorePayload] = useState(readRestorePayload);
  const [importingSource, setImportingSource] = useState("");
  const [importPreviews, setImportPreviews] = useState({});
  const autoThumbnailGenerationRef = useRef("");

  useEffect(() => {
    if (sharedPayload || restorePayload) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      console.warn("Radio Article Studio: browser storage quota exceeded. Export JSON to preserve current data.");
    }
  }, [data, sharedPayload, restorePayload]);

  useEffect(() => {
    const onHashChange = () => {
      setSharedPayload(readSharedFormPayload());
      setRestorePayload(readRestorePayload());
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    if (!sharedPayload?.publishedSlug) return undefined;
    let active = true;
    loadPublishedSharePayload(sharedPayload.publishedSlug)
      .then((payload) => {
        if (active) setSharedPayload(payload);
      })
      .catch(() => {
        if (active) setSharedPayload({ error: true, publishedSlug: sharedPayload.publishedSlug });
      });
    return () => {
      active = false;
    };
  }, [sharedPayload?.publishedSlug]);

  const selectedEpisode = useMemo(
    () => data.episodes.find((episode) => episode.id === selectedEpisodeId) ?? data.episodes[0],
    [data.episodes, selectedEpisodeId]
  );

  const episodeTracks = data.tracks
    .filter((track) => track.episodeId === selectedEpisode?.id)
    .sort((a, b) => Number(a.slotNo) - Number(b.slotNo));

  const episodeResponses = data.responses.filter((response) => response.episodeId === selectedEpisode?.id);
  const inferredGuestXHandle = useMemo(
    () => episodeResponses.map((response) => extractXHandleFromText(response.publicInfo)).find(Boolean) || "",
    [episodeResponses]
  );
  const currentStoredSocialPromo = selectedEpisode ? data.socialPromos?.[selectedEpisode.id] : null;
  const currentSocialPromo = selectedEpisode
    ? {
        ...defaultSocialPromo,
        ...(currentStoredSocialPromo ?? {}),
        guestName: currentStoredSocialPromo?.guestName || selectedEpisode.guestName || "",
        guestXHandle: currentStoredSocialPromo?.guestXHandle || inferredGuestXHandle,
        talkTheme: selectedEpisode.notes || currentStoredSocialPromo?.talkTheme || episodeResponses[0]?.articleUse || ""
      }
    : { ...defaultSocialPromo };

  const updateSocialPromo = (patchOrUpdater) => {
    if (!selectedEpisode) return;
    setData((current) => {
      const currentPromo = {
        ...defaultSocialPromo,
        ...(current.socialPromos?.[selectedEpisode.id] ?? {})
      };
      const patch = typeof patchOrUpdater === "function" ? patchOrUpdater(currentPromo) : patchOrUpdater;
      return {
        ...current,
        socialPromos: {
          ...(current.socialPromos ?? {}),
          [selectedEpisode.id]: {
            ...currentPromo,
            ...patch
          }
        }
      };
    });
  };

  const updateEpisodeTalkTheme = (value) => {
    if (!selectedEpisode) return;
    setData((current) => {
      const currentPromo = {
        ...defaultSocialPromo,
        ...(current.socialPromos?.[selectedEpisode.id] ?? {})
      };
      return {
        ...current,
        episodes: current.episodes.map((episode) =>
          episode.id === selectedEpisode.id ? { ...episode, notes: value } : episode
        ),
        socialPromos: {
          ...(current.socialPromos ?? {}),
          [selectedEpisode.id]: {
            ...currentPromo,
            talkTheme: value
          }
        }
      };
    });
  };

  useEffect(() => {
    const requestId = data.thumbnailStudio?.autoGenerateRequestedAt;
    if (!requestId || !selectedEpisode || autoThumbnailGenerationRef.current === requestId) return undefined;
    autoThumbnailGenerationRef.current = requestId;
    let cancelled = false;
    const studio = data.thumbnailStudio ?? defaultThumbnailStudio;
    const guestIcons = normalizeGuestIconList(studio.guestIcon, studio.guestIcons);
    const thumbnailDate = studio.date || selectedEpisode.date || "";
    const currentGuestName = selectedEpisode.guestName || "";

    Promise.all(
      THUMBNAIL_PRESETS.map(async (preset) => {
        const template = await resolveThumbnailTemplateForRender(preset.key, studio.templates?.[preset.key]);
        const dataUrl = await renderThumbnail({
          preset,
          template,
          icon: studio.guestIcon,
          icons: guestIcons,
          date: thumbnailDate,
          guestName: currentGuestName
        });
        const { generatedRecord } = await saveThumbnailDataUrl(preset, dataUrl, currentGuestName);
        return [preset.key, generatedRecord];
      }).map((task) => task.catch(() => null))
    )
      .then((entries) => {
        const generatedEntries = entries.filter(Boolean);
        if (generatedEntries.length === 0) throw new Error("AUTO_THUMBNAIL_GENERATION_FAILED");
        if (cancelled) return;
        setData((current) => {
          if (current.thumbnailStudio?.autoGenerateRequestedAt !== requestId) return current;
          return {
            ...current,
            thumbnailStudio: {
              ...defaultThumbnailStudio,
              ...(current.thumbnailStudio ?? {}),
              generated: {
                ...(current.thumbnailStudio?.generated ?? {}),
                ...Object.fromEntries(generatedEntries)
              },
              autoGenerateRequestedAt: ""
            },
            imports: {
              ...defaultImports,
              ...current.imports,
              lastLog: [`${new Date().toLocaleString("ja-JP")} サムネ: ${generatedEntries.length}件を取り込み内容から自動生成しました。`, ...(current.imports?.lastLog ?? [])].slice(0, 8)
            }
          };
        });
      })
      .catch(() => {
        if (cancelled) return;
        setData((current) => {
          if (current.thumbnailStudio?.autoGenerateRequestedAt !== requestId) return current;
          return {
            ...current,
            thumbnailStudio: {
              ...defaultThumbnailStudio,
              ...(current.thumbnailStudio ?? {}),
              autoGenerateRequestedAt: ""
            },
            imports: {
              ...defaultImports,
              ...current.imports,
              lastLog: [`${new Date().toLocaleString("ja-JP")} サムネ: 自動生成に失敗しました。素材画面で生成してください。`, ...(current.imports?.lastLog ?? [])].slice(0, 8)
            }
          };
        });
      });

    return () => {
      cancelled = true;
    };
  }, [data.thumbnailStudio?.autoGenerateRequestedAt, selectedEpisode]);

  const updateData = (key, updater) => {
    setData((current) => ({
      ...current,
      [key]: typeof updater === "function" ? updater(current[key]) : updater
    }));
  };

  const addEpisode = () => {
    const today = formatLocalDate();
    const episode = {
      id: newId("ep"),
      title: "新しい放送回",
      date: today,
      slot: getBroadcastSlot(today),
      time: "21:30-23:00",
      type: "ゲスト回",
      guestName: "",
      standfmUrl: "",
      status: "準備中",
      articleSlug: "",
      articleUrl: "",
      notes: "",
      extraInfo: ""
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
        aiArtist: "",
        title: "",
        urlType: "Suno",
        url: "",
        audioFile: "",
        audio: null,
        ownerIconUrl: "",
        embedUrl: "",
        honorific: getDefaultOwnerHonorific("ゲスト曲"),
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
        shareSlug: "",
        description: "",
        questions: [
          { id: newId("q"), label: "質問文", kind: "short", required: false, use: "article" }
        ]
      }
    ]);
    setActive("forms");
  };

  const addApplicationPeriod = () => {
    const episode = selectedEpisode ?? data.episodes[0];
    const listenerForm = data.forms.find((form) => form.id === "form_listener") ?? data.forms.find((form) => form.type === "リスナー") ?? data.forms[0];
    const today = formatLocalDate();
    const period = {
      id: newId("period"),
      title: episode ? `${episode.date} ${episode.title} 応募期間` : "新しい応募期間",
      type: "リスナー応募曲",
      episodeId: episode?.id ?? "",
      formId: listenerForm?.id ?? "",
      startDate: today,
      endDate: episode?.date ?? today,
      status: "準備中",
      shareSlug: "",
      csvUrl: "",
      notes: ""
    };
    updateData("applicationPeriods", (periods) => [period, ...periods]);
    setActive("periods");
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

  const appendImportLogToData = (current, message) => ({
      ...current,
      imports: {
        ...defaultImports,
        ...current.imports,
        lastLog: [`${new Date().toLocaleString("ja-JP")} ${message}`, ...(current.imports?.lastLog ?? [])].slice(0, 8)
      }
  });

  const appendImportLog = (message) => {
    setData((current) => appendImportLogToData(current, message));
  };

  const stageImportRows = (rows, kind, label = "CSV", periodId = "") => {
    if (!selectedEpisode) {
      appendImportLog(`${label}: 放送回を選んでから読み込んでください。`);
      return;
    }
    if (!rows.length) {
      appendImportLog(`${label}: CSVの回答行が見つかりませんでした。1行目に見出し、2行目以降に回答があるか確認してください。`);
      return;
    }

    const previewKey = getImportPreviewKey(kind, periodId);
    setImportPreviews((current) => ({
      ...current,
      [previewKey]: {
        key: previewKey,
        kind,
        label,
        periodId,
        episodeId: selectedEpisode.id,
        rows,
        mapping: current[previewKey]?.mapping ?? {},
        loadedAt: new Date().toISOString()
      }
    }));
    appendImportLog(`${label}: ${rows.length}行をプレビューに読み込みました。内容を確認して「反映」を押してください。`);
  };

  const importCsvRows = (rows, kind, label = "CSV", periodId = "", targetEpisodeId = selectedEpisode?.id) => {
    if (!targetEpisodeId) {
      appendImportLog(`${label}: 放送回を選んでから取り込んでください。`);
      return;
    }
    if (!rows.length) {
      appendImportLog(`${label}: CSVの回答行が見つかりませんでした。1行目に見出し、2行目以降に回答があるか確認してください。`);
      return;
    }

    setData((current) => {
      const currentEpisode = current.episodes.find((episode) => episode.id === targetEpisodeId) ?? selectedEpisode;
      if (!currentEpisode) return appendImportLogToData(current, `${label}: 対象の放送回が見つかりませんでした。`);
      const { data: next, result } = importRowsIntoData(current, currentEpisode, rows, kind, periodId);
      const trackBreakdown = result.tracks > 0 ? `（新規${result.trackCreates ?? 0}件 / 更新${result.trackUpdates ?? 0}件）` : "";
      const emptyResultNote =
        result.responses === 0 && result.tracks === 0
          ? ` 列名が合っていない可能性があります。Googleフォームの質問名を確認してください。${summarizeImportColumns(rows)}`
          : "";
      return appendImportLogToData(
        next,
        `${label}: ${rows.length}行を読み込み、回答${result.responses}件・楽曲${result.tracks}件${trackBreakdown}を反映しました。${emptyResultNote}`
      );
    });
  };

  const importCsvText = (text, kind, label = "CSV", periodId = "") => {
    const rows = parseCsv(text);
    stageImportRows(rows, kind, label, periodId);
  };

  const fetchCsvRows = async (url) => {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    if (looksLikeHtml(text)) throw new Error("HTML_RESPONSE");
    if (!text.trim()) throw new Error("EMPTY_CSV");
    return parseCsv(text);
  };

  const fetchRowsFromImportTarget = async (target) => {
    try {
      return await fetchCsvRows(target.url);
    } catch (csvError) {
      if (csvError?.message === "EMPTY_CSV") throw csvError;
      if (!target.spreadsheetId) throw csvError;
      console.debug("Google Sheets CSV import failed; trying JSONP fallback.", csvError);
      return fetchGoogleSheetRowsWithJsonp(target);
    }
  };

  const importCsvUrl = async (kind, url, label) => {
    const target = getCsvImportTarget(url);
    if (target.error) {
      appendImportLog(`${label}: ${target.error}`);
      return;
    }
    if (!target.url) {
      appendImportLog(`${label}: URLが未入力です。`);
      return;
    }
    setImportingSource(kind);
    appendImportLog(`${label}: プレビュー読み込みを開始しました。`);
    try {
      const rows = await fetchRowsFromImportTarget(target);
      stageImportRows(rows, kind, label);
    } catch (error) {
      appendImportLog(makeImportFailureMessage(label, error));
    } finally {
      setImportingSource((current) => (current === kind ? "" : current));
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

  const updateImportPreviewMapping = (kind, patch, periodId = "") => {
    const previewKey = getImportPreviewKey(kind, periodId);
    setImportPreviews((current) => {
      const preview = current[previewKey];
      if (!preview) return current;
      return {
        ...current,
        [previewKey]: {
          ...preview,
          mapping: {
            ...(preview.mapping ?? {}),
            ...patch
          }
        }
      };
    });
  };

  const clearImportPreview = (kind, periodId = "") => {
    const previewKey = getImportPreviewKey(kind, periodId);
    setImportPreviews((current) => {
      const next = { ...current };
      delete next[previewKey];
      return next;
    });
  };

  const applyImportPreview = (kind, periodId = "") => {
    const previewKey = getImportPreviewKey(kind, periodId);
    const preview = importPreviews[previewKey];
    if (!preview) {
      appendImportLog(`${IMPORT_KIND_LABELS[kind] || "取り込み"}: 反映できるプレビューがありません。`);
      return;
    }
    const mappedRows = applyColumnMappingToRows(preview.rows, preview.kind, preview.mapping);
    importCsvRows(mappedRows, preview.kind, preview.label, preview.periodId, preview.episodeId);
    clearImportPreview(kind, periodId);
  };

  const importPeriodCsvText = (period, text, label = "応募期間CSV") => {
    const rows = parseCsv(text);
    if (!rows.length) {
      appendImportLog(`${label}: CSVの回答行が見つかりませんでした。1行目に見出し、2行目以降に回答があるか確認してください。`);
      return;
    }

    setData((current) => {
      const currentEpisode = current.episodes.find((episode) => episode.id === period.episodeId) ?? selectedEpisode;
      const { data: next, result } = importRowsIntoData(current, currentEpisode, rows, "listener", period.id);
      const trackBreakdown = result.tracks > 0 ? `（新規${result.trackCreates ?? 0}件 / 更新${result.trackUpdates ?? 0}件）` : "";
      const nextWithPeriod = {
        ...next,
        applicationPeriods: next.applicationPeriods.map((item) =>
          item.id === period.id ? { ...item, status: rows.length ? "取り込み済み" : item.status } : item
        )
      };
      return appendImportLogToData(nextWithPeriod, `${label}: ${rows.length}行を応募期間「${period.title || period.id}」として読み込み、楽曲${result.tracks}件${trackBreakdown}を反映しました。`);
    });
  };

  const importPeriodCsvUrl = async (period) => {
    const target = getCsvImportTarget(period.csvUrl);
    const sourceKey = `period:${period.id}`;
    if (target.error) {
      appendImportLog(`応募期間「${period.title || period.id}」: ${target.error}`);
      return;
    }
    if (!target.url) {
      appendImportLog(`応募期間「${period.title || period.id}」: URLが未入力です。`);
      return;
    }
    setImportingSource(sourceKey);
    appendImportLog(`応募期間「${period.title || period.id}」: 読み込みを開始しました。`);
    try {
      const rows = await fetchRowsFromImportTarget(target);
      if (!rows.length) {
        appendImportLog(`応募期間「${period.title || period.id}」: CSVの回答行が見つかりませんでした。1行目に見出し、2行目以降に回答があるか確認してください。`);
        return;
      }

      setData((current) => {
        const currentEpisode = current.episodes.find((episode) => episode.id === period.episodeId) ?? selectedEpisode;
        const { data: next, result } = importRowsIntoData(current, currentEpisode, rows, "listener", period.id);
        const trackBreakdown = result.tracks > 0 ? `（新規${result.trackCreates ?? 0}件 / 更新${result.trackUpdates ?? 0}件）` : "";
        const nextWithPeriod = {
          ...next,
          applicationPeriods: next.applicationPeriods.map((item) =>
            item.id === period.id ? { ...item, status: "取り込み済み" } : item
          )
        };
        return appendImportLogToData(nextWithPeriod, `応募期間「${period.title || period.id}」: ${rows.length}行を読み込み、楽曲${result.tracks}件${trackBreakdown}を反映しました。`);
      });
    } catch (error) {
      appendImportLog(makeImportFailureMessage(`応募期間「${period.title || period.id}」`, error));
    } finally {
      setImportingSource((current) => (current === sourceKey ? "" : current));
    }
  };

  const importPeriodCsvFile = (period, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      importPeriodCsvText(period, String(reader.result), `応募期間「${period.title || period.id}」: ${file.name}`);
      event.target.value = "";
    };
    reader.readAsText(file, "utf-8");
  };

  const applyBellboTrackUrl = async () => {
    const url = data.imports?.bellboTrackUrl?.trim();
    if (!selectedEpisode || !url) {
      appendImportLog("べるぼ☂曲URL: 放送回またはURLが未入力です。");
      return;
    }

    appendImportLog("べるぼ☂曲URLから曲名を取得しています。");
    const fetchedTitle = await fetchTrackTitleFromUrl(url);

    setData((current) => {
      const nextTrack = {
        id: newId("tr"),
        episodeId: selectedEpisode.id,
        slotNo: nextSlotNo(current.tracks, selectedEpisode.id),
        source: "パーソナリティ曲",
        artist: "べるぼ☂",
        aiArtist: "",
        title: fetchedTitle || "べるぼ☂ 紹介曲",
        urlType: detectUrlType(url),
        url,
        audioFile: "",
        embedUrl: makeEmbedUrl(url),
        honorific: "さんなし",
        articlePoint: "",
        status: "URL反映済み"
      };
      return { ...current, tracks: appendTrack(current.tracks, nextTrack) };
    });
    appendImportLog(fetchedTitle ? `べるぼ☂曲「${fetchedTitle}」を今回の放送回に反映しました。` : "べるぼ☂曲URLを今回の放送回に反映しました。曲名は楽曲タブで修正できます。");
  };

  const updateThumbnailStudio = (updater) => {
    setData((current) => ({
      ...current,
      thumbnailStudio: typeof updater === "function" ? updater(current.thumbnailStudio ?? defaultThumbnailStudio) : updater
    }));
  };

  const buildThumbnailBundle = async () => {
    const thumbnails = [];
    for (const preset of CODEX_THUMBNAIL_PRESETS) {
      const generated = data.thumbnailStudio?.generated?.[preset.key];
      if (!generated) continue;
      let dataUrl = generated.dataUrl || "";
      if (!dataUrl && generated.imageKey) {
        try {
          dataUrl = await loadGeneratedThumbnailImage(generated.imageKey);
        } catch {
          dataUrl = "";
        }
      }
      if (!dataUrl) continue;
      thumbnails.push({
        key: preset.key,
        label: preset.label,
        fileName: generated.fileName || preset.fileName,
        width: preset.width,
        height: preset.height,
        mimeType: "image/png",
        generatedAt: generated.generatedAt || "",
        dataUrl
      });
    }
    const listenerHeadingThumbnails = [];
    for (const track of episodeTracks.filter((item) => item.source === "リスナー応募曲")) {
      const dataUrl = await renderListenerHeadingThumbnail({ track, episode: selectedEpisode });
      listenerHeadingThumbnails.push({
        trackId: track.id,
        slotNo: track.slotNo,
        trackTitle: track.title || "",
        applicantName: track.artist || "",
        aiArtist: track.aiArtist || "",
        ownerIconUrl: track.ownerIconUrl,
        fileName: `${String(track.slotNo || "track").padStart(2, "0")}-${sanitizeDownloadName(track.artist || "listener")}-heading-thumbnail.png`,
        width: 1280,
        height: 720,
        mimeType: "image/png",
        dataUrl,
        usage: "記事内でこの応募曲を紹介する見出し直下に置く応募者サムネPNG"
      });
    }

    return {
      type: "radio-article-studio-thumbnail-bundle",
      version: 1,
      episode: selectedEpisode
        ? {
            id: selectedEpisode.id,
            title: selectedEpisode.title,
            date: selectedEpisode.date,
            guestName: selectedEpisode.guestName || ""
          }
        : null,
      instructions: [
        "このJSONのthumbnails[]は記事用16:9アイキャッチのみです。stand.fm 1:1 と配信背景9:16は含めません。",
        "thumbnails[].dataUrlはPNG画像です。Codex側ではdataUrlをPNGとして保存し、WordPressアイキャッチに使ってください。",
        "listenerHeadingThumbnails[].dataUrlは、リスナー応募曲の見出し直下に置く1280x720 PNGです。ownerIconUrlが外部制約で読めない時も、曲名と応募者名入りのPNGを同梱します。",
        "PCへの手動ダウンロードを挟まないための受け渡しデータです。"
      ],
      thumbnails,
      listenerHeadingThumbnails
    };
  };

  const copyThumbnailBundle = async () => {
    const bundle = await buildThumbnailBundle();
    const text = JSON.stringify(bundle, null, 2);
    setThumbnailTransferText(text);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // The textarea below still exposes the transfer data when clipboard access is blocked.
    }
    setThumbnailBundleCopied(true);
    window.setTimeout(() => setThumbnailBundleCopied(false), 1800);
  };

  const copyFullPackWithThumbnails = async () => {
    const bundle = await buildThumbnailBundle();
    const text = `${codexPack}\n\n---\n\n# 記事画像データJSON\n\n${JSON.stringify(bundle, null, 2)}`;
    setThumbnailTransferText(text);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // The textarea below still exposes the transfer data when clipboard access is blocked.
    }
    setFullPackCopied(true);
    window.setTimeout(() => setFullPackCopied(false), 1800);
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
      .map((track) => {
        const ownerHonorific = track.honorific || getDefaultOwnerHonorific(track.source);
        const aiArtistNote = track.aiArtist ? ` / AIアーティスト名: ${track.aiArtist}（敬称なし）` : "";
        const ownerIconNote = track.ownerIconUrl ? ` / 本人アイコン: ${track.ownerIconUrl}` : "";
        return (
          `${track.slotNo}. ${track.title || "曲名未入力"} / ${track.artist || "アーティスト未入力"}\n` +
          `   種別: ${track.source} / 本人名の敬称: ${ownerHonorific}${aiArtistNote}${ownerIconNote} / 楽曲URL: ${track.url || "-"} / 音源ファイル: ${track.audioFile || "-"} / 埋め込み: ${track.embedUrl || "-"}\n` +
          `   記事ポイント: ${track.articlePoint || "-"}`
        );
      })
      .join("\n");

    const thumbnailRows = CODEX_THUMBNAIL_PRESETS
      .map((preset) => {
        const generated = data.thumbnailStudio?.generated?.[preset.key];
        const template = data.thumbnailStudio?.templates?.[preset.key] ?? defaultThumbnailStudio.templates[preset.key];
        return `- ${preset.label}: ${generated ? `生成済み / ${generated.fileName || preset.fileName}` : "未生成"} / ベース: ${template?.name || preset.baseName}`;
      })
      .join("\n");
    const listenerHeadingThumbnailRows = episodeTracks
      .filter((track) => track.source === "リスナー応募曲")
      .map((track) =>
        compactLines([
          `- ${track.slotNo}. ${track.title || "曲名未入力"} / 応募者: ${track.artist || "-"}`,
          `  本人アイコン: ${track.ownerIconUrl || "未登録"}`,
          "  用途: 記事内でこの応募曲を紹介する見出し直下に置く応募者サムネPNG。画像JSONのlistenerHeadingThumbnails[].dataUrlを保存して使ってください。"
        ])
      )
      .join("\n");
    const socialPromo = selectedEpisode ? data.socialPromos?.[selectedEpisode.id] : null;
    const socialRows = socialPromo
      ? compactLines([
          socialPromo.postText && `SNS告知文:\n${socialPromo.postText}`,
          socialPromo.comicTemplate && `4コマ漫画テンプレ:\n${socialPromo.comicTemplate}`,
          socialPromo.comicImage?.name && `保存済み漫画画像: ${socialPromo.comicImage.name}`
        ])
      : "";
    const articleUrl = selectedEpisode.articleUrl || buildArticleUrl(data.settings.wordpressSite, selectedEpisode.articleSlug);

    return `Obsidianの以下フォルダーを読んで、今回のラジオ放送回を記事化してください。

${data.settings.obsidianPath}

今回の放送回:
- episode_id: ${selectedEpisode.id}
- タイトル: ${selectedEpisode.title}
- 放送日: ${selectedEpisode.date}
- 開催枠: ${selectedEpisode.slot}
- 種別: ${selectedEpisode.type}
- ゲスト: ${selectedEpisode.guestName || "-"}
- トークテーマ: ${selectedEpisode.notes || "-"}
- その他の情報: ${selectedEpisode.extraInfo || "-"}
- stand.fm URL: ${selectedEpisode.standfmUrl || "-"}
- 記事スラッグ: ${selectedEpisode.articleSlug || "-"}
- 記事URL: ${articleUrl || "-"}

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

記事アイキャッチ 16:9:
${thumbnailRows || "-"}
※Codexパックへ渡す生成サムネは記事用16:9のみです。stand.fm 1:1 と配信背景9:16はstand.fm用なので記事作成パックには含めません。
※16:9 PNGそのものは、この画面の「本文+記事画像データをコピー」または「記事画像JSONをコピー」で渡します。dataUrlをPNGとして保存してWordPressアイキャッチに使ってください。

応募曲見出し下サムネ素材:
${listenerHeadingThumbnailRows || "-"}
※リスナー応募曲では、画像JSONに入っている1280x720 PNGを該当曲の見出し直下に配置してください。

SNS告知/漫画素材:
${socialRows || "-"}

厳守ルール:
- かなめ🦐、べるぼ☂はパーソナリティなので原則「さん」なし。
- 記事本文に内部確認メモやNG回答そのものを載せない。
- 主催/出演/参加/プロデュースなどの関係性を混同しない。
- WordPress認証情報はチャットで別途共有する。`;
  }, [data.settings, data.thumbnailStudio, data.socialPromos, episodeResponses, episodeTracks, selectedEpisode]);

  const copyPack = async () => {
    await navigator.clipboard.writeText(codexPack);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const copyTransferLink = async () => {
    await navigator.clipboard.writeText(makeRestoreUrl(data));
    setTransferCopied(true);
    window.setTimeout(() => setTransferCopied(false), 1800);
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
          periodId: response.periodId || "",
          formId: response.formId || data.forms[0]?.id || "",
          respondent: response.respondent || "",
          status: response.status || "未確認",
          publicInfo: response.publicInfo || "",
          articleUse: response.articleUse || "",
          internalOnly: response.internalOnly || "",
          constraints: response.constraints || "",
          attachments
        };
        const guestIconAttachment = findGuestIconAttachment(attachments);
        const guestIcon = makeGuestIconFromAttachment(guestIconAttachment, `${normalized.respondent || "guest"}-icon`);
        const importedTracks = buildTracksFromRawAnswers(parsed.rawAnswers ?? [], normalized.episodeId, normalized.formId, normalized.respondent, normalized.periodId);
        setData((current) => {
          let nextTracks = current.tracks;
          importedTracks.forEach((track) => {
            nextTracks = appendTrack(nextTracks, {
              ...track,
              slotNo: nextSlotNo(nextTracks, normalized.episodeId)
            });
          });
          return {
            ...current,
            responses: [normalized, ...current.responses],
            tracks: nextTracks,
            thumbnailStudio: guestIcon
              ? mergeGuestIcons(current.thumbnailStudio ?? defaultThumbnailStudio, guestIcon)
              : current.thumbnailStudio
          };
        });
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

  const restoreData = (incomingData) => {
    try {
      const next = migrateData(incomingData);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setData(next);
      setSelectedEpisodeId(next.episodes?.[0]?.id ?? "");
      setSharedPayload(null);
      setRestorePayload(null);
      setActive("settings");
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    } catch {
      alert("データを取り込めませんでした。JSON書き出し/読み込みを使ってください。");
    }
  };

  if (restorePayload) {
    return <RestoreDataView logoSrc={logoSrc} payload={restorePayload} restoreData={restoreData} />;
  }

  if (sharedPayload) {
    return <PublicSubmissionForm logoSrc={logoSrc} payload={sharedPayload} operatorSettings={data.settings} />;
  }

  return (
    <main className="app-shell">
      <Header logoSrc={logoSrc} />

      <nav className="app-nav" aria-label="Main navigation">
        {[
          ["dashboard", "ダッシュボード", Radio],
          ["imports", "取り込み", Upload],
          ["episodes", "放送回", CalendarDays],
          ["tracks", "楽曲", Music],
          ["assets", "素材", Image],
          ["social", "SNS告知", Share2],
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
              importPreviews={importPreviews}
              updateImportPreviewMapping={updateImportPreviewMapping}
              applyImportPreview={applyImportPreview}
              clearImportPreview={clearImportPreview}
              applyBellboTrackUrl={applyBellboTrackUrl}
              importingSource={importingSource}
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
              wordpressSite={data.settings.wordpressSite}
            />
          )}
          {active === "forms" && (
            <Forms
              forms={data.forms}
              settings={data.settings}
              patchItem={patchItem}
              removeItem={removeItem}
              addForm={addForm}
              addQuestion={addQuestion}
              patchQuestion={patchQuestion}
              removeQuestion={removeQuestion}
            />
          )}
          {active === "periods" && (
            <ApplicationPeriods
              periods={data.applicationPeriods}
              episodes={data.episodes}
              forms={data.forms}
              settings={data.settings}
              patchItem={patchItem}
              removeItem={removeItem}
              addPeriod={addApplicationPeriod}
              importPeriodCsvUrl={importPeriodCsvUrl}
              importPeriodCsvFile={importPeriodCsvFile}
              importingSource={importingSource}
            />
          )}
          {active === "responses" && (
            <Responses
              forms={data.forms}
              responses={data.responses}
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
              thumbnailStudio={data.thumbnailStudio ?? defaultThumbnailStudio}
              updateThumbnailStudio={updateThumbnailStudio}
              guestName={selectedEpisode?.guestName ?? ""}
              episodeDate={selectedEpisode?.date ?? ""}
            />
          )}
          {active === "social" && (
            <SocialPromo
              selectedEpisode={selectedEpisode}
              promo={currentSocialPromo}
              updatePromo={updateSocialPromo}
              updateTalkTheme={updateEpisodeTalkTheme}
            />
          )}
          {active === "pack" && (
            <CodexPack
              codexPack={codexPack}
              copyPack={copyPack}
              copied={copied}
              selectedEpisode={selectedEpisode}
              copyThumbnailBundle={copyThumbnailBundle}
              thumbnailBundleCopied={thumbnailBundleCopied}
              copyFullPackWithThumbnails={copyFullPackWithThumbnails}
              fullPackCopied={fullPackCopied}
              articleThumbnailCount={CODEX_THUMBNAIL_PRESETS.filter((preset) => data.thumbnailStudio?.generated?.[preset.key]).length}
              listenerHeadingThumbnailCount={episodeTracks.filter((track) => track.source === "リスナー応募曲").length}
              thumbnailTransferText={thumbnailTransferText}
            />
          )}
          {active === "settings" && (
            <SettingsPanel
              settings={data.settings}
              updateSettings={updateSettings}
              exportJson={exportJson}
              importJson={importJson}
              resetSample={resetSample}
              copyTransferLink={copyTransferLink}
              transferCopied={transferCopied}
              setActive={setActive}
            />
          )}
        </section>
      </div>
    </main>
  );
}

function RestoreDataView({ logoSrc, payload, restoreData }) {
  const incoming = payload?.data;

  if (payload?.error || !incoming) {
    return (
      <main className="app-shell public-shell">
        <Header logoSrc={logoSrc} />
        <article className="panel">
          <h2>引き継ぎデータを開けませんでした</h2>
          <p className="muted">URLが途中で切れている可能性があります。PC側で引き継ぎリンクを作り直すか、JSON読み込みを使ってください。</p>
        </article>
      </main>
    );
  }

  return (
    <main className="app-shell public-shell">
      <Header logoSrc={logoSrc} />
      <article className="panel restore-panel">
        <div className="public-head">
          <div>
            <p className="eyebrow slim">Device Transfer</p>
            <h2>この端末に制作データを取り込みますか？</h2>
            <p className="muted">
              PC側で作成したRadio Article Studioのデータを、このブラウザに保存します。
              取り込むと、この端末にある現在のデータは上書きされます。
            </p>
          </div>
        </div>
        <div className="restore-summary">
          <div><b>{incoming.episodes?.length ?? 0}</b><span>放送回</span></div>
          <div><b>{incoming.forms?.length ?? 0}</b><span>フォーム</span></div>
          <div><b>{incoming.tracks?.length ?? 0}</b><span>楽曲</span></div>
          <div><b>{incoming.applicationPeriods?.length ?? 0}</b><span>応募期間</span></div>
        </div>
        <dl className="detail-list">
          <div><dt>WordPress</dt><dd>{incoming.settings?.wordpressSite || "未設定"}</dd></div>
          <div><dt>Obsidian</dt><dd>{incoming.settings?.obsidianFolderName || incoming.settings?.obsidianPath || "未設定"}</dd></div>
          <div><dt>X</dt><dd>べるぼ☂ @{incoming.settings?.bellboXHandle || DEFAULT_BELLBO_X_HANDLE} / かなめ🦐 @{incoming.settings?.kanameXHandle || DEFAULT_KANAME_X_HANDLE}</dd></div>
        </dl>
        <div className="button-row">
          <button className="primary" onClick={() => restoreData(incoming)}><Upload size={16} />この端末に取り込む</button>
          <button className="secondary" onClick={() => { window.location.hash = ""; }}>キャンセル</button>
        </div>
      </article>
    </main>
  );
}

function PublicSubmissionForm({ logoSrc, payload, operatorSettings = {} }) {
  const form = payload?.form;
  const period = payload?.period;
  const episode = payload?.episode;
  const contactAccounts = {
    bellbo: normalizeXHandle(payload?.contactAccounts?.bellbo || DEFAULT_BELLBO_X_HANDLE),
    kaname: normalizeXHandle(payload?.contactAccounts?.kaname || DEFAULT_KANAME_X_HANDLE),
    additional: normalizeAdditionalXAccounts(payload?.contactAccounts?.additional || [])
  };
  const contactAccountList = getContactAccountList({ contactAccounts });
  const xContactMessage = payload?.xContactMessage || DEFAULT_X_CONTACT_MESSAGE;
  const submission = {
    ...(payload?.submission || {}),
    endpointUrl: payload?.submission?.endpointUrl || operatorSettings.responseEndpointUrl || "",
    driveFolderUrl: payload?.submission?.driveFolderUrl || operatorSettings.responseDriveFolderUrl || ""
  };
  const [answers, setAnswers] = useState({});
  const [formError, setFormError] = useState("");
  const [submitStatus, setSubmitStatus] = useState("");
  const [submitBusy, setSubmitBusy] = useState(false);

  useEffect(() => {
    setAnswers({});
    setFormError("");
    setSubmitStatus("");
    setSubmitBusy(false);
  }, [form?.id, period?.id, episode?.id]);

  if (payload?.loading) {
    return (
      <main className="app-shell public-shell">
        <Header logoSrc={logoSrc} />
        <article className="panel">
          <h2>公開フォームを読み込んでいます</h2>
          <p className="muted">少し待ってから、フォームが表示されるか確認してください。</p>
        </article>
      </main>
    );
  }

  if (payload?.error || !form) {
    return (
      <main className="app-shell public-shell">
        <Header logoSrc={logoSrc} />
        <article className="panel">
          <h2>共有フォームを開けませんでした</h2>
          <p className="muted">
            {payload?.publishedSlug
              ? `この短いURLはまだ有効化されていない可能性があります。URLを送ってくれた運営側へご連絡ください。`
              : "URLが途中で切れている可能性があります。URLを送ってくれた運営側へご連絡ください。"}
          </p>
        </article>
      </main>
    );
  }

  const updateAnswer = (questionId, value) => {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  };

  const updateTrackAnswer = (questionId, patch) => {
    setAnswers((current) => ({
      ...current,
      [questionId]: {
        title: "",
        artist: "",
        url: "",
        audio: null,
        ...(current[questionId] ?? {}),
        ...patch
      }
    }));
  };

  const updateTrackUrlAnswer = (questionId, event) => {
    const url = event.target.value;
    const isSupported = isSupportedTrackUrl(url);
    event.target.setCustomValidity(isSupported ? "" : TRACK_URL_ERROR_MESSAGE);
    setFormError("");
    updateTrackAnswer(questionId, { url });
  };

  const updateXContactAnswer = (questionId, patch) => {
    setAnswers((current) => {
      const previous = current[questionId] ?? {};
      const next = {
        rawX: "",
        xHandle: "",
        xUrl: "",
        followedBellbo: false,
        followedKaname: false,
        followedAccounts: {},
        dmOk: false,
        ...previous,
        ...patch
      };
      if ("rawX" in patch) {
        next.xHandle = formatXHandle(patch.rawX);
        next.xUrl = makeXUrl(patch.rawX);
      }
      return { ...current, [questionId]: next };
    });
  };

  const updateXFollowAnswer = (questionId, accountId, checked) => {
    setAnswers((current) => {
      const previous = current[questionId] ?? {};
      return {
        ...current,
        [questionId]: {
          rawX: "",
          xHandle: "",
          xUrl: "",
          followedBellbo: false,
          followedKaname: false,
          dmOk: false,
          ...previous,
          followedAccounts: {
            ...(previous.followedAccounts ?? {}),
            [accountId]: checked
          },
          ...(accountId === "bellbo" ? { followedBellbo: checked } : {}),
          ...(accountId === "kaname" ? { followedKaname: checked } : {})
        }
      };
    });
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

  const updateImageAnswer = async (questionId, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!isImageUpload(file)) {
      alert("PNG、JPG、WebP、GIFの画像を選んでください。");
      event.target.value = "";
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    updateAnswer(questionId, {
      fileName: file.name,
      mimeType: file.type || "image/png",
      size: file.size,
      dataUrl
    });
  };

  const updateTrackFileAnswer = async (questionId, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!isAudioUpload(file)) {
      alert("WAVまたはMP3ファイルを選んでください。");
      event.target.value = "";
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    updateTrackAnswer(questionId, {
      audio: {
        fileName: file.name,
        mimeType: file.type || (file.name.toLowerCase().endsWith(".wav") ? "audio/wav" : "audio/mpeg"),
        size: file.size,
        dataUrl
      }
    });
  };

  const formatAnswers = (uses) =>
    form.questions
      .filter((question) => uses.includes(question.use))
      .map((question) => {
        const formatted = formatAnswerValue(answers[question.id]);
        return formatted && formatted !== "-" ? `${question.label}: ${formatted}` : "";
      })
      .filter(Boolean)
      .join("\n");

  const inferRespondent = () => {
    const nameQuestion = form.questions.find((question) => /名前|名|アーティスト|ゲスト/i.test(question.label));
    return (nameQuestion && answers[nameQuestion.id]) || "";
  };

  const buildResponsePayload = () => {
    const fileAttachments = form.questions
      .filter((question) => question.kind === "file" && answers[question.id]?.dataUrl)
      .map((question) => ({
        questionId: question.id,
        questionLabel: question.label,
        fileName: answers[question.id].fileName,
        mimeType: answers[question.id].mimeType,
        size: answers[question.id].size,
        dataUrl: answers[question.id].dataUrl
      }));
    const imageAttachments = form.questions
      .filter((question) => question.kind === "image" && answers[question.id]?.dataUrl)
      .map((question) => ({
        questionId: question.id,
        questionLabel: question.label,
        fileName: answers[question.id].fileName,
        mimeType: answers[question.id].mimeType,
        size: answers[question.id].size,
        dataUrl: answers[question.id].dataUrl
      }));
    const trackAttachments = form.questions
      .filter((question) => question.kind === "track" && answers[question.id]?.audio?.dataUrl)
      .map((question) => ({
        questionId: question.id,
        questionLabel: `${question.label}: 音源ファイル`,
        trackTitle: answers[question.id].title || "",
        trackArtist: answers[question.id].artist || "",
        trackUrl: answers[question.id].url || "",
        fileName: answers[question.id].audio.fileName,
        mimeType: answers[question.id].audio.mimeType,
        size: answers[question.id].audio.size,
        dataUrl: answers[question.id].audio.dataUrl
      }));
    const attachments = [...fileAttachments, ...imageAttachments, ...trackAttachments];

    return {
      version: 1,
      type: "radio-article-studio-response",
      exportedAt: new Date().toISOString(),
      response: {
        id: newId("res"),
        episodeId: episode?.id || period?.episodeId || "",
        periodId: period?.id || "",
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
        kind: question.kind,
        use: question.use,
        useLabel: QUESTION_USE_LABELS[question.use] ?? question.use,
        answer: formatAnswerValue(answers[question.id]),
        attachment: question.kind === "file" || question.kind === "image" ? answers[question.id] || null : question.kind === "track" ? answers[question.id]?.audio || null : null,
        track: question.kind === "track" ? answers[question.id] || null : null,
        xContact: question.kind === "x_contact" ? answers[question.id] || null : null
      }))
    };
  };

  const submit = async (event) => {
    event.preventDefault();
    const invalidTrackUrlQuestion = form.questions.find(
      (question) => question.kind === "track" && answers[question.id]?.url && !isSupportedTrackUrl(answers[question.id].url)
    );
    if (invalidTrackUrlQuestion) {
      setFormError(`${invalidTrackUrlQuestion.label}: ${TRACK_URL_ERROR_MESSAGE}`);
      event.currentTarget.reportValidity();
      return;
    }
    setFormError("");
    setSubmitStatus("");
    const responsePayload = buildResponsePayload();
    const json = JSON.stringify(responsePayload, null, 2);
    const endpointUrl = String(submission.endpointUrl || "").trim();
    if (!endpointUrl) {
      setSubmitStatus("送信先の設定に不備があります。URLを送ってくれた運営側へご連絡ください。");
      return;
    }
    setSubmitBusy(true);
    try {
      await fetch(endpointUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: json
      });
      setSubmitStatus("回答データを送信しました。受信結果は運営側の保存先で確認してください。");
    } catch {
      setSubmitStatus("送信できませんでした。時間を置いて再送信するか、URLを送ってくれた運営側へご連絡ください。");
    } finally {
      setSubmitBusy(false);
    }
  };

  const scrollToQuestion = (questionId) => {
    document.getElementById(`question-${questionId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
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
            {(period || episode) && (
              <div className="public-context">
                {period && <span>応募期間: {period.title || period.id} / {formatDateRange(period.startDate, period.endDate)}</span>}
                {episode && <span>放送回: {episode.date || "-"} {episode.title || ""}</span>}
              </div>
            )}
          </div>
        </div>

        {formError && <p className="form-error">{formError}</p>}
        {submitStatus && <p className="submit-status">{submitStatus}</p>}

        <nav className="form-toc" aria-label="フォーム目次">
          <strong>目次</strong>
          <div>
            {form.questions.map((question, index) => (
              <button type="button" key={question.id} onClick={() => scrollToQuestion(question.id)}>
                {index + 1}. {question.label}
              </button>
            ))}
          </div>
        </nav>

        <form className="public-form" onSubmit={submit}>
          {form.questions.map((question) => (
            <div className="field wide" key={question.id} id={`question-${question.id}`}>
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
              ) : question.kind === "image" ? (
                <div className="upload-field">
                  <input
                    type="file"
                    required={Boolean(question.required)}
                    accept={IMAGE_FILE_ACCEPT}
                    onChange={(event) => updateImageAnswer(question.id, event)}
                  />
                  <small>{answers[question.id]?.fileName ? `選択済み: ${formatAnswerValue(answers[question.id])}` : "PNG、JPG、WebP、GIFをアップロード"}</small>
                  {answers[question.id]?.dataUrl && (
                    <img className="image-answer-preview" src={answers[question.id].dataUrl} alt={`${question.label} preview`} />
                  )}
                </div>
              ) : question.kind === "track" ? (
                <div className="track-question-fields">
                  <label>
                    <span>楽曲をWAVかMP3でアップロード</span>
                    <input
                      type="file"
                      required={Boolean(question.required)}
                      accept={AUDIO_FILE_ACCEPT}
                      onChange={(event) => updateTrackFileAnswer(question.id, event)}
                    />
                    <small>{answers[question.id]?.audio?.fileName ? `選択済み: ${formatAnswerValue(answers[question.id].audio)}` : "WAVまたはMP3をアップロードしてください。"}</small>
                  </label>
                  <p className="hint-text track-entry-help">音源を選んだあとも、楽曲名・アーティスト名は手動で入力や修正ができます。</p>
                  <label>
                    <span>楽曲名</span>
                    <input
                      required={Boolean(question.required)}
                      value={answers[question.id]?.title ?? ""}
                      onChange={(event) => updateTrackAnswer(question.id, { title: event.target.value })}
                    />
                    <small>正式な楽曲名を入力してください。あとから修正できます。</small>
                  </label>
                  <label>
                    <span>アーティスト名</span>
                    <input
                      required={Boolean(question.required)}
                      value={answers[question.id]?.artist ?? ""}
                      onChange={(event) => updateTrackAnswer(question.id, { artist: event.target.value })}
                    />
                    <small>記事や紹介欄に載せる正式表記を入力してください。</small>
                  </label>
                  <label>
                    <span>楽曲URL（YouTube / Suno）</span>
                    <input
                      type="url"
                      required={Boolean(question.required)}
                      pattern={TRACK_URL_PATTERN}
                      title={TRACK_URL_ERROR_MESSAGE}
                      placeholder="https://youtu.be/... または https://suno.com/..."
                      value={answers[question.id]?.url ?? ""}
                      onChange={(event) => updateTrackUrlAnswer(question.id, event)}
                      onInvalid={(event) => event.target.setCustomValidity(event.target.value ? TRACK_URL_ERROR_MESSAGE : "")}
                      onInput={(event) => event.target.setCustomValidity(isSupportedTrackUrl(event.target.value) ? "" : TRACK_URL_ERROR_MESSAGE)}
                    />
                    <small>YouTubeまたはSunoの共有URLだけ受け付けます。</small>
                  </label>
                  <TrackPreview track={answers[question.id]} />
                </div>
              ) : question.kind === "x_contact" ? (
                <div className="x-contact-block">
                  <label>
                    <span>Xアカウント</span>
                    <input
                      required={Boolean(question.required)}
                      placeholder="@bellbo13"
                      value={answers[question.id]?.rawX ?? ""}
                      onChange={(event) => updateXContactAnswer(question.id, { rawX: event.target.value })}
                    />
                    <small>
                      {answers[question.id]?.xUrl ? (
                        <a href={answers[question.id].xUrl} target="_blank" rel="noreferrer">
                          {answers[question.id].xHandle} を開く
                        </a>
                      ) : (
                        "@からでもURLからでも入力できます。"
                      )}
                    </small>
                  </label>
                  <p className="hint-text x-contact-message">{xContactMessage}</p>
                  <div className="follow-actions">
                    {contactAccountList.map((account) => (
                      <a className="secondary" href={makeXUrl(account.handle)} target="_blank" rel="noreferrer" key={account.id}>
                        {account.label}をフォロー
                      </a>
                    ))}
                    {contactAccountList.length === 0 && <span className="muted small">運営側のXアカウントが未設定です。</span>}
                  </div>
                  {contactAccountList.map((account) => {
                    const checked =
                      answers[question.id]?.followedAccounts?.[account.id] ??
                      (account.id === "bellbo" ? answers[question.id]?.followedBellbo : account.id === "kaname" ? answers[question.id]?.followedKaname : false);
                    return (
                      <label className="inline-check" key={`${question.id}-${account.id}`}>
                        <input
                          type="checkbox"
                          required={Boolean(question.required)}
                          checked={Boolean(checked)}
                          onChange={(event) => updateXFollowAnswer(question.id, account.id, event.target.checked)}
                        />
                        {account.label}をフォローしました
                      </label>
                    );
                  })}
                  {contactAccountList.length === 0 && (
                    <label className="inline-check">
                      <input
                        type="checkbox"
                        required={Boolean(question.required)}
                        checked={Boolean(answers[question.id]?.followedBellbo)}
                        onChange={(event) => updateXContactAnswer(question.id, { followedBellbo: event.target.checked })}
                      />
                      運営からの連絡条件を確認しました
                    </label>
                  )}
                  <label className="inline-check">
                    <input
                      type="checkbox"
                      required={Boolean(question.required)}
                      checked={Boolean(answers[question.id]?.dmOk)}
                      onChange={(event) => updateXContactAnswer(question.id, { dmOk: event.target.checked })}
                    />
                    XのDMで運営から連絡を受け取ってOKです
                  </label>
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
            </div>
          ))}
          <div className="form-bottom-actions">
            <button className="primary" type="submit" disabled={submitBusy}><Send size={16} />{submitBusy ? "送信中" : "送信する"}</button>
            <button className="secondary" type="button" onClick={scrollToTop}>上に戻る</button>
          </div>
        </form>
      </article>
    </main>
  );
}

function TrackPreview({ track }) {
  const audio = track?.audio;
  const url = String(track?.url ?? "").trim();
  const isSupportedUrl = isSupportedTrackUrl(url);
  const playableEmbedUrl = makePlayableEmbedUrl(url);
  const showExternalLink = isWebUrl(url) && isSupportedUrl;

  if (url && !isSupportedUrl) {
    return (
      <div className="track-preview invalid">
        <strong><Music size={16} />プレビュー確認</strong>
        <span>{TRACK_URL_ERROR_MESSAGE}</span>
      </div>
    );
  }

  if (!audio?.dataUrl && !playableEmbedUrl && !showExternalLink) {
    return (
      <div className="track-preview empty">
        <strong><Music size={16} />プレビュー確認</strong>
        <span>音源ファイル、YouTube URL、またはSunoの埋め込み可能URLを入れるとここで確認できます。</span>
      </div>
    );
  }

  return (
    <div className="track-preview">
      <div className="track-preview-head">
        <strong><Music size={16} />プレビュー確認</strong>
        {showExternalLink && (
          <a className="secondary compact-link" href={url} target="_blank" rel="noreferrer">
            元ページを開く
          </a>
        )}
      </div>

      {audio?.dataUrl && (
        <div className="preview-player">
          <span>アップロード音源</span>
          <audio controls preload="metadata" src={audio.dataUrl} />
        </div>
      )}

      {playableEmbedUrl && (
        <iframe
          className="track-preview-frame"
          title="楽曲URLプレビュー"
          src={playableEmbedUrl}
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
          loading="lazy"
        />
      )}

      {isSunoShortUrl(url) && !playableEmbedUrl && (
        <p className="hint-text">Sunoの短縮URLは、この画面では埋め込みプレイヤー化できない場合があります。元ページを開いて曲を確認してください。</p>
      )}
    </div>
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

function Dashboard({ data, selectedEpisode, episodeTracks, setActive }) {
  const articleUrl = selectedEpisode?.articleUrl || buildArticleUrl(data.settings.wordpressSite, selectedEpisode?.articleSlug);
  const articleThumbnailReady = Boolean(data.thumbnailStudio?.generated?.article16x9);
  const stats = [
    ["放送回", data.episodes.length, CalendarDays],
    ["この回の楽曲", episodeTracks.length, Music],
    ["記事アイキャッチ", articleThumbnailReady ? "済" : "未", Image],
    ["Codexパック", selectedEpisode ? "作成" : "-", FileText]
  ];
  const statTargets = {
    放送回: "episodes",
    この回の楽曲: "tracks",
    記事アイキャッチ: "assets",
    Codexパック: "pack"
  };

  return (
    <div className="view-stack">
      <SectionTitle title="ダッシュボード" subtitle="いま準備中の放送回と、制作の詰まりどころを見ます。" />
      <div className="stat-grid">
        {stats.map(([label, value, Icon]) => (
          <button className="stat-card" key={label} onClick={() => setActive(statTargets[label])}>
            <Icon size={22} />
            <span>{label}</span>
            <strong>{value}</strong>
          </button>
        ))}
      </div>

      <article className="panel">
        <h2>基本の流れ</h2>
        <div className="button-row">
          <button className="secondary" onClick={() => setActive("imports")}>1. 取り込み</button>
          <button className="secondary" onClick={() => setActive("tracks")}>2. 楽曲確認</button>
          <button className="secondary" onClick={() => setActive("assets")}>3. サムネ作成</button>
          <button className="primary" onClick={() => setActive("pack")}>4. Codexパック</button>
        </div>
      </article>

      <div className="two-col">
        <article className="panel">
          <h2>選択中の放送回</h2>
          {selectedEpisode ? (
            <dl className="detail-list">
              <div><dt>タイトル</dt><dd>{selectedEpisode.title}</dd></div>
              <div><dt>放送日</dt><dd>{selectedEpisode.date}</dd></div>
              <div><dt>種別</dt><dd>{selectedEpisode.type}</dd></div>
              <div><dt>ゲスト</dt><dd>{selectedEpisode.guestName || "-"}</dd></div>
              <div><dt>トークテーマ</dt><dd>{selectedEpisode.notes || "-"}</dd></div>
              <div><dt>その他の情報</dt><dd>{selectedEpisode.extraInfo || "-"}</dd></div>
              <div><dt>記事</dt><dd>{articleUrl || "未設定"}</dd></div>
            </dl>
          ) : (
            <p>放送回を追加してください。</p>
          )}
        </article>

        <article className="panel">
          <h2>制作状況</h2>
          <div className="check-list">
            <StatusLine done={Boolean(selectedEpisode?.standfmUrl)} label="stand.fm URL" />
            <StatusLine done={episodeTracks.length > 0} label="紹介楽曲" />
            <StatusLine done={Boolean(data.thumbnailStudio?.generated?.article16x9)} label="記事アイキャッチ" />
            <StatusLine done={Boolean(articleUrl)} label="公開記事URL" />
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

function ImportsPanel({
  imports,
  selectedEpisode,
  updateImports,
  importCsvUrl,
  importCsvFile,
  importPreviews,
  updateImportPreviewMapping,
  applyImportPreview,
  clearImportPreview,
  applyBellboTrackUrl,
  importingSource
}) {
  return (
    <div className="view-stack">
      <SectionTitle
        title="自動取り込み"
        subtitle="URL入力 → 読み込み → プレビュー → 反映 の順で、アンケートや応募曲シートを取り込みます。"
      />

      <article className="panel import-target-panel">
        <p className="eyebrow slim">この放送回に取り込みます</p>
        <h2>{selectedEpisode?.title || "放送回未選択"}</h2>
        <dl className="detail-list">
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
          preview={importPreviews[getImportPreviewKey("guest")]}
          onMappingChange={(patch) => updateImportPreviewMapping("guest", patch)}
          onApplyPreview={() => applyImportPreview("guest")}
          onClearPreview={() => clearImportPreview("guest")}
          loading={importingSource === "guest"}
          kind="guest"
        />
        <SourceImportCard
          title="リスナー応募曲"
          description="応募者名、AIアーティスト名、曲名、楽曲URL、音源ファイル、表記注意を取り込みます。"
          value={imports.listenerCsvUrl}
          onChange={(value) => updateImports({ listenerCsvUrl: value })}
          onImportUrl={() => importCsvUrl("listener", imports.listenerCsvUrl, "リスナー応募曲")}
          onImportFile={(event) => importCsvFile(event, "listener", "リスナー応募曲")}
          preview={importPreviews[getImportPreviewKey("listener")]}
          onMappingChange={(patch) => updateImportPreviewMapping("listener", patch)}
          onApplyPreview={() => applyImportPreview("listener")}
          onClearPreview={() => clearImportPreview("listener")}
          loading={importingSource === "listener"}
          kind="listener"
        />
        <SourceImportCard
          title="パーソナリティ曲シート"
          description="かなめ🦐/べるぼ☂の紹介曲、AIアーティスト名、曲への想いを取り込みます。"
          value={imports.personalityCsvUrl}
          onChange={(value) => updateImports({ personalityCsvUrl: value })}
          onImportUrl={() => importCsvUrl("personality", imports.personalityCsvUrl, "パーソナリティ曲")}
          onImportFile={(event) => importCsvFile(event, "personality", "パーソナリティ曲")}
          preview={importPreviews[getImportPreviewKey("personality")]}
          onMappingChange={(patch) => updateImportPreviewMapping("personality", patch)}
          onApplyPreview={() => applyImportPreview("personality")}
          onClearPreview={() => clearImportPreview("personality")}
          loading={importingSource === "personality"}
          kind="personality"
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
          ゲスト名、活動紹介文、今回話したいこと、触れないでほしいこと、曲名、アーティスト名、AIアーティスト名、楽曲URL、音源ファイル、記事で触れてほしいポイント、表記注意。
        </p>
      </article>
    </div>
  );
}

function SourceImportCard({
  title,
  description,
  value,
  onChange,
  onImportUrl,
  onImportFile,
  preview,
  onMappingChange,
  onApplyPreview,
  onClearPreview,
  loading = false,
  kind
}) {
  const columns = Object.keys(preview?.rows?.[0] ?? {}).filter(Boolean);
  const previewRows = preview ? buildImportPreviewRows(preview.rows, kind, preview.mapping).slice(0, 8) : [];
  const columnLabels = { "": "自動判定" };
  columns.forEach((column) => {
    columnLabels[column] = column;
  });

  return (
    <article className="record import-card">
      <h2>{title}</h2>
      <p className="muted">{description}</p>
      <div className="import-steps" aria-label="取り込み手順">
        {["URL入力", "読み込み", "プレビュー", "反映"].map((step, index) => (
          <span key={step} className={preview || index < 2 ? "active" : ""}>{step}</span>
        ))}
      </div>
      <Field
        label="Google Sheets / CSV URL"
        value={value}
        onChange={onChange}
        placeholder="https://docs.google.com/spreadsheets/d/..."
      />
      <p className="hint-text">GoogleフォームURLではなく、回答先スプレッドシートURLを入れてください。共有は「リンクを知っている全員が閲覧者」にします。</p>
      <div className="button-row">
        <button className="primary" onClick={onImportUrl} disabled={loading}><Upload size={16} />{loading ? "読み込み中" : "読み込み"}</button>
        <label className="secondary file-button">
          <Upload size={16} />CSVファイル
          <input type="file" accept=".csv,text/csv" onChange={onImportFile} />
        </label>
      </div>
      {preview && (
        <div className="import-preview">
          <div className="record-head">
            <div>
              <strong>プレビュー</strong>
              <p className="muted">{preview.rows.length}行を読み込み済み。内容を確認してから反映してください。</p>
            </div>
            <div className="button-row compact">
              <button className="primary" onClick={onApplyPreview}><Save size={16} />反映</button>
              <button className="secondary" onClick={onClearPreview}><X size={16} />取消</button>
            </div>
          </div>
          {columns.length > 0 && (
            <div className="import-mapping">
              <strong>列名マッピング</strong>
              <p className="hint-text">自動判定でずれている時だけ、対応する列を選んでください。</p>
              <div className="import-mapping-grid">
                {IMPORT_PREVIEW_FIELDS.map((field) => (
                  <SelectField
                    key={field.key}
                    label={field.label}
                    value={preview.mapping?.[field.key] || ""}
                    options={["", ...columns]}
                    labels={columnLabels}
                    onChange={(column) => onMappingChange({ [field.key]: column })}
                  />
                ))}
              </div>
            </div>
          )}
          <div className="import-preview-table-wrap">
            <table className="import-preview-table">
              <thead>
                <tr>
                  <th>#</th>
                  {IMPORT_PREVIEW_FIELDS.map((field) => <th key={field.key}>{field.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row) => (
                  <tr key={row.rowNo}>
                    <td>{row.rowNo}</td>
                    {IMPORT_PREVIEW_FIELDS.map((field) => (
                      <td key={field.key}>{shortenPreviewValue(row[field.key]) || "-"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.rows.length > previewRows.length && (
            <p className="hint-text">先頭{previewRows.length}行だけ表示しています。反映時は{preview.rows.length}行すべて取り込みます。</p>
          )}
        </div>
      )}
    </article>
  );
}

function downloadAttachment(attachment) {
  downloadDataUrlFile(attachment?.dataUrl, attachment?.fileName || "audio-file");
}

async function saveAttachmentWithPicker(attachment) {
  if (!attachment?.dataUrl) return;
  try {
    await saveDataUrlWithPicker(attachment.dataUrl, attachment.fileName || "audio-file");
  } catch {
    // User cancelled the picker. No UI state is needed here.
  }
}

function Episodes({ episodes, selectedEpisodeId, setSelectedEpisodeId, patchItem, removeItem, addEpisode, wordpressSite }) {
  const patchEpisodeDate = (episode, date) => {
    patchItem("episodes", episode.id, {
      date,
      slot: getBroadcastSlot(date)
    });
  };

  const patchEpisodeType = (episode, type) => {
    const patch = { type };
    if (type === "ゲスト回" && episode.guestName) {
      patch.title = makeGuestEpisodeTitle(episode.guestName);
    }
    patchItem("episodes", episode.id, patch);
  };

  const patchGuestName = (episode, guestName) => {
    const patch = { guestName };
    if (episode.type === "ゲスト回") {
      patch.title = makeGuestEpisodeTitle(guestName);
    }
    const slugCandidate = slugify(guestName);
    if (!episode.articleSlug && slugCandidate) {
      patch.articleSlug = slugCandidate;
      patch.articleUrl = buildArticleUrl(wordpressSite, slugCandidate);
    }
    patchItem("episodes", episode.id, patch);
  };

  const patchArticleSlug = (episode, value) => {
    const articleSlug = slugify(value);
    patchItem("episodes", episode.id, {
      articleSlug,
      articleUrl: buildArticleUrl(wordpressSite, articleSlug)
    });
  };

  const slotOptions = (episode) =>
    Array.from(new Set([episode.slot, getBroadcastSlot(episode.date), "第2木曜日", "第4木曜日", "特別回"].filter(Boolean)));

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
              <Field label="放送日" type="date" value={episode.date} onChange={(value) => patchEpisodeDate(episode, value)} />
              <SelectField label="開催枠" value={episode.slot} options={slotOptions(episode)} onChange={(value) => patchItem("episodes", episode.id, { slot: value })} />
              <Field label="放送時間" value={episode.time} onChange={(value) => patchItem("episodes", episode.id, { time: value })} />
              <SelectField label="種別" value={episode.type} options={["ゲスト回", "通常回", "リスナー曲回", "特別回"]} onChange={(value) => patchEpisodeType(episode, value)} />
              <Field label="ゲスト名" value={episode.guestName} onChange={(value) => patchGuestName(episode, value)} />
              <Field label="stand.fm URL" value={episode.standfmUrl} onChange={(value) => patchItem("episodes", episode.id, { standfmUrl: value })} />
              <SelectField label="ステータス" value={episode.status} options={["準備中", "素材待ち", "下書き作成済み", "確認待ち", "公開済み", "SNS投稿済み"]} onChange={(value) => patchItem("episodes", episode.id, { status: value })} />
              <Field label="記事スラッグ" value={episode.articleSlug} placeholder="例: yui / sunopa-yui-guest" onChange={(value) => patchArticleSlug(episode, value)} />
              <Field label="記事URL" value={episode.articleUrl || buildArticleUrl(wordpressSite, episode.articleSlug)} readOnly wide />
              <p className="hint-text wide">ゲスト回はゲスト名を入れると「〇〇さんゲスト回🌟」を自動入力します。スラッグはURL末尾になるため、基本はゲスト名の英語表記で入力してください。</p>
              <TextArea label="トークテーマ" value={episode.notes} onChange={(value) => patchItem("episodes", episode.id, { notes: value })} />
              <TextArea label="その他の情報" value={episode.extraInfo || ""} onChange={(value) => patchItem("episodes", episode.id, { extraInfo: value })} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function ApplicationPeriods({
  periods,
  episodes,
  forms,
  settings,
  patchItem,
  removeItem,
  addPeriod,
  importPeriodCsvUrl,
  importPeriodCsvFile,
  importingSource
}) {
  const [copiedPeriodId, setCopiedPeriodId] = useState("");
  const episodeLabels = Object.fromEntries(episodes.map((episode) => [episode.id, `${episode.date} ${episode.title}`]));
  const formLabels = Object.fromEntries(forms.map((form) => [form.id, form.name]));

  const copyPeriodShareUrl = async (period) => {
    const form = forms.find((item) => item.id === period.formId);
    if (!form) return;
    const episode = episodes.find((item) => item.id === period.episodeId);
    await navigator.clipboard.writeText(makePortableShareUrl(form, settings, { period, episode }));
    setCopiedPeriodId(period.id);
    window.setTimeout(() => setCopiedPeriodId(""), 1800);
  };

  const copyShortPeriodShareUrl = async (period) => {
    const form = forms.find((item) => item.id === period.formId);
    if (!form) return;
    const episode = episodes.find((item) => item.id === period.episodeId);
    await navigator.clipboard.writeText(makeShareUrl(form, settings, { period, episode }));
    setCopiedPeriodId(`${period.id}:short`);
    window.setTimeout(() => setCopiedPeriodId(""), 1800);
  };

  const copyPublishedPeriodShareUrl = async (period) => {
    const form = forms.find((item) => item.id === period.formId);
    if (!form) return;
    const episode = episodes.find((item) => item.id === period.episodeId);
    const slug = getPeriodPublishedSlug(period, episode, form);
    await navigator.clipboard.writeText(makePublishedShareUrl(slug));
    setCopiedPeriodId(`${period.id}:published`);
    window.setTimeout(() => setCopiedPeriodId(""), 1800);
  };

  const downloadPublishedPeriodJson = (period) => {
    const form = forms.find((item) => item.id === period.formId);
    if (!form) return;
    const episode = episodes.find((item) => item.id === period.episodeId);
    const slug = getPeriodPublishedSlug(period, episode, form);
    downloadPublishedShareJson(form, settings, { period, episode }, slug);
  };

  const copyPublishedPeriodJson = async (period) => {
    const form = forms.find((item) => item.id === period.formId);
    if (!form) return;
    const episode = episodes.find((item) => item.id === period.episodeId);
    await navigator.clipboard.writeText(JSON.stringify(makeSharePayload(form, settings, { period, episode }), null, 2));
    setCopiedPeriodId(`${period.id}:json`);
    window.setTimeout(() => setCopiedPeriodId(""), 1800);
  };

  const copyPeriodActivationRequest = async (period) => {
    const form = forms.find((item) => item.id === period.formId);
    if (!form) return;
    const episode = episodes.find((item) => item.id === period.episodeId);
    const slug = getPeriodPublishedSlug(period, episode, form);
    await navigator.clipboard.writeText(makeShortUrlActivationRequest(slug, makeSharePayload(form, settings, { period, episode })));
    setCopiedPeriodId(`${period.id}:activation`);
    window.setTimeout(() => setCopiedPeriodId(""), 1800);
  };

  return (
    <div className="view-stack">
      <SectionTitle
        title="応募期間管理"
        subtitle="リスナー応募曲などを、募集期間・放送回・フォーム・応募シート単位でまとめます。"
        action={<button className="primary" onClick={addPeriod}><Plus size={16} />応募期間追加</button>}
      />
      <div className="records">
        {periods.map((period) => {
          const form = forms.find((item) => item.id === period.formId);
          const episode = episodes.find((item) => item.id === period.episodeId);
          const shareUrl = form ? makePortableShareUrl(form, settings, { period, episode }) : "";
          const publishedSlug = form ? getPeriodPublishedSlug(period, episode, form) : "";
          const publishedUrl = publishedSlug ? makePublishedShareUrl(publishedSlug) : "";
          return (
            <article className="record" key={period.id}>
              <div className="record-head">
                <strong>{period.title || "応募期間名未入力"}</strong>
                <button className="icon-danger" onClick={() => removeItem("applicationPeriods", period.id)}><Trash2 size={16} /></button>
              </div>
              <div className="period-summary">
                <span>{period.status}</span>
                <b>{formatDateRange(period.startDate, period.endDate)}</b>
                <small>{episode ? `${episode.date} ${episode.title}` : "放送回未設定"}</small>
              </div>
              <div className="form-grid">
                <Field label="募集名" value={period.title} onChange={(value) => patchItem("applicationPeriods", period.id, { title: value })} />
                <SelectField label="種別" value={period.type} options={["リスナー応募曲", "ゲスト回答", "通常募集", "素材提出"]} onChange={(value) => patchItem("applicationPeriods", period.id, { type: value })} />
                <SelectField label="対象放送回" value={period.episodeId} options={episodes.map((item) => item.id)} labels={episodeLabels} onChange={(value) => patchItem("applicationPeriods", period.id, { episodeId: value })} />
                <SelectField label="使用フォーム" value={period.formId} options={forms.map((item) => item.id)} labels={formLabels} onChange={(value) => patchItem("applicationPeriods", period.id, { formId: value })} />
                <Field label="受付開始" type="date" value={period.startDate} onChange={(value) => patchItem("applicationPeriods", period.id, { startDate: value })} />
                <Field label="受付終了" type="date" value={period.endDate} onChange={(value) => patchItem("applicationPeriods", period.id, { endDate: value })} />
                <SelectField label="状態" value={period.status} options={["準備中", "受付中", "受付終了", "取り込み済み", "保留"]} onChange={(value) => patchItem("applicationPeriods", period.id, { status: value })} />
                <Field label="短縮ID" value={period.shareSlug} onChange={(value) => patchItem("applicationPeriods", period.id, { shareSlug: value })} placeholder="例: yui-20260723" />
                <Field
                  label="Google Sheets / CSV URL"
                  value={period.csvUrl}
                  onChange={(value) => patchItem("applicationPeriods", period.id, { csvUrl: value })}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                />
                <p className="hint-text wide">GoogleフォームURLではなく、回答先スプレッドシートURLを入れてください。共有は「リンクを知っている全員が閲覧者」にします。</p>
                <TextArea label="メモ" value={period.notes} onChange={(value) => patchItem("applicationPeriods", period.id, { notes: value })} />
              </div>
              <div className="share-box short-share">
                <div>
                  <strong><Share2 size={16} />短いURL</strong>
                  <span>ゲストさんやSNSに渡す用です。まだ開けない時は「Codex用依頼をコピー」をそのままCodexに貼ってください。</span>
                </div>
                <input readOnly value={publishedUrl} onFocus={(event) => event.target.select()} />
                <div className="inline-actions">
                  <button className="secondary" onClick={() => copyPublishedPeriodShareUrl(period)} disabled={!publishedUrl}>
                    <ClipboardCopy size={16} />{copiedPeriodId === `${period.id}:published` ? "コピー済み" : "短いURLをコピー"}
                  </button>
                  <button className="secondary" onClick={() => downloadPublishedPeriodJson(period)} disabled={!publishedUrl}>
                    <Download size={16} />URL用JSONを保存
                  </button>
                  <button className="secondary" onClick={() => copyPublishedPeriodJson(period)} disabled={!publishedUrl}>
                    <ClipboardCopy size={16} />{copiedPeriodId === `${period.id}:json` ? "JSONコピー済み" : "URL用JSONをコピー"}
                  </button>
                  <button className="secondary" onClick={() => copyPeriodActivationRequest(period)} disabled={!publishedUrl}>
                    <ClipboardCopy size={16} />{copiedPeriodId === `${period.id}:activation` ? "依頼文コピー済み" : "Codex用依頼をコピー"}
                  </button>
                </div>
              </div>
              <div className="share-box">
                <div>
                  <strong><Share2 size={16} />長いURL（すぐ使える）</strong>
                  <span>短いURLを有効化する前に使える予備URLです。フォーム内容をURLに含めるため長くなります。</span>
                </div>
                <input readOnly value={shareUrl} onFocus={(event) => event.target.select()} />
                <div className="inline-actions">
                  <button className="secondary" onClick={() => copyPeriodShareUrl(period)} disabled={!shareUrl}>
                    <ClipboardCopy size={16} />{copiedPeriodId === period.id ? "コピー済み" : "外部URLをコピー"}
                  </button>
                  <button className="secondary" onClick={() => copyShortPeriodShareUrl(period)} disabled={!shareUrl}>
                    <ClipboardCopy size={16} />{copiedPeriodId === `${period.id}:short` ? "コピー済み" : "管理端末用URLをコピー"}
                  </button>
                  <button className="primary" onClick={() => importPeriodCsvUrl(period)} disabled={importingSource === `period:${period.id}`}>
                    <Upload size={16} />{importingSource === `period:${period.id}` ? "取り込み中" : "この期間のCSVを取り込み"}
                  </button>
                  <label className="secondary file-button">
                    <Upload size={16} />CSVファイル
                    <input type="file" accept=".csv,text/csv" onChange={(event) => importPeriodCsvFile(period, event)} />
                  </label>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Forms({ forms, settings, patchItem, removeItem, addForm, addQuestion, patchQuestion, removeQuestion }) {
  const [copiedFormId, setCopiedFormId] = useState("");

  const copyShareUrl = async (form) => {
    await navigator.clipboard.writeText(makePortableShareUrl(form, settings));
    setCopiedFormId(form.id);
    window.setTimeout(() => setCopiedFormId(""), 1800);
  };

  const copyShortShareUrl = async (form) => {
    await navigator.clipboard.writeText(makeShareUrl(form, settings));
    setCopiedFormId(`${form.id}:short`);
    window.setTimeout(() => setCopiedFormId(""), 1800);
  };

  const copyPublishedShareUrl = async (form) => {
    const slug = getFormPublishedSlug(form);
    await navigator.clipboard.writeText(makePublishedShareUrl(slug));
    setCopiedFormId(`${form.id}:published`);
    window.setTimeout(() => setCopiedFormId(""), 1800);
  };

  const downloadPublishedFormJson = (form) => {
    const slug = getFormPublishedSlug(form);
    downloadPublishedShareJson(form, settings, {}, slug);
  };

  const copyPublishedFormJson = async (form) => {
    await navigator.clipboard.writeText(JSON.stringify(makeSharePayload(form, settings), null, 2));
    setCopiedFormId(`${form.id}:json`);
    window.setTimeout(() => setCopiedFormId(""), 1800);
  };

  const copyFormActivationRequest = async (form) => {
    const slug = getFormPublishedSlug(form);
    await navigator.clipboard.writeText(makeShortUrlActivationRequest(slug, makeSharePayload(form, settings)));
    setCopiedFormId(`${form.id}:activation`);
    window.setTimeout(() => setCopiedFormId(""), 1800);
  };

  return (
    <div className="view-stack">
      <SectionTitle title="フォーム管理" subtitle="質問テンプレートを作り、外部共有URLから回答してもらえます。現時点の回答回収はJSON受け取り方式です。" action={<button className="primary" onClick={addForm}><Plus size={16} />フォーム追加</button>} />
      <div className="records">
        {forms.map((form) => (
          <article className="record" key={form.id}>
            <div className="record-head">
              <strong>{form.name}</strong>
              <button className="icon-danger" onClick={() => removeItem("forms", form.id)}><Trash2 size={16} /></button>
            </div>
            <div className="form-grid">
              <Field label="フォーム名" value={form.name} onChange={(value) => patchItem("forms", form.id, { name: value })} />
              <Field label="短縮ID" value={form.shareSlug} onChange={(value) => patchItem("forms", form.id, { shareSlug: value })} placeholder="例: guest-form" />
              <TextArea label="説明" value={form.description} onChange={(value) => patchItem("forms", form.id, { description: value })} />
            </div>
            <div className="share-box short-share">
              <div>
                <strong><Share2 size={16} />短いURL</strong>
                <span>ゲストさんやSNSに渡す用です。まだ開けない時は「Codex用依頼をコピー」をそのままCodexに貼ってください。</span>
              </div>
              <input readOnly value={makePublishedShareUrl(getFormPublishedSlug(form))} onFocus={(event) => event.target.select()} />
              <div className="inline-actions">
                <button className="secondary" onClick={() => copyPublishedShareUrl(form)}>
                  <ClipboardCopy size={16} />{copiedFormId === `${form.id}:published` ? "コピー済み" : "短いURLをコピー"}
                </button>
                <button className="secondary" onClick={() => downloadPublishedFormJson(form)}>
                  <Download size={16} />URL用JSONを保存
                </button>
                <button className="secondary" onClick={() => copyPublishedFormJson(form)}>
                  <ClipboardCopy size={16} />{copiedFormId === `${form.id}:json` ? "JSONコピー済み" : "URL用JSONをコピー"}
                </button>
                <button className="secondary" onClick={() => copyFormActivationRequest(form)}>
                  <ClipboardCopy size={16} />{copiedFormId === `${form.id}:activation` ? "依頼文コピー済み" : "Codex用依頼をコピー"}
                </button>
              </div>
            </div>
            <div className="share-box">
              <div>
                <strong><Share2 size={16} />長いURL（すぐ使える）</strong>
                <span>短いURLを有効化する前に使える予備URLです。フォーム内容をURLに含めるため長くなります。期間を指定する場合は「応募期間管理」のURLを使います。</span>
              </div>
              <input readOnly value={makePortableShareUrl(form, settings)} onFocus={(event) => event.target.select()} />
              <div className="inline-actions">
                <button className="secondary" onClick={() => copyShareUrl(form)}>
                  <ClipboardCopy size={16} />{copiedFormId === form.id ? "コピー済み" : "外部URLをコピー"}
                </button>
                <button className="secondary" onClick={() => copyShortShareUrl(form)}>
                  <ClipboardCopy size={16} />{copiedFormId === `${form.id}:short` ? "コピー済み" : "管理端末用URLをコピー"}
                </button>
              </div>
            </div>
            <div className="question-list">
              <div className="subhead">質問項目</div>
              <p className="hint-text">入力形式: 楽曲を選ぶと「楽曲名・楽曲URL・WAV/MP3アップロード」の3点セットになります。画像はゲストアイコンやプロフィール画像用、ファイル単体はWAV/MP3の音源添付用です。</p>
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
                <div className="subhead">添付ファイル</div>
                {response.attachments.map((attachment, index) => (
                  <div className="attachment-item" key={`${attachment.fileName}-${index}`}>
                    <span>{attachment.fileName}</span>
                    <small>{Math.round((attachment.size || 0) / 1024 / 1024 * 10) / 10}MB</small>
                    <button className="secondary" onClick={() => downloadAttachment(attachment)}><Download size={16} />ダウンロード</button>
                    <button className="secondary" onClick={() => saveAttachmentWithPicker(attachment)}><FolderOpen size={16} />保存先を選ぶ</button>
                    {attachment.dataUrl && isImageAttachment(attachment) && (
                      <img className="attachment-image" src={attachment.dataUrl} alt={attachment.fileName || "添付画像"} />
                    )}
                    {attachment.dataUrl && isAudioAttachment(attachment) && (
                      <audio className="attachment-audio" controls preload="metadata" src={attachment.dataUrl} />
                    )}
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
    patchItem("tracks", track.id, { url, urlType: detectUrlType(url), embedUrl: makeEmbedUrl(url) || track.embedUrl });
  };
  const updateTrackSource = (track, source) => {
    const currentHonorific = track.honorific || "";
    const oldDefault = getDefaultOwnerHonorific(track.source);
    const patch = { source };
    if (!currentHonorific || currentHonorific === oldDefault) {
      patch.honorific = getDefaultOwnerHonorific(source);
    }
    patchItem("tracks", track.id, patch);
  };
  const saveTrackAudio = async (audio, fallbackName) => {
    try {
      await saveDataUrlWithPicker(audio.dataUrl, audio.fileName || fallbackName || "audio-file");
    } catch {
      // 保存先選択のキャンセルは運用上よくあるので、画面上のエラーにはしない。
    }
  };

  return (
    <div className="view-stack">
      <SectionTitle title="楽曲/音源管理" subtitle="1曲を1ブロックで管理します。楽曲名、楽曲URL、音源ファイルをまとめて入力します。" action={<button className="primary" onClick={addTrack}><Plus size={16} />楽曲追加</button>} />
      <div className="records">
        {tracks.map((track) => {
          const audio = track.audio;
          const audioDownloadUrl = makeDirectAudioDownloadUrl(track.audioFile);
          const isDriveAudio = Boolean(getGoogleDriveFileId(track.audioFile));
          return (
            <article className="record" key={track.id}>
              <div className="record-head">
                <strong>{track.slotNo}. {track.title || "楽曲名未入力"} / {track.artist || "アーティスト未入力"}</strong>
                <button className="icon-danger" onClick={() => removeItem("tracks", track.id)}><Trash2 size={16} /></button>
              </div>
              <div className="track-meta-grid">
                <Field label="曲順" type="number" value={track.slotNo} onChange={(value) => patchItem("tracks", track.id, { slotNo: value })} />
                <SelectField label="紹介枠" value={track.source} options={["ゲスト曲", "パーソナリティ曲", "リスナー応募曲"]} onChange={(value) => updateTrackSource(track, value)} />
                <Field label="本人名（ゲスト/応募者/パーソナリティ）" value={track.artist} onChange={(value) => patchItem("tracks", track.id, { artist: value })} />
                <Field label="AIアーティスト名" value={track.aiArtist} onChange={(value) => patchItem("tracks", track.id, { aiArtist: value })} />
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
                  <Field label="本人アイコンURL（応募曲見出し下サムネ用）" value={track.ownerIconUrl || ""} onChange={(value) => patchItem("tracks", track.id, { ownerIconUrl: value })} />
                  <Field label="埋め込みURL（必要なら）" value={track.embedUrl} onChange={(value) => patchItem("tracks", track.id, { embedUrl: value })} />
                  <Field label="本人名の敬称ルール" value={track.honorific || getDefaultOwnerHonorific(track.source)} onChange={(value) => patchItem("tracks", track.id, { honorific: value })} />
                  <TextArea label="記事で触れるポイント" value={track.articlePoint} onChange={(value) => patchItem("tracks", track.id, { articlePoint: value })} />
                </div>
                {audioDownloadUrl && !audio?.dataUrl && (
                  <div className="track-audio-ops track-audio-url">
                    <div>
                      <strong>音源URLからダウンロード</strong>
                      <small>{isDriveAudio ? "Google Driveを開かずに、直接ダウンロード用URLを呼び出します。" : "登録されている音源URLからダウンロードします。"}</small>
                    </div>
                    <div className="inline-actions">
                      <button className="secondary" onClick={() => downloadTrackAudioFromUrl(track)}>
                        <Download size={16} />音源をダウンロード
                      </button>
                    </div>
                  </div>
                )}
                {audio?.dataUrl && (
                  <div className="track-audio-ops">
                    <div>
                      <strong>取り込み済み音源</strong>
                      <small>{audio.fileName || track.audioFile || "audio-file"} / {Math.round((audio.size || 0) / 1024 / 1024 * 10) / 10}MB</small>
                    </div>
                    <div className="inline-actions">
                      <button className="secondary" onClick={() => downloadDataUrlFile(audio.dataUrl, audio.fileName || track.audioFile || "audio-file")}><Download size={16} />ダウンロード</button>
                      <button className="secondary" onClick={() => saveTrackAudio(audio, track.audioFile)}><FolderOpen size={16} />保存先を選ぶ</button>
                    </div>
                    <audio className="attachment-audio" controls preload="metadata" src={audio.dataUrl} />
                  </div>
                )}
              </div>
            </article>
          );
        })}
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

const assertCanvasImageReadable = (image) => {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0, 1, 1);
  canvas.toDataURL("image/png");
};

const loadCanvasImageSource = (src) =>
  new Promise((resolve, reject) => {
    if (!src) {
      reject(new Error("image-src-missing"));
      return;
    }
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    if (!src.startsWith("data:")) image.crossOrigin = "anonymous";
    image.src = src;
  });

const loadCanvasImage = async (src) => {
  const candidates = getCanvasImageSourceCandidates(src);
  let lastError = new Error("image-src-missing");
  for (const candidate of candidates) {
    try {
      const image = await loadCanvasImageSource(candidate);
      assertCanvasImageReadable(image);
      return image;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
};

function drawCoverAt(ctx, image, x, y, width, height, crop = {}) {
  const cropX = clampNumber(crop.cropX, 50, 0, 100);
  const cropY = clampNumber(crop.cropY, 50, 0, 100);
  const cropZoom = clampNumber(crop.cropZoom ?? crop.zoom, 100, 100, 300) / 100;
  const scale = Math.max(width / image.width, height / image.height) * cropZoom;
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const drawX = x + (width - drawWidth) * (cropX / 100);
  const drawY = y + (height - drawHeight) * (cropY / 100);
  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
}

function drawCover(ctx, image, width, height) {
  drawCoverAt(ctx, image, 0, 0, width, height);
}

const isCustomTemplate = (template) => template?.source === "custom";
const getTemplateSource = (template) => (isCustomTemplate(template) ? template?.dataUrl || "" : template?.assetUrl || "");
const getNormalizedThumbnailTemplate = (presetKey, template) => ({
  ...defaultThumbnailStudio.templates[presetKey],
  ...(template ?? {})
});

async function resolveThumbnailTemplateForRender(presetKey, template) {
  const normalizedTemplate = getNormalizedThumbnailTemplate(presetKey, template);
  if (!isCustomTemplate(normalizedTemplate) || normalizedTemplate.dataUrl || !normalizedTemplate.baseImageKey) {
    return normalizedTemplate;
  }
  try {
    return {
      ...normalizedTemplate,
      dataUrl: await loadGeneratedThumbnailImage(normalizedTemplate.baseImageKey)
    };
  } catch {
    return normalizedTemplate;
  }
}

function drawDateBadge(ctx, preset, dateString) {
  const lines = formatThumbnailDateLines(dateString);
  if (!lines) return;

  const config = preset.dateBadge;
  const centerX = (preset.width * config.x) / 100;
  const centerY = (preset.height * config.y) / 100;
  const [year, date, weekday] = lines;
  const fontFamily = 'Georgia, "Times New Roman", "Yu Mincho", "Hiragino Mincho ProN", serif';

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#f8d18a";
  ctx.strokeStyle = "rgba(59, 33, 10, .58)";
  ctx.shadowColor = "rgba(255, 191, 82, .72)";
  ctx.shadowBlur = Math.max(10, Math.round(config.date * 0.32));
  ctx.lineJoin = "round";

  [
    { text: year, size: config.year, weight: 700, offset: config.offsets[0], stroke: 2.2 },
    { text: date, size: config.date, weight: 700, offset: config.offsets[1], stroke: 2.8 },
    { text: weekday, size: config.weekday, weight: 700, offset: config.offsets[2], stroke: 2.2 }
  ].forEach((line) => {
    ctx.font = `${line.weight} ${line.size}px ${fontFamily}`;
    ctx.lineWidth = line.stroke;
    ctx.strokeText(line.text, centerX, centerY + line.offset);
    ctx.fillText(line.text, centerX, centerY + line.offset);
  });

  ctx.restore();
}

function drawGuestName(ctx, preset, template, guestName) {
  const name = String(guestName || "").trim();
  if (!name || template.guestNameVisible === false) return;

  const minSide = Math.min(preset.width, preset.height);
  const x = (preset.width * Number(template.guestNameX ?? 50)) / 100;
  const y = (preset.height * Number(template.guestNameY ?? 90)) / 100;
  const baseSize = Math.max(18, (minSide * Number(template.guestNameSize ?? 6)) / 100);
  const fontFamily = '"Yu Gothic", "Hiragino Sans", "Noto Sans JP", Arial, sans-serif';
  const lines = name.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, 3);
  const maxWidth = preset.width * 0.72;
  const longestLine = lines.reduce((longest, line) => (line.length > longest.length ? line : longest), lines[0] ?? name);
  let fontSize = baseSize;

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  while (fontSize > 14) {
    ctx.font = `900 ${fontSize}px ${fontFamily}`;
    if (ctx.measureText(longestLine).width <= maxWidth) break;
    fontSize -= 2;
  }

  const lineHeight = fontSize * 1.12;
  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  ctx.shadowColor = "rgba(0, 0, 0, .55)";
  ctx.shadowBlur = Math.round(fontSize * 0.28);
  ctx.strokeStyle = "rgba(42, 31, 19, .72)";
  ctx.lineWidth = Math.max(3, fontSize * 0.12);
  ctx.fillStyle = "#fff3b8";
  lines.forEach((line, index) => {
    const lineY = startY + index * lineHeight;
    ctx.strokeText(line, x, lineY);
    ctx.fillText(line, x, lineY);
  });
  ctx.restore();
}

function drawGuestBadge(ctx, preset, template, hasGuestContent, badgeImage) {
  if (!hasGuestContent || template.guestBadgeVisible === false) return;

  const minSide = Math.min(preset.width, preset.height);
  const diameter = Math.max(42, (minSide * Number(template.guestBadgeSize ?? 10)) / 100);
  const radius = diameter / 2;
  const centerX = (preset.width * Number(template.guestBadgeX ?? 40)) / 100;
  const centerY = (preset.height * Number(template.guestBadgeY ?? 78)) / 100;
  const points = 24;

  if (badgeImage) {
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.drawImage(badgeImage, -diameter / 2, -diameter / 2, diameter, diameter);
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate((-12 * Math.PI) / 180);
  ctx.beginPath();
  for (let index = 0; index < points; index += 1) {
    const angle = (Math.PI * 2 * index) / points - Math.PI / 2;
    const pointRadius = index % 2 === 0 ? radius : radius * 0.74;
    const x = Math.cos(angle) * pointRadius;
    const y = Math.sin(angle) * pointRadius;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.shadowColor = "rgba(0, 0, 0, .32)";
  ctx.shadowBlur = Math.max(5, radius * 0.16);
  ctx.fillStyle = "#ffd829";
  ctx.strokeStyle = "#f3b400";
  ctx.lineWidth = Math.max(3, radius * 0.08);
  ctx.fill();
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#163040";
  ctx.font = `900 ${Math.max(10, radius * 0.42)}px "Arial Black", "Yu Gothic", sans-serif`;
  ctx.fillText("GUEST", 0, -radius * 0.14);
  ctx.fillText("IN!!!", 0, radius * 0.24);
  ctx.restore();
}

async function renderThumbnail({ preset, template, icon, icons = [], date, guestName }) {
  const normalizedTemplate = getNormalizedThumbnailTemplate(preset.key, template);
  const templateSource = getTemplateSource(normalizedTemplate);
  if (!templateSource) throw new Error("template-missing");
  const canvas = document.createElement("canvas");
  canvas.width = preset.width;
  canvas.height = preset.height;
  const ctx = canvas.getContext("2d");
  const guestIcons = normalizeGuestIconList(icon, icons);
  const [baseImage, loadedIcons, badgeImage] = await Promise.all([
    loadCanvasImage(templateSource),
    Promise.all(
      guestIcons.map(async (guestIcon) => ({
        guestIcon,
        image: await loadCanvasImage(guestIcon.dataUrl).catch(() => null)
      }))
    ),
    loadCanvasImage(GUEST_BADGE_ASSET_URL).catch(() => null)
  ]);

  drawCover(ctx, baseImage, preset.width, preset.height);
  drawDateBadge(ctx, preset, date);

  const iconSlots = getThumbnailIconSlots(normalizedTemplate);
  const drawableIcons = loadedIcons.filter(({ image }) => image).slice(0, iconSlots.length);
  drawableIcons.forEach(({ guestIcon, image: iconImage }, index) => {
    const slot = iconSlots[index] ?? iconSlots[0];
    const diameter = Math.round((Math.min(preset.width, preset.height) * Number(slot.size || 28)) / 100);
    const centerX = Math.round((preset.width * Number(slot.x || 50)) / 100);
    const centerY = Math.round((preset.height * Number(slot.y || 50)) / 100);
    const x = centerX - diameter / 2;
    const y = centerY - diameter / 2;

    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, diameter / 2, 0, Math.PI * 2);
    ctx.clip();
    drawCoverAt(ctx, iconImage, x, y, diameter, diameter, guestIcon);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, diameter / 2, 0, Math.PI * 2);
    ctx.lineWidth = Math.max(6, Math.round(diameter * 0.035));
    ctx.strokeStyle = "rgba(255,255,255,.94)";
    ctx.stroke();
    ctx.restore();
  });

  drawGuestBadge(ctx, preset, normalizedTemplate, Boolean(drawableIcons.length || guestName), badgeImage);
  drawGuestName(ctx, preset, normalizedTemplate, guestName);

  return canvas.toDataURL("image/png");
}

async function renderListenerHeadingThumbnail({ track, episode }) {
  const width = 1280;
  const height = 720;
  const iconSrc = makeImagePreviewUrl(track.ownerIconUrl || "");
  const iconImage = iconSrc ? await loadCanvasImage(iconSrc).catch(() => null) : null;

  const draw = (useIcon = true) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#071b2c");
    gradient.addColorStop(0.52, "#0e615f");
    gradient.addColorStop(1, "#22182e");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "rgba(255, 216, 41, .16)";
    for (let i = 0; i < 12; i += 1) {
      const x = 80 + i * 112;
      const y = 90 + ((i * 67) % 460);
      ctx.beginPath();
      ctx.arc(x, y, 34 + (i % 3) * 12, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "rgba(0, 0, 0, .28)";
    ctx.fillRect(0, height - 148, width, 148);

    const iconDiameter = 272;
    const iconX = 126;
    const iconY = 224;
    ctx.save();
    ctx.beginPath();
    ctx.arc(iconX + iconDiameter / 2, iconY + iconDiameter / 2, iconDiameter / 2, 0, Math.PI * 2);
    ctx.clip();
    if (useIcon && iconImage) {
      drawCoverAt(ctx, iconImage, iconX, iconY, iconDiameter, iconDiameter);
    } else {
      const placeholderGradient = ctx.createLinearGradient(iconX, iconY, iconX + iconDiameter, iconY + iconDiameter);
      placeholderGradient.addColorStop(0, "#14b6c8");
      placeholderGradient.addColorStop(1, "#d65285");
      ctx.fillStyle = placeholderGradient;
      ctx.fillRect(iconX, iconY, iconDiameter, iconDiameter);
      ctx.fillStyle = "#fff8df";
      ctx.font = '900 96px "Yu Gothic", "Hiragino Sans", Arial, sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(track.artist || "♪").trim().slice(0, 2), iconX + iconDiameter / 2, iconY + iconDiameter / 2);
    }
    ctx.restore();
    ctx.beginPath();
    ctx.arc(iconX + iconDiameter / 2, iconY + iconDiameter / 2, iconDiameter / 2, 0, Math.PI * 2);
    ctx.lineWidth = 12;
    ctx.strokeStyle = "rgba(255, 255, 255, .92)";
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#ffd829";
    ctx.font = '900 34px "Yu Gothic", "Hiragino Sans", Arial, sans-serif';
    ctx.fillText("Sunoパ！応募曲", 456, 176);

    ctx.fillStyle = "#fff8df";
    ctx.shadowColor = "rgba(0, 0, 0, .52)";
    ctx.shadowBlur = 10;
    const title = String(track.title || "曲名未入力").trim();
    let titleSize = 78;
    while (titleSize > 42) {
      ctx.font = `900 ${titleSize}px "Yu Gothic", "Hiragino Sans", Arial, sans-serif`;
      if (ctx.measureText(title).width <= 720) break;
      titleSize -= 4;
    }
    ctx.fillText(title, 456, 282);

    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255, 255, 255, .88)";
    ctx.font = '800 34px "Yu Gothic", "Hiragino Sans", Arial, sans-serif';
    ctx.fillText(`応募者: ${track.artist || "-"}`, 456, 360);
    if (track.aiArtist) {
      ctx.fillText(`AIアーティスト: ${track.aiArtist}`, 456, 412);
    }
    ctx.fillStyle = "rgba(255, 248, 223, .76)";
    ctx.font = '700 26px "Yu Gothic", "Hiragino Sans", Arial, sans-serif';
    ctx.fillText(`${episode?.date || ""} ${episode?.title || ""}`.trim(), 456, 650);

    return canvas.toDataURL("image/png");
  };

  try {
    return draw(Boolean(iconImage));
  } catch {
    return draw(false);
  }
}

async function saveThumbnailDataUrl(preset, dataUrl, guestName) {
  const fileName = `${guestName || "guest"}-${preset.fileName}`;
  const generatedAt = new Date().toISOString();
  const imageKey = `${preset.key}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  let generatedRecord = {
    imageKey,
    fileName,
    label: preset.label,
    generatedAt
  };
  try {
    await saveGeneratedThumbnailImage(imageKey, dataUrl);
  } catch {
    generatedRecord = { ...generatedRecord, dataUrl };
  }
  return { fileName, generatedRecord };
}

function ThumbnailComposer({ studio, updateStudio, guestName, episodeDate }) {
  const [message, setMessage] = useState("");
  const [layoutPresetName, setLayoutPresetName] = useState("");
  const [generatedImages, setGeneratedImages] = useState({});
  const [templateBaseImages, setTemplateBaseImages] = useState({});
  const [livePreviewImages, setLivePreviewImages] = useState({});
  const [previewImage, setPreviewImage] = useState(null);
  const [collapsedSliderKeys, setCollapsedSliderKeys] = useState({ standfm1x1: true, stream9x16: true });
  const [generatingKey, setGeneratingKey] = useState("");
  const thumbnailDate = studio.date || episodeDate || "";
  const generated = studio.generated ?? {};
  const layoutPresetOverrides = studio.layoutPresetOverrides ?? {};
  const customLayoutPresets = studio.customLayoutPresets ?? [];
  const builtInLayoutPresets = THUMBNAIL_ICON_LAYOUT_PRESETS.map((preset) => ({
    ...preset,
    ...(layoutPresetOverrides[preset.id] ?? {}),
    id: preset.id,
    name: preset.name
  }));
  const layoutPresets = [...builtInLayoutPresets, ...customLayoutPresets];
  const activeLayoutPresetId = studio.activeLayoutPreset || THUMBNAIL_ICON_LAYOUT_PRESETS[0].id;
  const activeLayoutPreset = layoutPresets.find((preset) => preset.id === activeLayoutPresetId) ?? THUMBNAIL_ICON_LAYOUT_PRESETS[0];
  const activeLayoutPresetIsDefault = THUMBNAIL_ICON_LAYOUT_PRESETS.some((preset) => preset.id === activeLayoutPresetId);
  const activeLayoutPresetHasOverride = Boolean(layoutPresetOverrides[activeLayoutPresetId]);
  const guestIcons = normalizeGuestIconList(studio.guestIcon, studio.guestIcons);
  const guestIconPreviewKey = guestIcons.map((icon) => `${icon.name}:${icon.dataUrl.slice(0, 80)}:${icon.cropX}:${icon.cropY}:${icon.cropZoom}`).join("|");
  const getHydratedTemplate = (presetKey) => {
    const template = getNormalizedThumbnailTemplate(presetKey, studio.templates?.[presetKey]);
    if (!isCustomTemplate(template)) return template;
    return {
      ...template,
      dataUrl: template.dataUrl || templateBaseImages[presetKey] || ""
    };
  };
  const cacheHydratedTemplate = (presetKey, template) => {
    if (!isCustomTemplate(template) || !template.dataUrl) return;
    setTemplateBaseImages((current) => {
      if (current[presetKey] === template.dataUrl) return current;
      return { ...current, [presetKey]: template.dataUrl };
    });
  };
  const hydrateTemplateForPreset = async (presetKey) => {
    const template = await resolveThumbnailTemplateForRender(presetKey, getHydratedTemplate(presetKey));
    cacheHydratedTemplate(presetKey, template);
    return template;
  };
  const thumbnailTemplatePreviewKey = useMemo(
    () =>
      JSON.stringify(
        THUMBNAIL_PRESETS.map((preset) => {
          const template = getHydratedTemplate(preset.key);
          return [preset.key, template.source, template.assetUrl, template.baseImageKey, template.dataUrl?.slice(0, 80), template.iconX, template.iconY, template.iconSize, template.iconSlots, template.guestNameVisible, template.guestNameX, template.guestNameY, template.guestNameSize, template.guestBadgeVisible, template.guestBadgeX, template.guestBadgeY, template.guestBadgeSize];
        })
      ),
    [studio.templates, templateBaseImages]
  );

  const removeGeneratedRecords = (records, presetKeys) => {
    const nextGenerated = { ...(records ?? {}) };
    presetKeys.forEach((key) => delete nextGenerated[key]);
    return nextGenerated;
  };

  const forgetGeneratedImages = (presetKeysInput) => {
    const presetKeys = Array.isArray(presetKeysInput) ? presetKeysInput : [presetKeysInput];
    presetKeys.forEach((presetKey) => {
      const saved = generated[presetKey];
      if (saved?.imageKey) {
        deleteGeneratedThumbnailImage(saved.imageKey).catch(() => {
          // Removing the UI reference is enough if IndexedDB cleanup fails.
        });
      }
    });
    setGeneratedImages((current) => {
      const next = { ...current };
      presetKeys.forEach((presetKey) => delete next[presetKey]);
      return next;
    });
    setPreviewImage((current) => (current?.presetKey && presetKeys.includes(current.presetKey) ? null : current));
  };

  const forgetTemplateBaseImages = (presetKeysInput) => {
    const presetKeys = Array.isArray(presetKeysInput) ? presetKeysInput : [presetKeysInput];
    presetKeys.forEach((presetKey) => {
      const savedKey = studio.templates?.[presetKey]?.baseImageKey;
      if (savedKey) {
        deleteGeneratedThumbnailImage(savedKey).catch(() => {
          // The UI reference is removed even if IndexedDB cleanup fails.
        });
      }
    });
    setTemplateBaseImages((current) => {
      const next = { ...current };
      presetKeys.forEach((presetKey) => delete next[presetKey]);
      return next;
    });
  };

  useEffect(() => {
    let active = true;
    Promise.all(
      THUMBNAIL_PRESETS.map(async (preset) => {
        const saved = generated[preset.key];
        if (saved?.dataUrl) return [preset.key, saved.dataUrl];
        if (!saved?.imageKey) return [preset.key, ""];
        try {
          return [preset.key, await loadGeneratedThumbnailImage(saved.imageKey)];
        } catch {
          return [preset.key, ""];
        }
      })
    ).then((entries) => {
      if (!active) return;
      setGeneratedImages(Object.fromEntries(entries.filter(([, dataUrl]) => dataUrl)));
    });
    return () => {
      active = false;
    };
  }, [generated.article16x9?.imageKey, generated.article16x9?.dataUrl, generated.standfm1x1?.imageKey, generated.standfm1x1?.dataUrl, generated.stream9x16?.imageKey, generated.stream9x16?.dataUrl]);

  useEffect(() => {
    let active = true;
    Promise.all(
      THUMBNAIL_PRESETS.map(async (preset) => {
        const template = getNormalizedThumbnailTemplate(preset.key, studio.templates?.[preset.key]);
        if (!isCustomTemplate(template)) return [preset.key, ""];
        if (template.dataUrl) return [preset.key, template.dataUrl];
        if (!template.baseImageKey) return [preset.key, ""];
        try {
          return [preset.key, await loadGeneratedThumbnailImage(template.baseImageKey)];
        } catch {
          return [preset.key, ""];
        }
      })
    ).then((entries) => {
      if (!active) return;
      setTemplateBaseImages(Object.fromEntries(entries.filter(([, dataUrl]) => dataUrl)));
    });
    return () => {
      active = false;
    };
  }, [
    studio.templates?.article16x9?.source,
    studio.templates?.article16x9?.dataUrl,
    studio.templates?.article16x9?.baseImageKey,
    studio.templates?.standfm1x1?.source,
    studio.templates?.standfm1x1?.dataUrl,
    studio.templates?.standfm1x1?.baseImageKey,
    studio.templates?.stream9x16?.source,
    studio.templates?.stream9x16?.dataUrl,
    studio.templates?.stream9x16?.baseImageKey
  ]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      Promise.all(
        THUMBNAIL_PRESETS.map(async (preset) => {
          try {
            const template = await resolveThumbnailTemplateForRender(preset.key, getHydratedTemplate(preset.key));
            const dataUrl = await renderThumbnail({
              preset,
              template,
              icon: studio.guestIcon,
              icons: guestIcons,
              date: thumbnailDate,
              guestName
            });
            return [preset.key, dataUrl, template];
          } catch {
            return [preset.key, "", null];
          }
        })
      ).then((entries) => {
        if (!active) return;
        setTemplateBaseImages((current) => {
          let changed = false;
          const next = { ...current };
          entries.forEach(([presetKey, , template]) => {
            if (isCustomTemplate(template) && template.dataUrl && next[presetKey] !== template.dataUrl) {
              next[presetKey] = template.dataUrl;
              changed = true;
            }
          });
          return changed ? next : current;
        });
        setLivePreviewImages(Object.fromEntries(entries.filter(([, dataUrl]) => dataUrl).map(([presetKey, dataUrl]) => [presetKey, dataUrl])));
      });
    }, 80);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [thumbnailDate, guestName, guestIconPreviewKey, thumbnailTemplatePreviewKey]);

  const handleTemplateFile = async (presetKey, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    const baseImageKey = `base-${presetKey}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    let savedBaseImageKey = "";
    try {
      await saveGeneratedThumbnailImage(baseImageKey, dataUrl);
      savedBaseImageKey = baseImageKey;
    } catch {
      savedBaseImageKey = "";
    }
    forgetTemplateBaseImages(presetKey);
    forgetGeneratedImages(presetKey);
    setTemplateBaseImages((current) => ({ ...current, [presetKey]: dataUrl }));
    updateStudio((current) => ({
      ...defaultThumbnailStudio,
      ...current,
      generated: removeGeneratedRecords(current.generated, [presetKey]),
      templates: {
        ...defaultThumbnailStudio.templates,
        ...current.templates,
        [presetKey]: {
          ...defaultThumbnailStudio.templates[presetKey],
          ...current.templates?.[presetKey],
          name: file.name,
          source: "custom",
          assetUrl: "",
          dataUrl: savedBaseImageKey ? "" : dataUrl,
          baseImageKey: savedBaseImageKey,
          updatedAt: new Date().toISOString()
        }
      }
    }));
    setMessage("ベース画像を変更しました。古い生成画像は解除しました。");
    event.target.value = "";
  };

  const handleIconFile = async (event) => {
    const files = Array.from(event.target.files ?? []).filter(Boolean);
    if (!files.length) return;
    const nextGuestIcons = await Promise.all(
      files.map(async (file, index) => ({
        id: newId("guest_icon"),
        name: file.name || `guest-icon-${index + 1}`,
        dataUrl: await fileToDataUrl(file),
        cropX: 50,
        cropY: 50,
        cropZoom: 100,
        source: "manual",
        updatedAt: new Date().toISOString()
      }))
    );
    const normalizedNextGuestIcons = normalizeGuestIconList(nextGuestIcons[0], nextGuestIcons);
    const presetKeys = THUMBNAIL_PRESETS.map((preset) => preset.key);
    forgetGeneratedImages(presetKeys);
    updateStudio((current) => ({
      ...defaultThumbnailStudio,
      ...current,
      generated: removeGeneratedRecords(current.generated, presetKeys),
      guestIcon: normalizedNextGuestIcons[0] ?? { ...defaultThumbnailStudio.guestIcon },
      guestIcons: normalizedNextGuestIcons
    }));
    setMessage(`ゲストアイコンを${normalizedNextGuestIcons.length}枚に変更しました。古い生成画像は解除しました。`);
    event.target.value = "";
  };

  const clearGuestIcon = () => {
    const presetKeys = THUMBNAIL_PRESETS.map((preset) => preset.key);
    forgetGeneratedImages(presetKeys);
    updateStudio((current) => ({
      ...defaultThumbnailStudio,
      ...current,
      generated: removeGeneratedRecords(current.generated, presetKeys),
      guestIcon: { ...defaultThumbnailStudio.guestIcon },
      guestIcons: []
    }));
    setMessage("ゲストアイコンを解除しました。");
  };

  const patchGuestIconCrop = (index, patch) => {
    const presetKeys = THUMBNAIL_PRESETS.map((preset) => preset.key);
    const nextGuestIcons = guestIcons.map((icon, iconIndex) =>
      iconIndex === index
        ? {
            ...icon,
            ...patch,
            cropX: clampNumber(patch.cropX ?? icon.cropX, icon.cropX ?? 50, 0, 100),
            cropY: clampNumber(patch.cropY ?? icon.cropY, icon.cropY ?? 50, 0, 100),
            cropZoom: clampNumber(patch.cropZoom ?? icon.cropZoom, icon.cropZoom ?? 100, 100, 300)
          }
        : icon
    );
    forgetGeneratedImages(presetKeys);
    updateStudio((current) => ({
      ...defaultThumbnailStudio,
      ...current,
      generated: removeGeneratedRecords(current.generated, presetKeys),
      guestIcon: nextGuestIcons[0] ?? { ...defaultThumbnailStudio.guestIcon },
      guestIcons: nextGuestIcons
    }));
  };

  const patchTemplate = (presetKey, patch) => {
    forgetGeneratedImages(presetKey);
    updateStudio((current) => ({
      ...defaultThumbnailStudio,
      ...current,
      generated: removeGeneratedRecords(current.generated, [presetKey]),
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

  const patchDate = (date) => {
    const presetKeys = THUMBNAIL_PRESETS.map((preset) => preset.key);
    forgetGeneratedImages(presetKeys);
    updateStudio((current) => ({
      ...defaultThumbnailStudio,
      ...current,
      generated: removeGeneratedRecords(current.generated, presetKeys),
      date
    }));
  };

  const applyLayoutPreset = (presetId) => {
    const preset = layoutPresets.find((item) => item.id === presetId) ?? THUMBNAIL_ICON_LAYOUT_PRESETS[0];
    const presetKeys = THUMBNAIL_PRESETS.map((presetItem) => presetItem.key);
    forgetGeneratedImages(presetKeys);
    updateStudio((current) => ({
      ...defaultThumbnailStudio,
      ...current,
      activeLayoutPreset: preset.id,
      generated: removeGeneratedRecords(current.generated, presetKeys),
      templates: applyIconLayoutPresetToTemplates(current.templates, preset)
    }));
    setMessage(`${preset.name} の配置を適用しました。`);
  };

  const makeCurrentLayoutPreset = (id, name) => ({
    id,
    name,
    templates: Object.fromEntries(
      THUMBNAIL_PRESETS.map((presetItem) => {
        const template = getNormalizedThumbnailTemplate(presetItem.key, studio.templates?.[presetItem.key]);
        const iconSlots = getThumbnailIconSlots(template);
        return [
          presetItem.key,
          {
            iconX: Number(iconSlots[0]?.x ?? template.iconX ?? 50),
            iconY: Number(iconSlots[0]?.y ?? template.iconY ?? 50),
            iconSize: Number(iconSlots[0]?.size ?? template.iconSize ?? 28),
            iconSlots,
            guestNameVisible: template.guestNameVisible !== false,
            guestNameX: Number(template.guestNameX ?? 50),
            guestNameY: Number(template.guestNameY ?? 90),
            guestNameSize: Number(template.guestNameSize ?? 6),
            guestBadgeVisible: template.guestBadgeVisible !== false,
            guestBadgeX: Number(template.guestBadgeX ?? 40),
            guestBadgeY: Number(template.guestBadgeY ?? 78),
            guestBadgeSize: Number(template.guestBadgeSize ?? 10)
          }
        ];
      })
    )
  });

  const saveCurrentLayoutPreset = () => {
    const name = layoutPresetName.trim();
    if (!name) {
      setMessage("プリセット名を入力してください。");
      return;
    }
    const preset = makeCurrentLayoutPreset(newId("layout"), name);
    updateStudio((current) => ({
      ...defaultThumbnailStudio,
      ...current,
      activeLayoutPreset: preset.id,
      customLayoutPresets: [...(current.customLayoutPresets ?? []), preset]
    }));
    setLayoutPresetName("");
    setMessage(`${name} を配置プリセットに保存しました。`);
  };

  const overwriteActiveLayoutPreset = () => {
    const preset = makeCurrentLayoutPreset(activeLayoutPreset.id, activeLayoutPreset.name);
    updateStudio((current) => {
      if (activeLayoutPresetIsDefault) {
        return {
          ...defaultThumbnailStudio,
          ...current,
          layoutPresetVersion: THUMBNAIL_LAYOUT_PRESET_VERSION,
          layoutPresetOverrides: {
            ...(current.layoutPresetOverrides ?? {}),
            [preset.id]: preset
          }
        };
      }

      return {
        ...defaultThumbnailStudio,
        ...current,
        customLayoutPresets: (current.customLayoutPresets ?? []).map((item) => (item.id === preset.id ? preset : item))
      };
    });
    setMessage(`${preset.name} を現在の配置で上書きしました。`);
  };

  const deleteActiveLayoutPreset = () => {
    if (activeLayoutPresetIsDefault) {
      if (!activeLayoutPresetHasOverride) {
        setMessage("標準プリセットは削除できません。上書き済みの標準プリセットは標準値に戻せます。");
        return;
      }
      const originalPreset = THUMBNAIL_ICON_LAYOUT_PRESETS.find((preset) => preset.id === activeLayoutPresetId) ?? THUMBNAIL_ICON_LAYOUT_PRESETS[0];
      const presetKeys = THUMBNAIL_PRESETS.map((preset) => preset.key);
      forgetGeneratedImages(presetKeys);
      updateStudio((current) => {
        const nextOverrides = { ...(current.layoutPresetOverrides ?? {}) };
        delete nextOverrides[activeLayoutPresetId];
        return {
          ...defaultThumbnailStudio,
          ...current,
          layoutPresetOverrides: nextOverrides,
          generated: removeGeneratedRecords(current.generated, presetKeys),
          templates: applyIconLayoutPresetToTemplates(current.templates, originalPreset)
        };
      });
      setMessage(`${originalPreset.name} を標準値に戻しました。`);
      return;
    }
    const presetKeys = THUMBNAIL_PRESETS.map((preset) => preset.key);
    forgetGeneratedImages(presetKeys);
    updateStudio((current) => ({
      ...defaultThumbnailStudio,
      ...current,
      activeLayoutPreset: THUMBNAIL_ICON_LAYOUT_PRESETS[0].id,
      generated: removeGeneratedRecords(current.generated, presetKeys),
      templates: applyIconLayoutPresetToTemplates(current.templates, THUMBNAIL_ICON_LAYOUT_PRESETS[0]),
      customLayoutPresets: (current.customLayoutPresets ?? []).filter((preset) => preset.id !== activeLayoutPresetId)
    }));
    setMessage("カスタム配置プリセットを削除しました。");
  };

  const generateOne = async (preset) => {
    setGeneratingKey(preset.key);
    setMessage(`${preset.label} を生成しています。`);
    try {
      const template = await hydrateTemplateForPreset(preset.key);
      const dataUrl = await renderThumbnail({
        preset,
        template,
        icon: studio.guestIcon,
        icons: guestIcons,
        date: thumbnailDate,
        guestName
      });
      const { generatedRecord } = await saveThumbnailDataUrl(preset, dataUrl, guestName);
      setGeneratedImages((current) => ({ ...current, [preset.key]: dataUrl }));
      updateStudio((current) => ({
        ...defaultThumbnailStudio,
        ...current,
        generated: {
          ...(current.generated ?? {}),
          [preset.key]: generatedRecord
        }
      }));
      setMessage(`${preset.label} を生成して保存しました。`);
    } catch {
      setMessage("ベース画像を読み込めませんでした。画像を登録し直してください。");
    } finally {
      setGeneratingKey("");
    }
  };

  const clearGeneratedOne = async (preset) => {
    const saved = generated[preset.key];
    if (saved?.imageKey) {
      try {
        await deleteGeneratedThumbnailImage(saved.imageKey);
      } catch {
        // The UI state below still removes the generated image reference.
      }
    }

    setGeneratedImages((current) => {
      const next = { ...current };
      delete next[preset.key];
      return next;
    });
    updateStudio((current) => {
      const nextGenerated = { ...(current.generated ?? {}) };
      delete nextGenerated[preset.key];
      return { ...defaultThumbnailStudio, ...current, generated: nextGenerated };
    });
    setPreviewImage((current) => (current?.presetKey === preset.key || current?.label === preset.label ? null : current));
    setMessage(`${preset.label} の生成画像を解除しました。`);
  };

  const downloadOne = (preset) => {
    const saved = generated[preset.key];
    const dataUrl = generatedImages[preset.key] || saved?.dataUrl;
    if (!dataUrl) return;
    const anchor = document.createElement("a");
    anchor.href = dataUrl;
    anchor.download = saved.fileName || `${guestName || "guest"}-${preset.fileName}`;
    anchor.click();
  };

  const openLargePreview = (preset, dataUrl, saved) => {
    if (!dataUrl) return;
    setPreviewImage({
      src: dataUrl,
      presetKey: preset.key,
      label: preset.label,
      width: preset.width,
      height: preset.height,
      fileName: saved?.fileName || `${guestName || "guest"}-${preset.fileName}`
    });
  };

  const patchIconSlot = (presetKey, index, patch) => {
    const currentTemplate = getNormalizedThumbnailTemplate(presetKey, studio.templates?.[presetKey]);
    const nextSlots = getThumbnailIconSlots(currentTemplate).map((slot, slotIndex) => (slotIndex === index ? { ...slot, ...patch } : slot));
    patchTemplate(presetKey, {
      iconSlots: nextSlots,
      ...(index === 0
        ? {
            iconX: nextSlots[0].x,
            iconY: nextSlots[0].y,
            iconSize: nextSlots[0].size
          }
        : {})
    });
  };

  const renderPlacementControls = (preset, template, mode = "card") => {
    const iconSlots = getThumbnailIconSlots(template);
    return (
      <div className={`slider-grid ${mode === "modal" ? "modal-slider-grid" : ""}`}>
        {iconSlots.map((slot, index) => (
          <React.Fragment key={`${preset.key}-slot-${index}`}>
            <SliderField label={iconSlots.length > 1 ? `アイコン${index + 1} 横位置` : "アイコン 横位置"} value={slot.x} onChange={(value) => patchIconSlot(preset.key, index, { x: value })} />
            <SliderField label={iconSlots.length > 1 ? `アイコン${index + 1} 縦位置` : "アイコン 縦位置"} value={slot.y} onChange={(value) => patchIconSlot(preset.key, index, { y: value })} />
            <SliderField label={iconSlots.length > 1 ? `アイコン${index + 1} サイズ` : "アイコン サイズ"} value={slot.size} onChange={(value) => patchIconSlot(preset.key, index, { size: value })} min="10" max="60" />
          </React.Fragment>
        ))}
        <label className="inline-check thumbnail-check">
          <input type="checkbox" checked={template.guestNameVisible !== false} onChange={(event) => patchTemplate(preset.key, { guestNameVisible: event.target.checked })} />
          ゲスト名を載せる（{guestName || "名前未設定"}）
        </label>
        <SliderField label="ゲスト名 横位置" value={template.guestNameX} onChange={(value) => patchTemplate(preset.key, { guestNameX: value })} />
        <SliderField label="ゲスト名 縦位置" value={template.guestNameY} onChange={(value) => patchTemplate(preset.key, { guestNameY: value })} />
        <SliderField label="ゲスト名 サイズ" value={template.guestNameSize} onChange={(value) => patchTemplate(preset.key, { guestNameSize: value })} min="2" max="14" />
        <label className="inline-check thumbnail-check">
          <input type="checkbox" checked={template.guestBadgeVisible !== false} onChange={(event) => patchTemplate(preset.key, { guestBadgeVisible: event.target.checked })} />
          GUEST INを載せる
        </label>
        <SliderField label="GUEST IN 横位置" value={template.guestBadgeX} onChange={(value) => patchTemplate(preset.key, { guestBadgeX: value })} />
        <SliderField label="GUEST IN 縦位置" value={template.guestBadgeY} onChange={(value) => patchTemplate(preset.key, { guestBadgeY: value })} />
        <SliderField label="GUEST IN サイズ" value={template.guestBadgeSize} onChange={(value) => patchTemplate(preset.key, { guestBadgeSize: value })} min="4" max="22" />
      </div>
    );
  };

  const togglePlacementControls = (presetKey) => {
    setCollapsedSliderKeys((current) => ({ ...current, [presetKey]: !current[presetKey] }));
  };

  const modalPreset = previewImage ? THUMBNAIL_PRESETS.find((preset) => preset.key === previewImage.presetKey) : null;
  const modalTemplate = modalPreset ? getHydratedTemplate(modalPreset.key) : null;
  const modalImageSrc = modalPreset ? livePreviewImages[modalPreset.key] || previewImage.src : previewImage?.src;

  return (
    <article className="panel thumbnail-studio">
      <div className="record-head">
        <div>
          <h2>サムネ自動合成</h2>
          <p className="muted">登録したベース画像に、日付とゲストアイコンを指定位置で重ねます。</p>
        </div>
        <label className="secondary file-button">
          <Upload size={16} />ゲストアイコン
          <input type="file" accept="image/*" multiple onChange={handleIconFile} />
        </label>
      </div>

      <div className="form-grid thumbnail-date-controls">
        <Field label="サムネ日付" type="date" value={thumbnailDate} onChange={patchDate} />
        <p className="hint-text wide">初期値は選択中の放送日です。日付は各ベース画像上部の二重丸に、添付サンプルと同じ3行形式で入ります。</p>
      </div>

      <div className="thumbnail-layout-controls">
        <SelectField
          label="配置プリセット"
          value={activeLayoutPresetId}
          options={layoutPresets.map((preset) => preset.id)}
          labels={Object.fromEntries(layoutPresets.map((preset) => [preset.id, preset.name]))}
          onChange={applyLayoutPreset}
        />
        <Field label="新規プリセット名" value={layoutPresetName} onChange={setLayoutPresetName} placeholder="例: 2人用" />
        <button className="secondary" onClick={saveCurrentLayoutPreset}><Save size={16} />現在の配置を保存</button>
        <button className="secondary" onClick={overwriteActiveLayoutPreset}>
          <Save size={16} />選択プリセットに上書き
        </button>
        <button className="danger" onClick={deleteActiveLayoutPreset} disabled={activeLayoutPresetIsDefault && !activeLayoutPresetHasOverride}>
          <Trash2 size={16} />{activeLayoutPresetIsDefault ? "標準値に戻す" : "選択プリセット削除"}
        </button>
      </div>

      {guestIcons.length > 0 && (
        <div className="registered-icons-panel">
          <div className="registered-image-row">
            <div className="registered-icon-stack">
              {guestIcons.map((icon, index) => (
                <img
                  src={icon.dataUrl}
                  alt={`登録済みゲストアイコン ${index + 1}`}
                  key={`${icon.name}-${index}`}
                  style={{
                    objectPosition: `${icon.cropX}% ${icon.cropY}%`
                  }}
                />
              ))}
            </div>
            <p className="muted">ゲストアイコン: {guestIcons.map((icon) => icon.name).join(" / ")}</p>
            <button className="secondary" onClick={clearGuestIcon}><X size={16} />アイコン解除</button>
          </div>
          <div className="icon-crop-list">
            {guestIcons.map((icon, index) => (
              <div className="icon-crop-card" key={`${icon.id}-${index}`}>
                <div className="icon-crop-preview">
                  <img
                    src={icon.dataUrl}
                    alt={`切り抜き確認 ${index + 1}`}
                    style={{
                      objectPosition: `${icon.cropX}% ${icon.cropY}%`,
                      transform: `scale(${icon.cropZoom / 100})`,
                      transformOrigin: `${icon.cropX}% ${icon.cropY}%`
                    }}
                  />
                </div>
                <div className="icon-crop-controls">
                  <strong>{index + 1}. {icon.name}</strong>
                  <SliderField label="切り抜き 横位置" value={icon.cropX} onChange={(value) => patchGuestIconCrop(index, { cropX: value })} />
                  <SliderField label="切り抜き 縦位置" value={icon.cropY} onChange={(value) => patchGuestIconCrop(index, { cropY: value })} />
                  <SliderField label="切り抜き 拡大率" value={icon.cropZoom} onChange={(value) => patchGuestIconCrop(index, { cropZoom: value })} min="100" max="300" />
                </div>
              </div>
            ))}
          </div>
          {guestIcons.some((icon) => !String(icon.dataUrl || "").startsWith("data:")) && (
            <p className="hint-text">Driveなど外部URLの画像は、ブラウザ制約でPNG合成に入らない場合があります。その時は「ゲストアイコン」から画像ファイルを登録してください。</p>
          )}
        </div>
      )}
      {message && <p className="hint-text">{message}</p>}

      <div className="thumbnail-grid">
        {THUMBNAIL_PRESETS.map((preset) => {
          const template = getHydratedTemplate(preset.key);
          const templateSource = getTemplateSource(template);
          const isTemplateLoading = isCustomTemplate(template) && !templateSource && Boolean(template.baseImageKey);
          const templateLabel = isCustomTemplate(template) ? template.name : `${preset.baseName}（初期）`;
          const savedGenerated = generated[preset.key];
          const savedGeneratedDataUrl = isTemplateLoading ? "" : generatedImages[preset.key] || savedGenerated?.dataUrl;
          const livePreviewDataUrl = livePreviewImages[preset.key];
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
              <p className="muted">{templateLabel}</p>
              {templateSource ? (
                <div className="registered-template">
                  <span>登録済みベース画像</span>
                  <img className="thumbnail-preview" src={templateSource} alt={`${preset.label} base`} />
                </div>
              ) : isTemplateLoading ? (
                <div className="empty-preview">保存済みベース画像を読み込み中です</div>
              ) : (
                <div className="empty-preview">ベース画像を登録するとここに表示されます</div>
              )}
              {livePreviewDataUrl && (
                <div className="registered-template live-thumbnail-preview">
                  <span>調整中プレビュー</span>
                  <img className="thumbnail-preview" src={livePreviewDataUrl} alt={`${preset.label} live preview`} />
                </div>
              )}
              <button className="secondary slider-toggle" onClick={() => togglePlacementControls(preset.key)}>
                {collapsedSliderKeys[preset.key] ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                配置スライダーを{collapsedSliderKeys[preset.key] ? "開く" : "閉じる"}
              </button>
              {!collapsedSliderKeys[preset.key] && renderPlacementControls(preset, template)}
              <div className="button-row">
                <button className="primary" onClick={() => generateOne(preset)} disabled={generatingKey === preset.key}>
                  {generatingKey === preset.key ? "生成中" : "生成"}
                </button>
                <button className="secondary" onClick={() => downloadOne(preset)} disabled={!savedGeneratedDataUrl}>PNG保存</button>
                <button className="secondary" onClick={() => openLargePreview(preset, livePreviewDataUrl || savedGeneratedDataUrl, savedGenerated)} disabled={!livePreviewDataUrl && !savedGeneratedDataUrl}>
                  <ZoomIn size={16} />大きく確認
                </button>
                <button className="secondary" onClick={() => clearGeneratedOne(preset)} disabled={!savedGenerated}>
                  <X size={16} />生成画像解除
                </button>
              </div>
              {savedGeneratedDataUrl && (
                <div className="registered-template">
                  <span>保存済み合成プレビュー</span>
                  <img className="thumbnail-preview" src={savedGeneratedDataUrl} alt={`${preset.label} preview`} />
                </div>
              )}
            </section>
          );
        })}
      </div>
      {previewImage && (
        <div className="image-modal" role="dialog" aria-modal="true" aria-label="生成画像の確認" onClick={() => setPreviewImage(null)}>
          <div className="image-modal-panel" onClick={(event) => event.stopPropagation()}>
            <div className="image-modal-head">
              <div>
                <strong>{previewImage.label}</strong>
                <span>{previewImage.width} x {previewImage.height} / {previewImage.fileName}</span>
              </div>
              <button className="icon-danger" onClick={() => setPreviewImage(null)} aria-label="閉じる"><X size={18} /></button>
            </div>
            <div className="image-modal-body">
              <img src={modalImageSrc} alt={`${previewImage.label} large preview`} />
              {modalPreset && modalTemplate && (
                <div className="image-modal-controls">
                  <strong>大きく見ながら調整</strong>
                  {renderPlacementControls(modalPreset, modalTemplate, "modal")}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

function Assets({ thumbnailStudio, updateThumbnailStudio, guestName, episodeDate }) {
  return (
    <div className="view-stack">
      <SectionTitle title="サムネ/素材管理" subtitle="記事16:9、stand.fm 1:1、配信背景9:16を放送回に紐づけて作成します。" />
      <ThumbnailComposer studio={thumbnailStudio} updateStudio={updateThumbnailStudio} guestName={guestName} episodeDate={episodeDate} />
    </div>
  );
}

function SocialPromo({ selectedEpisode, promo, updatePromo, updateTalkTheme = () => {} }) {
  const [copiedTarget, setCopiedTarget] = useState("");
  const guestName = promo.guestName || selectedEpisode?.guestName || "";
  const guestXHandle = promo.guestXHandle || "";
  const talkTheme = promo.talkTheme || "";
  const context = {
    guestName,
    guestXHandle,
    talkTheme,
    date: selectedEpisode?.date || ""
  };

  const copyText = async (target, text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // The text remains visible in the textarea when clipboard access is blocked.
    }
    setCopiedTarget(target);
    window.setTimeout(() => setCopiedTarget(""), 1600);
  };

  const generatePost = () => {
    updatePromo({ postText: buildSocialPostText(context) });
  };

  const generateComicTemplate = () => {
    const comicTemplate = buildComicTemplateText(context);
    updatePromo({
      comicTemplate,
      comicPrompt: buildComicPromptText({ ...context, comicTemplate })
    });
  };

  const generateComicPrompt = () => {
    const comicTemplate = sanitizeSnsComicTemplateText(promo.comicTemplate || buildComicTemplateText(context));
    updatePromo({
      comicTemplate,
      comicPrompt: buildComicPromptText({ ...context, comicTemplate })
    });
  };

  const generateAll = () => {
    const postText = buildSocialPostText(context);
    const comicTemplate = buildComicTemplateText(context);
    const comicPrompt = buildComicPromptText({ ...context, comicTemplate });
    updatePromo({ postText, comicTemplate, comicPrompt });
  };

  const handleComicImageFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    updatePromo({
      comicImage: {
        name: file.name,
        dataUrl: await fileToDataUrl(file),
        savedAt: new Date().toISOString()
      }
    });
    event.target.value = "";
  };

  const clearComicImage = () => {
    updatePromo({ comicImage: { ...defaultSocialPromo.comicImage } });
  };

  const downloadComicImage = () => {
    if (!promo.comicImage?.dataUrl) return;
    const anchor = document.createElement("a");
    anchor.href = promo.comicImage.dataUrl;
    anchor.download = promo.comicImage.name || `${guestName || "sunopa"}-sns-comic.png`;
    anchor.click();
  };

  return (
    <div className="view-stack">
      <SectionTitle title="SNS告知/4コマ漫画" subtitle="ゲスト告知文、ChatGPT用4コマ漫画テンプレ、生成した漫画画像を放送回ごとに保存します。" />
      <article className="panel social-promo-panel">
        <div className="form-grid">
          <Field label="ゲスト名" value={guestName} onChange={(value) => updatePromo({ guestName: value })} />
          <Field label="Xアカウント" value={formatXHandle(guestXHandle)} onChange={(value) => updatePromo({ guestXHandle: normalizeXHandle(value) })} placeholder="@account" />
          <Field label="配信日" value={selectedEpisode?.date || ""} readOnly />
          <TextArea label="トークテーマ" value={talkTheme} onChange={updateTalkTheme} />
        </div>
        <div className="button-row">
          <button className="primary" onClick={generateAll}><Share2 size={16} />告知素材をまとめて生成</button>
          <button className="secondary" onClick={generatePost}>告知文生成</button>
          <button className="secondary" onClick={generateComicTemplate}>4コマテンプレ生成</button>
          <button className="secondary" onClick={generateComicPrompt}>ChatGPT用依頼生成</button>
        </div>
      </article>

      <article className="panel">
        <div className="record-head">
          <div>
            <h2>SNS投稿文</h2>
            <p className="muted">X/Threadsなどに投稿する告知文です。必要に応じて手直しして使えます。</p>
          </div>
          <button className="secondary" onClick={() => copyText("post", promo.postText)} disabled={!promo.postText}>
            <ClipboardCopy size={16} />{copiedTarget === "post" ? "コピー済み" : "コピー"}
          </button>
        </div>
        <textarea className="pack-output social-output" value={promo.postText} onChange={(event) => updatePromo({ postText: event.target.value })} />
      </article>

      <article className="panel">
        <div className="record-head">
          <div>
            <h2>4コマ漫画テンプレ</h2>
            <p className="muted">このテンプレを元に、ChatGPTで漫画画像を作るための設計メモです。</p>
          </div>
          <button className="secondary" onClick={() => copyText("comicTemplate", promo.comicTemplate)} disabled={!promo.comicTemplate}>
            <ClipboardCopy size={16} />{copiedTarget === "comicTemplate" ? "コピー済み" : "コピー"}
          </button>
        </div>
        <textarea className="pack-output social-output tall" value={promo.comicTemplate} onChange={(event) => updatePromo({ comicTemplate: event.target.value })} />
      </article>

      <article className="panel">
        <div className="record-head">
          <div>
            <h2>ChatGPT用漫画生成依頼</h2>
            <p className="muted">ChatGPTに貼る用です。漫画画像を生成したら下の保存欄に登録できます。</p>
          </div>
          <button className="secondary" onClick={() => copyText("comicPrompt", promo.comicPrompt)} disabled={!promo.comicPrompt}>
            <ClipboardCopy size={16} />{copiedTarget === "comicPrompt" ? "コピー済み" : "コピー"}
          </button>
        </div>
        <textarea className="pack-output social-output tall" value={promo.comicPrompt} onChange={(event) => updatePromo({ comicPrompt: event.target.value })} />
      </article>

      <article className="panel">
        <div className="record-head">
          <div>
            <h2>漫画画像保存</h2>
            <p className="muted">ChatGPTで生成した4コマ漫画画像をここに保存して、放送回と一緒に管理します。</p>
          </div>
          <label className="secondary file-button">
            <Upload size={16} />漫画画像を保存
            <input type="file" accept="image/*" onChange={handleComicImageFile} />
          </label>
        </div>
        {promo.comicImage?.dataUrl ? (
          <div className="comic-image-preview">
            <img src={promo.comicImage.dataUrl} alt="保存済みSNS告知漫画" />
            <div className="button-row">
              <button className="secondary" onClick={downloadComicImage}>PNG保存</button>
              <button className="secondary" onClick={clearComicImage}><X size={16} />画像解除</button>
            </div>
            <p className="muted">{promo.comicImage.name}</p>
          </div>
        ) : (
          <div className="empty-preview">ChatGPTで生成した漫画画像を保存するとここに表示されます</div>
        )}
      </article>
    </div>
  );
}

function CodexPack({
  codexPack,
  copyPack,
  copied,
  selectedEpisode,
  copyThumbnailBundle,
  thumbnailBundleCopied,
  copyFullPackWithThumbnails,
  fullPackCopied,
  articleThumbnailCount,
  listenerHeadingThumbnailCount,
  thumbnailTransferText
}) {
  const imageBundleCount = articleThumbnailCount + listenerHeadingThumbnailCount;
  return (
    <div className="view-stack">
      <SectionTitle title="Codex記事作成パック" subtitle="ここをコピーしてCodexへ渡せば、記事化に必要な情報がまとまります。" action={<button className="primary" onClick={copyPack}><ClipboardCopy size={16} />{copied ? "コピー済み" : "コピー"}</button>} />
      <article className="panel">
        <h2>{selectedEpisode?.title || "放送回未選択"}</h2>
        <div className="button-row">
          <button className="primary" onClick={copyFullPackWithThumbnails} disabled={!imageBundleCount}>
            <ClipboardCopy size={16} />{fullPackCopied ? "画像込みコピー済み" : "本文+記事画像データをコピー"}
          </button>
          <button className="secondary" onClick={copyThumbnailBundle} disabled={!imageBundleCount}>
            <ClipboardCopy size={16} />{thumbnailBundleCopied ? "記事画像JSONコピー済み" : "記事画像JSONをコピー"}
          </button>
        </div>
        <p className="hint-text">Codexへ送る画像: 記事アイキャッチ16:9 {articleThumbnailCount}件 / 応募曲見出し下PNG {listenerHeadingThumbnailCount}件。stand.fm 1:1 と配信背景9:16は記事作成パックには含めません。</p>
        {thumbnailTransferText && (
          <textarea className="pack-output thumbnail-transfer-output" value={thumbnailTransferText} readOnly />
        )}
        <textarea className="pack-output" value={codexPack} readOnly />
      </article>
    </div>
  );
}

function SettingsPanel({ settings, updateSettings, exportJson, importJson, resetSample, copyTransferLink, transferCopied, setActive }) {
  const [folderMessage, setFolderMessage] = useState("");
  const additionalXAccounts = Array.isArray(settings.additionalXAccounts) ? settings.additionalXAccounts : [];

  const chooseFolder = async () => {
    if (!window.showDirectoryPicker) {
      setFolderMessage("このブラウザではフォルダー選択に未対応です。既定パスボタンを使うか、パス欄に貼り付けてください。");
      return;
    }
    try {
      const handle = await window.showDirectoryPicker();
      updateSettings({ obsidianFolderName: handle.name });
      setFolderMessage(`${handle.name} を選択しました。ブラウザの仕様で絶対パスは取得できないため、Codex用のパス欄は必要に応じて確認してください。`);
    } catch {
      setFolderMessage("フォルダー選択をキャンセルしました。");
    }
  };

  const updateAdditionalXAccount = (index, patch) => {
    const accounts = additionalXAccounts.map((account, accountIndex) => ({
      id: account.id || `x_extra_${accountIndex}`,
      label: account.label || account.name || "追加アカウント",
      handle: account.handle || account.xHandle || ""
    }));
    const next = accounts.map((account, accountIndex) =>
      accountIndex === index ? { ...account, ...patch, handle: normalizeXHandle(patch.handle ?? account.handle) } : account
    );
    updateSettings({ additionalXAccounts: next });
  };

  const addAdditionalXAccount = () => {
    const accounts = additionalXAccounts.map((account, index) => ({
      id: account.id || `x_extra_${index}`,
      label: account.label || account.name || "追加アカウント",
      handle: account.handle || account.xHandle || ""
    }));
    updateSettings({
      additionalXAccounts: [
        ...accounts,
        { id: newId("x"), label: "追加アカウント", handle: "" }
      ]
    });
  };

  const removeAdditionalXAccount = (index) => {
    updateSettings({ additionalXAccounts: additionalXAccounts.filter((_, accountIndex) => accountIndex !== index) });
  };

  return (
    <div className="view-stack">
      <SectionTitle title="設定/バックアップ" subtitle="ブラウザ内保存のエクスポート、インポート、主要パスを管理します。" />
      <article className="panel sync-panel">
        <div className="sync-heading">
          <Database size={20} />
          <div>
            <h3>アプリ化とデータ同期</h3>
            <p>
              スマホではホーム画面に追加、PCではブラウザのインストールからアプリ風に起動できます。
              現在の制作データはこの端末のブラウザ内に保存されるため、スマホとPCの自動連動にはGoogle Drive、Firebase、Supabaseなどのクラウド保存機能が別途必要です。
            </p>
          </div>
        </div>
        <div className="sync-status-grid">
          <div>
            <b>今すぐ可能</b>
            <span>ホーム画面追加、オフライン起動補助、JSON書き出し/読み込みでの引き継ぎ</span>
          </div>
          <div>
            <b>次フェーズ</b>
            <span>ログイン、クラウド保存、スマホ/PC間の自動同期、共同編集</span>
          </div>
        </div>
      </article>
      <article className="panel">
        <div className="record-head">
          <div>
            <h2>詳細設定</h2>
            <p className="muted">フォーム作成・回答管理・応募期間管理は、今は通常運用では使わない旧/将来用の機能としてここに退避しています。</p>
          </div>
        </div>
        <div className="advanced-actions">
          <button className="secondary" onClick={() => setActive("forms")}><FileText size={16} />フォーム管理</button>
          <button className="secondary" onClick={() => setActive("responses")}><ClipboardCopy size={16} />回答管理</button>
          <button className="secondary" onClick={() => setActive("periods")}><CalendarDays size={16} />応募期間管理</button>
        </div>
      </article>
      <article className="panel">
        <div className="form-grid">
          <Field label="Obsidian格納庫パス" value={settings.obsidianPath} onChange={(value) => updateSettings({ obsidianPath: value })} />
          <p className="hint-text wide">ここはCodexが記事作成マニュアルやバックアップを読む場所です。オンラインフォームの回答保存先ではありません。</p>
          <Field label="選択したフォルダー名" value={settings.obsidianFolderName || ""} readOnly />
          <Field label="WordPressサイト" value={settings.wordpressSite} onChange={(value) => updateSettings({ wordpressSite: value })} />
          <Field label="SE_Pon URL" value={settings.sePonUrl} onChange={(value) => updateSettings({ sePonUrl: value })} />
          <Field label="回答保存Webhook URL" value={settings.responseEndpointUrl || ""} onChange={(value) => updateSettings({ responseEndpointUrl: value })} placeholder="Google Apps ScriptなどのWebアプリURL" wide />
          <Field label="回答保存先Google DriveフォルダーURL（控え）" value={settings.responseDriveFolderUrl || ""} onChange={(value) => updateSettings({ responseDriveFolderUrl: value })} placeholder="DriveフォルダーのURL" wide />
          <TextArea label="音源保存先メモ" value={settings.audioSaveMemo || ""} onChange={(value) => updateSettings({ audioSaveMemo: value })} />
          <Field label="べるぼ☂ Xアカウント" value={settings.bellboXHandle || ""} onChange={(value) => updateSettings({ bellboXHandle: normalizeXHandle(value) })} />
          <Field label="かなめ🦐 Xアカウント" value={settings.kanameXHandle || ""} onChange={(value) => updateSettings({ kanameXHandle: normalizeXHandle(value) })} />
          <TextArea label="X連絡ブロック説明文" value={settings.xContactMessage || DEFAULT_X_CONTACT_MESSAGE} onChange={(value) => updateSettings({ xContactMessage: value })} />
        </div>
        <div className="settings-subpanel">
          <div className="record-head">
            <div>
              <strong>追加Xアカウント</strong>
              <p className="muted">フォームの連絡ブロックに、フォローリンクと確認チェックとして追加されます。</p>
            </div>
            <button className="secondary" onClick={addAdditionalXAccount}><Plus size={16} />追加</button>
          </div>
          {additionalXAccounts.length === 0 ? (
            <p className="hint-text">追加アカウントは未設定です。</p>
          ) : (
            <div className="x-account-list">
              {additionalXAccounts.map((account, index) => (
                <div className="x-account-row" key={account.id || index}>
                  <Field label="表示名" value={account.label || ""} onChange={(value) => updateAdditionalXAccount(index, { label: value })} />
                  <Field label="Xアカウント" value={account.handle || ""} onChange={(value) => updateAdditionalXAccount(index, { handle: value })} />
                  <button className="icon-danger" onClick={() => removeAdditionalXAccount(index)} aria-label="追加Xアカウントを削除"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="button-row">
          <button className="secondary" onClick={() => updateSettings({ obsidianPath: DEFAULT_OBSIDIAN_PATH, obsidianFolderName: "Sunoパ！記事" })}>
            <Save size={16} />既定のSunoパ！記事フォルダー
          </button>
          <button className="secondary" onClick={chooseFolder}>
            <FolderOpen size={16} />フォルダーを選ぶ
          </button>
        </div>
        {folderMessage && <p className="hint-text">{folderMessage}</p>}
        <div className="button-row">
          <button className="secondary" onClick={copyTransferLink}><ClipboardCopy size={16} />{transferCopied ? "コピー済み" : "引き継ぎリンクをコピー"}</button>
          <button className="secondary" onClick={exportJson}><Download size={16} />JSONを書き出し</button>
          <label className="secondary file-button">
            <Upload size={16} />JSONを読み込み
            <input type="file" accept="application/json" onChange={importJson} />
          </label>
          <button className="danger" onClick={resetSample}><Trash2 size={16} />サンプルに戻す</button>
        </div>
        <p className="hint-text">スマホへ一度だけ移す場合は、PCで引き継ぎリンクをコピーしてスマホで開きます。画像や音源を多く含む場合はJSON書き出し/読み込みを使ってください。</p>
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

function Field({ label, value, onChange = () => {}, type = "text", placeholder = "", readOnly = false, wide = false }) {
  const handleInput = (event) => onChange(event.target.value);
  return (
    <label className={wide ? "field wide" : "field"}>
      <span>{label}</span>
      <input
        type={type}
        value={value ?? ""}
        placeholder={placeholder}
        readOnly={readOnly}
        onChange={handleInput}
        onInput={handleInput}
      />
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
