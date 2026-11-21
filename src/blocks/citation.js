/* draft.inator: the Cite block. In the text editor, a "Citation" button opens a form:
   one or more works, each with an optional page, prefix, form, and reference topics. It writes a citation.inator
   marker, {citation id | note:"Bell 1992" | locator:12 | tags:ritual-theory; other-id}, with each note taken from
   citation.inator's description of the work (window.DRAFT_WORKS, written by the host site's build; see docs/data-contract.md). Existing markers open in the same form;
   any option the form doesn't show (a label, fallback words) is kept as it was. */
(function () {
  if (!window.CMS) return;
  var WORKS = window.DRAFT_WORKS || [], TOPICS = window.DRAFT_TOPICS || [];
  var NOTE = {}; WORKS.forEach(function (w) { NOTE[w.id] = w.note; });
  var FORMS = ['parenthetical', 'narrative', 'author-only', 'suppress-author', 'suppress-year'];
  var SHOWN = ['note', 'locator', 'prefix', 'form', 'tags'];

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

  function parse(body) {
    return split(body, ';').filter(Boolean).map(function (part) {
      var bits = split(part, '|'), item = { work: bits[0], locator: '', prefix: '', form: '', tags: [], extra: [], order: [] };
      bits.slice(1).forEach(function (b) {
        var m = /^([a-z-]+):([\s\S]*)$/.exec(b);
        if (m && SHOWN.indexOf(m[1]) >= 0) {
          if (m[1] === 'tags') item.tags = unquote(m[2]).split(',').map(function (t) { return t.trim(); }).filter(Boolean);
          else if (m[1] !== 'note') item[m[1]] = unquote(m[2]);
          item.order.push(m[1] + (/^\s*"/.test(m[2]) ? '"' : ''));   // '"': it was written quoted, so keep it so
        } else if (b) { item.extra.push(b); if (item.order.indexOf('extra') < 0) item.order.push('extra'); }
      });
      item.extra = item.extra.join(' | ');
      item.order = item.order.join(',');             // the marker's own option order, kept when it's written back
      return item;
    });
  }

  function build(items) {
    return '{citation ' + (items || []).filter(function (it) { return it && it.work; }).map(function (it) {
      var was = (it.order || '').split(',');
      function q(k, v) { return was.indexOf(k + '"') >= 0 ? quoteAlways(v) : quote(v); }
      var tags = it.tags || [], parts = {
        note: 'note:' + quoteAlways(NOTE[it.work] || it.work),
        locator: it.locator ? 'locator:' + (/\s/.test(it.locator) ? quoteAlways(it.locator) : q('locator', it.locator)) : '',
        prefix: it.prefix ? 'prefix:' + q('prefix', it.prefix) : '',
        form: it.form ? 'form:' + it.form : '',
        tags: tags.length ? 'tags:' + tags.join(',') : '',
        extra: it.extra || ''
      };
      var order = was.map(function (k) { return k.replace('"', ''); }).filter(function (k) { return k in parts; });
      ['note', 'locator', 'prefix', 'form', 'tags', 'extra'].forEach(function (k) { if (order.indexOf(k) < 0) order.push(k); });
      if (order.indexOf('note') > 0 && (it.order || '').indexOf('note') < 0) { order.splice(order.indexOf('note'), 1); order.unshift('note'); }
      return [it.work].concat(order.map(function (k) { return parts[k]; }).filter(Boolean)).join(' | ');
    }).join('; ') + '}';
  }

  window.DRAFT_CITATION = { parse: parse, build: build };   // for the tests

  CMS.registerEditorComponent({
    id: 'citation',
    label: 'Citation',
    icon: 'format_quote',
    fields: [{
      name: 'items', label: 'Works cited here', label_singular: 'Work', widget: 'list',
      fields: [
        { name: 'work', label: 'Work (search by author, year, or title)', widget: 'select',
          options: WORKS.map(function (w) { return { label: w.note + ' · ' + w.title, value: w.id }; }) },
        { name: 'locator', label: 'Page or section (such as 12, or "pp. 4–6")', widget: 'string', required: false },
        { name: 'prefix', label: 'Words before it (such as "see also")', widget: 'string', required: false },
        { name: 'form', label: 'How it reads', widget: 'select', required: false,
          options: [{ label: '(Bell 1992): the usual', value: '' }].concat(FORMS.slice(1).map(function (f) { return { label: f.replace('-', ' '), value: f }; })) },
        { name: 'tags', label: 'Topics this citation is about', widget: 'select', multiple: true, required: false,
          options: TOPICS.map(function (t) { return { label: t.label, value: t.id }; }) },
        { name: 'extra', label: 'Other options (kept as written)', widget: 'string', required: false },
        { name: 'order', label: 'Option order', widget: 'hidden', required: false }
      ]
    }],
    pattern: /\{citation (?!endnote\b|list\b|nocite\b|evidence\b|credit\b)((?:[^{}\\]|\\.)*)\}/,
    fromBlock: function (match) { return { items: parse(match[1]) }; },
    toBlock: function (data) { return build(data.items); },
    toPreview: function (data) {
      return '(' + (data.items || []).map(function (it) {
        return (it.prefix ? it.prefix + ' ' : '') + (NOTE[it.work] || it.work) + (it.locator ? ', ' + it.locator : '');
      }).join('; ') + ')';
    }
  });
})();
