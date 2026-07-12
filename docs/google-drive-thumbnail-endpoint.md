# Google Drive Thumbnail Endpoint

Radio Article Studio can send the three generated thumbnail PNGs to a Google Apps Script Web App.

Paste the Web App URL into:

```text
設定 > サムネDrive保存Webhook URL
```

Paste the target folder URL into:

```text
設定 > サムネ保存先Google DriveフォルダーURL
```

## Apps Script Template

Replace `YOUR_DRIVE_FOLDER_ID` with the target Google Drive folder ID.

```javascript
const FOLDER_ID = "YOUR_DRIVE_FOLDER_ID";

function doPost(e) {
  const folder = DriveApp.getFolderById(FOLDER_ID);
  const payload = JSON.parse(e.postData.contents);
  const images = payload.images || [];

  images.forEach((image, index) => {
    if (!image.dataUrl) return;
    const match = image.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return;

    const mimeType = match[1];
    const bytes = Utilities.base64Decode(match[2]);
    const fileName = String(image.fileName || `thumbnail-${index + 1}.png`).replace(/[\\/:*?"<>|]/g, "_");
    folder.createFile(Utilities.newBlob(bytes, mimeType, fileName));
  });

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, saved: images.length }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

## Notes

The browser sends a simple POST request and cannot always verify the response because Apps Script often runs without normal cross-origin confirmation. After the first test, confirm the PNG files in the Drive folder.
