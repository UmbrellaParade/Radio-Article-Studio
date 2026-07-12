import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import LZString from "lz-string";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
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
  RotateCcw,
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
import { postToGasEndpoint, getFromGasEndpoint, loadAppConfig } from "./lib/gas.js";

import {
  STORAGE_KEY,
  STORAGE_COMPRESSED_PREFIX,
  THUMBNAIL_IMAGE_DB_NAME,
  THUMBNAIL_IMAGE_STORE,
  SHARED_FORMS_DIR,
  DEFAULT_OBSIDIAN_PATH,
  DEFAULT_BELLBO_X_HANDLE,
  DEFAULT_KANAME_X_HANDLE,
  DEFAULT_X_CONTACT_MESSAGE,
  DEFAULT_RESPONSE_ENDPOINT_URL,
  DEFAULT_RESPONSE_DRIVE_FOLDER_URL,
  DEFAULT_ATTACHMENT_LIMIT_MB,
  MAX_ATTACHMENT_LIMIT_MB,
  DEFAULT_THUMBNAIL_DRIVE_ENDPOINT_URL,
  DEFAULT_THUMBNAIL_DRIVE_FOLDER_URL,
  DEFAULT_AUDIO_SAVE_MEMO,
  publicAsset,
  GUEST_BADGE_ASSET_URL,
  openThumbnailImageDb,
  saveGeneratedThumbnailImage,
  deleteGeneratedThumbnailImage,
  loadGeneratedThumbnailImage,
  QUESTION_USE_OPTIONS,
  QUESTION_USE_LABELS,
  QUESTION_KIND_OPTIONS,
  TRACK_FIELD_TYPE_OPTIONS,
  FORM_COLOR_PALETTE,
  normalizeFormColor,
  normalizeTrackFields,
  normalizeAttachmentLimitMb,
  TRACK_URL_ERROR_MESSAGE,
  TRACK_URL_PATTERN,
  detectUrlType,
  AUDIO_FILE_ACCEPT,
  IMAGE_FILE_ACCEPT,
  isAudioUpload,
  isImageUpload,
  isAudioAttachment,
  isImageAttachment,
  isGuestIconAttachment,
  findGuestIconAttachment,
  makeGuestIconFromAttachment,
  mergeGuestIcons,
  normalizeXHandle,
  makeXUrl,
  formatXHandle,
  extractXHandleFromText,
  formatJapaneseDate,
  normalizeAdditionalXAccounts,
  getContactAccountList,
  isWebUrl,
  getGoogleDriveFileId,
  makeDirectAudioDownloadUrl,
  makeImagePreviewUrl,
  getGoogleDriveImageUrls,
  makeCanvasImageProxyUrl,
  getCanvasImageSourceCandidates,
  sanitizeDownloadName,
  getUrlFileExtension,
  makeTrackAudioDownloadName,
  downloadTrackAudioFromUrl,
  isSupportedTrackUrl,
  makePlayableEmbedUrl,
  isSunoShortUrl,
  formatAnswerValue,
  THUMBNAIL_PRESETS,
  ARTICLE_THUMBNAIL_KEY,
  CODEX_THUMBNAIL_PRESETS,
  IMPORT_PREVIEW_FIELDS,
  IMPORT_KIND_LABELS,
  getImportPreviewKey,
  getImportCanonicalColumn,
  applyColumnMappingToRows,
  THUMBNAIL_ICON_LAYOUT_PRESETS,
  THUMBNAIL_LAYOUT_PRESET_VERSION,
  getIconLayoutPresetTemplates,
  applyIconLayoutPresetToTemplates,
  defaultThumbnailStudio,
  clampNumber,
  normalizeGuestIconList,
  getThumbnailIconSlots,
  countGuestsFromText,
  getLayoutPresetForGuestCount,
  defaultImports,
  defaultSocialPromo,
  getShortTheme,
  buildSocialPostText,
  buildComicTemplateText,
  sanitizeSnsComicTemplateText,
  buildComicPromptText,
  newId,
  WEEKDAY_LABELS,
  WEEKDAY_SHORT_LABELS,
  getBroadcastSlot,
  formatLocalDate,
  formatThumbnailDateLines,
  ensureGuestHonorific,
  makeGuestEpisodeTitle,
  slugify,
  extractSlugFromUrl,
  buildArticleUrl,
  normalizeKey,
  compactLines,
  isExcludedImportLabel,
  pick,
  pickByLabelPattern,
  pickImportValue,
  isImportMetadataColumn,
  meaningfulRowEntries,
  formatRemainingAnswers,
  summarizeImportColumns,
  makeUniqueHeaders,
  parseCsv,
  GOOGLE_SHEETS_JSONP_TIMEOUT_MS,
  getUrlParam,
  makeGoogleSheetExportUrl,
  makeGoogleSheetPublishedCsvUrl,
  makeGoogleSheetJsonpUrl,
  gvizCellToText,
  gvizResponseToRows,
  fetchGoogleSheetRowsWithJsonp,
  getCsvImportTarget,
  toGoogleCsvUrl,
  looksLikeHtml,
  makeImportFailureMessage,
  makeEmbedUrl,
  cleanFetchedTrackTitle,
  fetchTrackTitleFromUrl,
  nextSlotNo,
  appendTrack,
  normalizeTrackUrlKey,
  makeTrackImportKey,
  upsertImportedTrack,
  getDefaultOwnerHonorific,
  buildResponseFromRow,
  hasOwn,
  pickOverride,
  TRACK_COLUMN_PATTERNS,
  getTrackColumnField,
  getTrackColumnGroup,
  collectTrackFieldGroups,
  buildTrackFromRow,
  buildTracksFromRow,
  getPreviewTrackSource,
  pickPreviewOwnerName,
  shortenPreviewValue,
  buildImportPreviewRows,
  importRowsIntoData,
  buildTracksFromRawAnswers,
  encodeSharePayload,
  decodeSharePayload,
  encodeCompressedSharePayload,
  decodeCompressedSharePayload,
  encodeStoredData,
  decodeStoredData,
  saveStoredData,
  normalizeShareSlug,
  getFormPublishedSlug,
  getPeriodPublishedSlug,
  getPublishedSharePayloadUrl,
  makePublishedShareUrl,
  makeShortUrlActivationRequest,
  downloadTextFile,
  downloadDataUrlFile,
  saveDataUrlWithPicker,
  writeDataUrlToDirectory,
  getRawStoredDataForShare,
  resolveFormReferencePayload,
  resolvePeriodReferencePayload,
  readSharedFormPayload,
  isValidSharePayload,
  loadPublishedSharePayload,
  publishSharePayloadToGas,
  readRestorePayload,
  makeSharePayload,
  makeShareUrl,
  makePortableShareUrl,
  makeLegacyShareUrl,
  makeRestoreUrl,
  downloadPublishedShareJson,
  formatDateRange,
  sampleData,
  migrateData,
  loadData
} from "./lib/core.js";
import {
  fileToDataUrl,
  assertCanvasImageReadable,
  loadCanvasImageSource,
  loadCanvasImage,
  drawCoverAt,
  drawCover,
  isCustomTemplate,
  getTemplateSource,
  getNormalizedThumbnailTemplate,
  resolveThumbnailTemplateForRender,
  drawDateBadge,
  drawGuestName,
  drawGuestBadge,
  renderThumbnail,
  renderListenerHeadingThumbnail,
  saveThumbnailDataUrl
} from "./lib/thumbnail.js";
import {
  Header,
  StatusLine,
  SectionTitle,
  Field,
  TextArea,
  SliderField,
  SelectField
} from "./components/ui.jsx";
import {
  PublicSubmissionForm,
  TrackPreview
} from "./components/PublicSubmissionForm.jsx";
import {
  GuestIconCropPreview,
  ThumbnailComposer,
  Assets
} from "./components/thumbnail.jsx";

const moveArrayItem = (items = [], fromIndex, toIndex) => {
  if (fromIndex < 0 || toIndex < 0 || fromIndex >= items.length || toIndex >= items.length || fromIndex === toIndex) return items;
  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
};

const TRACK_FIELD_TYPE_LABELS = Object.fromEntries(TRACK_FIELD_TYPE_OPTIONS);

const MAIN_NAV_ITEMS = [
  ["dashboard", "ダッシュボード", Radio],
  ["imports", "取り込み", Upload],
  ["episodes", "放送回", CalendarDays],
  ["forms", "フォーム", Send],
  ["responses", "回答", ClipboardCopy],
  ["tracks", "楽曲", Music],
  ["assets", "素材", Image],
  ["social", "SNS告知", Share2],
  ["pack", "Codexパック", FileText],
  ["settings", "設定", Settings]
];

const MAIN_NAV_KEYS = new Set(MAIN_NAV_ITEMS.map(([key]) => key));
const UI_STATE_KEY = `${STORAGE_KEY}:ui`;
const formAnchorId = (formId) => `form-section-${formId}`;

const getTrackFieldDefaults = (settings = {}) => normalizeTrackFields(settings.trackFieldDefaults);

const hexToRgba = (hex, alpha) => {
  const color = normalizeFormColor(hex).slice(1);
  const red = parseInt(color.slice(0, 2), 16);
  const green = parseInt(color.slice(2, 4), 16);
  const blue = parseInt(color.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

const getFormColorStyle = (color) => {
  const normalized = normalizeFormColor(color);
  return {
    "--form-color": normalized,
    "--form-color-soft": hexToRgba(normalized, 0.14),
    "--form-color-mid": hexToRgba(normalized, 0.32)
  };
};

const cloneFormQuestion = (question) => ({
  ...question,
  id: newId("q"),
  help: question.help || "",
  trackFields: question.kind === "track" ? normalizeTrackFields(question.trackFields) : question.trackFields
});

const makeFormSnapshot = (form) => ({
  name: form.name || "フォームプリセット",
  type: form.type || "自由フォーム",
  status: form.status || "準備中",
  description: form.description || "",
  receptionStartDate: form.receptionStartDate || "",
  receptionEndDate: form.receptionEndDate || "",
  submissionLimit: form.submissionLimit || "",
  attachmentLimitMb: normalizeAttachmentLimitMb(form.attachmentLimitMb),
  color: normalizeFormColor(form.color),
  questions: (form.questions || []).map((question) => ({
    ...question,
    help: question.help || "",
    trackFields: question.kind === "track" ? normalizeTrackFields(question.trackFields) : question.trackFields
  }))
});

const makeFormFromPreset = (presetForm, index = 0) => {
  const source = makeFormSnapshot(presetForm || {});
  return {
    ...source,
    id: newId("form"),
    name: `${source.name} コピー`,
    shareSlug: "",
    color: normalizeFormColor(source.color, FORM_COLOR_PALETTE[index % FORM_COLOR_PALETTE.length]),
    questions: source.questions.map(cloneFormQuestion)
  };
};

const makeFormPreset = (form, name = "") => ({
  id: newId("preset"),
  name: name || form.name || "フォームプリセット",
  createdAt: new Date().toISOString(),
  form: makeFormSnapshot(form)
});

function readUiState() {
  try {
    const raw = localStorage.getItem(UI_STATE_KEY);
    if (!raw) return { active: "", selectedEpisodeId: "", collapsibles: {} };
    const parsed = JSON.parse(raw);
    const collapsibles =
      parsed?.collapsibles && typeof parsed.collapsibles === "object" && !Array.isArray(parsed.collapsibles)
        ? parsed.collapsibles
        : {};
    return {
      active: typeof parsed?.active === "string" ? parsed.active : "",
      selectedEpisodeId: typeof parsed?.selectedEpisodeId === "string" ? parsed.selectedEpisodeId : "",
      collapsibles
    };
  } catch {
    return { active: "", selectedEpisodeId: "", collapsibles: {} };
  }
}

function saveUiState(payload) {
  try {
    localStorage.setItem(UI_STATE_KEY, JSON.stringify(payload));
  } catch {
    // UI state is helpful, but losing it should not block the main app data.
  }
}

const sanitizeLimitInput = (value) => {
  const text = String(value || "").trim();
  if (!text) return "";
  const limit = Math.floor(Number(text));
  return Number.isFinite(limit) && limit > 0 ? String(limit) : "";
};

const sanitizeAttachmentLimitInput = (value) => {
  const text = String(value || "").trim();
  if (!text) return "";
  return String(normalizeAttachmentLimitMb(text));
};

function App() {
  const logoSrc = `${import.meta.env.BASE_URL}assets/umbrella-parade-logo.png`;
  const [data, setData] = useState(loadData);
  const [initialUiState] = useState(readUiState);
  const [active, setActive] = useState(() => (MAIN_NAV_KEYS.has(initialUiState.active) ? initialUiState.active : "dashboard"));
  const [selectedEpisodeId, setSelectedEpisodeId] = useState(() =>
    data.episodes.some((episode) => episode.id === initialUiState.selectedEpisodeId)
      ? initialUiState.selectedEpisodeId
      : data.episodes[0]?.id ?? ""
  );
  const [collapsibleState, setCollapsibleState] = useState(() => initialUiState.collapsibles);
  const [copied, setCopied] = useState(false);
  const [thumbnailBundleCopied, setThumbnailBundleCopied] = useState(false);
  const [fullPackCopied, setFullPackCopied] = useState(false);
  const [thumbnailTransferText, setThumbnailTransferText] = useState("");
  const [transferCopied, setTransferCopied] = useState(false);
  const [sharedPayload, setSharedPayload] = useState(readSharedFormPayload);
  const [restorePayload, setRestorePayload] = useState(readRestorePayload);
  const [importingSource, setImportingSource] = useState("");
  const [importPreviews, setImportPreviews] = useState({});
  const [storageWarning, setStorageWarning] = useState("");
  const [syncState, setSyncState] = useState({ busy: false, message: "" });
  const [packExportMessage, setPackExportMessage] = useState("");
  const autoThumbnailGenerationRef = useRef("");
  const pendingSaveRef = useRef(null);

  const setCollapsibleOpen = (key, open) => {
    setCollapsibleState((current) => (current[key] === open ? current : { ...current, [key]: open }));
  };

  useEffect(() => {
    if (sharedPayload || restorePayload) return;
    saveUiState({ active, selectedEpisodeId, collapsibles: collapsibleState });
  }, [active, selectedEpisodeId, collapsibleState, sharedPayload, restorePayload]);

  useEffect(() => {
    if (!data.episodes.length) return;
    if (!data.episodes.some((episode) => episode.id === selectedEpisodeId)) {
      setSelectedEpisodeId(data.episodes[0].id);
    }
  }, [data.episodes, selectedEpisodeId]);

  // ブラウザ保存はLZ圧縮が重く、スライダー操作のたびに実行するとUIがカクつくため
  // 350msデバウンスする。タブを閉じる/離れる時はpagehideで即時保存する。
  useEffect(() => {
    if (sharedPayload || restorePayload) {
      pendingSaveRef.current = null;
      return undefined;
    }
    const persist = () => {
      pendingSaveRef.current = null;
      try {
        saveStoredData(data);
        setStorageWarning("");
      } catch (error) {
        setStorageWarning("ブラウザ保存に失敗しました。再読み込みすると直前の変更が戻る可能性があります。設定からJSONを書き出してください。");
        console.warn("Radio Article Studio: browser storage failed. Export JSON to preserve current data.", error);
      }
    };
    pendingSaveRef.current = persist;
    const timer = window.setTimeout(persist, 350);
    return () => window.clearTimeout(timer);
  }, [data, sharedPayload, restorePayload]);

  useEffect(() => {
    const flushPendingSave = () => {
      pendingSaveRef.current?.();
    };
    window.addEventListener("pagehide", flushPendingSave);
    document.addEventListener("visibilitychange", flushPendingSave);
    return () => {
      window.removeEventListener("pagehide", flushPendingSave);
      document.removeEventListener("visibilitychange", flushPendingSave);
    };
  }, []);

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
        color: normalizeFormColor(FORM_COLOR_PALETTE[forms.length % FORM_COLOR_PALETTE.length]),
        description: "",
        receptionStartDate: "",
        receptionEndDate: "",
        submissionLimit: "",
        attachmentLimitMb: DEFAULT_ATTACHMENT_LIMIT_MB,
        questions: [
          { id: newId("q"), label: "質問文", kind: "short", required: false, use: "article", help: "" }
        ]
      }
    ]);
    setActive("forms");
  };

  const addFormFromPreset = (preset) => {
    if (!preset?.form) return;
    const nextForm = makeFormFromPreset(preset.form, data.forms.length);
    updateData("forms", (forms) => [...forms, nextForm]);
    setCollapsibleOpen(`form:${nextForm.id}:record`, true);
    setActive("forms");
  };

  const saveFormPreset = (formId) => {
    const form = data.forms.find((item) => item.id === formId);
    if (!form) return;
    updateData("formPresets", (presets = []) => [makeFormPreset(form), ...presets]);
  };

  const removeFormPreset = (presetId) => {
    updateData("formPresets", (presets = []) => presets.filter((preset) => preset.id !== presetId));
  };

  const overwriteBuiltInFormPreset = (sourceFormId, form) => {
    if (!sourceFormId || !form) return;
    updateData("formPresetOverrides", (overrides = {}) => ({
      ...overrides,
      [sourceFormId]: makeFormSnapshot(form)
    }));
  };

  const resetBuiltInFormPreset = (sourceFormId) => {
    updateData("formPresetOverrides", (overrides = {}) => {
      const next = { ...overrides };
      delete next[sourceFormId];
      return next;
    });
  };

  const removeFormWithBackup = (form) => {
    if (!form) return;
    setData((current) => ({
      ...current,
      forms: current.forms.filter((item) => item.id !== form.id),
      formPresets: [makeFormPreset(form, `削除バックアップ: ${form.name || "フォーム名未入力"}`), ...(current.formPresets ?? [])]
    }));
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
                { id: newId("q"), label: "新しい質問", kind: "short", required: false, use: "article", help: "" }
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

  const moveQuestion = (formId, questionId, direction) => {
    updateData("forms", (forms) =>
      forms.map((form) => {
        if (form.id !== formId) return form;
        const currentIndex = form.questions.findIndex((question) => question.id === questionId);
        return {
          ...form,
          questions: moveArrayItem(form.questions, currentIndex, currentIndex + direction)
        };
      })
    );
  };

  const patchTrackField = (formId, questionId, fieldType, patch) => {
    updateData("forms", (forms) =>
      forms.map((form) => {
        if (form.id !== formId) return form;
        return {
          ...form,
          questions: form.questions.map((question) =>
            question.id === questionId
              ? {
                  ...question,
                  trackFields: normalizeTrackFields(question.trackFields).map((field) =>
                    field.type === fieldType ? { ...field, ...patch, id: field.id, type: field.type } : field
                  )
                }
              : question
          )
        };
      })
    );
  };

  const moveTrackField = (formId, questionId, fieldType, direction) => {
    updateData("forms", (forms) =>
      forms.map((form) => {
        if (form.id !== formId) return form;
        return {
          ...form,
          questions: form.questions.map((question) => {
            if (question.id !== questionId) return question;
            const trackFields = normalizeTrackFields(question.trackFields);
            const currentIndex = trackFields.findIndex((field) => field.type === fieldType);
            return {
              ...question,
              trackFields: moveArrayItem(trackFields, currentIndex, currentIndex + direction)
            };
          })
        };
      })
    );
  };

  const resetTrackFields = (formId, questionId) => {
    patchQuestion(formId, questionId, { trackFields: getTrackFieldDefaults(data.settings) });
  };

  const saveTrackFieldsAsDefault = (formId, questionId) => {
    const form = data.forms.find((item) => item.id === formId);
    const question = form?.questions.find((item) => item.id === questionId);
    updateSettings({ trackFieldDefaults: normalizeTrackFields(question?.trackFields) });
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

  const exportPackToFolder = async () => {
    if (!selectedEpisode) return;
    if (!window.showDirectoryPicker) {
      setPackExportMessage("このブラウザはフォルダー書き出しに未対応です。ChromeかEdgeで開くか、コピーで渡してください。");
      return;
    }
    try {
      const directoryHandle = await window.showDirectoryPicker({ mode: "readwrite" });
      const bundle = await buildThumbnailBundle();
      const imageItems = [...bundle.thumbnails, ...bundle.listenerHeadingThumbnails].filter((item) => item.dataUrl);
      const imageNotes = imageItems.length
        ? `\n\n記事画像ファイル:\n${imageItems.map((item) => `- article-images/${item.fileName}`).join("\n")}\n※記事アイキャッチ16:9と応募曲見出し下PNGは、このフォルダーのarticle-images/に保存済みです。dataUrlの復元作業は不要です。`
        : "";
      const packText = `${codexPack}${imageNotes}\n`;
      const fileHandle = await directoryHandle.getFileHandle("codex_request.md", { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(new Blob([packText], { type: "text/markdown" }));
      await writable.close();
      if (imageItems.length) {
        const imagesDir = await directoryHandle.getDirectoryHandle("article-images", { create: true });
        for (const item of imageItems) {
          await writeDataUrlToDirectory(imagesDir, item.fileName, item.dataUrl);
        }
      }
      setPackExportMessage(
        `${directoryHandle.name} に codex_request.md${imageItems.length ? ` と記事画像${imageItems.length}枚（article-images/）` : ""} を書き出しました。Codexにはこのフォルダーを読むよう伝えるだけでOKです。`
      );
    } catch (error) {
      if (error?.name === "AbortError") {
        setPackExportMessage("フォルダー書き出しをキャンセルしました。");
      } else {
        setPackExportMessage(`書き出しに失敗しました（${error?.message || "不明なエラー"}）。`);
      }
    }
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

  const buildNormalizedResponse = (parsed) => {
    const response = parsed?.response ?? parsed;
    if (!response || typeof response !== "object") return null;
    const attachments =
      response.attachments ??
      parsed.attachments ??
      (parsed.rawAnswers ?? [])
        .map((answer) => answer.attachment)
        .filter(Boolean);
    const normalized = {
      id: response.id || newId("res"),
      submittedAt: response.submittedAt || "",
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
    const importedTracks = buildTracksFromRawAnswers(
      parsed.rawAnswers ?? [],
      normalized.episodeId,
      normalized.formId,
      normalized.respondent,
      normalized.periodId
    );
    return { normalized, guestIcon, importedTracks };
  };

  const applyResponsePayloads = (parsedList) => {
    const fresh = parsedList
      .map(buildNormalizedResponse)
      .filter((item) => item && !data.responses.some((existing) => existing.id === item.normalized.id));
    if (!fresh.length) return 0;
    setData((current) => {
      let next = current;
      for (const { normalized, guestIcon, importedTracks } of fresh) {
        if (next.responses.some((item) => item.id === normalized.id)) continue;
        let nextTracks = next.tracks;
        importedTracks.forEach((track) => {
          nextTracks = appendTrack(nextTracks, {
            ...track,
            slotNo: nextSlotNo(nextTracks, normalized.episodeId)
          });
        });
        next = {
          ...next,
          responses: [normalized, ...next.responses],
          tracks: nextTracks,
          thumbnailStudio: guestIcon
            ? mergeGuestIcons(next.thumbnailStudio ?? defaultThumbnailStudio, guestIcon)
            : next.thumbnailStudio
        };
      }
      return next;
    });
    return fresh.length;
  };

  const importResponseJson = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const importedCount = applyResponsePayloads([parsed]);
        if (!importedCount) alert("この回答は読み込み済みです。");
        setActive("responses");
      } catch {
        alert("回答JSONを読み込めませんでした。");
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsText(file, "utf-8");
  };

  const syncResponses = async () => {
    const endpointUrl = String(data.settings.responseEndpointUrl || "").trim();
    const token = String(data.settings.responseSyncToken || "").trim();
    if (!endpointUrl) {
      setSyncState({ busy: false, message: "設定で「回答保存Webhook URL」を入力してください。" });
      return;
    }
    setSyncState({ busy: true, message: "新着回答を確認しています…" });
    try {
      const result = await getFromGasEndpoint(endpointUrl, {
        action: "listResponses",
        token,
        folder: String(data.settings.responseDriveFolderUrl || "").trim()
      });
      const payloads = Array.isArray(result.responses) ? result.responses : [];
      const importedCount = applyResponsePayloads(payloads);
      updateSettings({ lastResponseSyncAt: result.now || new Date().toISOString() });
      setSyncState({
        busy: false,
        message: importedCount
          ? `新着回答を${importedCount}件取り込みました（受信口の回答 全${payloads.length}件）。`
          : `新着回答はありませんでした（受信口の回答 全${payloads.length}件）。`
      });
    } catch (error) {
      setSyncState({ busy: false, message: `同期できませんでした（${error?.message || "不明なエラー"}）。` });
    }
  };

  const resetSample = () => {
    if (!confirm("サンプルデータに戻しますか？現在のブラウザ内データは上書きされます。")) return;
    setData(sampleData);
    setSelectedEpisodeId(sampleData.episodes[0].id);
  };

  const restoreData = (incomingData) => {
    try {
      const next = migrateData(incomingData);
      saveStoredData(next);
      setData(next);
      setStorageWarning("");
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
        {MAIN_NAV_ITEMS.map(([key, label, Icon]) => (
          <button className={active === key ? "active" : ""} key={key} onClick={() => setActive(key)}>
            <Icon size={17} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {storageWarning && (
        <div className="storage-warning" role="alert">
          {storageWarning}
        </div>
      )}

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
          <SideNavigator active={active} setActive={setActive} forms={data.forms} />
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
              formPresets={data.formPresets ?? []}
              formPresetOverrides={data.formPresetOverrides ?? {}}
              settings={data.settings}
              patchItem={patchItem}
              addForm={addForm}
              addFormFromPreset={addFormFromPreset}
              saveFormPreset={saveFormPreset}
              removeFormPreset={removeFormPreset}
              overwriteBuiltInFormPreset={overwriteBuiltInFormPreset}
              resetBuiltInFormPreset={resetBuiltInFormPreset}
              removeFormWithBackup={removeFormWithBackup}
              addQuestion={addQuestion}
              patchQuestion={patchQuestion}
              moveQuestion={moveQuestion}
              patchTrackField={patchTrackField}
              moveTrackField={moveTrackField}
              resetTrackFields={resetTrackFields}
              saveTrackFieldsAsDefault={saveTrackFieldsAsDefault}
              removeQuestion={removeQuestion}
              collapsibleState={collapsibleState}
              setCollapsibleOpen={setCollapsibleOpen}
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
              syncResponses={syncResponses}
              syncState={syncState}
              lastResponseSyncAt={data.settings.lastResponseSyncAt || ""}
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
              settings={data.settings}
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
              exportPackToFolder={exportPackToFolder}
              packExportMessage={packExportMessage}
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
      <FloatingNavigator active={active} setActive={setActive} />
    </main>
  );
}

function SideNavigator({ active, setActive, forms = [] }) {
  const goToPanel = (key) => {
    setActive(key);
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  };

  const goToForm = (formId) => {
    setActive("forms");
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document.getElementById(formAnchorId(formId))?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  };

  return (
    <nav className="side-nav" aria-label="ツール目次">
      <div className="side-title">目次</div>
      {MAIN_NAV_ITEMS.map(([key, label, Icon]) => (
        <div className="side-nav-group" key={key}>
          <button className={active === key ? "active" : ""} onClick={() => goToPanel(key)}>
            <Icon size={15} />
            <span>{label}</span>
          </button>
          {key === "forms" && active === "forms" && forms.length > 0 && (
            <div className="side-subnav" aria-label="フォーム内目次">
              {forms.map((form, index) => (
                <button type="button" key={form.id} onClick={() => goToForm(form.id)}>
                  <span>{index + 1}. {form.name || "フォーム名未入力"}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}

function FloatingNavigator() {
  return (
    <div className="floating-nav" aria-label="ページ操作">
      <button className="floating-top-button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
        <ArrowUp size={16} />
        <span>上へ</span>
      </button>
    </div>
  );
}

function PersistentDetails({ persistKey, defaultOpen = false, collapsibleState = {}, setCollapsibleOpen, children, ...props }) {
  const isOpen = hasOwn(collapsibleState, persistKey) ? Boolean(collapsibleState[persistKey]) : defaultOpen;
  return (
    <details
      {...props}
      open={isOpen}
      onToggle={(event) => {
        if (event.target !== event.currentTarget) return;
        setCollapsibleOpen?.(persistKey, event.currentTarget.open);
      }}
    >
      {children}
    </details>
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
  const allPreviewRows = preview ? buildImportPreviewRows(preview.rows, kind, preview.mapping) : [];
  const previewRows = allPreviewRows.slice(0, 8);
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
              <p className="muted">{preview.rows.length}行 / {allPreviewRows.length}件の楽曲候補を読み込み済み。内容を確認してから反映してください。</p>
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
          {allPreviewRows.length > previewRows.length && (
            <p className="hint-text">先頭{previewRows.length}件だけ表示しています。反映時は{allPreviewRows.length}件すべて取り込みます。</p>
          )}
        </div>
      )}
    </article>
  );
}

function downloadAttachment(attachment) {
  if (attachment?.dataUrl) {
    downloadDataUrlFile(attachment.dataUrl, attachment.fileName || "audio-file");
    return;
  }
  // GAS同期で取り込んだ回答は音源本体をDriveに置くため、Drive側からダウンロードする。
  if (attachment?.driveUrl) window.open(attachment.driveUrl, "_blank", "noopener");
}

async function saveAttachmentWithPicker(attachment) {
  if (!attachment?.dataUrl) {
    if (attachment?.driveUrl) window.open(attachment.driveUrl, "_blank", "noopener");
    return;
  }
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
  const [publishMessage, setPublishMessage] = useState("");
  const [publishingPeriodId, setPublishingPeriodId] = useState("");
  const episodeLabels = Object.fromEntries(episodes.map((episode) => [episode.id, `${episode.date} ${episode.title}`]));
  const formLabels = Object.fromEntries(forms.map((form) => [form.id, form.name]));

  const publishPeriodShortUrl = async (period) => {
    const form = forms.find((item) => item.id === period.formId);
    if (!form) return;
    const episode = episodes.find((item) => item.id === period.episodeId);
    const slug = getPeriodPublishedSlug(period, episode, form);
    setPublishingPeriodId(period.id);
    setPublishMessage("");
    try {
      await publishSharePayloadToGas(settings, slug, makeSharePayload(form, settings, { period, episode }));
      setPublishMessage(`短いURLを公開しました: ${makePublishedShareUrl(slug)}`);
    } catch (error) {
      setPublishMessage(`公開できませんでした（${error?.message || "不明なエラー"}）。`);
    } finally {
      setPublishingPeriodId("");
    }
  };

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
      {publishMessage && <p className="hint-text">{publishMessage}</p>}
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
                  <button className="primary" onClick={() => publishPeriodShortUrl(period)} disabled={!publishedUrl || publishingPeriodId === period.id}>
                    <Send size={16} />{publishingPeriodId === period.id ? "公開中…" : "短いURLを公開/更新"}
                  </button>
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
              <details className="share-box collapsible-share">
                <summary>
                  <strong><Share2 size={16} />長いURL（予備）</strong>
                  <span>必要な時だけ開く</span>
                </summary>
                <p className="hint-text">短いURLを有効化する前に使える予備URLです。フォーム内容をURLに含めるため長くなります。</p>
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
              </details>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Forms({
  forms,
  formPresets = [],
  formPresetOverrides = {},
  settings,
  patchItem,
  addForm,
  addFormFromPreset,
  saveFormPreset,
  removeFormPreset,
  overwriteBuiltInFormPreset,
  resetBuiltInFormPreset,
  removeFormWithBackup,
  addQuestion,
  patchQuestion,
  moveQuestion,
  patchTrackField,
  moveTrackField,
  resetTrackFields,
  saveTrackFieldsAsDefault,
  removeQuestion,
  collapsibleState,
  setCollapsibleOpen
}) {
  const [copiedFormId, setCopiedFormId] = useState("");
  const [publishMessage, setPublishMessage] = useState("");
  const [publishingFormId, setPublishingFormId] = useState("");
  const [savedDefaultQuestionId, setSavedDefaultQuestionId] = useState("");
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [presetMessage, setPresetMessage] = useState("");
  const trackFieldDefaults = getTrackFieldDefaults(settings);
  const builtInFormPresets = sampleData.forms.map((form) => {
    const override = formPresetOverrides?.[form.id];
    const presetForm = override ? { ...form, ...override, id: form.id, shareSlug: form.shareSlug } : form;
    return {
      id: `builtin:${form.id}`,
      sourceId: form.id,
      name: `標準: ${presetForm.name}${override ? "（上書き済み）" : ""}`,
      builtIn: true,
      overwritten: Boolean(override),
      form: presetForm
    };
  });
  const allFormPresets = [...builtInFormPresets, ...formPresets];
  const selectedPreset = allFormPresets.find((preset) => preset.id === selectedPresetId) ?? allFormPresets[0];

  const saveTrackDefault = (formId, questionId) => {
    saveTrackFieldsAsDefault(formId, questionId);
    setSavedDefaultQuestionId(`${formId}:${questionId}`);
    window.setTimeout(() => setSavedDefaultQuestionId(""), 1800);
  };

  const detailsProps = (persistKey, defaultOpen = false) => ({
    persistKey,
    defaultOpen,
    collapsibleState,
    setCollapsibleOpen
  });

  const addSelectedPreset = () => {
    if (!selectedPreset) return;
    addFormFromPreset(selectedPreset);
    setPresetMessage(`「${selectedPreset.name}」からフォームを追加しました。`);
    window.setTimeout(() => setPresetMessage(""), 2400);
  };

  const savePreset = (form) => {
    saveFormPreset(form.id);
    setPresetMessage(`「${form.name || "フォーム名未入力"}」をプリセットに保存しました。`);
    window.setTimeout(() => setPresetMessage(""), 2400);
  };

  const deleteSelectedPreset = () => {
    if (!selectedPreset) return;
    if (selectedPreset.builtIn) {
      if (!selectedPreset.overwritten) return;
      resetBuiltInFormPreset(selectedPreset.sourceId);
      setPresetMessage(`「${selectedPreset.name.replace("（上書き済み）", "")}」を初期標準に戻しました。`);
      window.setTimeout(() => setPresetMessage(""), 2400);
      return;
    }
    removeFormPreset(selectedPreset.id);
    setSelectedPresetId("");
    setPresetMessage(`「${selectedPreset.name}」をプリセットから削除しました。`);
    window.setTimeout(() => setPresetMessage(""), 2400);
  };

  const getBuiltInPresetForForm = (form) =>
    builtInFormPresets.find((preset) => preset.sourceId === form.id) ?? null;

  const overwriteFormBuiltInPreset = (form) => {
    const targetPreset = getBuiltInPresetForForm(form);
    if (!targetPreset) return;
    const presetName = targetPreset.name.replace(/^標準: /, "").replace("（上書き済み）", "");
    overwriteBuiltInFormPreset(targetPreset.sourceId, form);
    setPresetMessage(`標準プリセット「${presetName}」を、このフォーム内容で上書きしました。`);
    window.setTimeout(() => setPresetMessage(""), 3000);
  };

  const deleteForm = (form) => {
    removeFormWithBackup(form);
    setPresetMessage(`「${form.name || "フォーム名未入力"}」を削除し、プリセットにバックアップしました。`);
    window.setTimeout(() => setPresetMessage(""), 3000);
  };

  const publishFormShortUrl = async (form) => {
    const slug = getFormPublishedSlug(form);
    setPublishingFormId(form.id);
    setPublishMessage("");
    try {
      await publishSharePayloadToGas(settings, slug, makeSharePayload(form, settings));
      setPublishMessage(`短いURLを公開しました: ${makePublishedShareUrl(slug)}`);
    } catch (error) {
      setPublishMessage(`公開できませんでした（${error?.message || "不明なエラー"}）。`);
    } finally {
      setPublishingFormId("");
    }
  };

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
      <SectionTitle title="フォーム管理" subtitle="質問テンプレートを作り、「短いURLを公開/更新」ですぐ共有できます。回答は回答管理の「新着回答を同期」で自動取得します。" action={<button className="primary" onClick={addForm}><Plus size={16} />フォーム追加</button>} />
      <div className="form-preset-panel">
        <div>
          <strong>フォームプリセット</strong>
          <span>似たフォームを作る時や、削除バックアップから戻す時に使います。</span>
        </div>
        <select value={selectedPreset?.id ?? ""} onChange={(event) => setSelectedPresetId(event.target.value)}>
          {allFormPresets.map((preset) => (
            <option key={preset.id} value={preset.id}>{preset.name}</option>
          ))}
        </select>
        <button className="secondary" onClick={addSelectedPreset} disabled={!selectedPreset}>
          <Plus size={16} />プリセットから追加
        </button>
        <button
          className={selectedPreset?.builtIn ? "secondary" : "icon-danger"}
          onClick={deleteSelectedPreset}
          disabled={!selectedPreset || (selectedPreset.builtIn && !selectedPreset.overwritten)}
          title={selectedPreset?.builtIn ? "上書き済み標準プリセットを初期に戻す" : "保存プリセットを削除"}
        >
          {selectedPreset?.builtIn ? <RotateCcw size={16} /> : <Trash2 size={16} />}
          {selectedPreset?.builtIn ? "初期に戻す" : ""}
        </button>
      </div>
      {presetMessage && <p className="hint-text">{presetMessage}</p>}
      {publishMessage && <p className="hint-text">{publishMessage}</p>}
      <div className="records">
        {forms.map((form) => {
          const builtInTarget = getBuiltInPresetForForm(form);
          const builtInTargetName = builtInTarget?.name.replace(/^標準: /, "").replace("（上書き済み）", "") || "";
          return (
          <PersistentDetails {...detailsProps(`form:${form.id}:record`)} className="record collapsible-record form-record" key={form.id} id={formAnchorId(form.id)} style={getFormColorStyle(form.color)}>
            <summary className="record-summary">
              <strong><i className="form-color-dot" aria-hidden="true" />{form.name || "フォーム名未入力"}</strong>
              <span>{form.questions.length}項目</span>
              <span>{formatDateRange(form.receptionStartDate, form.receptionEndDate)}</span>
              {form.submissionLimit ? <span>上限 {form.submissionLimit}件</span> : <span>上限なし</span>}
              <span>添付URL目安 {normalizeAttachmentLimitMb(form.attachmentLimitMb)}MB</span>
            </summary>
            <div className="record-body">
              <div className="record-head compact">
                <strong>フォーム編集</strong>
                <div className="inline-actions">
                  <button className="secondary" onClick={() => savePreset(form)}><Save size={16} />プリセット保存</button>
                  <button
                    className="secondary"
                    onClick={() => overwriteFormBuiltInPreset(form)}
                    disabled={!builtInTarget}
                    title={builtInTarget ? `標準プリセット「${builtInTargetName}」をこのフォーム内容で上書き` : "標準プリセットと対応するフォームだけ上書きできます"}
                  >
                    <Save size={16} />このフォームを標準へ上書き
                  </button>
                  <button className="icon-danger" onClick={() => deleteForm(form)} title="削除バックアップを残してフォームを削除"><Trash2 size={16} /></button>
                </div>
              </div>
              <PersistentDetails {...detailsProps(`form:${form.id}:basic`, true)} className="collapsible-section">
                <summary><strong>基本設定</strong><span>フォーム名・説明</span></summary>
                <div className="form-grid">
                  <Field label="フォーム名" value={form.name} onChange={(value) => patchItem("forms", form.id, { name: value })} />
                  <Field label="短縮ID" value={form.shareSlug} onChange={(value) => patchItem("forms", form.id, { shareSlug: value })} placeholder="例: guest-form" />
                  <label className="field">
                    <span>フォーム色</span>
                    <div className="color-control-row">
                      <input type="color" value={normalizeFormColor(form.color)} onChange={(event) => patchItem("forms", form.id, { color: normalizeFormColor(event.target.value) })} />
                      <input value={form.color || ""} onChange={(event) => patchItem("forms", form.id, { color: event.target.value })} onBlur={(event) => patchItem("forms", form.id, { color: normalizeFormColor(event.target.value) })} />
                    </div>
                  </label>
                  <div className="form-color-swatches wide" aria-label="フォーム色プリセット">
                    {FORM_COLOR_PALETTE.map((color) => (
                      <button
                        type="button"
                        key={color}
                        className={normalizeFormColor(form.color) === color ? "active" : ""}
                        style={{ background: color }}
                        onClick={() => patchItem("forms", form.id, { color })}
                        aria-label={`フォーム色 ${color}`}
                      />
                    ))}
                  </div>
                  <TextArea label="説明" value={form.description} onChange={(value) => patchItem("forms", form.id, { description: value })} />
                </div>
              </PersistentDetails>
              <PersistentDetails {...detailsProps(`form:${form.id}:availability`, true)} className="collapsible-section">
                <summary><strong>受付条件</strong><span>期間・応募数・添付容量</span></summary>
                <p className="hint-text">日付と応募数は空欄なら制限なしです。期間外、または応募数上限に達したフォームは回答画面に表示されません。GASへ直接送れる音源は35MB程度までです。大きいWAVはGoogle Driveなどの共有URLで受け取ります。</p>
                <div className="form-grid">
                  <Field
                    label="受付開始"
                    type="date"
                    value={form.receptionStartDate || ""}
                    onChange={(value) => patchItem("forms", form.id, { receptionStartDate: value })}
                  />
                  <Field
                    label="受付終了"
                    type="date"
                    value={form.receptionEndDate || ""}
                    onChange={(value) => patchItem("forms", form.id, { receptionEndDate: value })}
                  />
                  <Field
                    label="応募数上限"
                    type="number"
                    value={form.submissionLimit || ""}
                    onChange={(value) => patchItem("forms", form.id, { submissionLimit: sanitizeLimitInput(value) })}
                    placeholder="未指定"
                  />
                  <Field
                    label="大容量音源URLの目安（MB）"
                    type="number"
                    value={form.attachmentLimitMb || ""}
                    onChange={(value) => patchItem("forms", form.id, { attachmentLimitMb: sanitizeAttachmentLimitInput(value) })}
                    placeholder={String(DEFAULT_ATTACHMENT_LIMIT_MB)}
                  />
                  <p className="hint-text wide">1〜{MAX_ATTACHMENT_LIMIT_MB}MBで指定できます。回答者画面では、フォーム直送は35MBまで、35MB超は大容量音源URL欄へ案内します。</p>
                </div>
              </PersistentDetails>
              <PersistentDetails {...detailsProps(`form:${form.id}:share`)} className="collapsible-section">
                <summary><strong><Share2 size={16} />共有URL</strong><span>公開・コピー</span></summary>
                <div className="share-box short-share">
                  <div>
                    <strong><Share2 size={16} />短いURL</strong>
                    <span>ゲストさんやSNSに渡す用です。まだ開けない時は「Codex用依頼をコピー」をそのままCodexに貼ってください。</span>
                  </div>
                  <div className="share-url-row">
                    <input readOnly value={makePublishedShareUrl(getFormPublishedSlug(form))} onFocus={(event) => event.target.select()} />
                    <a className="secondary" href={makePublishedShareUrl(getFormPublishedSlug(form))} target="_blank" rel="noreferrer">
                      <Link size={16} />開く
                    </a>
                  </div>
                  <div className="inline-actions">
                    <button className="primary" onClick={() => publishFormShortUrl(form)} disabled={publishingFormId === form.id}>
                      <Send size={16} />{publishingFormId === form.id ? "公開中…" : "短いURLを公開/更新"}
                    </button>
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
                <PersistentDetails {...detailsProps(`form:${form.id}:long-share`)} className="share-box collapsible-share">
                  <summary>
                    <strong><Share2 size={16} />長いURL（予備）</strong>
                    <span>必要な時だけ開く</span>
                  </summary>
                  <p className="hint-text">短いURLを有効化する前に使える予備URLです。フォーム内容をURLに含めるため長くなります。</p>
                  <input readOnly value={makePortableShareUrl(form, settings)} onFocus={(event) => event.target.select()} />
                  <div className="inline-actions">
                    <button className="secondary" onClick={() => copyShareUrl(form)}>
                      <ClipboardCopy size={16} />{copiedFormId === form.id ? "コピー済み" : "外部URLをコピー"}
                    </button>
                    <button className="secondary" onClick={() => copyShortShareUrl(form)}>
                      <ClipboardCopy size={16} />{copiedFormId === `${form.id}:short` ? "コピー済み" : "管理端末用URLをコピー"}
                    </button>
                  </div>
                </PersistentDetails>
              </PersistentDetails>
              <PersistentDetails {...detailsProps(`form:${form.id}:questions`, true)} className="collapsible-section">
                <summary><strong>質問項目</strong><span>{form.questions.length}項目</span></summary>
                <div className="question-list">
                  <p className="hint-text">入力形式: 楽曲を選ぶと「音源アップロード・楽曲名・アーティスト名・楽曲URL」のまとまりが表示されます。質問と楽曲内項目は上下ボタンで並び替えできます。</p>
                  {form.questions.map((question, questionIndex) => {
                    const trackFields = question.kind === "track" ? normalizeTrackFields(question.trackFields) : [];
                    return (
                      <div className="question-editor" key={question.id}>
                        <div className="question-row">
                          <input value={question.label} onChange={(event) => patchQuestion(form.id, question.id, { label: event.target.value })} />
                          <select
                            value={question.kind}
                            onChange={(event) => {
                              const kind = event.target.value;
                              patchQuestion(form.id, question.id, kind === "track" ? { kind, trackFields: trackFieldDefaults } : { kind });
                            }}
                          >
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
                          <div className="move-buttons" aria-label={`${question.label || "質問"}の並び替え`}>
                            <button className="icon-secondary" onClick={() => moveQuestion(form.id, question.id, -1)} disabled={questionIndex === 0} aria-label="質問を上へ" title="上へ"><ArrowUp size={16} /></button>
                            <button className="icon-secondary" onClick={() => moveQuestion(form.id, question.id, 1)} disabled={questionIndex === form.questions.length - 1} aria-label="質問を下へ" title="下へ"><ArrowDown size={16} /></button>
                          </div>
                          <button className="icon-danger" onClick={() => removeQuestion(form.id, question.id)} aria-label="質問を削除" title="削除"><Trash2 size={16} /></button>
                        </div>
                        <label className="question-help-row">
                          <span>補足文</span>
                          <input
                            value={question.help || ""}
                            onChange={(event) => patchQuestion(form.id, question.id, { help: event.target.value })}
                            placeholder="回答者に見せる説明や注意書きを入力"
                          />
                        </label>
                        {question.kind === "track" && (
                          <PersistentDetails {...detailsProps(`form:${form.id}:question:${question.id}:track-fields`)} className="track-field-editor collapsible-share">
                            <summary>
                              <strong>楽曲内の項目</strong>
                              <span>開いて編集</span>
                            </summary>
                            <div className="track-field-editor-head">
                              <div>
                                <span>回答フォームではこの順番で表示され、音源プレビューは音源アップロードの直下に出ます。</span>
                              </div>
                              <div className="track-field-editor-actions">
                                <button className="secondary" onClick={() => saveTrackDefault(form.id, question.id)}>
                                  <Save size={16} />{savedDefaultQuestionId === `${form.id}:${question.id}` ? "既定にしました" : "この並びを既定にする"}
                                </button>
                                <button className="secondary" onClick={() => resetTrackFields(form.id, question.id)}><RotateCcw size={16} />既定に戻す</button>
                              </div>
                            </div>
                            {trackFields.map((field, fieldIndex) => (
                              <div className="track-field-row" key={field.type}>
                                <div className="track-field-kind">{TRACK_FIELD_TYPE_LABELS[field.type] || field.type}</div>
                                <label>
                                  <span>表示名</span>
                                  <input value={field.label || ""} onChange={(event) => patchTrackField(form.id, question.id, field.type, { label: event.target.value })} />
                                </label>
                                <label>
                                  <span>補足文</span>
                                  <input value={field.help || ""} onChange={(event) => patchTrackField(form.id, question.id, field.type, { help: event.target.value })} />
                                </label>
                                {field.type === "url" ? (
                                  <label>
                                    <span>入力例</span>
                                    <input value={field.placeholder || ""} onChange={(event) => patchTrackField(form.id, question.id, field.type, { placeholder: event.target.value })} />
                                  </label>
                                ) : field.type === "audio" ? (
                                  <label>
                                    <span>音源後の案内</span>
                                    <input value={field.note || ""} onChange={(event) => patchTrackField(form.id, question.id, field.type, { note: event.target.value })} />
                                  </label>
                                ) : (
                                  <span className="track-field-spacer" />
                                )}
                                <div className="move-buttons" aria-label={`${field.label || "楽曲内項目"}の並び替え`}>
                                  <button className="icon-secondary" onClick={() => moveTrackField(form.id, question.id, field.type, -1)} disabled={fieldIndex === 0} aria-label="楽曲内項目を上へ" title="上へ"><ArrowUp size={16} /></button>
                                  <button className="icon-secondary" onClick={() => moveTrackField(form.id, question.id, field.type, 1)} disabled={fieldIndex === trackFields.length - 1} aria-label="楽曲内項目を下へ" title="下へ"><ArrowDown size={16} /></button>
                                </div>
                              </div>
                            ))}
                          </PersistentDetails>
                        )}
                      </div>
                    );
                  })}
                  <button className="secondary" onClick={() => addQuestion(form.id)}><Plus size={16} />質問追加</button>
                </div>
              </PersistentDetails>
            </div>
          </PersistentDetails>
          );
        })}
      </div>
    </div>
  );
}

function Responses({ forms, responses, patchItem, removeItem, addResponse, importResponseJson, syncResponses, syncState, lastResponseSyncAt }) {
  return (
    <div className="view-stack">
      <SectionTitle
        title="回答管理"
        subtitle="公開できる情報、記事に使う内容、制作メモ、掲載NG/表記ルールを分けて保持します。"
        action={
          <div className="inline-actions">
            <button className="primary" onClick={syncResponses} disabled={syncState?.busy}>
              <Download size={16} />{syncState?.busy ? "同期中…" : "新着回答を同期"}
            </button>
            <label className="secondary file-button">
              <Upload size={16} />回答JSONを読み込み
              <input type="file" accept="application/json" onChange={importResponseJson} />
            </label>
            <button className="secondary" onClick={addResponse}><Plus size={16} />回答追加</button>
          </div>
        }
      />
      {(syncState?.message || lastResponseSyncAt) && (
        <p className="hint-text">
          {syncState?.message}
          {lastResponseSyncAt ? `（最終同期: ${new Date(lastResponseSyncAt).toLocaleString("ja-JP")}）` : ""}
        </p>
      )}
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
                    {attachment.driveUrl && (
                      <a className="secondary file-button" href={attachment.driveUrl} target="_blank" rel="noreferrer noopener">
                        <Link size={16} />Driveで開く
                      </a>
                    )}
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
  thumbnailTransferText,
  exportPackToFolder,
  packExportMessage
}) {
  const imageBundleCount = articleThumbnailCount + listenerHeadingThumbnailCount;
  return (
    <div className="view-stack">
      <SectionTitle title="Codex記事作成パック" subtitle="フォルダーへ書き出すと、codex_request.mdと記事画像がまとめて保存され、Codexがそのまま読めます。" action={<button className="primary" onClick={copyPack}><ClipboardCopy size={16} />{copied ? "コピー済み" : "コピー"}</button>} />
      <article className="panel">
        <h2>{selectedEpisode?.title || "放送回未選択"}</h2>
        <div className="button-row">
          <button className="primary" onClick={exportPackToFolder}>
            <FolderOpen size={16} />Sunoパ！記事フォルダーへ書き出し
          </button>
          <button className="secondary" onClick={copyFullPackWithThumbnails} disabled={!imageBundleCount}>
            <ClipboardCopy size={16} />{fullPackCopied ? "画像込みコピー済み" : "本文+記事画像データをコピー"}
          </button>
          <button className="secondary" onClick={copyThumbnailBundle} disabled={!imageBundleCount}>
            <ClipboardCopy size={16} />{thumbnailBundleCopied ? "記事画像JSONコピー済み" : "記事画像JSONをコピー"}
          </button>
        </div>
        {packExportMessage && <p className="hint-text">{packExportMessage}</p>}
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
            <p className="muted">フォーム作成・回答管理・応募期間管理は上部ナビからも開けます。</p>
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
          <Field label="回答保存Webhook URL" value={settings.responseEndpointUrl || ""} onChange={(value) => updateSettings({ responseEndpointUrl: value })} placeholder="Google Apps ScriptのWebアプリURL" wide />
          <p className="hint-text wide">docs/google-apps-script/Code.gs をApps Scriptにデプロイして、WebアプリURLをここに貼ります。フォーム送信の受信、新着回答の同期、短いURL公開がこの1本で動きます。</p>
          <Field label="回答同期トークン" value={settings.responseSyncToken || ""} onChange={(value) => updateSettings({ responseSyncToken: value })} placeholder="Apps ScriptのSECRET_TOKENと同じ文字列" wide />
          <Field label="回答保存先Google DriveフォルダーURL" value={settings.responseDriveFolderUrl || ""} onChange={(value) => updateSettings({ responseDriveFolderUrl: value })} placeholder="DriveフォルダーのURL" wide />
          <p className="hint-text wide">回答JSON・音源・画像はこのフォルダーに保存されます。変更したら、使用中フォームの「短いURLを公開/更新」を押し直すと新しい保存先が回答者側にも反映されます。空欄の場合はApps Script側のFOLDER_IDに保存します。</p>
          <Field label="サムネDrive保存Webhook URL" value={settings.thumbnailDriveEndpointUrl || ""} onChange={(value) => updateSettings({ thumbnailDriveEndpointUrl: value })} placeholder="サムネPNG保存用のGoogle Apps Script WebアプリURL" wide />
          <Field label="サムネ保存先Google DriveフォルダーURL" value={settings.thumbnailDriveFolderUrl || ""} onChange={(value) => updateSettings({ thumbnailDriveFolderUrl: value })} placeholder="DriveフォルダーのURL" wide />
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


createRoot(document.getElementById("root")).render(<App />);

