// Google Apps Script Webアプリとの通信ヘルパー。
// GASはtext/plainのPOSTなら preflight が発生しないシンプルリクエストとして扱えるため、
// mode: "no-cors" を使わずに応答本文（保存成功/失敗）をそのまま読める。

const parseGasResult = async (response) => {
  const text = await response.text();
  let result = null;
  try {
    result = JSON.parse(text);
  } catch {
    throw new Error("受信口の応答を読み取れませんでした。Apps Scriptのデプロイ設定（全員がアクセス可）を確認してください。");
  }
  if (!response.ok || !result || result.ok !== true) {
    throw new Error(result?.error || `受信口がエラーを返しました（HTTP ${response.status}）。`);
  }
  return result;
};

const getGoogleDriveFileIdFromUrl = (url = "") => {
  const trimmed = String(url || "").trim();
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

export const postToGasEndpoint = async (endpointUrl, payload) => {
  const response = await fetch(String(endpointUrl).trim(), {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
    redirect: "follow"
  });
  return parseGasResult(response);
};

export const getFromGasEndpoint = async (endpointUrl, params = {}) => {
  const url = new URL(String(endpointUrl).trim());
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  });
  const response = await fetch(url.toString(), { redirect: "follow", cache: "no-store" });
  return parseGasResult(response);
};

export const fetchDriveImageDataUrlFromGas = async (endpointUrl, token, imageUrl) => {
  const trimmedEndpoint = String(endpointUrl || "").trim();
  const fileId = getGoogleDriveFileIdFromUrl(imageUrl);
  if (!trimmedEndpoint || !String(token || "").trim() || !fileId) return "";
  const result = await getFromGasEndpoint(trimmedEndpoint, {
    action: "getDriveFileDataUrl",
    token,
    fileId
  });
  return result?.dataUrl || "";
};

// GitHub Pagesに置く公開設定ファイル。公開フォームページ（運営のlocalStorageを持たない端末）が
// フォーム定義の取得先となるGAS URLを知るために使う。
export const loadAppConfig = async (baseUrl = "/") => {
  try {
    const response = await fetch(`${baseUrl}app-config.json`, { cache: "no-store" });
    if (!response.ok) return {};
    return await response.json();
  } catch {
    return {};
  }
};
