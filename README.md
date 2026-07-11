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
4. Broadcast episode management.
5. Form template management.
6. Shareable form URL prototype.
7. Response JSON creation/import with WAV/MP3 attachments.
8. Response management with public/article/internal/constraint separation.
9. Track and audio metadata management.
10. Thumbnail composition from three base images plus a guest icon.
11. Thumbnail and production asset management.
12. Codex request pack generation.
13. JSON export/import backup.

The import workflow currently supports public Google Sheets CSV/export URLs and local CSV files. Shared forms can embed WAV/MP3 uploads in the response JSON so the operator can import and download them. Private Google account OAuth, Google Drive folder sync, WordPress draft posting, and SE_Pon automation are planned for later phases.

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
