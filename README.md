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
7. Compressed shareable form URLs.
8. Response JSON creation/import with grouped song fields, in-form song preview, WAV/MP3 attachments, and internal X contact blocks.
9. Response management with public/article/internal/constraint separation.
10. Track and audio metadata management.
11. Thumbnail composition from bundled fixed base images plus date text and an optional guest icon, with registered image previews.
12. Thumbnail and production asset management.
13. Codex request pack generation.
14. JSON export/import backup.
15. Responsive mobile layout for management screens and shared forms.
16. PWA app shell with install metadata, home-screen icon, and basic offline app-shell caching.
17. One-time device transfer links for moving the current browser data to another phone or desktop browser.

The import workflow currently supports public Google Sheets CSV/export URLs and local CSV files. Application periods connect a date range, target episode, form, and listener submission sheet. Shared forms default to compressed portable `#/s/...` URLs for external respondents, so the form can open on devices that do not have the operator's local browser data. Short reference URLs such as `#/p/...` and `#/f/...` are kept as management-device shortcuts only. Forms can use a song field that groups title, YouTube/Suno-only URL input, WAV/MP3 upload, and a preview player in one block. They can also use an internal X contact block that normalizes handles into profile URLs and links respondents to the Bellbo/Kaname operating accounts before DM contact. The operator can import the response JSON, preview/download attached audio, and automatically add grouped song answers to the track list. Private Google account OAuth, Google Drive folder sync, WordPress draft posting, and SE_Pon automation are planned for later phases.

The PWA version can be added to a smartphone home screen or installed from desktop browsers. Data still lives in each browser's localStorage, so automatic smartphone/PC synchronization requires a future cloud storage layer such as Google Drive, Firebase, or Supabase. Until then, use device transfer links for small browser states or JSON export/import for larger states with images and audio.

## Development

```bash
npm install
npm run dev
```

## Documentation

The main design document is in:

```text
docs/design.md
```
