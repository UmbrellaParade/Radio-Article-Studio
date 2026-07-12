# Umbrella Parade Radio Article Studio

Radio Article Studio is a production management tool for turning radio broadcasts into articles, social posts, thumbnails, and reusable production packs.

GitHub repository:

```text
UmbrellaParade/Radio-Article-Studio
```

## Purpose

The first target workflow is the Sunoパ！ production flow:

- broadcast episode management
- guest questionnaire management
- listener song submission management
- personality song entry
- thumbnail asset tracking
- audio file organization
- Codex article request pack generation
- social post and manga prompt preparation

The app is intentionally named generically so it can support other radio/article workflows later.

## Brand

App name:

```text
Umbrella Parade Radio Article Studio
```

Short name:

```text
Radio Article Studio
```

## Current MVP

The current app is a browser-based working prototype with localStorage persistence.

Implemented:

1. Dashboard.
2. Spreadsheet/CSV import for guest questionnaires, listener song submissions, and personality song sheets.
3. Bellbo-only manual song URL entry.
4. Broadcast episode management with automatic broadcast slot, guest episode title, and article URL slug handling.
5. Application period management for listener submissions.
6. Form template management.
7. Compressed shareable form URLs plus short published form URLs.
8. Response JSON creation/import with grouped song fields, in-form song preview, WAV/MP3 attachments, and internal X contact blocks.
9. Response management with public/article/internal/constraint separation.
10. Track and audio metadata management.
11. Thumbnail composition from bundled fixed base images plus date text and an optional guest icon, with registered image previews, saved generated previews, reusable icon layout presets, three-image batch generation, local folder export, and optional Drive webhook export.
12. Thumbnail and production asset management.
13. Codex request pack generation.
14. JSON export/import backup.
15. Responsive mobile layout for management screens and shared forms.
16. PWA app shell with install metadata, home-screen icon, and basic offline app-shell caching.
17. One-time device transfer links for moving the current browser data to another phone or desktop browser.
18. Shared form table of contents, top return button, response status messaging, and audio download/save actions.
19. Google Apps Script response endpoint with verified submission results: the shared form reads the endpoint's JSON reply, so respondents see real success/failure instead of a blind "sent" message.
20. One-click "新着回答を同期" that pulls new responses from the endpoint into response management (no manual response JSON handling).
21. Instant short-URL form publishing via the endpoint ("短いURLを公開/更新"), with the legacy repo-committed JSON as fallback.
22. Thumbnail Drive save with verified results through the same endpoint.
23. Codex pack folder export: writes codex_request.md plus article-images/ PNGs directly into a chosen local folder.
24. Editable extra X contact accounts for shared form contact blocks.

The import workflow currently supports public Google Sheets CSV/export URLs and local CSV files. Application periods connect a date range, target episode, form, and listener submission sheet. Shared forms can use short `#/r/{id}` URLs after the app-generated Codex activation request is applied. They also keep compressed portable `#/s/...` URLs as immediate fallback links, so the form can open on devices that do not have the operator's local browser data even before a short URL is activated. Short reference URLs such as `#/p/...` and `#/f/...` are kept as management-device shortcuts only. Forms can use a song field that groups title, YouTube/Suno-only URL input, WAV/MP3 upload, and a preview player in one block. Guest forms can also use an image field for the guest icon. When a response JSON or imported guest sheet includes a guest icon image, the thumbnail composer automatically registers it as the current guest icon. They can also use an X contact block that explains why Bellbo/Kaname follows are needed for DM contact while keeping the respondent's X URL usable for article promotion. The operator can import the response JSON, preview/download attached audio and images, and automatically add grouped song answers to the track list. Private Google account OAuth, Google Drive folder sync, WordPress draft posting, and SE_Pon automation are planned for later phases.

Generated thumbnail PNG previews are stored in the browser's IndexedDB and referenced from the main localStorage data. This keeps generated images available after a reload without overloading localStorage. Base images, guest icons, and generated previews are still browser-local until a future cloud sync layer is added.

The PWA version can be added to a smartphone home screen or installed from desktop browsers. Data still lives in each browser's localStorage, so automatic smartphone/PC synchronization requires a future cloud storage layer such as Google Drive, Firebase, or Supabase. Until then, use device transfer links for small browser states or JSON export/import for larger states with images and audio.

## Development

```bash
npm install
npm run dev
```

## Source layout

```text
src/
├─ main.jsx                          App shell, management views, state
├─ styles.css
├─ lib/
│  ├─ core.js                        Pure helpers, constants, sample data, migrations
│  ├─ gas.js                         Google Apps Script endpoint client
│  └─ thumbnail.js                   Canvas rendering helpers
└─ components/
   ├─ PublicSubmissionForm.jsx       Public shared form for respondents
   ├─ thumbnail.jsx                  Thumbnail composer studio + assets view
   └─ ui.jsx                         Shared UI primitives
docs/google-apps-script/Code.gs      Single GAS web app (receive/list/publish/thumbnails)
public/app-config.json               Public form page bootstrap (GAS endpoint URL)
```

## Documentation

The main design document is in:

```text
docs/design.md
```

Google Drive response receiving setup:

```text
docs/google-drive-response-endpoint.md
```

Operations and troubleshooting runbook:

```text
docs/troubleshooting-runbook.md
```
