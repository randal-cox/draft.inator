/* draft.inator: the Figure block. In the text editor, a "Figure" block places an image with its alt text, caption,
   credit, licence, and source, and how it sits on the page (alignment, width, wrap). It writes one line:
     {figure /uploads/mask.jpg | alt:"A carved mask" | caption:"Mask, 1910" | credit:"Ann Cox" | licence:"CC BY 4.0" |
      source:"https://example.org/mask" | align:right | width:half | wrap:yes}
   The image's provenance (credit, licence, source) lives in the tag, so it shows in every diff; the host's build
   renders the tag and can collect the provenance from it (draft-inator figures). Any option the form doesn't show is
   kept as it was, where it was. The grammar is citation.inator's marker notation, as in the Cite block. */
(function () {
  if (!window.CMS) return;
  var ALIGN = ['left', 'right', 'centre', 'wide', 'full'];
  var WIDTH = ['third', 'half', 'two-thirds', 'full'];
  var TEXT = ['alt', 'caption', 'credit', 'licence', 'source'];
  var SHOWN = TEXT.concat(['align', 'width', 'wrap', 'label']);
  // A label names the figure for cross-references ({ref fig:depth} reads "Figure 2"); numbers are never written.
  var LABEL = /^[a-z][a-z0-9]*:[a-z0-9][a-z0-9_-]*$/;

  // Split on a separator outside quotes, honouring backslash escapes (citation.inator's notation; as in the Cite block).
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
  function needsQuotes(v) { return /[;|"{}\\:]|^\s|\s$|^$/.test(v); }
  function quoteAlways(v) { return '"' + String(v).replace(/(["\\])/g, '\\$1') + '"'; }

  // Read the tag's body into form values. `order` remembers the tag's own option order and how each was written, so
  // writing it back changes nothing a writer didn't change.
  function parse(body) {
    var bits = split(body, '|'), data = { src: unquote(bits[0] || ''), extra: [], order: [] };
    data.srcQuoted = /^\s*"/.test(bits[0] || '');
    bits.slice(1).forEach(function (b) {
      var m = /^([a-z-]+):([\s\S]*)$/.exec(b), key = m && m[1], raw = m && m[2];
      var value = m ? unquote(raw) : '';
      var known = m && SHOWN.indexOf(key) >= 0 && !(key in data) &&
        (key === 'align' ? ALIGN.indexOf(value) >= 0 : key === 'width' ? WIDTH.indexOf(value) >= 0 :
         key === 'wrap' ? value === 'yes' || value === 'no' : key === 'label' ? LABEL.test(value) : true);
      if (known) {
        data[key] = key === 'wrap' ? value === 'yes' : value;
        data.order.push(key + (key === 'wrap' ? '=' + value : '') + (/^\s*"/.test(raw) ? '"' : ''));
      } else if (b) { data.extra.push(b); data.order.push('extra'); }   // one 'extra' per unknown option, in place
    });
    data.extra = data.extra.join(' | ');
    data.order = data.order.join(',');
    return data;
  }

  function build(d) {
    d = d || {};
    var was = (d.order || '').split(',').filter(Boolean);
    var quoted = function (k) { return was.indexOf(k + '"') >= 0; };
    var wrapWas = (was.filter(function (k) { return k.indexOf('wrap=') === 0; })[0] || '').replace(/"$/, '').slice(5);
    var parts = {};
    TEXT.forEach(function (k) {
      if (!d[k]) return;
      // New free text is always quoted, which is easiest to read; a value written bare stays bare while it can.
      var bare = was.indexOf(k) >= 0 && !needsQuotes(d[k]);
      parts[k] = k + ':' + (bare && !quoted(k) ? d[k] : quoteAlways(d[k]));
    });
    if (d.align && ALIGN.indexOf(d.align) >= 0) parts.align = 'align:' + d.align;
    if (d.width && WIDTH.indexOf(d.width) >= 0) parts.width = 'width:' + d.width;
    if (d.label && LABEL.test(d.label)) parts.label = 'label:' + (quoted('label') ? quoteAlways(d.label) : d.label);
    if (d.wrap === true) parts.wrap = 'wrap:yes';
    else if (d.wrap === false && wrapWas === 'no') parts.wrap = 'wrap:no';
    // Unknown options go back where each one was. If the writer changed "Other options" so they no longer match one
    // for one, they all go where the first one was.
    var extras = d.extra ? split(d.extra, '|').filter(Boolean) : [];
    var slots = was.filter(function (k) { return k === 'extra'; }).length, next = 0, out = [], seen = {};
    was.forEach(function (k) {
      k = k.replace(/"$/, '').replace(/=.*$/, '');
      if (k === 'extra') {
        if (extras.length === slots) out.push(extras[next++]);
        else if (next === 0 && extras.length) { out.push(extras.join(' | ')); next = -1; }
      } else if (k in parts && !seen[k]) { seen[k] = true; out.push(parts[k]); }
    });
    SHOWN.forEach(function (k) { if (k in parts && !seen[k]) out.push(parts[k]); });
    if (!slots && extras.length) out.push(extras.join(' | '));
    var src = d.src || '';
    src = d.srcQuoted || needsQuotes(src) || /\s/.test(src) ? quoteAlways(src) : src;
    return '{figure ' + [src].concat(out).join(' | ') + '}';
  }

  function escapeHTML(v) {
    return String(v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  window.DRAFT_FIGURE = { parse: parse, build: build };   // for the tests

  CMS.registerEditorComponent({
    id: 'figure',
    label: 'Figure',
    icon: 'image',
    fields: [
      { name: 'src', label: 'Image', widget: 'image', media_libraries: { stock_assets: false } },
      { name: 'alt', label: 'Alt text: what the image shows, for people who can\'t see it', widget: 'string' },
      { name: 'caption', label: 'Caption', widget: 'string', required: false },
      { name: 'credit', label: 'Credit (who made it)', widget: 'string', required: false },
      { name: 'licence', label: 'Licence (such as "CC BY 4.0", or "Used with permission")', widget: 'string', required: false },
      { name: 'source', label: 'Source (where it came from: a web address or a collection)', widget: 'string', required: false },
      { name: 'align', label: 'Alignment', widget: 'select', required: false,
        options: [{ label: 'Left', value: 'left' }, { label: 'Right', value: 'right' }, { label: 'Centre', value: 'centre' },
                  { label: 'Wide (wider than the text)', value: 'wide' }, { label: 'Full width of the page', value: 'full' }] },
      { name: 'width', label: 'Width', widget: 'select', required: false,
        options: [{ label: 'A third', value: 'third' }, { label: 'Half', value: 'half' },
                  { label: 'Two thirds', value: 'two-thirds' }, { label: 'Full', value: 'full' }] },
      { name: 'wrap', label: 'Let the text wrap around it', widget: 'boolean', required: false },
      { name: 'label', label: 'Label, to refer to it as {ref fig:…} (such as fig:depth); it is numbered automatically', widget: 'string', required: false,
        pattern: ['^$|^fig:[a-z0-9][a-z0-9_-]*$', 'Start with fig: and use lowercase letters, digits, and hyphens'] },
      { name: 'extra', label: 'Other options (kept as written)', widget: 'string', required: false },
      { name: 'order', label: 'Option order', widget: 'hidden', required: false },
      { name: 'srcQuoted', label: 'Image path quoted', widget: 'hidden', required: false }
    ],
    // A figure is a block: a line of its own (the m flag tells Sveltia so).
    pattern: /^\{figure ((?:[^{}\\\n]|\\.)*)\}$/m,
    fromBlock: function (match) { return parse(match[1]); },
    toBlock: function (data) { return build(data); },
    toPreview: function (data, getAsset) {
      if (!data || !data.src) return '';
      var asset = typeof getAsset === 'function' ? getAsset(data.src) : null;
      var url = (asset && asset.url) || data.src;
      var credit = [data.credit, data.licence].filter(Boolean).join(', ');
      return '<figure><img src="' + escapeHTML(url) + '" alt="' + escapeHTML(data.alt || '') + '">' +
        (data.caption || credit ? '<figcaption>' + escapeHTML(data.caption || '') +
          (credit ? ' <small>' + escapeHTML(credit) + '</small>' : '') + '</figcaption>' : '') + '</figure>';
    }
  });
})();
