# WingNuts 6410 website

The bilingual (English and Spanish) website for FRC Team 6410 at Everett Alvarez High School, built with [SvelteKit](https://svelte.dev/docs/kit). The whole site is built into plain files; there is no database, no login and no admin page. To change the site, edit the files in this folder and push to GitHub.

## Run it on your computer

```sh
npm install
npm run dev
```

Open `http://localhost:5173/en/`. The page updates as you save files.

## Change the words on a page

All text lives in `src/content/`. Edit the file, save, and check the page in your browser.

| What | File |
| --- | --- |
| Team name, school name, form links, social links, announcement bar | `src/content/settings/site.yml` |
| Home, Team, Robots, Outreach, Sponsors, News, Join (English) | `src/content/pages/en/*.yml` |
| The same pages in Spanish | `src/content/pages/es/*.yml` |
| News stories | `src/content/news/en/*.md` and `src/content/news/es/*.md` |
| Subteams (Team page) | `src/content/team/*.yml` |
| Outreach programs | `src/content/outreach/*.yml` |
| Robot seasons | `src/content/seasons/*.yml` |
| Sponsors | `src/content/sponsors/*.yml` |
| Downloads (sponsor packet, handbook) | `src/content/downloads/*.yml` |

Menu labels, footer text and the "coming soon" notes are in `src/lib/site.ts`.

If a file has a typo or is missing something, `npm run dev` and `npm run build` stop and name the file and the field.

## Common edits

**Add a photo.** Put the picture in `static/images/`, then point to it from the content file. A description (`alt`) is required.

```yaml
photo:
  src: /images/team-2026.jpg
  alt: The team standing behind the robot at the regional
  caption: Optional caption
  credit: Optional photo credit
```

**Add a news story.** Create `src/content/news/en/my-story.md` (and a Spanish one in `news/es/` if you have it). A story with text below the header gets its own page; one without text only shows as a card.

```md
---
lang: en
title: "Our first event of the season"
date: March 14, 2026     # shown exactly as typed, e.g. "2026 October". Leave out to show "Coming soon"
category: competition   # team, build, competition or outreach
summary: One or two sentences for the card.
published: true
---

The story goes here, written in Markdown.
```

**Add a sponsor.** Put the logo in `static/images/` and create `src/content/sponsors/acme.yml`:

```yaml
name: Acme Tools
tier: Gold            # Platinum, Gold, Silver or Bronze
logo:
  src: /images/acme.png
website: https://example.com
```

**Show a robot season.** In `src/content/seasons/2026.yml`, set `public: true` and fill in `robotName`, `gameName`, `summaryEn`, `summaryEs`, `photo` and `blueAllianceUrl`. The newest public season is featured; older ones fill the archive.

**Add a download.** Put the PDF in `static/downloads/` and create `src/content/downloads/sponsor-packet.yml`:

```yaml
lang: en
title: Sponsor packet (PDF)
kind: packet          # packet shows on Sponsors; handbook or other show on Join
file: /downloads/sponsor-packet.pdf
published: true
```

## Publish

```sh
npm run check   # looks for mistakes
npm run build   # builds the site into dist/
git add -A && git commit -m "Describe the change" && git push
```

Pushing to the `main` branch on GitHub rebuilds and publishes the site automatically (`.github/workflows/deploy.yml`, Cloudflare Pages free tier). It takes about a minute.

## Where things are

- `src/content/` — all page text and lists
- `static/` — pictures, downloads and other files served as they are
- `src/routes/` — the pages: `/en/…` and `/es/…`
- `src/lib/components/` — page sections, header, footer
- `src/lib/schema.ts` — what each content file must contain
- `src/lib/site.ts` — site address, page addresses, menu and footer text
- `src/app.css` — all styling
- `design/logo-drafts/` — logo drafts; not published

Do not put student or family information in the website. Use school-managed Google Forms for join, sponsor and contact responses, and paste their links into `src/content/settings/site.yml`.
