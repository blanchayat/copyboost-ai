# AI Product Description Optimizer

A clean, modern single-page web app where e-commerce store owners can paste an existing product description and instantly generate an **AI-optimized** version with a single click.

The app runs entirely in your browser and supports:

- **Original description input**: Paste your current product copy.
- **AI-optimized output**: Get a clearer, more persuasive version.
- **Tone and focus controls**: Choose tone (friendly, luxury, etc.) and SEO vs. conversion emphasis.
- **Copy button**: Copy the optimized description to your clipboard in one click.
- **Optional real AI API**: Uses a server-side Anthropic proxy (Vercel serverless or local Express), with a built-in local rewrite as fallback.

## Getting started

You can run the app in two ways:

### 1. Open directly in your browser

1. From this project folder, open `index.html` in any modern browser (Chrome, Edge, Firefox, Safari).
2. Start using the tool—no build step or dependencies required.

### 2. Run with a local proxy server (optional)

If you have Node.js installed:

```bash
cd AI-Projects
npm install
npm run server
```

This starts the local Node.js proxy on `http://localhost:4000`.

Then, either:

- Open `index.html` directly in your browser, or
- Serve the folder statically (e.g. `npm run start`) and open the printed URL.

## Using an AI provider

By default, the app uses a **local rule-based rewrite** so it works without any external API.  
To use a real AI model:

1. Set `ANTHROPIC_API_KEY` in `.env` for local, or in Vercel project environment variables for production.
2. The frontend calls `/api/anthropic` (Vercel serverless function). For local development, you can run `npm run server` and the frontend can still use the local rewrite fallback if the API isn’t available.

> ⚠️ **Security note**: API keys used in the browser are exposed to anyone with access to that browser or dev tools. For production use, you should proxy requests through your own backend so keys are never exposed client-side.

## Keyboard shortcuts

- **Ctrl+Enter / Cmd+Enter** while in the original description box: trigger optimization.

## Customization

- Tweak colors, spacing, and typography in `styles.css`.
- Adjust prompt behavior or fallback rewriting rules in `app.js`.

