# Personal Website

My personal site: [andrewm24.github.io/Personal-Website](https://andrewm24.github.io/Personal-Website/)

Static HTML, one stylesheet, one small script. No framework. Vite handles the build.

## Structure

```
index.html          Page content
src/main.js         Theme toggle, scroll reveal, nav highlighting
src/style.css       Design tokens and layout
public/assets/      Résumé PDF and other static files
```

## Running it

```bash
npm install
```

```bash
npm run dev
```

Build to `dist/`:

```bash
npm run build
```

## Deploying

`.github/workflows/deploy-pages.yml` builds and publishes to GitHub Pages on every push to
`main`.

Because Pages serves the site from a subpath, `vite.config.js` sets `base: './'` and links to
assets are relative — keep them that way.
