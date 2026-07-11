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
2. Broadcast episode management.
3. Form template management.
4. Response management with public/internal/constraint separation.
5. Track and audio metadata management.
6. Thumbnail and production asset management.
7. Codex request pack generation.
8. JSON export/import backup.

External integrations such as Google Drive, WordPress, and SE_Pon are planned for later phases.

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
