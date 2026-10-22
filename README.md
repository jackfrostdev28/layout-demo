# CSS Grid Concepts

An interactive playground for learning CSS Grid. Pick a layout, edit tracks and gaps, drag areas to swap them, and copy the CSS and HTML that produce the preview.

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173).

## Production build

```bash
npm run build
npm run preview
```

`npm run build` typechecks the project and writes a static site to `dist/`.

## Deploy on Vercel

Vercel detects Vite automatically. Import this repository and use:

- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`

No environment variables are required. This app is a single static page with no client-side router, so it does not need a `vercel.json`.

## Checks

```bash
npm test
npm run build
```
