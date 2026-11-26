// Kitchen Studio share links: link previews with the recipe's name and photo (Kay, 2026-11-26).
//
// Messages, WhatsApp and the like build a link preview from the page's Open Graph tags, and they
// don't run the page's script. So for /r/<code> and /c/<code> this small Worker reads the share
// (the same public get_share_link call the page makes) and writes its name and main photo into
// the page before sending it. Everything else on the site is served as plain files and never
// reaches this code (wrangler.jsonc run_worker_first).
//
// If the share can't be read (stopped, unknown, no signal) the page goes out unchanged, with the
// general "A recipe shared from Kitchen Studio" preview. Nothing is stored or tracked.

// Public values, the same ones share/share.js uses: the publishable key can only call what the
// database lets signed-out visitors call (reading one share by its code).
const SUPABASE_URL = 'https://hkomjgcujhnuasrmbjxw.supabase.co';
const PUBLISHABLE_KEY = 'sb_publishable_2FDMLyNUn3Wp8k77egZIyg_HGWnlWw0';

const SHARE_PATH = /^\/(r|c)\/([a-f0-9]{32})\/?$/;
const PAGE_HEADERS = { 'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'no-referrer' };

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const match = SHARE_PATH.exec(url.pathname);
    const letter = match ? match[1] : url.pathname.startsWith('/c/') ? 'c' : 'r';
    // The share page itself (r/index.html or c/index.html), whatever the code.
    const page = await env.ASSETS.fetch(new Request(new URL(`/${letter}/`, url), request));
    const headers = new Headers(page.headers);
    for (const [k, v] of Object.entries(PAGE_HEADERS)) headers.set(k, v);
    // Previews change when the cook edits the recipe; keep them fresh.
    headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
    const plain = new Response(page.body, { status: page.status, headers });
    if (!match || !page.ok || request.method !== 'GET') return plain;

    const share = await readShare(match[2], ctx).catch(() => null);
    const kind = letter === 'r' ? 'recipe' : 'cookbook';
    if (!share || share.kind !== kind) return plain;
    const preview = previewFor(share);
    if (!preview) return plain;

    return new HTMLRewriter()
      .on('title', { element: (el) => el.setInnerContent(`${preview.title} · Kitchen Studio`) })
      .on('meta[property="og:title"]', { element: (el) => el.setAttribute('content', preview.title) })
      .on('meta[property="og:description"]', { element: (el) => el.setAttribute('content', preview.description) })
      .on('head', {
        element: (el) => {
          // setAttribute and the tag text below are escaped by hand: names come from the cook.
          if (preview.image) {
            el.append(`<meta property="og:image" content="${attr(preview.image)}">`, { html: true });
            el.append('<meta name="twitter:card" content="summary_large_image">', { html: true });
          }
          el.append('<meta property="og:type" content="article">', { html: true });
        },
      })
      .transform(plain);
  },
};

/** The share, from a 60-second edge cache so a busy group chat doesn't ask the database each time. */
async function readShare(token, ctx) {
  const cache = caches.default;
  const key = new Request(`https://share-preview.cache/${token}`);
  const hit = await cache.match(key);
  if (hit) return hit.json();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_share_link`, {
    method: 'POST',
    headers: { apikey: PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_token: token }),
  });
  if (!res.ok) return null;
  const share = await res.json();
  if (!share || typeof share !== 'object') return null;
  ctx.waitUntil(cache.put(key, new Response(JSON.stringify(share), { headers: { 'Cache-Control': 'max-age=60' } })));
  return share;
}

function text(value, max) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

/** Only https photos (a phone photo is copied to the web when the link is sent). */
function photoUrl(photo) {
  const uri = photo && photo.kind === 'uri' && typeof photo.uri === 'string' ? photo.uri : '';
  return /^https:\/\/[^\s"<>]+$/i.test(uri) && uri.length < 2000 ? uri : '';
}

export function previewFor(share) {
  const who = text(share.sharer_name, 80) || 'A friend';
  if (share.kind === 'recipe') {
    const recipe = (share.payload && share.payload.recipe) || {};
    const title = text(recipe.title, 120);
    if (!title) return null;
    return { title, description: `From ${who}’s Kitchen Studio cookbook`, image: photoUrl(recipe.photo) };
  }
  const name = text(share.cookbook_name, 120) || 'A cookbook';
  const recipes = Array.isArray(share.payload && share.payload.recipes) ? share.payload.recipes : [];
  const count = recipes.filter((r) => r && text(r.title, 1)).length;
  const first = recipes.map((r) => photoUrl(r && r.photo)).find(Boolean) || '';
  return {
    title: name,
    description: `${who} shared their cookbook · ${count === 1 ? '1 recipe' : `${count} recipes`}`,
    image: first,
  };
}

function attr(value) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
