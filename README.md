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
5. Form template management.
6. Shareable form URL prototype.
7. Response JSON creation/import with grouped song fields, in-form song preview, WAV/MP3 attachments, and internal X contact blocks.
8. Response management with public/article/internal/constraint separation.
9. Track and audio metadata management.
10. Thumbnail composition from bundled fixed base images plus date text and an optional guest icon, with registered image previews.
11. Thumbnail and production asset management.
12. Codex request pack generation.
13. JSON export/import backup.

The import workflow currently supports public Google Sheets CSV/export URLs and local CSV files. Shared forms can use a song field that groups title, YouTube/Suno-only URL input, WAV/MP3 upload, and a preview player in one block. They can also use an internal X contact block that normalizes handles into profile URLs and links respondents to the Bellbo/Kaname operating accounts before DM contact. The operator can import the response JSON, preview/download attached audio, and automatically add grouped song answers to the track list. Private Google account OAuth, Google Drive folder sync, WordPress draft posting, and SE_Pon automation are planned for later phases.

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
