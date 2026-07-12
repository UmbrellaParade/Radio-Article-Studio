// Radio Article Studio 受信口（Google Apps Script）
//
// この1本のWebアプリで以下を担当します。
//   1. 共有フォームからの回答受信（doPost action=submitResponse）
//      - 回答JSONを _responses/ に保存
//      - 音源/画像の添付を放送回フォルダーに実ファイルとして保存
//      - スプレッドシート「回答ログ」に1行追記
//   2. ツールの「新着回答を同期」への回答一覧配信（doGet action=listResponses）
//   3. 短いURLフォーム定義の公開/配信（doPost action=publishForm / doGet action=getForm）
//   4. サムネPNGのDrive保存（doPost action=saveThumbnails）
//
// セットアップ手順は docs/google-drive-response-endpoint.md を参照。

// 回答保存先のGoogle DriveフォルダーID（既定値）。
// ツールの設定「回答保存先Google DriveフォルダーURL」を入れると、そちらが優先される。
const FOLDER_ID = "1FnQ0knOIUKnTOYisf7JdKJNORsTgDwza";

// ツールの設定画面「回答同期トークン」と同じ文字列にする（好きな合言葉でOK）
const SECRET_TOKEN = "ここを好きな合言葉に変更";

// このサイズ以下の画像（ゲストアイコンなど）は、Drive保存に加えて回答JSONにも残す。
// サムネ合成でそのまま使えるようにするため。音源はDrive保存のみ。
const INLINE_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
const SCRIPT_VERSION = "2026-07-13-response-details";

const RESPONSES_DIR = "_responses";
const FORMS_DIR = "_forms";
const THUMBNAILS_DIR = "サムネ";
const LOG_SHEET_NAME = "回答ログ";
const DETAIL_SHEET_NAME = "回答詳細";
const TRACKS_DIR = "楽曲";
const LOG_HEADERS = [
  "受信日時",
  "回答者",
  "フォームID",
  "放送回ID",
  "期間ID",
  "添付数",
  "JSONファイル",
  "受付ID",
  "フォーム名",
  "フォーム種別",
  "放送回",
  "応募期間",
  "フォーム受付期間",
  "公開プロフィール",
  "記事/SNS用回答",
  "制作側メモ",
  "触れないこと・表記ルール",
  "楽曲情報",
  "全質問回答",
  "添付ファイルURL",
  "JSON保存先URL"
];
const DETAIL_HEADERS = [
  "受信日時",
  "受付ID",
  "回答者",
  "フォーム名",
  "フォームID",
  "放送回ID",
  "期間ID",
  "JSONファイル",
  "質問ID",
  "質問内容",
  "用途",
  "入力形式",
  "回答",
  "楽曲名",
  "アーティスト名",
  "楽曲URL",
  "大容量音源URL",
  "添付ファイル名",
  "添付URL",
  "JSON保存先URL"
];

function jsonOutput(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action || (payload.response ? "submitResponse" : payload.type === "thumbnail_bundle" ? "saveThumbnails" : "");
    if (action === "submitResponse") return handleSubmitResponse(payload);
    if (action === "publishForm") {
      requireToken(payload.token);
      return handlePublishForm(payload);
    }
    if (action === "saveThumbnails") {
      requireToken(payload.token);
      return handleSaveThumbnails(payload);
    }
    return jsonOutput({ ok: false, error: "未対応のactionです: " + action });
  } catch (error) {
    return jsonOutput({ ok: false, error: errorMessage(error) });
  }
}

function doGet(e) {
  try {
    const params = (e && e.parameter) || {};
    const action = params.action || "ping";
    if (action === "ping") return jsonOutput({ ok: true, version: SCRIPT_VERSION, now: new Date().toISOString() });
    if (action === "getForm") return handleGetForm(params);
    if (action === "submissionStatus") return handleSubmissionStatus(params);
    if (action === "listResponses") {
      requireToken(params.token);
      return handleListResponses(params);
    }
    return jsonOutput({ ok: false, error: "未対応のactionです: " + action });
  } catch (error) {
    return jsonOutput({ ok: false, error: errorMessage(error) });
  }
}

function errorMessage(error) {
  return String(error && error.message ? error.message : error);
}

function requireToken(token) {
  if (!SECRET_TOKEN || SECRET_TOKEN.indexOf("ここを") === 0) {
    throw new Error("Apps Script側のSECRET_TOKENが未設定です。Code.gsのSECRET_TOKENを合言葉に変更してください。");
  }
  if (String(token || "") !== SECRET_TOKEN) {
    throw new Error("トークンが一致しません。ツール設定の「回答同期トークン」を確認してください。");
  }
}

function getRootFolder(folderRef) {
  const raw = String(folderRef || "").trim();
  if (raw) {
    // DriveフォルダーURL（.../folders/{ID}）でも生のIDでも受け付ける
    const idMatch = raw.match(/[-\w]{25,}/);
    if (idMatch) {
      try {
        return DriveApp.getFolderById(idMatch[0]);
      } catch (error) {
        throw new Error("指定のDriveフォルダーを開けません。URLと共有設定を確認してください: " + raw);
      }
    }
  }
  return DriveApp.getFolderById(FOLDER_ID);
}

function getOrCreateFolder(parent, name) {
  const folders = parent.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : parent.createFolder(name);
}

function sanitizeName(value, fallback) {
  const cleaned = String(value || "")
    .replace(/[\\/:*?"<>|#\[\]]/g, "_")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || fallback;
}

function decodeDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return Utilities.newBlob(Utilities.base64Decode(match[2]), match[1]);
}

function nowStamp() {
  return Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyyMMdd-HHmmss");
}

function todayDateString() {
  return Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy-MM-dd");
}

function isAudioAttachment(attachment) {
  const mimeType = String(attachment && attachment.mimeType ? attachment.mimeType : "").toLowerCase();
  const fileName = String(attachment && attachment.fileName ? attachment.fileName : "").toLowerCase();
  return (
    mimeType.indexOf("audio/") === 0 ||
    /\.(mp3|wav|m4a|aac|flac|ogg|opus)$/i.test(fileName)
  );
}

function normalizeSubmissionLimit(value) {
  const limit = Math.floor(Number(value || 0));
  return isFinite(limit) && limit > 0 ? limit : 0;
}

function countSubmittedResponses(root, formId, periodId) {
  const targetFormId = String(formId || "").trim();
  const targetPeriodId = String(periodId || "").trim();
  if (!targetFormId) return 0;
  const responsesFolder = getOrCreateFolder(root, RESPONSES_DIR);
  const files = responsesFolder.getFiles();
  let count = 0;
  while (files.hasNext()) {
    const file = files.next();
    if (file.getName().slice(-5) !== ".json") continue;
    try {
      const payload = JSON.parse(file.getBlob().getDataAsString("UTF-8"));
      const response = payload.response || {};
      if (String(response.formId || "") !== targetFormId) continue;
      if (targetPeriodId && String(response.periodId || "") !== targetPeriodId) continue;
      count += 1;
    } catch (error) {
      // 壊れたJSONは件数確認から除外
    }
  }
  return count;
}

function enforceSubmissionAvailability(root, payload) {
  const form = payload.form || {};
  const period = payload.period || {};
  const response = payload.response || {};
  const today = todayDateString();
  const dateRules = [
    { label: "フォーム受付期間", startDate: form.receptionStartDate || "", endDate: form.receptionEndDate || "" },
    { label: "応募期間", startDate: period.startDate || "", endDate: period.endDate || "" }
  ];
  for (let i = 0; i < dateRules.length; i += 1) {
    const rule = dateRules[i];
    if (rule.startDate && today < rule.startDate) {
      throw new Error(rule.label + "の開始前です。");
    }
    if (rule.endDate && today > rule.endDate) {
      throw new Error(rule.label + "は終了しています。");
    }
  }

  const limit = normalizeSubmissionLimit(form.submissionLimit);
  if (!limit) return;
  const formId = response.formId || form.id || "";
  const periodId = response.periodId || period.id || "";
  const count = countSubmittedResponses(root, formId, periodId);
  if (count >= limit) {
    throw new Error("応募数の上限に達しています。");
  }
}

// ---- 回答受信 ----

function handleSubmitResponse(payload) {
  const root = getRootFolder(payload.driveFolderUrl || (payload.submission && payload.submission.driveFolderUrl));
  const response = payload.response || {};
  enforceSubmissionAvailability(root, payload);
  const stamp = nowStamp();
  const respondent = sanitizeName(response.respondent, "回答者");
  const episodeLabel = sanitizeName(
    (payload.episode && payload.episode.date) || response.episodeId || "未分類",
    "未分類"
  );
  const attachmentFolders = {};
  const savedFiles = [];
  const savedCache = {}; // 同じ添付がresponse.attachmentsとrawAnswersの両方に入っているため二重保存を防ぐ

  const getAttachmentFolder = function (attachment) {
    const folderName = isAudioAttachment(attachment) ? TRACKS_DIR : episodeLabel;
    if (!attachmentFolders[folderName]) {
      attachmentFolders[folderName] = getOrCreateFolder(root, folderName);
    }
    return { folder: attachmentFolders[folderName], folderName: folderName };
  };

  const processAttachment = function (attachment) {
    if (!attachment || !attachment.dataUrl) return attachment;
    const cacheKey = (attachment.fileName || "") + ":" + (attachment.size || 0);
    let saved = savedCache[cacheKey];
    if (!saved) {
      const blob = decodeDataUrl(attachment.dataUrl);
      if (!blob) return attachment;
      const fileName = stamp + "_" + respondent + "_" + sanitizeName(attachment.fileName, "attachment");
      blob.setName(fileName);
      const target = getAttachmentFolder(attachment);
      const file = target.folder.createFile(blob);
      saved = { fileName: fileName, driveUrl: file.getUrl(), driveFileId: file.getId(), folderName: target.folderName };
      savedCache[cacheKey] = saved;
      savedFiles.push({ fileName: fileName, url: saved.driveUrl, folderName: target.folderName });
    }
    const isSmallImage =
      String(attachment.mimeType || "").indexOf("image/") === 0 &&
      Number(attachment.size || 0) <= INLINE_IMAGE_MAX_BYTES;
    const next = {};
    for (const key in attachment) next[key] = attachment[key];
    next.driveUrl = saved.driveUrl;
    next.driveFileId = saved.driveFileId;
    next.driveFolderName = saved.folderName || "";
    // 音源などの大きいデータはDrive本体を正とし、JSONからbase64を外して軽くする
    if (!isSmallImage) delete next.dataUrl;
    return next;
  };

  if (Array.isArray(response.attachments)) {
    response.attachments = response.attachments.map(processAttachment);
  }
  if (Array.isArray(payload.rawAnswers)) {
    payload.rawAnswers = payload.rawAnswers.map(function (answer) {
      if (!answer) return answer;
      if (answer.attachment) answer.attachment = processAttachment(answer.attachment);
      if (answer.track && answer.track.audio) answer.track.audio = processAttachment(answer.track.audio);
      return answer;
    });
  }

  const responsesFolder = getOrCreateFolder(root, RESPONSES_DIR);
  const jsonName = stamp + "_" + respondent + ".json";
  const jsonFile = responsesFolder.createFile(jsonName, JSON.stringify(payload, null, 2), "application/json");

  appendResponseLog(root, payload, savedFiles, jsonName, jsonFile.getUrl());

  return jsonOutput({ ok: true, savedAs: jsonName, savedFiles: savedFiles, now: new Date().toISOString() });
}

function appendResponseLog(root, payload, savedFiles, jsonName, jsonUrl) {
  const receivedAt = new Date();
  appendLogRow(root, buildLogRow(payload, savedFiles, jsonName, jsonUrl, receivedAt));
  appendDetailRows(root, buildDetailRows(payload, jsonName, jsonUrl, receivedAt));
}

function buildLogRow(payload, savedFiles, jsonName, jsonUrl, receivedAt) {
  const response = payload.response || {};
  const form = payload.form || {};
  const period = payload.period || {};
  const episode = payload.episode || {};
  const savedFileList = savedFiles || [];
  return [
    receivedAt || response.submittedAt || payload.exportedAt || new Date(),
    response.respondent || "",
    response.formId || "",
    response.episodeId || "",
    response.periodId || "",
    savedFileList.length,
    jsonName,
    response.id || "",
    form.name || "",
    form.type || "",
    formatEpisodeForLog(episode, response.episodeId),
    formatPeriodForLog(period),
    formatDateRangeForLog(form.receptionStartDate, form.receptionEndDate),
    truncateForLogCell(response.publicInfo || ""),
    truncateForLogCell(response.articleUse || ""),
    truncateForLogCell(response.internalOnly || ""),
    truncateForLogCell(response.constraints || ""),
    truncateForLogCell(formatTracksForLog(payload.rawAnswers || [])),
    truncateForLogCell(formatRawAnswersForLog(payload.rawAnswers || [])),
    truncateForLogCell(formatSavedFilesForLog(savedFileList)),
    jsonUrl || ""
  ];
}

function rebuildResponseLogFromJson() {
  const root = getRootFolder();
  const responsesFolder = getOrCreateFolder(root, RESPONSES_DIR);
  const rows = [];
  const detailRows = [];
  const files = responsesFolder.getFiles();
  while (files.hasNext()) {
    const file = files.next();
    if (file.getName().slice(-5) !== ".json") continue;
    try {
      const payload = JSON.parse(file.getBlob().getDataAsString("UTF-8"));
      const receivedAt = file.getDateCreated();
      rows.push(
        buildLogRow(
          payload,
          collectSavedFilesFromPayload(payload),
          file.getName(),
          file.getUrl(),
          receivedAt
        )
      );
      detailRows.push.apply(detailRows, buildDetailRows(payload, file.getName(), file.getUrl(), receivedAt));
    } catch (error) {
      // 壊れたJSONは復元対象から除外
    }
  }
  rows.sort(function (a, b) {
    return new Date(a[0]).getTime() - new Date(b[0]).getTime();
  });
  detailRows.sort(function (a, b) {
    return new Date(a[0]).getTime() - new Date(b[0]).getTime();
  });
  const sheet = getResponseSheet(root, LOG_SHEET_NAME);
  sheet.clearContents();
  ensureSheetHeader(sheet, LOG_HEADERS);
  if (rows.length) {
    sheet.getRange(2, 1, rows.length, LOG_HEADERS.length).setValues(rows);
  }
  const detailSheet = getResponseSheet(root, DETAIL_SHEET_NAME);
  detailSheet.clearContents();
  ensureSheetHeader(detailSheet, DETAIL_HEADERS);
  if (detailRows.length) {
    detailSheet.getRange(2, 1, detailRows.length, DETAIL_HEADERS.length).setValues(detailRows);
  }
  return "回答ログを" + rows.length + "件、回答詳細を" + detailRows.length + "行で作り直しました。";
}

function appendLogRow(root, row) {
  try {
    const sheet = getResponseSheet(root, LOG_SHEET_NAME);
    ensureSheetHeader(sheet, LOG_HEADERS);
    sheet.appendRow(row);
  } catch (error) {
    // ログ追記の失敗で回答受信全体を失敗にしない
  }
}

function appendDetailRows(root, rows) {
  if (!rows || !rows.length) return;
  try {
    const sheet = getResponseSheet(root, DETAIL_SHEET_NAME);
    ensureSheetHeader(sheet, DETAIL_HEADERS);
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, DETAIL_HEADERS.length).setValues(rows);
  } catch (error) {
    // 詳細ログの失敗で回答受信全体を失敗にしない
  }
}

function getResponseSpreadsheet(root) {
  const files = root.getFilesByName(LOG_SHEET_NAME);
  let spreadsheet;
  if (files.hasNext()) {
    spreadsheet = SpreadsheetApp.open(files.next());
  } else {
    spreadsheet = SpreadsheetApp.create(LOG_SHEET_NAME);
    DriveApp.getFileById(spreadsheet.getId()).moveTo(root);
  }
  return spreadsheet;
}

function getResponseSheet(root, sheetName) {
  const spreadsheet = getResponseSpreadsheet(root);
  const existing = spreadsheet.getSheetByName(sheetName);
  if (existing) return existing;
  if (sheetName === LOG_SHEET_NAME) {
    const active = spreadsheet.getActiveSheet();
    try {
      active.setName(LOG_SHEET_NAME);
    } catch (error) {
      // 同名シートがないのに改名できない場合だけ新規作成へ進む
    }
    if (active.getName() === LOG_SHEET_NAME) return active;
  }
  return spreadsheet.insertSheet(sheetName);
}

function ensureSheetHeader(sheet, headers) {
  const currentWidth = Math.max(sheet.getLastColumn(), headers.length);
  const currentHeaders =
    sheet.getLastRow() > 0 && currentWidth > 0
      ? sheet.getRange(1, 1, 1, currentWidth).getValues()[0]
      : [];
  let shouldWrite = sheet.getLastRow() === 0;
  const nextHeaders = [];
  for (let i = 0; i < headers.length; i += 1) {
    nextHeaders[i] = currentHeaders[i] || headers[i];
    if (nextHeaders[i] !== headers[i]) {
      nextHeaders[i] = headers[i];
      shouldWrite = true;
    }
  }
  if (currentHeaders.length < headers.length) shouldWrite = true;
  if (shouldWrite) {
    sheet.getRange(1, 1, 1, headers.length).setValues([nextHeaders]);
    sheet.setFrozenRows(1);
  }
}

function formatEpisodeForLog(episode, fallbackId) {
  const parts = [];
  if (episode.date) parts.push(episode.date);
  if (episode.title) parts.push(episode.title);
  if (episode.slot) parts.push(episode.slot);
  return parts.join(" / ") || fallbackId || "";
}

function formatPeriodForLog(period) {
  if (!period || (!period.title && !period.startDate && !period.endDate)) return "";
  const range = formatDateRangeForLog(period.startDate, period.endDate);
  return [period.title || period.id || "", range].filter(Boolean).join(" / ");
}

function formatDateRangeForLog(startDate, endDate) {
  if (!startDate && !endDate) return "指定なし";
  if (startDate && endDate) return startDate + " 〜 " + endDate;
  if (startDate) return startDate + " 〜";
  return "〜 " + endDate;
}

function formatSavedFilesForLog(savedFiles) {
  return (savedFiles || [])
    .map(function (file) {
      return [
        file.folderName ? "保存フォルダー: " + file.folderName : "",
        file.fileName || "",
        file.url || ""
      ]
        .filter(Boolean)
        .join("\n");
    })
    .filter(Boolean)
    .join("\n\n");
}

function collectSavedFilesFromPayload(payload) {
  const collected = [];
  const seen = {};
  const addAttachment = function (attachment) {
    if (!attachment) return;
    const url = attachment.driveUrl || attachment.url || attachment.sourceUrl || "";
    const key = attachment.driveFileId || url || attachment.fileName || "";
    if (!key || seen[key]) return;
    seen[key] = true;
    collected.push({ fileName: attachment.fileName || "", url: url, folderName: attachment.driveFolderName || "" });
  };
  const response = payload.response || {};
  (response.attachments || []).forEach(addAttachment);
  (payload.rawAnswers || []).forEach(function (answer) {
    if (!answer) return;
    addAttachment(answer.attachment);
    if (answer.track) addAttachment(answer.track.audio);
  });
  return collected;
}

function buildDetailRows(payload, jsonName, jsonUrl, receivedAt) {
  const response = payload.response || {};
  const form = payload.form || {};
  const rawAnswers = Array.isArray(payload.rawAnswers) ? payload.rawAnswers : [];
  const answers = rawAnswers.length ? rawAnswers : buildFallbackAnswersFromResponse(response);
  return answers.map(function (answer) {
    const track = answer.track || {};
    const attachment = getDetailAttachment(answer);
    return [
      receivedAt || response.submittedAt || payload.exportedAt || new Date(),
      response.id || "",
      response.respondent || "",
      form.name || "",
      response.formId || form.id || "",
      response.episodeId || "",
      response.periodId || "",
      jsonName || "",
      answer.id || "",
      answer.label || "質問",
      answer.useLabel || answer.use || "",
      answer.kind || "",
      truncateForLogCell(formatDetailAnswerForLog(answer)),
      track.title || "",
      track.artist || track.aiArtist || "",
      track.url || "",
      track.audioUrl || "",
      attachment.fileName || "",
      attachment.driveUrl || attachment.url || attachment.sourceUrl || "",
      jsonUrl || ""
    ];
  });
}

function buildFallbackAnswersFromResponse(response) {
  const fallback = [
    { id: "publicInfo", label: "公開プロフィール", useLabel: "公開情報", kind: "summary", answer: response.publicInfo || "" },
    { id: "articleUse", label: "記事/SNS用回答", useLabel: "記事/SNS用", kind: "summary", answer: response.articleUse || "" },
    { id: "internalOnly", label: "制作側メモ", useLabel: "内部用", kind: "summary", answer: response.internalOnly || "" },
    { id: "constraints", label: "触れないこと・表記ルール", useLabel: "制約", kind: "summary", answer: response.constraints || "" }
  ];
  return fallback.filter(function (answer) {
    return String(answer.answer || "").trim();
  });
}

function getDetailAttachment(answer) {
  if (!answer) return {};
  if (answer.attachment) return answer.attachment;
  if (answer.track && answer.track.audio) return answer.track.audio;
  return {};
}

function formatDetailAnswerForLog(answer) {
  if (!answer) return "";
  const parts = [];
  if (answer.answer && answer.answer !== "-") parts.push(answer.answer);
  if (answer.track) parts.push(formatTrackForLog(answer.track));
  if (answer.attachment) parts.push("添付: " + formatAttachmentForLog(answer.attachment));
  if (answer.xContact) parts.push("連絡先: " + formatValueForLog(answer.xContact));
  const text = compactLogLines(parts);
  return text || "未回答";
}

function formatRawAnswersForLog(rawAnswers) {
  return (rawAnswers || [])
    .map(function (answer) {
      if (!answer) return "";
      const body = compactLogLines([
        answer.answer && answer.answer !== "-" ? answer.answer : "",
        answer.track ? formatTrackForLog(answer.track) : "",
        answer.attachment ? "添付: " + formatAttachmentForLog(answer.attachment) : "",
        answer.xContact ? "連絡先: " + formatValueForLog(answer.xContact) : ""
      ]);
      return (answer.label || answer.id || "質問") + (answer.useLabel ? "（" + answer.useLabel + "）" : "") + "\n" + (body || "未回答");
    })
    .filter(Boolean)
    .join("\n\n---\n\n");
}

function formatTracksForLog(rawAnswers) {
  return (rawAnswers || [])
    .filter(function (answer) {
      return answer && answer.track;
    })
    .map(function (answer) {
      const trackLog = formatTrackForLog(answer.track);
      return trackLog ? (answer.label || "楽曲") + "\n" + trackLog : "";
    })
    .filter(Boolean)
    .join("\n\n---\n\n");
}

function formatTrackForLog(track) {
  if (!track) return "";
  return compactLogLines([
    track.title ? "楽曲名: " + track.title : "",
    track.artist ? "アーティスト名: " + track.artist : "",
    track.aiArtist ? "AIアーティスト名: " + track.aiArtist : "",
    track.url ? "楽曲URL: " + track.url : "",
    track.audioUrl ? "大容量音源URL: " + track.audioUrl : "",
    track.audio ? "添付音源: " + formatAttachmentForLog(track.audio) : ""
  ]);
}

function formatAttachmentForLog(attachment) {
  if (!attachment) return "";
  return compactLogLines([
    attachment.fileName || "",
    attachment.mimeType ? "形式: " + attachment.mimeType : "",
    attachment.size ? "サイズ: " + attachment.size + " bytes" : "",
    attachment.driveUrl || attachment.url || attachment.sourceUrl || "",
    attachment.driveFileId ? "Drive ID: " + attachment.driveFileId : ""
  ]);
}

function formatValueForLog(value) {
  if (value === null || typeof value === "undefined") return "";
  if (typeof value === "string") {
    if (value.indexOf("data:") === 0 && value.indexOf(";base64,") > -1) return "[base64データ省略]";
    return value;
  }
  if (typeof value !== "object") return String(value);
  if (Array.isArray(value)) {
    return value.map(formatValueForLog).filter(Boolean).join(" / ");
  }
  const sanitized = {};
  for (const key in value) {
    if (key === "dataUrl") {
      sanitized[key] = "[base64データ省略]";
    } else if (key === "audio" || key === "attachment") {
      sanitized[key] = formatAttachmentForLog(value[key]);
    } else {
      sanitized[key] = formatValueForLog(value[key]);
    }
  }
  return JSON.stringify(sanitized);
}

function compactLogLines(lines) {
  return (lines || [])
    .map(function (line) {
      return String(line || "").trim();
    })
    .filter(Boolean)
    .join("\n");
}

function truncateForLogCell(value) {
  const text = String(value || "");
  const maxLength = 45000;
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "\n...（長いため省略。全文はJSONファイルを確認してください）";
}

function handleSubmissionStatus(params) {
  const formId = String(params.formId || "").trim();
  if (!formId) throw new Error("formIdがありません。");
  const root = getRootFolder(params.folder);
  const periodId = String(params.periodId || "").trim();
  return jsonOutput({
    ok: true,
    count: countSubmittedResponses(root, formId, periodId),
    now: new Date().toISOString()
  });
}

// ---- 回答一覧配信（ツールの「新着回答を同期」） ----

function handleListResponses(params) {
  const root = getRootFolder(params.folder);
  const responsesFolder = getOrCreateFolder(root, RESPONSES_DIR);
  const since = params.since ? new Date(params.since) : null;
  const items = [];
  const files = responsesFolder.getFiles();
  while (files.hasNext()) {
    const file = files.next();
    if (file.getName().slice(-5) !== ".json") continue;
    if (since && file.getDateCreated() <= since) continue;
    try {
      items.push({ name: file.getName(), created: file.getDateCreated(), payload: JSON.parse(file.getBlob().getDataAsString("UTF-8")) });
    } catch (error) {
      // 壊れたJSONはスキップ
    }
  }
  items.sort(function (a, b) {
    return a.created - b.created;
  });
  return jsonOutput({
    ok: true,
    now: new Date().toISOString(),
    responses: items.map(function (item) {
      return item.payload;
    })
  });
}

// ---- フォーム定義の公開/配信（短いURL） ----

function handlePublishForm(payload) {
  const slug = sanitizeName(payload.slug, "");
  if (!slug) throw new Error("slugがありません。");
  if (!payload.payload || !payload.payload.form) throw new Error("フォーム定義がありません。");
  const root = getRootFolder();
  const formsFolder = getOrCreateFolder(root, FORMS_DIR);
  const fileName = slug + ".json";
  const content = JSON.stringify(payload.payload, null, 2);
  const existing = formsFolder.getFilesByName(fileName);
  if (existing.hasNext()) {
    existing.next().setContent(content);
  } else {
    formsFolder.createFile(fileName, content, "application/json");
  }
  return jsonOutput({ ok: true, slug: slug, now: new Date().toISOString() });
}

function handleGetForm(params) {
  const slug = sanitizeName(params.slug, "");
  if (!slug) throw new Error("slugがありません。");
  const root = getRootFolder();
  const formsFolder = getOrCreateFolder(root, FORMS_DIR);
  const files = formsFolder.getFilesByName(slug + ".json");
  if (!files.hasNext()) throw new Error("このslugのフォームは公開されていません: " + slug);
  const payload = JSON.parse(files.next().getBlob().getDataAsString("UTF-8"));
  return jsonOutput({ ok: true, payload: payload });
}

// ---- サムネPNG保存 ----

function handleSaveThumbnails(payload) {
  const root = getRootFolder(payload.driveFolderUrl);
  const folder = getOrCreateFolder(root, THUMBNAILS_DIR);
  const stamp = nowStamp();
  const prefix = sanitizeName(payload.episodeDate || "", "") || stamp;
  const savedFiles = [];
  (payload.images || []).forEach(function (image, index) {
    const blob = decodeDataUrl(image.dataUrl);
    if (!blob) return;
    const fileName = prefix + "_" + sanitizeName(image.fileName, "thumbnail-" + (index + 1) + ".png");
    blob.setName(fileName);
    const file = folder.createFile(blob);
    savedFiles.push({ fileName: fileName, url: file.getUrl() });
  });
  if (!savedFiles.length) throw new Error("保存できる画像がありませんでした。");
  return jsonOutput({ ok: true, savedFiles: savedFiles, now: new Date().toISOString() });
}
