export const site = {
  identity: 'jaredgoldberg.org',
  name: 'Jared Goldberg',
  nameLines: ['Jared', 'Goldberg'],
  title: 'Jared Goldberg — Artist, systems designer and writer',
  role: 'Artist · Systems designer · Writer',
  googleTagId: 'G-N6X517GEQ2',
};

export const navigation = [
  { label: 'Home', href: '/' },
  { label: 'Explore', children: [
    { label: 'Practice & Research', href: '/#inquiries' },
    { label: 'Projects & Initiatives', href: '/#projects' },
    { label: 'Archive & Chronology', href: '/#archive' },
    { label: 'Writing & Publications', href: '/#writing' },
  ] },
  { label: 'About the practice', children: [
    { label: 'Where the work lives', href: '/#ecosystem' },
    { label: 'Where to begin', href: '/#start' },
  ] },
];

export const homepage = {
  introduction: [
    'Jared Goldberg works across art, software, archives, education, professional systems and public writing. He studies the structures around a thing: the interface through which it is encountered, the rules that govern it, the history it carries and the institutions that give it value.',
    'In his art, those structures become material for interpretation. In professional work, he helps make systems operate. His civic projects ask how design can expand learning and participation. His writing examines the ideas connecting these activities.',
  ],
  actions: [
    { label: 'Explore Practice & Research', href: '#inquiries', variant: 'primary' },
    { label: 'Browse Projects & Initiatives', href: '#projects', variant: 'secondary' },
  ],
  inquiries: {
    title: 'Five areas of inquiry',
    introduction: 'The practice draws on systems theory, design research, media ecology and institutional studies. These five areas offer ways into work made for different purposes.',
    records: [
      { title: 'Systems and Institutions', summary: 'How rules, incentives and organizations shape behaviour. This inquiry runs through professional platforms, civic initiatives and artist-made institutions.' },
      { title: 'Media, Archives and Memory', summary: 'How photographs, sequences, memoirs and interfaces become records—and how preservation, editing or obscurity changes what those records can tell us.' },
      { title: 'Design, Participation and Interfaces', summary: 'How a tool distributes decisions among its designer, its users and the system itself. The question appears in participatory art, software and product design.' },
      { title: 'Capability, Learning and Work', summary: 'What conditions allow people to learn, contribute and earn. The Money Club tests those conditions through education; Capability Works develops a proposal for their redesign around employment.' },
      { title: 'Art, Authorship and Valuation', summary: 'How names, ownership, circulation and price affect the meaning of an artwork. This area includes the works, institutions and artist personae that make those mechanisms visible.' },
    ],
    destination: 'Explore the research areas',
  },
  projects: {
    title: 'Selected projects and initiatives',
    introduction: 'Each entry represents a different kind of work. Its full record identifies its status, participants, history and proper destination.',
    records: [
      { title: 'The Pitch', type: 'Conceptual art', status: 'Institutional project in development', summary: 'Presented through Duchamped, The Pitch brings the language and machinery of valuation into the artwork. Its associated fractional-share programme is in development.' },
      { title: 'Meta Munchkins', type: 'Artwork', status: 'Series', summary: 'Existing images and objects become the ground for new interventions. The series asks what changes when an inherited picture or physical carrier acquires another author and another context.' },
      { title: '640×480', type: 'Photography', status: 'Archive', summary: 'Individual digital photographs form sequences whose order and presentation matter to the work. Pixilation is one way of encountering those sequences; the archive also records the images and the interfaces built around them.' },
      { title: 'Narcissus As Narcosis', type: 'Participatory art', status: 'Software', summary: 'Participants make choices, software generates composites, and Goldberg selects particular outcomes as artworks. Its Mashup and Picarty manifestations reveal how authorship is divided across those stages.' },
      { title: 'The Money Club', type: 'Nonprofit', status: 'Educational program', summary: 'Young people build products, set prices and test ideas with other people. Money, design and feedback become things they can work with, rather than concepts encountered only in a lesson.' },
      { title: 'Capability Works', type: 'Civic research', status: 'Developing proposal', summary: 'Capability Works explores employment arrangements shaped around disabled workers’ capabilities, choices and support needs, alongside real demand for work. It remains a proposal in development.' },
      { title: 'In-store retail media systems', type: 'Professional practice', status: 'Employer-owned work', summary: 'Across roles at Loblaw, Walmart Connect and Canadian Tire, Goldberg has worked on systems connecting media, stores and measurement. The case studies document his contribution within each employer’s work.' },
    ],
    destination: 'Browse the complete Projects & Initiatives index',
  },
  archive: {
    title: 'From the archive',
    firstTitle: 'Shanghaied',
    firstBody: ' records writing from Goldberg’s Shanghai years through distinct historical presentations, including readable and glyph-obfuscated versions. ',
    secondTitle: 'Archive & Chronology',
    secondBody: ' places these alongside 640×480, earlier websites, professional work and later initiatives, preserving how the practice changed over time.',
    destination: 'Explore Archive & Chronology',
  },
  writing: {
    title: 'Selected writing',
    introduction: 'JaredGoldberg.org places the writing in the context of the wider practice. The complete systems essays are published at JaredGoldberg.ca.',
    records: [
      { title: 'The Future of Work Is a Design Problem', href: 'https://jaredgoldberg.ca/writing/the-future-of-work-is-a-design-problem/', summary: 'A job contains tasks, but also schedules, environments and inherited assumptions. The essay asks which of those conditions can change so a person’s capability can count.' },
      { title: 'The Conditions of Dignity Are a Systems Output', href: 'https://jaredgoldberg.ca/writing/dignity-is-a-systems-output/', summary: 'Dignity is inherent. The essay follows the connections among work, transport, support and choice that determine whether it is respected in daily life.' },
    ],
    destination: 'Browse Writing & Publications',
  },
  ecosystem: {
    title: 'Where the work lives',
    statements: [
      'JaredGoldberg.org connects the complete practice.',
      'JaredGoldberg.ca publishes the full systems essays and professional ideas.',
      'Duchamped presents and registers the art.',
      'Specialist destinations carry the 640×480 player, Picarty application and Money Club program; Pure Kitsch handles editions, objects and merchandise.',
    ],
  },
  start: {
    title: 'Where to begin',
    routes: [
      { title: 'Art and authorship', summary: 'Explore artworks, Duchamped and the histories of the artist personae.' },
      { title: 'Archives and memory', summary: 'Begin with 640×480, Shanghaied and the platforms that carried them.' },
      { title: 'Civic work and learning', summary: 'Follow The Money Club and Capability Works.' },
      { title: 'Professional systems', summary: 'Read selected records from Bestway, Loblaw, Walmart Connect and Canadian Tire.' },
    ],
    destinations: ['Open the complete index', 'Read the Biography & CV'],
  },
};
