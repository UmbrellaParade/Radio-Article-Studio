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

const RESPONSES_DIR = "_responses";
const FORMS_DIR = "_forms";
const THUMBNAILS_DIR = "サムネ";
const LOG_SHEET_NAME = "回答ログ";

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
    if (action === "ping") return jsonOutput({ ok: true, now: new Date().toISOString() });
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
  const attachmentsFolder = getOrCreateFolder(root, episodeLabel);
  const savedFiles = [];
  const savedCache = {}; // 同じ添付がresponse.attachmentsとrawAnswersの両方に入っているため二重保存を防ぐ

  const processAttachment = function (attachment) {
    if (!attachment || !attachment.dataUrl) return attachment;
    const cacheKey = (attachment.fileName || "") + ":" + (attachment.size || 0);
    let saved = savedCache[cacheKey];
    if (!saved) {
      const blob = decodeDataUrl(attachment.dataUrl);
      if (!blob) return attachment;
      const fileName = stamp + "_" + respondent + "_" + sanitizeName(attachment.fileName, "attachment");
      blob.setName(fileName);
      const file = attachmentsFolder.createFile(blob);
      saved = { fileName: fileName, driveUrl: file.getUrl(), driveFileId: file.getId() };
      savedCache[cacheKey] = saved;
      savedFiles.push({ fileName: fileName, url: saved.driveUrl });
    }
    const isSmallImage =
      String(attachment.mimeType || "").indexOf("image/") === 0 &&
      Number(attachment.size || 0) <= INLINE_IMAGE_MAX_BYTES;
    const next = {};
    for (const key in attachment) next[key] = attachment[key];
    next.driveUrl = saved.driveUrl;
    next.driveFileId = saved.driveFileId;
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
  responsesFolder.createFile(jsonName, JSON.stringify(payload, null, 2), "application/json");

  appendLogRow(root, [
    new Date(),
    response.respondent || "",
    response.formId || "",
    response.episodeId || "",
    response.periodId || "",
    savedFiles.length,
    jsonName
  ]);

  return jsonOutput({ ok: true, savedAs: jsonName, savedFiles: savedFiles, now: new Date().toISOString() });
}

function appendLogRow(root, row) {
  try {
    const files = root.getFilesByName(LOG_SHEET_NAME);
    let spreadsheet;
    if (files.hasNext()) {
      spreadsheet = SpreadsheetApp.open(files.next());
    } else {
      spreadsheet = SpreadsheetApp.create(LOG_SHEET_NAME);
      DriveApp.getFileById(spreadsheet.getId()).moveTo(root);
      spreadsheet.getActiveSheet().appendRow(["受信日時", "回答者", "フォームID", "放送回ID", "期間ID", "添付数", "JSONファイル"]);
    }
    spreadsheet.getActiveSheet().appendRow(row);
  } catch (error) {
    // ログ追記の失敗で回答受信全体を失敗にしない
  }
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
