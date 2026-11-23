# WingNuts 6410 website

A bilingual Astro website for FRC Team 6410 at Everett Alvarez High School. It includes a custom, no-code editor at `/admin/`; editors never see Git, YAML, or source files.

## Use it locally

```sh
npm install
npm run dev
```

Open:

- Website: `http://localhost:4321/en/`
- Editor: `http://localhost:4321/admin/`

The local username and password reminder is in `.local/ADMIN_LOGIN_LOCAL.txt`. That folder is ignored by Git. To change the local password, run `npm run admin:setup`.

## Editing the website

1. Sign in at `/admin/`.
2. Choose a page or item from the left side.
3. Change text, reorder or hide sections, or upload an image.
4. Select **Save draft**. Visitors cannot see drafts.
5. Select **Preview** to check the draft.
6. Select **Publish changes** when it is ready.

The editor covers site settings, all English and Spanish pages, news, robots and seasons, outreach, subteams, sponsors, downloads, images, links, visibility, and SEO. New repeatable items can be added with **Add new**. Current robot seasons start hidden.

## Storage and cost

There is no Sanity account, database, subscription, or credit card. Published content stays in `src/content/`, and uploaded files stay in `public/uploads/`. Local drafts stay in `.local/drafts/` until published.

The included live-site adapter is designed for Cloudflare Pages' free tier:

- `/admin/` on the live site asks for a username and a long generated password. Create a new one with `npm run admin:live-password` and store the printed value as the `ADMIN_PASSWORD_HASH` secret. (Cloudflare Access is also supported: set `CF_ACCESS_TEAM_DOMAIN` and `CF_ACCESS_AUD` instead.)
- A GitHub App writes drafts to a draft branch and publishes approved files to the main branch.
- `.github/workflows/deploy.yml` rebuilds the live site after each publish, and the draft preview after each save.
- Static visitors never run a database or paid CMS.

See `wrangler.example.toml` for the live environment variables. Keep the Cloudflare project, GitHub repository, and GitHub App under school/team ownership with at least two adult administrators.

## Commands

```sh
npm run dev          # local website and editor
npm run admin:setup  # change local editor credentials
npm run admin:live-password  # new password for the live editor
npm run check        # TypeScript and Astro validation
npm run build        # production build into dist/
```

## Important files

- `src/admin/` — custom editor interface
- `src/cms/` — validation, drafts, publishing, authentication, and storage
- `functions/api/admin/` — Cloudflare Pages production API
- `src/content/` — published editable content
- `public/uploads/` — published images and PDFs
- `.local/` — private local credentials and drafts; never committed

Do not place student/family form submissions or private student information in the website. Use school-managed Google Forms for join, sponsor, and contact responses.
