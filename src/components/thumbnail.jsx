// サムネ合成スタジオと素材ビュー
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

export function GuestIconCropPreview({ icon, label }) {
  const canvasRef = useRef(null);
  const [useFallbackImage, setUseFallbackImage] = useState(false);

  useEffect(() => {
    let active = true;
    const canvas = canvasRef.current;
    if (!canvas || !icon?.dataUrl) return () => {
      active = false;
    };

    const size = 240;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "#f7efe4";
    ctx.fillRect(0, 0, size, size);
    setUseFallbackImage(false);

    loadCanvasImage(icon.dataUrl)
      .then((image) => {
        if (!active) return;
        ctx.clearRect(0, 0, size, size);
        ctx.save();
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.clip();
        drawCoverAt(ctx, image, 0, 0, size, size, icon);
        ctx.restore();
      })
      .catch(() => {
        if (active) setUseFallbackImage(true);
      });

    return () => {
      active = false;
    };
  }, [icon?.dataUrl, icon?.cropX, icon?.cropY, icon?.cropZoom]);

  return (
    <span className="icon-crop-canvas-wrap">
      <canvas ref={canvasRef} aria-label={label} role="img" />
      {useFallbackImage && (
        <img
          src={icon.dataUrl}
          alt={label}
          style={{
            objectPosition: `${icon.cropX}% ${icon.cropY}%`,
            transform: `scale(${icon.cropZoom / 100})`,
            transformOrigin: `${icon.cropX}% ${icon.cropY}%`
          }}
        />
      )}
    </span>
  );
}


export function GuestIconCropCard({ icon, index, onPatch, onRemove }) {
  const [aspect, setAspect] = useState(1);

  useEffect(() => {
    let active = true;
    if (!icon?.dataUrl) return undefined;
    loadCanvasImage(icon.dataUrl)
      .then((image) => {
        if (active && image.width && image.height) setAspect(image.width / image.height);
      })
      .catch(() => {
        // 読み込めない画像は正方形とみなす（ヒント表示の判定にしか使わない）
      });
    return () => {
      active = false;
    };
  }, [icon?.dataUrl]);

  // 切り抜き枠は正方形（円形クリップ）。cover配置ではみ出しがある軸だけ位置調整が効く。
  const zoomedIn = Number(icon.cropZoom || 100) > 100;
  const canPanX = zoomedIn || aspect > 1.001;
  const canPanY = zoomedIn || aspect < 0.999;

  return (
    <div className="icon-crop-card">
      <div className="icon-crop-preview">
        <GuestIconCropPreview icon={icon} label={`切り抜き確認 ${index + 1}`} />
      </div>
      <div className="icon-crop-controls">
        <div className="icon-crop-head">
          <strong>{index + 1}. {icon.name || "（名前なし）"}</strong>
          {onRemove && (
            <button className="icon-danger" onClick={() => onRemove(index)} aria-label={`アイコン${index + 1}を解除`} title="このアイコンだけ解除">
              <Trash2 size={16} />
            </button>
          )}
        </div>
        {!String(icon.dataUrl || "").startsWith("data:") && (
          <p className="hint-text">外部URL画像のため、プレビューやPNG合成に表示されない場合があります。表示されない時はこのアイコンを解除して、画像ファイルを直接登録してください。</p>
        )}
        <SliderField label="切り抜き 拡大率" value={icon.cropZoom} onChange={(value) => onPatch(index, { cropZoom: value })} min="100" max="300" />
        <SliderField label="切り抜き 横位置" value={icon.cropX} onChange={(value) => onPatch(index, { cropX: value })} disabled={!canPanX} />
        <SliderField label="切り抜き 縦位置" value={icon.cropY} onChange={(value) => onPatch(index, { cropY: value })} disabled={!canPanY} />
        {(!canPanX || !canPanY) && (
          <p className="hint-text">
            アイコンが枠にぴったり収まっているため、{!canPanX && !canPanY ? "位置" : !canPanX ? "横位置" : "縦位置"}を動かす余白がありません。先に「拡大率」を上げると位置を調整できます。
          </p>
        )}
      </div>
    </div>
  );
}

export function ThumbnailComposer({ studio, updateStudio, guestName, episodeDate, settings = {} }) {
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
  const generatedReadyCount = THUMBNAIL_PRESETS.filter((preset) => generatedImages[preset.key] || generated[preset.key]).length;
  const allThumbnailsReady = generatedReadyCount === THUMBNAIL_PRESETS.length;

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

  const removeGuestIcon = (index) => {
    const presetKeys = THUMBNAIL_PRESETS.map((preset) => preset.key);
    const nextGuestIcons = guestIcons.filter((_, iconIndex) => iconIndex !== index);
    forgetGeneratedImages(presetKeys);
    updateStudio((current) => ({
      ...defaultThumbnailStudio,
      ...current,
      generated: removeGeneratedRecords(current.generated, presetKeys),
      guestIcon: nextGuestIcons[0] ?? { ...defaultThumbnailStudio.guestIcon },
      guestIcons: nextGuestIcons
    }));
    setMessage(`アイコン${index + 1}を解除しました。古い生成画像は解除しました。`);
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

  const generateAll = async () => {
    setGeneratingKey("all");
    setMessage("3種類のサムネをまとめて生成しています。");
    try {
      const imageEntries = [];
      const generatedEntries = [];
      for (const preset of THUMBNAIL_PRESETS) {
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
        imageEntries.push([preset.key, dataUrl]);
        generatedEntries.push([preset.key, generatedRecord]);
      }
      setGeneratedImages((current) => ({ ...current, ...Object.fromEntries(imageEntries) }));
      updateStudio((current) => ({
        ...defaultThumbnailStudio,
        ...current,
        generated: {
          ...(current.generated ?? {}),
          ...Object.fromEntries(generatedEntries)
        }
      }));
      setMessage("3種類のサムネをまとめて生成して保存しました。");
    } catch {
      setMessage("一括生成に失敗しました。ベース画像やゲストアイコンを確認してください。");
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

  const collectGeneratedThumbnailItems = async () => {
    const items = [];
    for (const preset of THUMBNAIL_PRESETS) {
      const saved = generated[preset.key];
      if (!saved) continue;
      let dataUrl = generatedImages[preset.key] || saved.dataUrl || "";
      if (!dataUrl && saved.imageKey) {
        try {
          dataUrl = await loadGeneratedThumbnailImage(saved.imageKey);
        } catch {
          dataUrl = "";
        }
      }
      if (!dataUrl) continue;
      items.push({
        key: preset.key,
        label: preset.label,
        width: preset.width,
        height: preset.height,
        fileName: saved.fileName || `${guestName || "guest"}-${preset.fileName}`,
        mimeType: "image/png",
        generatedAt: saved.generatedAt || "",
        dataUrl
      });
    }
    return items;
  };

  const saveAllToPcFolder = async () => {
    const items = await collectGeneratedThumbnailItems();
    if (items.length !== THUMBNAIL_PRESETS.length) {
      setMessage("3種類すべてを生成してから一括保存してください。");
      return;
    }
    if (!window.showDirectoryPicker) {
      items.forEach((item) => downloadDataUrlFile(item.dataUrl, item.fileName));
      setMessage("このブラウザではフォルダー選択に未対応のため、3枚を通常ダウンロードしました。");
      return;
    }
    try {
      const directoryHandle = await window.showDirectoryPicker({ mode: "readwrite" });
      for (const item of items) {
        await writeDataUrlToDirectory(directoryHandle, item.fileName, item.dataUrl);
      }
      setMessage(`${directoryHandle.name} に3枚のPNGを保存しました。`);
    } catch {
      setMessage("PCフォルダーへの一括保存をキャンセルしました。");
    }
  };

  const saveAllToDrive = async () => {
    const endpointUrl = String(settings.thumbnailDriveEndpointUrl || "").trim();
    if (!endpointUrl) {
      setMessage("設定で「サムネDrive保存Webhook URL」を入力してください。");
      return;
    }
    const items = await collectGeneratedThumbnailItems();
    if (items.length !== THUMBNAIL_PRESETS.length) {
      setMessage("3種類すべてを生成してからDriveへ保存してください。");
      return;
    }
    try {
      const result = await postToGasEndpoint(endpointUrl, {
        action: "saveThumbnails",
        type: "thumbnail_bundle",
        token: String(settings.responseSyncToken || "").trim(),
        createdAt: new Date().toISOString(),
        guestName,
        episodeDate: thumbnailDate,
        driveFolderUrl: settings.thumbnailDriveFolderUrl || "",
        images: items
      });
      const savedCount = Array.isArray(result.savedFiles) ? result.savedFiles.length : items.length;
      setMessage(`Driveへ${savedCount}枚のPNGを保存しました。`);
    } catch (error) {
      setMessage(`Driveへ保存できませんでした（${error?.message || "不明なエラー"}）。URLやApps Scriptの公開設定を確認してください。`);
    }
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

      <div className="thumbnail-bulk-actions">
        <button className="primary" onClick={generateAll} disabled={generatingKey === "all"}>
          <Image size={16} />{generatingKey === "all" ? "一括生成中" : "3枚まとめて生成"}
        </button>
        <button className="secondary" onClick={saveAllToPcFolder} disabled={!allThumbnailsReady || generatingKey === "all"}>
          <Download size={16} />3枚をPCへ一括保存
        </button>
        <button className="secondary" onClick={saveAllToDrive} disabled={!allThumbnailsReady || generatingKey === "all"}>
          <Send size={16} />3枚をDriveへ保存
        </button>
        <p className="hint-text wide">PC保存は保存先フォルダーを選んで3枚まとめて書き出します。Drive保存は設定のWebhook URLへ送信します。</p>
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
                <GuestIconCropPreview
                  icon={icon}
                  label={`登録済みゲストアイコン ${index + 1}`}
                  key={`${icon.name}-${index}`}
                />
              ))}
            </div>
            <p className="muted">ゲストアイコン: {guestIcons.map((icon) => icon.name).join(" / ")}</p>
            <button className="secondary" onClick={clearGuestIcon}><X size={16} />全アイコンを解除</button>
          </div>
          <div className="icon-crop-list">
            {guestIcons.map((icon, index) => (
              <GuestIconCropCard icon={icon} index={index} onPatch={patchGuestIconCrop} onRemove={removeGuestIcon} key={`${icon.id}-${index}`} />
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
                <button className="primary" onClick={() => generateOne(preset)} disabled={generatingKey === preset.key || generatingKey === "all"}>
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

export function Assets({ thumbnailStudio, updateThumbnailStudio, guestName, episodeDate, settings }) {
  return (
    <div className="view-stack">
      <SectionTitle title="サムネ/素材管理" subtitle="記事16:9、stand.fm 1:1、配信背景9:16を放送回に紐づけて作成します。" />
      <ThumbnailComposer studio={thumbnailStudio} updateStudio={updateThumbnailStudio} guestName={guestName} episodeDate={episodeDate} settings={settings} />
    </div>
  );
}

