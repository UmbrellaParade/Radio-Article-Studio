// 共有UI部品
import React from "react";
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
  MAX_SUBMISSION_BYTES,
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

export function Header({ logoSrc }) {
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


export function StatusLine({ done, label }) {
  return (
    <div className={done ? "status-line done" : "status-line"}>
      <span>{done ? "完了" : "未完"}</span>
      <b>{label}</b>
    </div>
  );
}


export function SectionTitle({ title, subtitle, action }) {
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

export function Field({ label, value, onChange = () => {}, type = "text", placeholder = "", readOnly = false, wide = false }) {
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

export function TextArea({ label, value, onChange }) {
  return (
    <label className="field wide">
      <span>{label}</span>
      <textarea value={value ?? ""} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

export function SliderField({ label, value, onChange, min = "0", max = "100", disabled = false }) {
  return (
    <label className={disabled ? "field field-disabled" : "field"}>
      <span>{label}: {value}%</span>
      <input type="range" min={min} max={max} value={value ?? 50} disabled={disabled} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

export function SelectField({ label, value, onChange, options, labels = {} }) {
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

