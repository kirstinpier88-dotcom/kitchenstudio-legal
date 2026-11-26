# Kitchen Studio privacy policy and share pages

This repository holds the public privacy policy for the Kitchen Studio app and the small pages
that shared recipe and cookbook links open, served by GitHub Pages. It contains no app code.

- `index.html` is the page people see. It is plain HTML with no scripts, trackers or outside files.
- `policy.md` is the same text in Markdown, for easy editing.

To update the policy: edit both files so they match, change the effective date, and commit.
GitHub Pages republishes the page automatically within a few minutes.

## Share pages

- `r/index.html` shows a shared recipe; `c/index.html` shows a shared cookbook. New links look like
  `https://kitchenstudioapp.co/r/<code>` (`/c/<code>` for a cookbook). Older links,
  `https://kirstinpier88-dotcom.github.io/kitchenstudio-legal/r/?t=<code>`, keep working.
- `share/share.js` reads the share by its code from Kitchen Studio's database (the
  `get_share_link` function, Kitchen Studio Dev) using the publishable key, which is public by
  design. It shows the text only as text, has no trackers, and sends nothing anywhere else.
- "Open in Kitchen Studio" opens `cookbook://r/<code>` or `cookbook://c/<code>` in the app.
- The app side lives in the private app repo (`utils/share-links.ts`).

## Universal links (kitchenstudioapp.co)

On an iPhone with Kitchen Studio installed, tapping a `https://kitchenstudioapp.co/r/...` or
`/c/...` link opens the app straight away instead of this page.

- `.well-known/apple-app-site-association` tells Apple which app may open which links: app
  `46R2AQ9F6L.kitchenstudio.app` (Team ID + the app's bundle ID), paths `/r/*` and `/c/*` only.
  The privacy policy and everything else still open in the browser.
- `kitchenstudioapp.co` is served by **Cloudflare Pages** (free) from this repo's `main` branch,
  with no build step. `_headers` serves the Apple file as JSON; `_redirects` shows the share page
  for `/r/<code>` and `/c/<code>`. GitHub Pages ignores both files and keeps serving the old
  `github.io` address.
- The app side is `ios.associatedDomains` in the app repo's `app.json` and `SHARE_WEB_BASE` in
  `utils/share-links.ts`.

## Link previews (worker.js)

Messages and other chat apps build a link preview from the page's Open Graph tags without running
its script. `worker.js` sees every request but only changes `/r/*` and `/c/*` pages; everything
else is handed straight to the files (the Apple link file also has a built-in copy in case that
ever fails). For share pages it reads the share with the same public `get_share_link` call, then writes the recipe's name
(or the cookbook's name and recipe count) and its main photo into `og:title`, `og:description`
and `og:image`. A share that can't be read keeps the general preview. Answers are cached for 60
seconds at the edge. Everything else (the policy, the Apple file, `share/`) is served straight
from the files.
