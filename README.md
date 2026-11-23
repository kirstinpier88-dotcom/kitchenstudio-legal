# Kitchen Studio privacy policy and share pages

This repository holds the public privacy policy for the Kitchen Studio app and the small pages
that shared recipe and cookbook links open, served by GitHub Pages. It contains no app code.

- `index.html` is the page people see. It is plain HTML with no scripts, trackers or outside files.
- `policy.md` is the same text in Markdown, for easy editing.

To update the policy: edit both files so they match, change the effective date, and commit.
GitHub Pages republishes the page automatically within a few minutes.

## Share pages

- `r/index.html` shows a shared recipe; `c/index.html` shows a shared cookbook. Links look like
  `https://kirstinpier88-dotcom.github.io/kitchenstudio-legal/r/?t=<code>`.
- `share/share.js` reads the share by its code from Kitchen Studio's database (the
  `get_share_link` function, Kitchen Studio Dev) using the publishable key, which is public by
  design. It shows the text only as text, has no trackers, and sends nothing anywhere else.
- "Open in Kitchen Studio" opens `cookbook://r/<code>` or `cookbook://c/<code>` in the app.
- The app side lives in the private app repo (`utils/share-links.ts`).
