/* A stand-in for Sveltia CMS, for the demos only. Sveltia draws a form from an editor component's `fields`; this does
   the same for the field kinds draft.inator's blocks use (list, select, select with multiple, string, hidden), so a
   block's real code can run in a plain page. It is not Sveltia, and it doesn't try to look like it. */
(function () {
  var components = {};
  window.CMS = { registerEditorComponent: function (c) { components[c.id] = c; } };

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') n.textContent = attrs[k];
      else if (attrs[k] !== false && attrs[k] != null) n.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
    });
    (kids || []).forEach(function (kid) { if (kid) n.appendChild(kid); });
    return n;
  }
  var uid = 0;

  // One field of one list item. Calls change() whenever its value changes.
  function field(spec, value, change) {
    var id = 'f' + (++uid);
    if (spec.widget === 'hidden') return null;
    var label = el('label', { for: id, text: spec.label + (spec.required === false ? '' : ' (required)') });
    if (spec.widget === 'select' && spec.multiple) {
      var chosen = (value || []).slice();
      var box = el('fieldset', { class: 'checks' }, [el('legend', { text: spec.label })]);
      if (!spec.options.length) box.appendChild(el('p', { class: 'hint', text: 'This site has no topics yet.' }));
      spec.options.forEach(function (o) {
        var cid = 'f' + (++uid), input = el('input', { type: 'checkbox', id: cid, value: o.value, checked: chosen.indexOf(o.value) >= 0 });
        input.addEventListener('change', function () {
          if (input.checked) chosen.push(o.value); else chosen.splice(chosen.indexOf(o.value), 1);
          change(chosen.slice());
        });
        box.appendChild(el('label', { for: cid }, [input, document.createTextNode(o.label)]));
      });
      // Values the options don't list (a tag already in a marker) are kept, and shown so nothing vanishes unseen.
      var unknown = chosen.filter(function (v) { return !spec.options.some(function (o) { return o.value === v; }); });
      if (unknown.length) box.appendChild(el('p', { class: 'hint', text: 'Also kept, not in the topic list: ' + unknown.join(', ') }));
      return box;
    }
    if (spec.widget === 'select') {
      var select = el('select', { id: id });
      var options = spec.options.slice();
      if (value && !options.some(function (o) { return o.value === value; })) options.unshift({ label: value + ' (not in the works list)', value: value });
      if (spec.required !== false && !value) select.appendChild(el('option', { value: '', text: 'Choose…' }));
      options.forEach(function (o) { select.appendChild(el('option', { value: o.value, text: o.label, selected: o.value === (value || '') })); });
      select.addEventListener('change', function () { change(select.value); });
      return el('div', {}, [label, select]);
    }
    var input = el('input', { type: 'text', id: id, value: value || '' });
    input.addEventListener('input', function () { change(input.value); });
    return el('div', {}, [label, input]);
  }

  // Draw a component's form into `host` for `data`; onChange(data) after every edit.
  function drawForm(component, host, data, onChange) {
    host.textContent = '';
    component.fields.forEach(function (spec) {
      if (spec.widget !== 'list') {
        var single = field(spec, data[spec.name], function (v) { data[spec.name] = v; onChange(data); });
        if (single) host.appendChild(single);
        return;
      }
      var items = data[spec.name] = data[spec.name] || [];
      var noun = (spec.label_singular || 'Item').toLowerCase();
      var list = el('div', { role: 'group', 'aria-label': spec.label });
      items.forEach(function (item, i) {
        var set = el('fieldset', {}, [el('legend', { text: (spec.label_singular || 'Item') + ' ' + (i + 1) })]);
        spec.fields.forEach(function (sub) {
          var f = field(sub, item[sub.name], function (v) { item[sub.name] = v; onChange(data); });
          if (f) set.appendChild(f);
        });
        var actions = el('div', { class: 'actions' });
        if (i > 0) {
          var up = el('button', { type: 'button', class: 'quiet', text: 'Move ' + noun + ' ' + (i + 1) + ' up' });
          up.addEventListener('click', function () { items.splice(i - 1, 0, items.splice(i, 1)[0]); redraw('Moved ' + noun + ' ' + (i + 1) + ' up.'); });
          actions.appendChild(up);
        }
        var remove = el('button', { type: 'button', class: 'quiet', text: 'Remove ' + noun + ' ' + (i + 1) });
        remove.addEventListener('click', function () {
          items.splice(i, 1); redraw('Removed ' + noun + ' ' + (i + 1) + '.');
          var buttons = host.querySelectorAll('button'); buttons[buttons.length - 1].focus();   // "Add a …", so focus isn't lost
        });
        actions.appendChild(remove);
        set.appendChild(actions);
        list.appendChild(set);
      });
      var add = el('button', { type: 'button', class: 'quiet', text: 'Add a ' + noun });
      add.addEventListener('click', function () {
        items.push({});
        redraw('Added ' + noun + ' ' + items.length + '.');
        var sets = host.querySelectorAll('fieldset > legend');
        var last = sets[sets.length - 1];
        if (last) { var first = last.parentNode.querySelector('select, input'); if (first) first.focus(); }
      });
      host.appendChild(list);
      host.appendChild(el('div', { class: 'actions' }, [add]));
    });
    function redraw(message) { drawForm(component, host, data, onChange); onChange(data, message); }
  }

  window.DraftStandIn = { components: components, drawForm: drawForm, el: el };
})();
