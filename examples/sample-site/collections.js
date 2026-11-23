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
    { slug: 'jun-park', name: 'Jun Park' },
    { slug: 'ada-lindqvist', name: 'Ada Lindqvist' },
    { slug: 'bruno-ferreira', name: 'Bruno Ferreira' },
    { slug: 'chiara-valli', name: 'Chiara Valli' },
    { slug: 'dmitri-volkov', name: 'Dmitri Volkov' },
    { slug: 'esi-mensah', name: 'Esi Mensah' },
    { slug: 'farah-haddad', name: 'Farah Haddad' },
    { slug: 'gideon-marsh', name: 'Gideon Marsh' },
    { slug: 'hana-kobayashi', name: 'Hana Kobayashi' },
    { slug: 'ilse-brandt', name: 'Ilse Brandt' },
    { slug: 'joaquin-soto', name: 'Joaquín Soto' },
    { slug: 'kwame-asante', name: 'Kwame Asante' },
    { slug: 'lena-novak', name: 'Lena Novak' },
    { slug: 'mateo-ruiz', name: 'Mateo Ruiz' },
    { slug: 'nadia-rahman', name: 'Nadia Rahman' },
    { slug: 'oren-shapiro', name: 'Oren Shapiro' },
    { slug: 'priya-nair', name: 'Priya Nair' },
    { slug: 'quinn-harlow', name: 'Quinn Harlow' },
    { slug: 'rosa-delgado', name: 'Rosa Delgado' },
    { slug: 'saoirse-byrne', name: 'Saoirse Byrne' },
    { slug: 'teodor-ilic', name: 'Teodor Ilić' },
    { slug: 'uma-patel', name: 'Uma Patel' },
    { slug: 'viktor-lund', name: 'Viktor Lund' },
    { slug: 'wren-abernathy', name: 'Wren Abernathy' },
    { slug: 'ximena-cruz', name: 'Ximena Cruz' },
    { slug: 'yusuf-demir', name: 'Yusuf Demir' },
    { slug: 'zofia-wojcik', name: 'Zofia Wójcik' }
  ],
  topics: [
    { id: 'ritual-theory', label: 'Theory › Ritual theory' },
    { id: 'attachment', label: 'Theory › Attachment' },
    { id: 'performance-theory', label: 'Theory › Performance theory' },
    { id: 'liminality', label: 'Theory › Liminality' },
    { id: 'play', label: 'Theory › Play' },
    { id: 'consent', label: 'Practice › consent' },
    { id: 'facilitation', label: 'Practice › Facilitation' },
    { id: 'safety', label: 'Practice › Safety and care' },
    { id: 'masks', label: 'Craft › Masks' },
    { id: 'costume', label: 'Craft › Costume' },
    { id: 'movement', label: 'Craft › Movement' },
    { id: 'voice', label: 'Craft › Voice' },
    { id: 'history', label: 'Context › History' },
    { id: 'festivals', label: 'Context › Festivals' },
    { id: 'theatre', label: 'Context › Theatre' }
  ],
  // The essays themselves: an order field offers places among them, and keywords suggest what they use.
  essays: [
    { slug: 'masks-in-ritual', title: 'Masks in ritual', order: 2, keywords: ['masks', 'threshold', 'ritual'] },
    { slug: 'the-play-frame', title: 'The play frame', order: 1, keywords: ['play', 'frames', 'ritual'] },
    { slug: 'grief-and-the-mask', title: 'Grief and the mask', order: 3, keywords: ['masks', 'grief'] },
    { slug: 'voices-in-the-dark', title: 'Voices in the dark', order: 3, keywords: ['voice', 'night'] },
    { slug: 'rules-of-the-game', title: 'Rules of the game', order: 5, keywords: ['play', 'rules'] }
  ]
};
