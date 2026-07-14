// サムネ合成のCanvas描画ヘルパー（React非依存）
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
} from "./core.js";

export const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const assertCanvasImageReadable = (image) => {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0, 1, 1);
  canvas.toDataURL("image/png");
};

export const loadCanvasImageSource = (src) =>
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

export const loadCanvasImage = async (src) => {
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

export const loadCanvasImageAsDataUrl = async (src, maxSide = 1200) => {
  const image = await loadCanvasImage(src);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const scale = Math.min(1, maxSide / Math.max(width || maxSide, height || maxSide));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round((width || maxSide) * scale));
  canvas.height = Math.max(1, Math.round((height || maxSide) * scale));
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
};

export const hydrateGuestIconForCanvas = async (guestIcon, imageDataUrlResolver) => {
  if (!guestIcon?.dataUrl || String(guestIcon.dataUrl).startsWith("data:")) return guestIcon;
  const sources = [guestIcon.dataUrl, guestIcon.sourceUrl].map((source) => String(source || "").trim()).filter(Boolean);
  const uniqueSources = [...new Set(sources)];

  for (const source of uniqueSources) {
    if (imageDataUrlResolver) {
      try {
        const dataUrl = await imageDataUrlResolver(source);
        if (dataUrl && String(dataUrl).startsWith("data:")) {
          return { ...guestIcon, sourceUrl: guestIcon.sourceUrl || guestIcon.dataUrl, dataUrl };
        }
      } catch {
        // Fall through to public URL/CORS candidates.
      }
    }

    try {
      const dataUrl = await loadCanvasImageAsDataUrl(source);
      if (dataUrl && String(dataUrl).startsWith("data:")) {
        return { ...guestIcon, sourceUrl: guestIcon.sourceUrl || guestIcon.dataUrl, dataUrl };
      }
    } catch {
      // Try the next candidate.
    }
  }

  return guestIcon;
};

export const hydrateGuestIconsForCanvas = async (icon, icons = [], imageDataUrlResolver) => {
  const guestIcons = normalizeGuestIconList(icon, icons);
  return Promise.all(guestIcons.map((guestIcon) => hydrateGuestIconForCanvas(guestIcon, imageDataUrlResolver)));
};

export function drawCoverAt(ctx, image, x, y, width, height, crop = {}) {
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

export function drawCover(ctx, image, width, height) {
  drawCoverAt(ctx, image, 0, 0, width, height);
}


export const isCustomTemplate = (template) => template?.source === "custom";
export const getTemplateSource = (template) => (isCustomTemplate(template) ? template?.dataUrl || "" : template?.assetUrl || "");
export const getNormalizedThumbnailTemplate = (presetKey, template) => ({
  ...defaultThumbnailStudio.templates[presetKey],
  ...(template ?? {})
});

export async function resolveThumbnailTemplateForRender(presetKey, template) {
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

export function drawDateBadge(ctx, preset, dateString) {
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

export function drawGuestName(ctx, preset, template, guestName) {
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

export function drawGuestBadge(ctx, preset, template, hasGuestContent, badgeImage) {
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

export async function renderThumbnail({ preset, template, icon, icons = [], date, guestName, iconDataUrlResolver, requireIcon = false }) {
  const normalizedTemplate = getNormalizedThumbnailTemplate(preset.key, template);
  const templateSource = getTemplateSource(normalizedTemplate);
  if (!templateSource) throw new Error("template-missing");
  const canvas = document.createElement("canvas");
  canvas.width = preset.width;
  canvas.height = preset.height;
  const ctx = canvas.getContext("2d");
  const guestIcons = await hydrateGuestIconsForCanvas(icon, icons, iconDataUrlResolver);
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
  if (requireIcon && guestIcons.length > 0 && drawableIcons.length === 0) {
    throw new Error("guest-icon-unreadable");
  }
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

export async function renderListenerHeadingThumbnail({ track, episode }) {
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

export async function saveThumbnailDataUrl(preset, dataUrl, guestName) {
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

