# playroom-web

Marketing site, privacy policy and support page for **Playroom - Party Games**
(iOS, bundle id `com.byld.playroom`). The app itself lives in a separate repo (`playroom`).

It's built the same way as `book-web`: plain HTML/CSS/JS with no build step, hosted on
GitHub Pages, with the email sign-up posting to a Google Apps Script that appends rows to a
Google Sheet.

## What's here

```
index.html              Landing page: hero, the four games, how it works, Party Pass, sign-up
privacy/index.html      Privacy policy (App Store "Privacy Policy URL")
support/index.html      Support: FAQ + contact (App Store "Support URL")
404.html                Not-found page, and the landing page for invite links (/join/ABCDE)
config.js               Public settings: App Store URL, sign-up endpoint, support email
script.js               Sign-up form, support form, small page behaviour
styles.css              All styles (colours mirror the app's src/theme/tokens.ts)
google-apps-script.js   Paste into the Google Sheet's Apps Script editor (sign-up backend)
assets/                 Logo, icon, favicon, Party Pass screenshot, social preview image
scripts/dev-server.mjs  Local server that behaves like GitHub Pages
scripts/check.mjs       Link + secret check (the closest thing to a build)
.nojekyll               Tells GitHub Pages to serve files as-is
```

`config.js` ships to every visitor. Never put a secret in it (or anywhere in this repo): no
Supabase service-role key, no database password, no API secret. `npm run check` fails if
something that looks like one shows up.

## Run locally

Needs Node 18+. No `npm install`: there are no dependencies.

```bash
npm run dev          # http://localhost:4173/
npm run dev:pages    # http://localhost:4173/playroom-web/  (same sub-path as GitHub Pages)
npm run check        # every local link resolves, no secrets committed
```

Opening `index.html` straight from disk mostly works too, but use the dev server to test
invite links (`/join/BLMKR`) and the 404 page.

## Sign-up form (Google Sheets)

Same mechanism as book-web: the form sends an opaque (`no-cors`) POST with a JSON body to an
Apps Script web app, which writes to a Sheet. The browser can't read the reply, so a network
error is the only failure the page can show. The script ignores repeat sign-ups for the same
email, stores values as plain text (so a submission can't become a formula), and a hidden
honeypot field drops most bots before anything is sent.

One-time setup (needs your Google account, so it's manual):

1. Create a Google Sheet, e.g. **Playroom Signups**. Leave it empty: the script creates a
   `Signups` tab with the headers `Email | Timestamp | Source | Page`.
2. **Extensions → Apps Script**. Replace the editor contents with `google-apps-script.js`. Save.
3. Optional: run `testScript` once from the editor. It asks for permission and adds a
   `test@example.com` row (delete it afterwards).
4. **Deploy → New deployment →** type **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Authorise, then copy the **Web app URL** (`https://script.google.com/macros/s/…/exec`).
6. Put it in `config.js` as `signupUrl`, commit and push.

Changing the script later: **Deploy → Manage deployments → edit → Version: New version**.
That keeps the same URL. "New deployment" creates a new URL, which you'd have to put in
`config.js` again.

Until `signupUrl` is set, the form says sign-ups aren't connected yet instead of pretending.

### Testing it

Submit a real address on the deployed site (or `npm run dev`) and check the row appears in
the sheet. Submitting the same address again must not add a second row.

## Deploy (GitHub Pages)

1. Create a repo (`GaetanJP/playroom-web`, next to the `playroom` app repo) and push `main`.
2. Repo **Settings → Pages → Build and deployment**: Source **Deploy from a branch**,
   Branch **main**, folder **/ (root)**. Save.
3. After a minute the site is at `https://<owner>.github.io/playroom-web/`.
4. Optional custom domain (e.g. `playroom.byld.app`): add it under Settings → Pages,
   create the DNS record GitHub shows (a `CNAME` to `<owner>.github.io`), tick
   **Enforce HTTPS**. Pages adds a `CNAME` file to the repo; pull it.

Everything uses relative paths, so the site works both at a sub-path and on a custom domain.
`404.html` works out the site root itself, so it also works at either.

## URLs the app and App Store Connect need

With GitHub Pages under `GaetanJP` (replace the base if you use another owner or a custom
domain):

| Where | Value |
| --- | --- |
| App Store Connect → Privacy Policy URL | `https://gaetanjp.github.io/playroom-web/privacy/` |
| App Store Connect → Support URL | `https://gaetanjp.github.io/playroom-web/support/` |
| App Store Connect → Marketing URL | `https://gaetanjp.github.io/playroom-web/` |
| App: `EXPO_PUBLIC_PRIVACY_URL` | `https://gaetanjp.github.io/playroom-web/privacy/` |
| App: `EXPO_PUBLIC_INVITE_BASE_URL` | `https://gaetanjp.github.io/playroom-web` |

The app builds invite links as `${EXPO_PUBLIC_INVITE_BASE_URL}/join/ABCDE`. On this site
that URL opens the invite page: it shows the code, an **Open in Playroom** button
(`playroom://join/ABCDE`) and the App Store badge. It is a normal web page, not a Universal
Link: tapping an invite opens Safari first. Opening the app directly would need an
`apple-app-site-association` file on a domain you control (a custom domain, not a
`github.io` sub-path) plus Associated Domains in the app. That's a later step.

GitHub Pages returns the invite page with HTTP status 404 (that's how its fallback works).
Browsers show it normally; some link-preview bots may not show a preview card.

## When the app goes live

1. Set `appStoreUrl` in `config.js` to the App Store link. Every badge then links there and
   reads "Download on the App Store" instead of "Coming soon".
2. Replace the placeholder badge with Apple's official one from
   <https://developer.apple.com/app-store/marketing/guidelines/> (download the SVG into
   `assets/` and swap the `.store-badge` markup in `index.html` and `404.html`).
3. Swap in final App Store screenshots if you want more than the Party Pass one.

## Keeping copy in sync with the app

- Game names, player counts and taglines come from the app's `shared/games/catalog.ts`.
- Party Pass contents and price come from the app's Party Pass screen and `docs/PARTY_PASS.md`.
- The privacy policy describes the app as of November 2026: anonymous Supabase auth, optional
  email for the pass, RevenueCat purchase records, no analytics, rooms deleted after
  6 hours idle (`cleanup_rooms()`), rate-limit rows after 1 day. If any of that changes (an
  analytics SDK, a crash reporter, a new data type), update `privacy/index.html` and the
  App Store privacy labels together. Have someone review the policy before submission.
