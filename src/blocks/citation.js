/* draft.inator: the Cite block. In the text editor, a "Citation" button opens a form:
   one or more works, each with an optional page, prefix, form, and reference topics. It writes a citation.inator
   marker, {cite id | note:"Bell 1992" | locator:12 | tags:ritual-theory; other-id}, with each note taken from
   citation.inator's description of the work (window.DRAFT_WORKS, written by the host site's build; see docs/data-contract.md). Existing markers open in the same form;
   any option the form doesn't show (a label, fallback words) is kept as it was. */
(function () {
  if (!window.CMS) return;
  var TOPICS = window.DRAFT_TOPICS || [];
  // The works a writer can cite, indexed. addWorks() (below) adds to them in place, so works an import brings in
  // appear in the form and get their notes at once.
  var NOTE = {}, WORK_OPTIONS = [];
  function index() {
    NOTE = {}; WORK_OPTIONS.length = 0;
    (window.DRAFT_WORKS || []).forEach(function (w) { NOTE[w.id] = w.note; WORK_OPTIONS.push({ label: w.note + ' · ' + w.title, value: w.id }); });
  }
  index();
  var FORMS = ['parenthetical', 'narrative', 'author-only', 'suppress-author', 'suppress-year'];
  var SHOWN = ['note', 'locator', 'prefix', 'form', 'tags'];
  // The one keyword this site writes and reads (cite.inator 0.5.1: one configured keyword, default cite; #33).
  var KEYWORD = /^[a-z][a-z-]*$/.test(window.DRAFT_CITATION_KEYWORD || '') ? window.DRAFT_CITATION_KEYWORD : 'cite';

  // Split on a separator outside quotes, honouring backslash escapes (citation.inator's notation).
  function split(s, sep) {
    var out = [], cur = '', q = false;
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      if (c === '\\' && i + 1 < s.length) { cur += c + s[++i]; continue; }
      if (c === '"') q = !q;
      if (c === sep && !q) { out.push(cur); cur = ''; continue; }
      cur += c;
    }
    out.push(cur);
    return out.map(function (x) { return x.trim(); });
  }
  // One work's text, split into its id and fields, keeping each separator exactly as written: a pipe (with any spaces
  // around it), or, since cite.inator 0.5.1, plain whitespace before the next field name. Quotes and escapes are
  // honoured, so a quoted value may hold anything.
  function splitParts(s) {
    var parts = [], seps = [], cur = '', q = false, i = 0, m;
    s = s.trim();
    while (i < s.length) {
      var c = s[i];
      if (c === '\\' && i + 1 < s.length) { cur += c + s[i + 1]; i += 2; continue; }
      if (c === '"') q = !q;
      if (!q) {
        m = /^\s*\|\s*/.exec(s.slice(i));
        if (m && m[0].length) { parts.push(cur); seps.push(m[0]); cur = ''; i += m[0].length; continue; }
        m = /^\s+(?=[a-z][a-z-]*:)/.exec(s.slice(i));
        if (m && cur) { parts.push(cur); seps.push(m[0]); cur = ''; i += m[0].length; continue; }
      }
      cur += c; i++;
    }
    parts.push(cur);
    return { parts: parts.map(function (x) { return x.trim(); }), seps: seps };
  }
  function unquote(v) {
    v = v.trim();
    if (v.length > 1 && v[0] === '"' && v[v.length - 1] === '"') v = v.slice(1, -1);
    return v.replace(/\\(.)/g, '$1');
  }
  function quote(v) {
    v = String(v);
    return /[;|"{}\\:]|^\s|\s$/.test(v) ? '"' + v.replace(/(["\\])/g, '\\$1') + '"' : v;
  }

  function quoteAlways(v) { return '"' + String(v).replace(/(["\\])/g, '\\$1') + '"'; }

  // A work's id is written bare (bell-1992-ritual) or explicitly local (local:bell-1992-ritual); citation.inator reads
  // both as the same record. The block works with the bare id and remembers how it was written, so an unchanged work
  // goes back exactly as it was. A newly chosen work is written bare, unless the bare id would read as a directive.
  var DIRECTIVES = ['endnote', 'list', 'nocite', 'evidence', 'credit', 'tags'];
  function bareId(written) { return /^local:/.test(written) ? written.slice(6) : written; }
  function writeId(it) {
    if (it.written && bareId(it.written) === it.work) return it.written;
    return DIRECTIVES.indexOf(it.work) >= 0 ? 'local:' + it.work : it.work;
  }

  function parse(body) {
    return split(body, ';').filter(Boolean).map(function (part) {
      var sp = splitParts(part), bits = sp.parts;
      var item = { work: bareId(bits[0]), written: bits[0], note: '', locator: '', prefix: '', form: '', tags: [], extra: [], order: [], seps: sp.seps.join('\u0000') };
      bits.slice(1).forEach(function (b) {
        var m = /^([a-z-]+):([\s\S]*)$/.exec(b);
        if (m && SHOWN.indexOf(m[1]) >= 0) {
          if (m[1] === 'tags') item.tags = unquote(m[2]).split(',').map(function (t) { return t.trim(); }).filter(Boolean);
          else item[m[1]] = unquote(m[2]);   // note: is the block's to refresh; kept only for an unknown work (noteFor)
          item.order.push(m[1] + (/^\s*"/.test(m[2]) ? '"' : ''));   // '"': it was written quoted, so keep it so
        } else if (b) { item.extra.push(b); item.order.push('extra'); }   // one 'extra' per unknown option, in place
      });
      item.extra = item.extra.join(' | ');
      item.order = item.order.join(',');             // the marker's own option order, kept when it's written back
      return item;
    });
  }

  // A work's note: the site's description of it. A work the site doesn't describe (an import placeholder, after a
  // reload) keeps the words its marker already had, so (Cox, 1995) never turns into its id. Words belong to the work
  // they were written for: a changed work never inherits them.
  function noteFor(it) {
    if (NOTE[it.work]) return NOTE[it.work];
    if (it.note && it.written && bareId(it.written) === it.work) return it.note;
    return it.work;
  }

  // A marker's layout, as written: what comes between "{" and the keyword, between the keyword and the first work,
  // between works, and before "}". Multi-line markers keep their lines.
  function layoutOf(full, body) {
    var kw = new RegExp('^\\{(\\s*)' + KEYWORD + '(\\s+)').exec(full || '');
    if (!kw) return '';
    var open = kw[1], afterKw = kw[2], close = /(\s*)\}$/.exec(full)[1];
    return [open, afterKw, close].concat(workSeps(body)).join('\u0000');
  }
  // The exact text between works (the ";" and the space or line break around it), when every part is a work.
  function workSeps(body) {
    var raw = [], cur = '', q = false;
    for (var i = 0; i < body.length; i++) {
      var c = body[i];
      if (c === '\\' && i + 1 < body.length) { cur += c + body[++i]; continue; }
      if (c === '"') q = !q;
      if (c === ';' && !q) { raw.push(cur); cur = ''; continue; }
      cur += c;
    }
    raw.push(cur);
    if (raw.some(function (r) { return !r.trim(); })) return [];
    var seps = [];
    for (var k = 0; k + 1 < raw.length; k++) seps.push(/\s*$/.exec(raw[k])[0] + ';' + /^\s*/.exec(raw[k + 1])[0]);
    return seps;
  }

  function build(items, keyword, layout) {
    var lay = layout ? String(layout).split('\u0000') : [];
    var open = lay[0] || '', afterKw = lay[1] || ' ', close = lay[2] || '', between = lay.slice(3);
    var lineBreak = /\n/.test(afterKw) ? afterKw : '';   // a marker written on several lines: new fields go on new lines
    var written = (items || []).filter(function (it) { return it && it.work; });
    var works = written.map(function (it) {
      var was = (it.order || '').split(',').filter(Boolean);
      function q(k, v) { return was.indexOf(k + '"') >= 0 ? quoteAlways(v) : quote(v); }
      var tags = it.tags || [], parts = {
        note: 'note:' + quoteAlways(noteFor(it)),
        locator: it.locator ? 'locator:' + (/\s/.test(it.locator) ? quoteAlways(it.locator) : q('locator', it.locator)) : '',
        prefix: it.prefix ? 'prefix:' + q('prefix', it.prefix) : '',
        form: it.form ? 'form:' + it.form : '',
        tags: tags.length ? 'tags:' + tags.join(',') : ''
      };
      // Unknown options go back where each one was. If the writer changed "Other options" so they no longer match
      // one for one, they all go where the first one was.
      var extras = it.extra ? splitParts(it.extra).parts.filter(Boolean) : [];
      // A placeholder that gets a real work is finished: its unresolved: (cite.inator 0.5.1) belonged to the
      // placeholder and is not carried to the work that replaces it. Every other option stays the writer's call.
      if (it.written && bareId(it.written) !== it.work) extras = extras.filter(function (x) { return !/^unresolved:/.test(x); });
      var slots = was.filter(function (k) { return k === 'extra'; }).length, next = 0;
      var out = [], seen = {};
      was.forEach(function (k) {
        k = k.replace('"', '');
        if (k === 'extra') {
          if (extras.length === slots) out.push(extras[next++]);
          else if (next === 0 && extras.length) { out.push(extras.join(' | ')); next = -1; }
        } else if (k in parts && !seen[k]) { seen[k] = true; if (parts[k]) out.push({ key: k, text: parts[k] }); }
      });
      ['note', 'locator', 'prefix', 'form', 'tags'].forEach(function (k) {
        if (!seen[k] && parts[k]) out.push({ key: k, text: parts[k] });
      });
      if (!slots && extras.length) out.push(extras.join(' | '));
      // A note the marker didn't have goes first.
      if (was.indexOf('note') < 0 && was.indexOf('note"') < 0) {
        var at = out.findIndex ? out.findIndex(function (o) { return o && o.key === 'note'; }) : -1;
        if (at > 0) out.unshift(out.splice(at, 1)[0]);
      }
      // Separators: the marker's own, exactly, when it has the same number of parts as before (a refreshed note, say);
      // otherwise its own style throughout: plain spaces if it used only spaces, else pipes.
      var all = [writeId(it)].concat(out.map(function (o) { return typeof o === 'string' ? o : o.text; }));
      var seps = it.seps ? String(it.seps).split('\u0000') : [];
      var spaced = seps.length && seps.every(function (x) { return x.indexOf('|') < 0; });
      var onLines = seps.filter(function (x) { return /\n/.test(x); })[0] || lineBreak;
      return all.reduce(function (acc, p, k) {
        return k === 0 ? p : acc + (seps.length === all.length - 1 ? seps[k - 1] : onLines || (spaced ? ' ' : ' | ')) + p;
      }, '');
    });
    var join = between.length === works.length - 1 ? null : (between.filter(function (x) { return /\n/.test(x); })[0] || between[0] || '; ');
    return '{' + open + (keyword || KEYWORD) + afterKw + works.reduce(function (acc, w, k) {
      return k === 0 ? w : acc + (join || between[k - 1]) + w;
    }, '') + close + '}';
  }

  function addWorks(list) {
    if (!window.DRAFT_WORKS) window.DRAFT_WORKS = [];
    (list || []).forEach(function (w) { if (w && w.id && !(w.id in NOTE)) { window.DRAFT_WORKS.push(w); NOTE[w.id] = w.note; } });
    index();
  }

  window.DRAFT_CITATION = { parse: parse, build: build, addWorks: addWorks, writeId: writeId, keyword: KEYWORD };

  CMS.registerEditorComponent({
    id: 'citation',
    label: 'Citation',
    icon: 'format_quote',
    fields: [{
      name: 'items', label: 'Works cited here', label_singular: 'Work', widget: 'list',
      fields: [
        { name: 'work', label: 'Work (search by author, year, or title)', widget: 'select',
          options: WORK_OPTIONS },
        { name: 'locator', label: 'Page or section (such as 12, or "pp. 4–6")', widget: 'string', required: false },
        { name: 'prefix', label: 'Words before it (such as "see also")', widget: 'string', required: false },
        { name: 'form', label: 'How it reads', widget: 'select', required: false,
          options: [{ label: '(Bell 1992): the usual', value: '' }].concat(FORMS.slice(1).map(function (f) { return { label: f.replace('-', ' '), value: f }; })) },
        { name: 'tags', label: 'Topics this citation is about', widget: 'select', multiple: true, required: false,
          options: TOPICS.map(function (t) { return { label: t.label, value: t.id }; }) },
        { name: 'extra', label: 'Other options (kept as written)', widget: 'string', required: false },
        { name: 'order', label: 'Option order', widget: 'hidden', required: false },
        { name: 'written', label: 'The work as written', widget: 'hidden', required: false },
        { name: 'note', label: 'The note as written', widget: 'hidden', required: false }
      ]
    }, { name: 'layout', label: 'Layout', widget: 'hidden', required: false }],
    // Directives are not citations of a work; leave them alone. Matches citation.inator 0.2.0's own test exactly
    // ({cite endnote}, {cite endnote | …}, {cite list …}, {cite nocite …}, {cite evidence},
    // {cite credit}), so a work whose id merely starts with one of those words (list-2001) still opens.
    // Space or line breaks may come before and after the keyword ({\n  cite\n  bell-1992-ritual\n}).
    pattern: new RegExp('\\{\\s*' + KEYWORD + '\\s+(?!\\s*(?:endnote(?:[\\s|}])|(?:list|nocite|tags)\\s|(?:evidence|credit)(?:[\\s|}])))((?:[^{}\\\\]|\\\\.)*?)\\s*\\}'),
    fromBlock: function (match) { return { items: parse(match[1]), layout: layoutOf(match[0], match[1]) }; },
    toBlock: function (data) { return build(data.items, null, data.layout); },
    // Options that belong to the work an item cites, not to the citation: when the work is changed in draft.inator's
    // own form, they're set aside, shown, and kept only if the writer says so (forms.js).
    bound: { key: 'work', fields: ['locator', 'extra'], labels: { locator: 'page', extra: 'other options' },
      describe: function (id) { return NOTE[id] || id; } },
    toPreview: function (data) {
      return '(' + (data.items || []).map(function (it) {
        return (it.prefix ? it.prefix + ' ' : '') + noteFor(it) + (it.locator ? ', ' + it.locator : '');
      }).join('; ') + ')';
    }
  });
})();
