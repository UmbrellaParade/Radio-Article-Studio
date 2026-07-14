// Radio Article Studio 受信口（Google Apps Script）
//
// この1本のWebアプリで以下を担当します。
//   1. 共有フォームからの回答受信（doPost action=submitResponse）
//      - 回答JSONを _responses/ に保存
//      - 音源/画像の添付を放送回フォルダーに実ファイルとして保存
//      - スプレッドシート「回答ログ」のフォームごとのタブにGoogleフォーム形式で1行追記
//   2. ツールの「新着回答を同期」への回答一覧配信（doGet action=listResponses）
//   3. 短いURLフォーム定義の公開/配信（doPost action=publishForm / doGet action=getForm）
//   4. サムネPNGのDrive保存（doPost action=saveThumbnails）
//   5. Drive画像のサムネ合成用dataURL配信（doGet action=getDriveFileDataUrl）
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
const DRIVE_IMAGE_DATA_URL_MAX_BYTES = 8 * 1024 * 1024;
const SCRIPT_VERSION = "2026-07-15-drive-icon-data-url";

const RESPONSES_DIR = "_responses";
const FORMS_DIR = "_forms";
const THUMBNAILS_DIR = "サムネ";
const TRACKS_DIR = "楽曲";

// スプレッドシートのファイル名（Driveフォルダー内に自動作成される）
const LOG_SHEET_NAME = "回答ログ";
// フォームごとのタブ（タブ名＝フォーム名）にGoogleフォーム形式で回答を記録し、
// このタブには受信の控えだけを最小限で残す。
const RECEIPT_SHEET_NAME = "受信ログ";
const RECEIPT_HEADERS = ["受信日時", "回答者", "フォーム名", "添付数", "回答JSON"];
const TRACK_SHEET_FIELD_DEFAULTS = [
  { type: "title", label: "楽曲名" },
  { type: "artist", label: "アーティスト名" },
  { type: "aiArtist", label: "AIアーティスト名" },
  { type: "url", label: "楽曲URL（YouTube / Suno）" },
  { type: "audioUrl", label: "大容量音源URL（Driveなど）" },
  { type: "audio", label: "音源アップロード" },
  { type: "savedAudioUrl", label: "音源保存URL" }
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
    if (action === "getDriveFileDataUrl") {
      requireToken(params.token);
      return handleGetDriveFileDataUrl(params);
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

function extractDriveFileId(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const idParam = text.match(/[?&]id=([-\w]{20,})/);
  if (idParam) return idParam[1];
  const filePath = text.match(/\/file\/d\/([-\w]{20,})/);
  if (filePath) return filePath[1];
  const rawId = text.match(/^[-\w]{20,}$/);
  return rawId ? rawId[0] : "";
}

function handleGetDriveFileDataUrl(params) {
  const fileId = extractDriveFileId(params.fileId || params.url);
  if (!fileId) throw new Error("Drive fileId is missing.");
  const file = DriveApp.getFileById(fileId);
  const blob = file.getBlob();
  const mimeType = blob.getContentType() || "";
  if (mimeType.indexOf("image/") !== 0) {
    throw new Error("The requested Drive file is not an image.");
  }
  const bytes = blob.getBytes();
  if (bytes.length > DRIVE_IMAGE_DATA_URL_MAX_BYTES) {
    throw new Error("The requested image is too large for thumbnail composition.");
  }
  return jsonOutput({
    ok: true,
    fileName: file.getName(),
    mimeType: mimeType,
    size: bytes.length,
    dataUrl: "data:" + mimeType + ";base64," + Utilities.base64Encode(bytes)
  });
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
  try {
    appendFormAnswerRow(root, payload, receivedAt);
  } catch (error) {
    // 回答シートへの追記失敗で回答受信全体を失敗にしない
  }
  try {
    const sheet = getResponseSheet(root, RECEIPT_SHEET_NAME);
    ensureSheetHeader(sheet, RECEIPT_HEADERS);
    sheet.appendRow(buildReceiptRow(payload, savedFiles, jsonName, jsonUrl, receivedAt));
  } catch (error) {
    // 受信ログの失敗で回答受信全体を失敗にしない
  }
}

function buildReceiptRow(payload, savedFiles, jsonName, jsonUrl, receivedAt) {
  const response = payload.response || {};
  const form = payload.form || {};
  return [
    receivedAt || new Date(),
    response.respondent || "",
    form.name || response.formId || "",
    (savedFiles || []).length,
    jsonUrl || jsonName || ""
  ];
}

// ---- フォームごとのGoogleフォーム形式シート ----
// タブ名＝フォーム名。1行＝1回答。1列目は受信日時、2列目以降は質問。
// 列はツールで設定した「フォームの全質問」（_forms/の公開定義）を基準に作るため、
// まだ回答が無い質問も最初から列として並ぶ。

// _forms/ の公開済みフォーム定義を読み、フォームIDごとの「フォーム名＋全質問ラベル」を返す
function loadPublishedFormDefinitions(root) {
  const formsFolder = getOrCreateFolder(root, FORMS_DIR);
  const definitions = {};
  const files = formsFolder.getFiles();
  while (files.hasNext()) {
    const file = files.next();
    if (file.getName().slice(-5) !== ".json") continue;
    try {
      const payload = JSON.parse(file.getBlob().getDataAsString("UTF-8"));
      const form = payload && payload.form;
      if (!form || !form.id) continue;
      const updatedAt = file.getLastUpdated().getTime();
      if (definitions[form.id] && definitions[form.id].updatedAt >= updatedAt) continue;
      definitions[form.id] = {
        name: form.name || form.id,
        labels: flattenLabels(
          (form.questions || []).map(function (question) {
            return getQuestionSheetLabels(question);
          })
        ),
        updatedAt: updatedAt
      };
    } catch (error) {
      // 壊れた定義はスキップ
    }
  }
  return definitions;
}

function appendFormAnswerRow(root, payload, receivedAt, definitionsInput) {
  const rawAnswers = Array.isArray(payload.rawAnswers) ? payload.rawAnswers : [];
  const answers = rawAnswers.length ? rawAnswers : buildFallbackAnswersFromResponse(payload.response || {});
  if (!answers.length) return;
  const response = payload.response || {};
  const form = payload.form || {};
  const definitions = definitionsInput || loadPublishedFormDefinitions(root);
  const definition = definitions[response.formId || form.id || ""];
  // 全質問の列順は「公開済みフォーム定義」→「送信ペイロードのフォーム定義」→「回答に含まれる質問」の順で決める
  const formQuestionLabels = definition
    ? definition.labels
    : flattenLabels(
        (form.questions || []).map(function (question) {
          return getQuestionSheetLabels(question);
        })
      );
  const sheetName = sanitizeName((definition && definition.name) || form.name || response.formId || "回答", "回答");
  const sheet = getResponseSheet(root, sheetName);
  const labels = formQuestionLabels.concat(
    flattenLabels(
      answers.map(function (answer) {
        return getAnswerSheetLabels(answer);
      })
    )
  );
  const headers = upsertFormSheetHeader(sheet, labels);
  const answerByLabel = {};
  answers.forEach(function (answer) {
    addAnswerCells(answerByLabel, answer);
  });
  const row = headers.map(function (header, index) {
    return index === 0 ? receivedAt || new Date() : answerByLabel[header] || "";
  });
  sheet.appendRow(row);
}

function flattenLabels(groups) {
  const labels = [];
  (groups || []).forEach(function (group) {
    (Array.isArray(group) ? group : [group]).forEach(function (label) {
      const value = String(label || "").trim();
      if (value) labels.push(value);
    });
  });
  return labels;
}

function getQuestionSheetLabels(question) {
  if (question && question.kind === "track") {
    return getTrackSheetItems(question.label, question.trackFields).map(function (item) {
      return item.label;
    });
  }
  return [String((question && (question.label || question.id)) || "質問")];
}

function getAnswerSheetLabels(answer) {
  if (answer && answer.kind === "track") {
    return getTrackSheetItems(answer.label, answer.trackFields).map(function (item) {
      return item.label;
    });
  }
  return [String((answer && (answer.label || answer.id)) || "質問")];
}

function getTrackSheetItems(baseLabel, trackFields) {
  const base = String(baseLabel || "楽曲").trim() || "楽曲";
  const labelMap = {};
  (Array.isArray(trackFields) ? trackFields : []).forEach(function (field) {
    if (!field || !field.type) return;
    labelMap[field.type] = field.label || "";
  });
  return TRACK_SHEET_FIELD_DEFAULTS.map(function (defaults) {
    return {
      type: defaults.type,
      label: base + " / " + (labelMap[defaults.type] || defaults.label)
    };
  });
}

function addAnswerCells(answerByLabel, answer) {
  if (!answer) return;
  if (answer.kind === "track" && answer.track) {
    addTrackAnswerCells(answerByLabel, answer);
    return;
  }
  const label = String(answer.label || answer.id || "質問");
  addMergedAnswerCell(answerByLabel, label, formatAnswerCell(answer));
}

function addTrackAnswerCells(answerByLabel, answer) {
  const track = answer.track || {};
  const audio = track.audio || answer.attachment || {};
  const items = getTrackSheetItems(answer.label, answer.trackFields);
  const values = {
    title: track.title || "",
    artist: track.artist || "",
    aiArtist: track.aiArtist || "",
    url: track.url || "",
    audioUrl: track.audioUrl || "",
    audio: audio.fileName || "",
    savedAudioUrl: audio.driveUrl || audio.url || audio.sourceUrl || ""
  };
  items.forEach(function (item) {
    addMergedAnswerCell(answerByLabel, item.label, values[item.type] || "");
  });
}

function addMergedAnswerCell(answerByLabel, label, cell) {
  answerByLabel[label] = answerByLabel[label] ? answerByLabel[label] + "\n" + cell : cell;
}

// 1行目のヘッダー（受信日時＋質問列）を維持する。質問が増えた場合は右に列を足す。
function upsertFormSheetHeader(sheet, labels) {
  const width = Math.max(sheet.getLastColumn(), 1);
  const existing =
    sheet.getLastRow() > 0
      ? sheet
          .getRange(1, 1, 1, width)
          .getValues()[0]
          .map(function (value) {
            return String(value || "");
          })
          .filter(function (value) {
            return value;
          })
      : [];
  const headers = existing.length ? existing : ["受信日時"];
  let changed = !existing.length;
  labels.forEach(function (label) {
    if (headers.indexOf(label) === -1) {
      headers.push(label);
      changed = true;
    }
  });
  if (changed) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
  return headers;
}

// 回答セルの文字列化。base64は載せず、添付はDriveリンクにする。
function formatAnswerCell(answer) {
  if (!answer) return "";
  const parts = [];
  if (answer.track) {
    parts.push(formatTrackForLog(answer.track));
  } else if (answer.xContact) {
    parts.push(formatXContactForLog(answer.xContact));
  } else if (answer.answer && answer.answer !== "-") {
    parts.push(answer.answer);
  }
  if (answer.attachment) {
    const url = answer.attachment.driveUrl || answer.attachment.url || answer.attachment.sourceUrl || "";
    parts.push([answer.attachment.fileName || "", url].filter(Boolean).join("\n"));
  }
  return truncateForLogCell(compactLogLines(parts)) || "未回答";
}

function formatXContactForLog(xContact) {
  return compactLogLines([
    xContact.xHandle || xContact.rawX || "",
    xContact.xUrl || "",
    xContact.dmOk ? "DM連絡OK" : ""
  ]);
}

// 保存済みの回答JSONから、全シートを作り直す（Apps Scriptエディタから手動実行する）。
// 古い形式のタブも一度消して、フォームごとのGoogleフォーム形式＋受信ログに揃える。
function rebuildResponseLogFromJson() {
  const root = getRootFolder();
  const responsesFolder = getOrCreateFolder(root, RESPONSES_DIR);
  const spreadsheet = getResponseSpreadsheet(root);

  const placeholder = spreadsheet.insertSheet("_rebuild_tmp");
  spreadsheet.getSheets().forEach(function (sheet) {
    if (sheet.getSheetId() !== placeholder.getSheetId()) spreadsheet.deleteSheet(sheet);
  });

  const items = [];
  const files = responsesFolder.getFiles();
  while (files.hasNext()) {
    const file = files.next();
    if (file.getName().slice(-5) !== ".json") continue;
    try {
      items.push({
        payload: JSON.parse(file.getBlob().getDataAsString("UTF-8")),
        receivedAt: file.getDateCreated(),
        name: file.getName(),
        url: file.getUrl()
      });
    } catch (error) {
      // 壊れたJSONは復元対象から除外
    }
  }
  items.sort(function (a, b) {
    return a.receivedAt - b.receivedAt;
  });

  // 公開済みの全フォームのタブを、回答が無くても全質問ヘッダー付きで先に作る
  const definitions = loadPublishedFormDefinitions(root);
  Object.keys(definitions).forEach(function (formId) {
    const definition = definitions[formId];
    if (!definition.labels.length) return;
    const sheet = getResponseSheet(root, sanitizeName(definition.name, "回答"));
    upsertFormSheetHeader(sheet, definition.labels);
  });

  const receiptSheet = getResponseSheet(root, RECEIPT_SHEET_NAME);
  ensureSheetHeader(receiptSheet, RECEIPT_HEADERS);
  items.forEach(function (item) {
    appendFormAnswerRow(root, item.payload, item.receivedAt, definitions);
    receiptSheet.appendRow(
      buildReceiptRow(item.payload, collectSavedFilesFromPayload(item.payload), item.name, item.url, item.receivedAt)
    );
  });

  spreadsheet.deleteSheet(placeholder);
  return "フォーム" + Object.keys(definitions).length + "件・回答" + items.length + "件からシートを作り直しました。";
}

function getResponseSpreadsheet(root) {
  const files = root.getFilesByName(LOG_SHEET_NAME);
  let spreadsheet;
  if (files.hasNext()) {
    spreadsheet = SpreadsheetApp.open(files.next());
  } else {
    spreadsheet = SpreadsheetApp.create(LOG_SHEET_NAME);
    DriveApp.getFileById(spreadsheet.getId()).moveTo(root);
    try {
      spreadsheet.getActiveSheet().setName(RECEIPT_SHEET_NAME);
    } catch (error) {
      // 既に同名タブがある場合はそのままでよい
    }
  }
  return spreadsheet;
}

function getResponseSheet(root, sheetName) {
  const spreadsheet = getResponseSpreadsheet(root);
  const existing = spreadsheet.getSheetByName(sheetName);
  if (existing) return existing;
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
