# Google Drive Response Endpoint

Radio Article Studio is hosted on GitHub Pages, so the shared form page cannot directly write files into the operator's Google Drive folder by itself.

To receive online form submissions into Google Drive, create a small Google Apps Script Web App and paste its Web App URL into:

```text
設定 > 回答保存Webhook URL
```

## Apps Script Template

Replace `YOUR_DRIVE_FOLDER_ID` with the target Google Drive folder ID.

```javascript
const FOLDER_ID = "YOUR_DRIVE_FOLDER_ID";

function doPost(e) {
  const folder = DriveApp.getFolderById(FOLDER_ID);
  const payload = JSON.parse(e.postData.contents);
  const stamp = Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyyMMdd-HHmmss");
  const respondent = payload.response?.respondent || payload.response?.formId || "response";
  const safeName = String(respondent).replace(/[\\/:*?"<>|]/g, "_");

  folder.createFile(
    `${stamp}-${safeName}.json`,
    JSON.stringify(payload, null, 2),
    MimeType.JSON
  );

  const attachments = payload.response?.attachments || [];
  attachments.forEach((attachment, index) => {
    if (!attachment.dataUrl) return;
    const match = attachment.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return;
    const mimeType = match[1];
    const bytes = Utilities.base64Decode(match[2]);
    const fileName = attachment.fileName || `${stamp}-attachment-${index + 1}`;
    folder.createFile(Utilities.newBlob(bytes, mimeType, fileName));
  });

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

## Deploy

1. Create a Google Apps Script project.
2. Paste the script above.
3. Set `FOLDER_ID`.
4. Deploy as a Web App.
5. Execute as yourself.
6. Allow access to anyone with the URL, or the intended respondent access scope.
7. Copy the Web App URL into Radio Article Studio settings.

The form uses a simple POST request. The browser cannot fully verify the Drive write because many Apps Script deployments respond without normal cross-origin confirmation, so confirm received files in the Drive folder after a test submission.
