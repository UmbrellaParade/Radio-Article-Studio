// 公開共有フォーム（回答者向け画面）
import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { postToGasEndpoint, getFromGasEndpoint, loadAppConfig } from "../lib/gas.js";
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
  normalizeTrackFields,
  normalizeSubmissionLimit,
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
} from "../lib/core.js";
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
} from "../lib/thumbnail.js";
import {
  Header,
  StatusLine,
  SectionTitle,
  Field,
  TextArea,
  SliderField,
  SelectField
} from "./ui.jsx";

const PUBLIC_DRAFT_KEY_PREFIX = `${STORAGE_KEY}:public-draft`;

const formatFileSizeMb = (bytes = 0) => {
  const mb = Number(bytes || 0) / 1024 / 1024;
  if (!Number.isFinite(mb) || mb <= 0) return "0MB";
  return `${mb >= 10 ? Math.round(mb) : Math.round(mb * 10) / 10}MB`;
};

const makePublicDraftKey = (formId = "", periodId = "", episodeId = "") =>
  `${PUBLIC_DRAFT_KEY_PREFIX}:${formId || "form"}:${periodId || ""}:${episodeId || ""}`;

const stripFileDataForDraft = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  if (value.dataUrl || (value.fileName && value.mimeType)) return undefined;
  const next = { ...value };
  if (next.audio) delete next.audio;
  return next;
};

const makeDraftAnswers = (answers = {}) =>
  Object.fromEntries(
    Object.entries(answers)
      .map(([questionId, value]) => [questionId, stripFileDataForDraft(value)])
      .filter(([, value]) => value !== undefined && value !== "")
  );

const readPublicDraftAnswers = (draftKey) => {
  try {
    const parsed = JSON.parse(localStorage.getItem(draftKey) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const savePublicDraftAnswers = (draftKey, answers) => {
  try {
    const draft = makeDraftAnswers(answers);
    if (Object.keys(draft).length) {
      localStorage.setItem(draftKey, JSON.stringify(draft));
    } else {
      localStorage.removeItem(draftKey);
    }
  } catch {
    // 下書き保存は補助機能なので、保存に失敗しても入力や送信を止めない。
  }
};

const clearPublicDraftAnswers = (draftKey) => {
  try {
    localStorage.removeItem(draftKey);
  } catch {
    // 送信成功後の後始末なので、削除に失敗しても完了表示を優先する。
  }
};

export function PublicSubmissionForm({ logoSrc, payload, operatorSettings = {} }) {
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
  const draftKey = makePublicDraftKey(form?.id, period?.id, episode?.id);
  const [answers, setAnswers] = useState(() => readPublicDraftAnswers(draftKey));
  const [formError, setFormError] = useState("");
  const [submitStatus, setSubmitStatus] = useState("");
  const [submitBusy, setSubmitBusy] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState({ loading: false, count: null, error: "" });
  const submissionLimit = normalizeSubmissionLimit(form?.submissionLimit);
  const attachmentLimitMb = normalizeAttachmentLimitMb(form?.attachmentLimitMb);
  const attachmentLimitBytes = attachmentLimitMb * 1024 * 1024;
  const draftLoadingRef = useRef(false);

  useEffect(() => {
    draftLoadingRef.current = true;
    setAnswers(readPublicDraftAnswers(draftKey));
    setFormError("");
    setSubmitStatus("");
    setSubmitBusy(false);
  }, [draftKey]);

  useEffect(() => {
    if (draftLoadingRef.current) {
      draftLoadingRef.current = false;
      return;
    }
    savePublicDraftAnswers(draftKey, answers);
  }, [draftKey, answers]);

  useEffect(() => {
    const endpointUrl = String(submission.endpointUrl || "").trim();
    if (!form?.id || !submissionLimit || !endpointUrl) {
      setSubmissionStatus({ loading: false, count: null, error: "" });
      return undefined;
    }
    let cancelled = false;
    setSubmissionStatus({ loading: true, count: null, error: "" });
    getFromGasEndpoint(endpointUrl, {
      action: "submissionStatus",
      formId: form.id,
      periodId: period?.id || "",
      folder: String(submission.driveFolderUrl || "").trim()
    })
      .then((result) => {
        if (!cancelled) {
          setSubmissionStatus({
            loading: false,
            count: Number.isFinite(Number(result.count)) ? Number(result.count) : 0,
            error: ""
          });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setSubmissionStatus({ loading: false, count: null, error: error?.message || "応募数を確認できませんでした。" });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [form?.id, period?.id, submission.endpointUrl, submission.driveFolderUrl, submissionLimit]);

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

  const today = formatLocalDate();
  const closedNotice = (() => {
    const dateRules = [
      { label: "フォーム受付期間", startDate: form.receptionStartDate || "", endDate: form.receptionEndDate || "" },
      { label: "応募期間", startDate: period?.startDate || "", endDate: period?.endDate || "" }
    ];
    for (const rule of dateRules) {
      if (rule.startDate && today < rule.startDate) {
        return {
          title: "受付開始前です",
          body: `${rule.label}は ${formatDateRange(rule.startDate, rule.endDate)} です。`
        };
      }
      if (rule.endDate && today > rule.endDate) {
        return {
          title: "受付は終了しました",
          body: `${rule.label}は ${formatDateRange(rule.startDate, rule.endDate)} でした。`
        };
      }
    }
    if (submissionLimit && submissionStatus.count !== null && submissionStatus.count >= submissionLimit) {
      return {
        title: "応募上限に達しました",
        body: `このフォームの受付数が上限（${submissionLimit}件）に達しました。`
      };
    }
    return null;
  })();

  if (closedNotice) {
    return (
      <main className="app-shell public-shell">
        <Header logoSrc={logoSrc} />
        <article className="panel closed-form-panel">
          <p className="eyebrow slim">Shared Form</p>
          <h2>{closedNotice.title}</h2>
          <p className="muted">{closedNotice.body}</p>
          <div className="public-context">
            <span>フォーム: {form.name}</span>
            {(form.receptionStartDate || form.receptionEndDate) && <span>受付条件: {formatDateRange(form.receptionStartDate, form.receptionEndDate)}</span>}
            {period && <span>応募期間: {period.title || period.id} / {formatDateRange(period.startDate, period.endDate)}</span>}
            {submissionLimit ? <span>応募数: {submissionStatus.count ?? "-"} / {submissionLimit}</span> : <span>応募数: 制限なし</span>}
            <span>添付: 1ファイルあたり{attachmentLimitMb}MBまで</span>
          </div>
        </article>
      </main>
    );
  }

  const availabilityWindows = [
    form.receptionStartDate || form.receptionEndDate
      ? { label: "受付期間", startDate: form.receptionStartDate || "", endDate: form.receptionEndDate || "" }
      : null,
    period?.startDate || period?.endDate
      ? { label: "応募期間", startDate: period.startDate || "", endDate: period.endDate || "" }
      : null
  ].filter(Boolean);

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

  const validateAttachmentFile = (file, event, label = "添付ファイル") => {
    if (!file || file.size <= attachmentLimitBytes) {
      setFormError("");
      return true;
    }
    setFormError(`${label}は1ファイルあたり${attachmentLimitMb}MBまでです。「${file.name}」は${formatFileSizeMb(file.size)}あります。`);
    event.target.value = "";
    return false;
  };

  const updateFileAnswer = async (questionId, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!isAudioUpload(file)) {
      alert("WAVまたはMP3ファイルを選んでください。");
      event.target.value = "";
      return;
    }
    if (!validateAttachmentFile(file, event, "音源ファイル")) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      updateAnswer(questionId, {
        fileName: file.name,
        mimeType: file.type || (file.name.toLowerCase().endsWith(".wav") ? "audio/wav" : "audio/mpeg"),
        size: file.size,
        dataUrl
      });
    } catch {
      setFormError("ファイルを読み込めませんでした。もう一度ファイルを選び直してください。");
      event.target.value = "";
    }
  };

  const updateImageAnswer = async (questionId, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!isImageUpload(file)) {
      alert("PNG、JPG、WebP、GIFの画像を選んでください。");
      event.target.value = "";
      return;
    }
    if (!validateAttachmentFile(file, event, "画像ファイル")) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      updateAnswer(questionId, {
        fileName: file.name,
        mimeType: file.type || "image/png",
        size: file.size,
        dataUrl
      });
    } catch {
      setFormError("画像を読み込めませんでした。もう一度ファイルを選び直してください。");
      event.target.value = "";
    }
  };

  const updateTrackFileAnswer = async (questionId, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!isAudioUpload(file)) {
      alert("WAVまたはMP3ファイルを選んでください。");
      event.target.value = "";
      return;
    }
    if (!validateAttachmentFile(file, event, "楽曲音源")) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      updateTrackAnswer(questionId, {
        audio: {
          fileName: file.name,
          mimeType: file.type || (file.name.toLowerCase().endsWith(".wav") ? "audio/wav" : "audio/mpeg"),
          size: file.size,
          dataUrl
        }
      });
    } catch {
      setFormError("音源ファイルを読み込めませんでした。もう一度ファイルを選び直してください。");
      event.target.value = "";
    }
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
      form: {
        id: form.id,
        name: form.name,
        type: form.type,
        receptionStartDate: form.receptionStartDate || "",
        receptionEndDate: form.receptionEndDate || "",
        submissionLimit,
        attachmentLimitMb
      },
      period: period
        ? {
            id: period.id,
            title: period.title,
            type: period.type,
            startDate: period.startDate,
            endDate: period.endDate,
            episodeId: period.episodeId
          }
        : null,
      episode: episode
        ? {
            id: episode.id,
            title: episode.title,
            date: episode.date,
            slot: episode.slot
          }
        : null,
      response: {
        id: newId("res"),
        submittedAt: new Date().toISOString(),
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
    const oversizedAttachment = (responsePayload.response.attachments || []).find(
      (attachment) => Number(attachment.size || 0) > attachmentLimitBytes
    );
    const endpointUrl = String(submission.endpointUrl || "").trim();
    if (!endpointUrl) {
      setSubmitStatus("送信先の設定に不備があります。URLを送ってくれた運営側へご連絡ください。");
      return;
    }
    if (oversizedAttachment) {
      setFormError(`添付ファイルは1ファイルあたり${attachmentLimitMb}MBまでです。「${oversizedAttachment.fileName || "添付ファイル"}」は${formatFileSizeMb(oversizedAttachment.size)}あります。`);
      return;
    }
    setSubmitBusy(true);
    try {
      const result = await postToGasEndpoint(endpointUrl, {
        action: "submitResponse",
        driveFolderUrl: String(submission.driveFolderUrl || "").trim(),
        ...responsePayload
      });
      const savedFiles = Array.isArray(result.savedFiles) ? result.savedFiles.length : 0;
      setSubmitStatus(
        `回答を受け付けました。ありがとうございます！（受付番号: ${result.savedAs || responsePayload.response.id}${savedFiles ? ` / 添付ファイル${savedFiles}件保存済み` : ""}）`
      );
      clearPublicDraftAnswers(draftKey);
      setAnswers({});
    } catch (error) {
      setSubmitStatus(
        `送信できませんでした（${error?.message || "不明なエラー"}）。時間を置いて再送信するか、URLを送ってくれた運営側へご連絡ください。`
      );
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

  const renderTrackQuestionFields = (question) => {
    const trackFields = normalizeTrackFields(question.trackFields);
    const audioField = trackFields.find((field) => field.type === "audio");
    const detailFields = trackFields.filter((field) => field.type !== "audio");

    const renderDetailField = (field) => {
      if (field.type === "title") {
        return (
          <label key={field.type}>
            <span>{field.label}</span>
            <input
              required={Boolean(question.required)}
              placeholder={field.placeholder || ""}
              value={answers[question.id]?.title ?? ""}
              onChange={(event) => updateTrackAnswer(question.id, { title: event.target.value })}
            />
            {field.help && <small>{field.help}</small>}
          </label>
        );
      }
      if (field.type === "artist") {
        return (
          <label key={field.type}>
            <span>{field.label}</span>
            <input
              required={Boolean(question.required)}
              placeholder={field.placeholder || ""}
              value={answers[question.id]?.artist ?? ""}
              onChange={(event) => updateTrackAnswer(question.id, { artist: event.target.value })}
            />
            {field.help && <small>{field.help}</small>}
          </label>
        );
      }
      if (field.type === "url") {
        return (
          <label key={field.type}>
            <span>{field.label}</span>
            <input
              type="url"
              required={Boolean(question.required)}
              pattern={TRACK_URL_PATTERN}
              title={TRACK_URL_ERROR_MESSAGE}
              placeholder={field.placeholder || ""}
              value={answers[question.id]?.url ?? ""}
              onChange={(event) => updateTrackUrlAnswer(question.id, event)}
              onInvalid={(event) => event.target.setCustomValidity(event.target.value ? TRACK_URL_ERROR_MESSAGE : "")}
              onInput={(event) => event.target.setCustomValidity(isSupportedTrackUrl(event.target.value) ? "" : TRACK_URL_ERROR_MESSAGE)}
            />
            {field.help && <small>{field.help}</small>}
          </label>
        );
      }
      return null;
    };

    return (
      <div className="track-question-fields">
        {audioField && (
          <div className="track-audio-upload-block">
            <label>
              <span>{audioField.label}</span>
              <input
                type="file"
                required={Boolean(question.required)}
                accept={AUDIO_FILE_ACCEPT}
                onChange={(event) => updateTrackFileAnswer(question.id, event)}
              />
              <small>
                {answers[question.id]?.audio?.fileName
                  ? `選択済み: ${formatAnswerValue(answers[question.id].audio)}`
                  : `${audioField.help || "WAVまたはMP3をアップロードしてください。"}（1曲あたり${attachmentLimitMb}MBまで）`}
              </small>
            </label>
            <TrackPreview track={answers[question.id]} />
            {audioField.note && <p className="hint-text track-entry-help">{audioField.note}</p>}
          </div>
        )}
        {detailFields.map(renderDetailField)}
      </div>
    );
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
            {(period || episode || form.receptionStartDate || form.receptionEndDate || submissionLimit > 0 || attachmentLimitMb > 0) && (
              <div className="public-context">
                {period && <span>応募期間: {period.title || period.id} / {formatDateRange(period.startDate, period.endDate)}</span>}
                {episode && <span>放送回: {episode.date || "-"} {episode.title || ""}</span>}
                <span>添付: 1ファイルあたり{attachmentLimitMb}MBまで</span>
                {submissionLimit > 0 && (
                  <span>応募数: {submissionStatus.loading ? "確認中" : submissionStatus.count !== null ? `${submissionStatus.count} / ${submissionLimit}` : `上限 ${submissionLimit}件`}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {availabilityWindows.length > 0 && (
          <div className="availability-banner" aria-label="受付期間">
            <strong><CalendarDays size={16} />受付中</strong>
            <div>
              {availabilityWindows.map((item) => (
                <span key={item.label}>{item.label}: {formatDateRange(item.startDate, item.endDate)}</span>
              ))}
            </div>
          </div>
        )}

        {formError && <p className="form-error">{formError}</p>}
        {submitStatus && <p className="submit-status">{submitStatus}</p>}
        {submissionLimit > 0 && submissionStatus.error && (
          <p className="hint-text">応募数の確認ができませんでした。送信時にも受付状況を確認します。</p>
        )}

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
              {String(question.help || "").trim() && <p className="question-help">{question.help}</p>}
              {question.kind === "file" ? (
                <div className="upload-field">
                  <input
                    type="file"
                    required={Boolean(question.required)}
                    accept={AUDIO_FILE_ACCEPT}
                    onChange={(event) => updateFileAnswer(question.id, event)}
                  />
                  <small>{answers[question.id]?.fileName ? `選択済み: ${formatAnswerValue(answers[question.id])}` : `WAVまたはMP3をアップロード（1ファイルあたり${attachmentLimitMb}MBまで）`}</small>
                </div>
              ) : question.kind === "image" ? (
                <div className="upload-field">
                  <input
                    type="file"
                    required={Boolean(question.required)}
                    accept={IMAGE_FILE_ACCEPT}
                    onChange={(event) => updateImageAnswer(question.id, event)}
                  />
                  <small>{answers[question.id]?.fileName ? `選択済み: ${formatAnswerValue(answers[question.id])}` : `PNG、JPG、WebP、GIFをアップロード（1ファイルあたり${attachmentLimitMb}MBまで）`}</small>
                  {answers[question.id]?.dataUrl && (
                    <img className="image-answer-preview" src={answers[question.id].dataUrl} alt={`${question.label} preview`} />
                  )}
                </div>
              ) : question.kind === "track" ? (
                renderTrackQuestionFields(question)
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

export function TrackPreview({ track }) {
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

