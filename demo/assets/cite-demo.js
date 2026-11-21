/* Wires the Cite block demo: list the markers in the text, open one in the form, write it back. The block does the
   reading and writing (fromBlock, toBlock, toPreview); this file only moves text around. */
(function () {
  var block = window.DraftForms.components.citation;
  var $ = function (id) { return document.getElementById(id); };
  var source = $('source'), form = $('form'), markerOut = $('marker'), previewOut = $('preview'), status = $('status');
  var global = new RegExp(block.pattern.source, 'g');
  var opened = null;    // { start, end, raw } of the marker in the form, or null for a new one
  var data = { items: [] };

  source.value = [
    '# Ritual and the body',
    '',
    'Practice comes first {citation bell-1992-ritual | note:"Bell 1992" | locator:12 | tags:ritual-theory}.',
    'Liminality {citation turner-1969-ritual | prefix:"see also" | tags:ritual-theory}.',
    'An old note {citation bell-1992-ritual | note:"Bell 1991" | label:"chapter" | locator:3}, kept in place.',
    'Two at once {citation ainsworth-1978-patterns | form:narrative | locator:7; bell-1992-ritual}.',
    'Not yet found {citation smith-2003-rites | note:"Smith 2003"}.',
    '',
    '{citation endnote}',
    ''
  ].join('\n');

  function markers() {
    var found = [], m;
    global.lastIndex = 0;
    while ((m = global.exec(source.value))) found.push({ start: m.index, end: m.index + m[0].length, raw: m[0], match: m });
    return found;
  }

  function listMarkers() {
    var list = $('markers');
    list.textContent = '';
    markers().forEach(function (mk, i) {
      var items = block.fromBlock(mk.match).items;
      var name = items.map(function (it) { return (window.DRAFT_WORKS.find(function (w) { return w.id === it.work; }) || { note: it.work }).note; }).join('; ');
      var button = window.DraftForms.el('button', { type: 'button', class: 'quiet', text: 'Open ' + (i + 1) + ': ' + name });
      button.addEventListener('click', function () { open(mk, i); });
      list.appendChild(window.DraftForms.el('li', {}, [button, document.createElement('br'), window.DraftForms.el('code', { text: mk.raw })]));
    });
  }

  function show(message) {
    var written = data.items.some(function (it) { return it.work; }) ? block.toBlock(data) : '';
    markerOut.textContent = written || '(choose a work)';
    previewOut.textContent = written ? block.toPreview(data) : '';
    if (message) status.textContent = message;
  }

  function open(mk, i) {
    opened = mk;
    data = block.fromBlock(mk.match);
    $('form-state').textContent = 'Editing citation ' + (i + 1) + '. Save writes it back in place.';
    window.DraftForms.drawForm(block, form, data, function (d, message) { show(message); });
    show('Opened citation ' + (i + 1) + '.');
    var first = form.querySelector('select, input');
    if (first) first.focus();
  }

  $('new').addEventListener('click', function () {
    opened = null;
    data = { items: [{}] };
    $('form-state').textContent = 'A new citation. Save puts it where the cursor was in the text.';
    window.DraftForms.drawForm(block, form, data, function (d, message) { show(message); });
    show('Started a new citation.');
    form.querySelector('select').focus();
  });

  $('save').addEventListener('click', function () {
    if (!data.items.some(function (it) { return it.work; })) { show('Choose a work first.'); return; }
    var written = block.toBlock(data), text = source.value;
    if (opened) {
      if (text.slice(opened.start, opened.end) !== opened.raw) { show('The text changed since this citation was opened. Open it again.'); return; }
      source.value = text.slice(0, opened.start) + written + text.slice(opened.end);
      opened = { start: opened.start, end: opened.start + written.length, raw: written, match: [written] };
    } else {
      var at = source.selectionStart || text.length;
      source.value = text.slice(0, at) + written + text.slice(at);
      opened = { start: at, end: at + written.length, raw: written, match: [written] };
    }
    listMarkers();
    show('Saved to the text.');
  });

  $('roundtrip').addEventListener('click', function () {
    var before = source.value, all = markers(), changed = 0, other = 0;
    var after = before.replace(global, function (raw, body) {
      var out = block.toBlock(block.fromBlock([raw, body]));
      if (out !== raw) { changed++; if (strip(out) !== strip(raw)) other++; }
      return out;
    });
    var again = after.replace(global, function (raw, body) { return block.toBlock(block.fromBlock([raw, body])); });
    source.value = after;
    listMarkers();
    $('roundtrip-result').textContent = all.length + ' citations opened and saved. ' + changed + ' had a note refreshed or added; ' +
      (other ? other + ' changed in some other way (that would be a bug).' : 'nothing else changed.') +
      (again === after ? ' A second pass changed nothing.' : ' A second pass changed something (a bug).');
  });
  function strip(s) { return s.replace(/ \| note:"(?:[^"\\]|\\.)*"/g, ''); }

  source.addEventListener('input', listMarkers);   // Save checks the opened marker is still where it was
  listMarkers();
  show();
})();
