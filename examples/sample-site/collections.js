/* The sample site's collections and entries, as a host's build would write them for draft.inator
   (docs/data-contract.md: DRAFT_COLLECTIONS and DRAFT_ENTRIES). Fields use Sveltia CMS's format, so a site that
   already has a Sveltia config can pass its collections as they are. Made-up people and topics. */
window.DRAFT_COLLECTIONS = [
  {
    name: 'essays', label: 'Essays', folder: 'content/essays',
    fields: [
      { name: 'title', label: 'Title' },
      { name: 'subtitle', label: 'Subtitle', required: false },
      { name: 'date', label: 'Published', widget: 'datetime', time_format: false },
      { name: 'authors', label: 'Authors', widget: 'relation', collection: 'people', multiple: true, display_fields: ['{{name}}'], min: 1 },
      { name: 'topics', label: 'Topics', widget: 'relation', collection: 'topics', value_field: '{{id}}', display_fields: ['{{label}}'], multiple: true, required: false },
      { name: 'summary', label: 'Summary', widget: 'text', required: false, hint: 'One or two sentences, for lists and link previews.' },
      { name: 'image', label: 'Card image', widget: 'image', required: false },
      { name: 'keywords', label: 'Keywords', widget: 'list', required: false },
      { name: 'order', label: 'Order in the list', widget: 'number', value_type: 'int', min: 1, required: false },
      { name: 'draft', label: 'Draft (not on the site yet)', widget: 'boolean', required: false },
      { name: 'seo', label: 'Search engines', widget: 'object', required: false, fields: [{ name: 'title' }, { name: 'description' }] },
      { name: 'layout', widget: 'hidden', default: 'essay' },
      { name: 'body', label: 'Body', widget: 'markdown' }
    ]
  },
  {
    name: 'people', label: 'People', folder: 'content/people',
    fields: [
      { name: 'name', label: 'Name' },
      { name: 'role', label: 'Role', required: false },
      { name: 'body', label: 'Biography', widget: 'markdown', required: false }
    ]
  }
];

window.DRAFT_ENTRIES = {
  people: [
    { slug: 'mara-ellison', name: 'Mara Ellison' },
    { slug: 'tomas-reyes', name: 'Tomás Reyes' },
    { slug: 'iris-okafor', name: 'Iris Okafor' },
    { slug: 'jun-park', name: 'Jun Park' }
  ],
  topics: [
    { id: 'ritual-theory', label: 'Theory › Ritual theory' },
    { id: 'attachment', label: 'Theory › Attachment' },
    { id: 'consent', label: 'Practice › consent' }
  ]
};
