# Mightora Prompt Builder

Free, open-source, browser-first prompt builder for ChatGPT, Microsoft Copilot, Claude and other AI assistants, hosted at [prompts.mightora.io](https://prompts.mightora.io/).

## Features

- Guided prompt composition with role, objective, context, audience, format, tone, constraints, reference material and quality checks.
- Seven built-in AI working profiles and twelve task templates.
- Create and save up to 30 custom roles in browser local storage. No account, server, or AI API.
- Live output, copy to clipboard and Markdown/text downloads.
- Public search-readable examples, profile pages, guides and privacy notes, including structured metadata and a sitemap.
- Single-file offline HTML and ZIP generated from the same maintained source, with embedded styles, scripts, images and a restrictive offline CSP.
- GitHub Actions for tests, deployment and CodeQL. MIT licensed.

## Local development

Requirements: Node.js 20+ and the `zip`/`unzip` command-line tools.

```sh
npm test
npm run build
npm run verify
```

Open `dist/index.html` via a local static server for the online version (for example `npx serve dist`). Open `dist/downloads/mightora-prompt-builder-offline.html` directly from disk to test the offline edition. The online version uses root-relative paths and is intended for its custom domain.

No `npm install` is required. There are no runtime npm dependencies.

## Repository layout

- `src/index.html`: main page, builder controls, static explanatory content.
- `src/catalogue.js`: profiles and task templates.
- `src/engine.js`: shared prompt composition engine.
- `src/app.js`: browser behaviour, local profile storage, output and downloads.
- `src/styles.css`: application styles.
- `src/assets/`: official Mightora brand image, portrait and offline shared styles.
- `scripts/build.mjs`: static SEO pages, sitemap, offline HTML and ZIP from one codebase.
- `scripts/verify.mjs`, `tests/`: release integrity and engine checks.

## GitHub Pages deployment

The workflow `.github/workflows/pages.yml` builds and tests on every push to `main`, uploads `dist/`, and deploys it through GitHub Actions. In **Settings → Pages**, select **GitHub Actions** as the build and deployment source. The custom domain is `prompts.mightora.io`; the `CNAME` file is copied to `dist/` and Cloudflare DNS points to `mightora.github.io` (DNS only).

If a Pages deployment is blocked before its first run, check that repository Pages is enabled and that the `github-pages` environment permits deployments from `main`.

## Security and privacy

Prompt fields and reference material remain in browser memory; only explicitly saved custom profiles use localStorage. This application does not transmit prompts to Mightora or any AI provider. When visitors copy content into another AI service, that service's data handling applies. The online version requests Mightora shared UI assets and third-party badge imagery. The offline file embeds the required assets and blocks network connections with CSP.

CodeQL is a useful automated check, not a security guarantee. The tool offers no authentication, analytics or backend.

## Contributing

Issues and pull requests are welcome. Keep new templates factual, platform-neutral, accessible, and free of embedded secrets or copyrighted source material. Verify with `npm run check` before submitting.

## Licence

MIT — see [LICENSE](LICENSE).
