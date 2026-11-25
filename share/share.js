// Kitchen Studio share page. Shows one shared recipe (r/) or cookbook (c/) and offers to open it
// in the app. Reads the share by its code from Kitchen Studio's database (get_share_link), which
// returns only what the cook chose to share. Nothing here is saved, tracked or sent anywhere else.
(function () {
  'use strict';
  // Public values, safe to publish: the publishable key can only call what the database allows
  // signed-out visitors to call (here, reading one share by its code).
  var SUPABASE_URL = 'https://hkomjgcujhnuasrmbjxw.supabase.co';
  var PUBLISHABLE_KEY = 'sb_publishable_2FDMLyNUn3Wp8k77egZIyg_HGWnlWw0';

  var kind = document.body.getAttribute('data-kind') === 'cookbook' ? 'cookbook' : 'recipe';
  var main = document.getElementById('share');

  function el(tag, text, cls) {
    var node = document.createElement(tag);
    if (text != null) node.textContent = text; // always text, never HTML
    if (cls) node.className = cls;
    return node;
  }

  function tokenFromUrl() {
    var q = new URLSearchParams(window.location.search).get('t');
    if (!q) {
      var parts = window.location.pathname.split('/').filter(Boolean);
      q = parts[parts.length - 1];
    }
    return /^[a-f0-9]{32}$/.test(q || '') ? q : null;
  }

  function message(title, body) {
    main.textContent = '';
    main.appendChild(el('h1', title));
    main.appendChild(el('p', body, 'muted'));
  }

  function headingLine(line) {
    return /:\s*$/.test(line) && line.length < 60;
  }

  function list(tag, lines) {
    var node = el(tag);
    lines.forEach(function (line) {
      if (typeof line !== 'string' || !line.trim()) return;
      if (headingLine(line)) node.appendChild(el('li', line.replace(/:\s*$/, ''), 'heading'));
      else node.appendChild(el('li', line));
    });
    return node;
  }

  function openButton(token) {
    var a = el('a', 'Open in Kitchen Studio', 'open');
    a.href = 'cookbook://' + (kind === 'recipe' ? 'r' : 'c') + '/' + token;
    return a;
  }

  function appNote() {
    return el(
      'p',
      kind === 'recipe'
        ? 'Opening it adds this recipe to your Kitchen Studio cookbook. Kitchen Studio is an iPhone app in testing and isn’t in the App Store yet. You can still cook from the recipe on this page.'
        : 'Opening it puts this cookbook on your Shared shelf in Kitchen Studio. Kitchen Studio is an iPhone app in testing and isn’t in the App Store yet.',
      'note'
    );
  }

  function facts(r) {
    var bits = [];
    if (r.servings > 0) bits.push('Serves ' + r.servings);
    if (r.prepMinutes > 0) bits.push('Prep ' + r.prepMinutes + ' min');
    if (r.cookMinutes > 0) bits.push((r.cookLabel || 'Cook') + ' ' + r.cookMinutes + ' min');
    return bits.join(' · ');
  }

  function photo(r) {
    var uri = r && r.photo && r.photo.kind === 'uri' && typeof r.photo.uri === 'string' ? r.photo.uri : '';
    if (!/^https:\/\//i.test(uri)) return null;
    var img = el('img', null, 'photo');
    img.src = uri;
    img.alt = '';
    img.referrerPolicy = 'no-referrer';
    img.onerror = function () { img.remove(); };
    return img;
  }

  function showRecipe(link, token) {
    var r = (link.payload && link.payload.recipe) || {};
    var title = typeof r.title === 'string' && r.title.trim() ? r.title.trim() : 'A recipe';
    document.title = title + ' · Kitchen Studio';
    main.textContent = '';
    main.appendChild(el('p', 'From ' + (link.sharer_name || 'a friend') + '’s cookbook', 'from'));
    main.appendChild(el('h1', title));
    var img = photo(r);
    if (img) main.appendChild(img);
    var f = facts(r);
    if (f) main.appendChild(el('p', f, 'facts'));
    main.appendChild(openButton(token));
    main.appendChild(appNote());
    if (Array.isArray(r.ingredients) && r.ingredients.length) {
      main.appendChild(el('h2', 'Ingredients'));
      main.appendChild(list('ul', r.ingredients));
    }
    if (Array.isArray(r.steps) && r.steps.length) {
      main.appendChild(el('h2', 'Instructions'));
      main.appendChild(list(r.plainSteps ? 'ul' : 'ol', r.steps));
    }
    if (r.source && typeof r.source.url === 'string' && /^https?:\/\//i.test(r.source.url)) {
      var p = el('p', 'Originally from ', 'muted');
      var a = el('a', r.source.name || new URL(r.source.url).hostname);
      a.href = r.source.url;
      a.rel = 'noopener noreferrer nofollow';
      p.appendChild(a);
      main.appendChild(p);
    }
  }

  function showCookbook(link, token) {
    var name = link.cookbook_name || 'A cookbook';
    var recipes = (link.payload && Array.isArray(link.payload.recipes) ? link.payload.recipes : []).filter(function (r) {
      return r && typeof r.title === 'string' && r.title.trim();
    });
    document.title = name + ' · Kitchen Studio';
    main.textContent = '';
    main.appendChild(el('p', (link.sharer_name || 'A friend') + ' shared their cookbook', 'from'));
    main.appendChild(el('h1', name));
    main.appendChild(el('p', recipes.length === 1 ? '1 recipe' : recipes.length + ' recipes', 'facts'));
    main.appendChild(openButton(token));
    main.appendChild(appNote());
    recipes.forEach(function (r) {
      var card = el('div', null, 'card');
      card.appendChild(el('strong', r.title.trim()));
      var f = facts(r);
      if (f) card.appendChild(el('span', f, 'muted'));
      main.appendChild(card);
    });
  }

  var token = tokenFromUrl();
  if (!token) {
    message('This link isn’t complete', 'Ask your friend to send the link again.');
    return;
  }
  fetch(SUPABASE_URL + '/rest/v1/rpc/get_share_link', {
    method: 'POST',
    headers: { apikey: PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_token: token }),
    referrerPolicy: 'no-referrer',
  })
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (link) {
      if (!link || link.kind !== kind) {
        message('Not shared any more', 'This link has been stopped. Ask your friend to send it again.');
        return;
      }
      if (kind === 'recipe') showRecipe(link, token);
      else showCookbook(link, token);
    })
    .catch(function () {
      message('Couldn’t load it', 'Check your signal, then reload this page.');
    });
})();
