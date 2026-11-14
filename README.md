# HNova Marketing Website

> AI workflow-automation agency — [hnova.tech](https://hnova.tech)

## Project structure

```
Hnova/
├── index.html              ← Main marketing page
├── privacy-policy.html     ← Privacy Policy
├── terms.html              ← Terms of Service
│
├── css/
│   └── styles.css          ← All styles (custom properties, layout, animations, accessibility)
│
├── js/
│   └── main.js             ← Typewriter, scroll-reveal, counters, mouse effects, contact form
│
├── favicon.svg             ← SVG favicon (geometric HN mark)
├── og-image.svg            ← OG image source (convert to og-image.png before deploy – see below)
│
├── robots.txt              ← SEO: allow all crawlers, points to sitemap
├── sitemap.xml             ← SEO: canonical page list
│
├── .gitignore
└── README.md               ← This file
```

---

## Running locally

No build step is required — the site is 100% static.

**Option 1 — open directly:**  
Just double-click `index.html`. Everything works except anchor-link scrolling in some browsers when opened as `file://`.

**Option 2 — local HTTP server (recommended):**

```bash
# Node.js (one-liner, no install needed)
npx serve .

# Python 3
python -m http.server 3000

# VS Code
Install the "Live Server" extension → right-click index.html → Open with Live Server
```

Then open `http://localhost:3000` (or the port shown).

---

## OG image — convert SVG → PNG

The `og-image.svg` file is a 1200×630 source. Social platforms require a raster PNG.

```bash
# Option A — sharp CLI
npm install -g sharp-cli
sharp og-image.svg -o og-image.png

# Option B — Inkscape (free, desktop)
inkscape og-image.svg --export-type=png --export-filename=og-image.png -w 1200 -h 630

# Option C — online
# Upload og-image.svg to https://cloudconvert.com/svg-to-png
```

Commit `og-image.png` and reference it at `https://hnova.tech/og-image.png`.

---

## Environment variables

The current site is fully static and needs **no `.env` file**.

When you add a real contact-form backend (e.g. Formspree or a custom Node API), create a `.env` file at the project root:

```
# Contact form endpoint
FORM_ENDPOINT=https://formspree.io/f/YOUR_ID

# (future) Formspree or backend API key
FORM_API_KEY=your_key_here
```

> `.env` is already in `.gitignore` — never commit it.

---

## Deployment

### Netlify (recommended — free tier covers this)

1. Push the repo to GitHub (or GitLab / Bitbucket).
2. Log in to [netlify.com](https://netlify.com) → **Add new site → Import an existing project**.
3. Select the repo.
4. Settings:
   - **Build command:** *(leave blank — no build step)*
   - **Publish directory:** `.`
5. Click **Deploy site**.
6. Add your domain: **Domain management → Add custom domain → `hnova.tech`**.
7. Enable **Force HTTPS** (Netlify auto-provisions a Let's Encrypt certificate).

### Vercel (alternative)

```bash
npm install -g vercel
vercel --prod
```

Follow the prompts. Add `hnova.tech` in the Vercel dashboard under **Domains**.

### GitHub Pages (zero-cost, simplest)

1. Push to `main` branch of a public GitHub repo.
2. Settings → Pages → Branch: `main` / Root `/`.
3. Add a `CNAME` file containing `hnova.tech`.
4. Point your DNS `A` record to GitHub's IPs (see [GitHub docs](https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site)).

### AWS S3 + CloudFront (production-grade)

```bash
# 1. Create bucket (name must match domain)
aws s3 mb s3://hnova.tech

# 2. Enable static website hosting
aws s3 website s3://hnova.tech --index-document index.html --error-document index.html

# 3. Upload files (sync only changed files)
aws s3 sync . s3://hnova.tech \
  --exclude ".git/*" --exclude "node_modules/*" --exclude ".env" \
  --delete

# 4. Create CloudFront distribution (via console or CDK) pointing to the S3 origin.
# 5. Add an ACM certificate for hnova.tech in us-east-1.
# 6. Set CloudFront as the DNS target in Route 53 or your registrar.
```

---

## Future: adding a backend

When you're ready to handle the contact form server-side (instead of `mailto:`):

### Option A — Formspree (no backend, free tier)

1. Sign up at [formspree.io](https://formspree.io).
2. Create a form → copy the endpoint, e.g. `https://formspree.io/f/abcdefgh`.
3. In `js/main.js`, replace the `mailto:` handler with a `fetch()` POST to that endpoint.

### Option B — Node.js API (custom)

Deploy a small Express or Fastify server on:
- **Railway** — `railway up` after linking GitHub repo
- **Render** — connect repo, set start command to `node server.js`
- **DigitalOcean App Platform** — push to GitHub, App Platform auto-detects Node

The server receives form submissions and forwards them via **Nodemailer** (or **Resend**) to `hello@hnova.tech`.

---

## Checklist before going live

- [ ] Convert `og-image.svg` → `og-image.png` (1200 × 630)
- [ ] Generate `favicon.ico` from `favicon.svg` (use [realfavicongenerator.net](https://realfavicongenerator.net))
- [ ] Update `sitemap.xml` `<lastmod>` dates after any content edits
- [ ] Update the Twitter handle `@hnova_tech` in `index.html` if different
- [ ] Replace `mailto:` form handler with a real backend or Formspree endpoint
- [ ] Run [PageSpeed Insights](https://pagespeed.web.dev) on the live URL and fix any regressions
- [ ] Verify all three Open Graph tags render correctly with [opengraph.xyz](https://www.opengraph.xyz)
- [ ] Test on a real iOS Safari device (safe-area insets)

---

## License

All source code in this repository is proprietary and confidential.  
© 2026 HNova. All rights reserved.
