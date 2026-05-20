# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start Vite dev server on port 5173
npm run build        # Type-check (tsc -b) then production build
npm run typecheck    # Type-check only, no emit
npm run preview      # Preview production build with PWA
```

No test or lint scripts are configured.

## What this app is

A PWA for learning English vocabulary through typing and speaking practice. Works fully offline once installed. All state is local-first — no backend API, no user accounts.

## Architecture

**Routes (src/pages/):**
- `/` — Batch selector; loads word groups of 50 words each
- `/practice/:batchId` — Typing practice: type English translation, progressive hints, auto-advance on correct
- `/speak/:batchId` — Speaking practice: real-time pronunciation scoring via Web Speech API
- `/review` — Difficult words review, randomly shuffled
- `/settings` — Theme, speech rate, voice, pronunciation source, progress export/import

**State (src/store/) — all Zustand + localStorage persist:**
- `useWordsStore` — words loaded from `/public/words.json`, batches, byId Map
- `useProgressStore` — per-word attempts, correct count, isHard flag, lastScore (0–1)
- `useSettingsStore` — theme, speech settings, UI toggles (auto-show phonetic, etc.)

**Data flow:** App mounts → `useWordsStore.load()` fetches `words.json` → user picks a batch → navigated to practice page → practice pages read store, write progress back.

**Key hooks (src/hooks/):**
- `useSpeak()` — wraps SpeechSynthesis, manages voice selection cache
- `useRecognize()` — wraps Web Speech API (webkit fallback), emits interim + final results, handles permission/network/insecure-context errors
- `useShortcuts()` — global keyboard shortcuts: Enter (submit/advance), Ctrl+Arrow (navigate), M (mark hard), Esc (exit)
- `useDevice()` — detects mobile, speech recognition availability

## Key data types (src/types.ts)

```ts
Word: { id, english, spanish, ipa, sentence, sentenceSpanish, sentencePhonetic, ... }
WordProgress: { attempts, correct, isHard, lastSeen, lastScore }  // lastScore is 0–1 similarity
Batch: { index, label, wordIds, size }
```

Words come from `public/words.json` as `RawWord[]` and are normalized in `src/utils/loadWords.ts`.

## Core utilities (src/utils/)

- `normalize.ts` — strips diacritics, punctuation, lowercases; used for typing comparison
- `similarity.ts` — Levenshtein character-level + token-level matching for pronunciation scoring (`similarity()`, `sentenceSimilarity()`)
- `hint.ts` — `buildHint()`: progressive reveals (attempt 1 → 1 letter, attempt 2+ → 2 letters)

## Styling

Tailwind with dark mode via `class`. Custom component classes (`.btn`, `.btn-primary`, `.card`, `.input`, `.chip`) defined in `src/index.css` using `@layer components`. Brand palette is blue-based.

## PWA / Build notes

VitePWA is configured with auto-update and workbox caching (5 MB limit, caches JS/CSS/HTML/SVG/PNG/JSON). Netlify is the deployment target — do not add `@types/node` to `tsconfig.node.json` (broke the build previously).
