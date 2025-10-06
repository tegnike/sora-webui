# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sora2 | Video Generator WebUI - OpenAI Sora2 APIを使用した動画生成Webアプリケーション

**Tech Stack:**
- Next.js 15 (App Router)
- TypeScript (strict mode)
- Tailwind CSS 4
- OpenAI SDK

## Common Commands

```bash
# Development
npm run dev          # Start development server at http://localhost:3000

# Build & Production
npm run build        # Build for production
npm start            # Start production server

# Linting
npm run lint         # Run Next.js linter
```

## Architecture

### Directory Structure

- `app/` - Next.js App Router pages and API routes
  - `app/page.tsx` - Main UI component (video generation form)
  - `app/api/generate/route.ts` - Video generation endpoint
  - `app/api/status/route.ts` - Video status polling endpoint
  - `app/api/download/route.ts` - Video download endpoint
- `lib/` - Shared utilities
  - `lib/sora.ts` - Sora2 API client wrapper functions
- `types/` - TypeScript type definitions
  - `types/sora.ts` - Sora2 API types (`VideoGenerationRequest`, `VideoStatus`, etc.)

### API Flow

1. **Video Generation**: Client → `/api/generate` → OpenAI `client.videos.create()` → Returns `videoId`
2. **Status Polling**: Client → `/api/status?videoId=xxx` → OpenAI videos API → Returns status (`pending`, `in-progress`, `completed`, `failed`)
3. **Download**: Client → `/api/download?videoId=xxx` → Fetches video binary from OpenAI

### API Key Handling

APIキーは以下のいずれかから取得:
- FormDataの`apiKey`パラメータ（WebUI入力）
- 環境変数`OPENAI_API_KEY`（`.env.local`）

### Path Alias

`@/*` → プロジェクトルート（`tsconfig.json`で設定）

## Development Notes

- Sora2 APIは公式OpenAI SDKの`client.videos.create()`を使用
- 画像参照機能は`input_reference`パラメータで実装
- モデル選択: `sora-2`（高速）または`sora-2-pro`（高品質）
