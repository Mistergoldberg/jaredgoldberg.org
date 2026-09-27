export const site = {
  identity: 'jaredgoldberg.org',
  footerIdentity: 'JAREDGOLDBERG.ORG',
  name: 'Jared Goldberg',
  nameLines: ['Jared', 'Goldberg'],
  title: 'Jared Goldberg — Artist, systems designer and writer',
  role: 'Artist · Systems designer · Writer',
  copyright: '© 2026 Jared Goldberg',
  googleTagId: 'G-N6X517GEQ2',
};

export const sectionRoutes = [
  { key: 'media', label: 'Media, Archives and Memory', href: '/media-archives-and-memory/' },
  { key: 'community', label: 'Learning, Work and Agency', href: '/community-service/' },
  { key: 'systems', label: 'Systems and Institutions', href: '/systems-and-institutions/' },
  { key: 'art', label: 'Art', href: '/art/' },
];

export const navigation = [
  { label: 'Home', href: '/' },
  { label: "Explore Jared's practice", children: sectionRoutes.map(({ label, href }) => ({ label, href })) },
];

export const homepage = {
  introduction: [
    'Jared Goldberg makes art, software, public projects and large work systems. The forms change. The main question does not: how do rules shape what people see, value and do?',
  ],
  indexHeading: 'Four ways into the work',
  sections: [
    {
      title: 'Media, archives and memory',
      href: '/media-archives-and-memory/',
      summary: { parts: [
        'How does a photograph change when it becomes a sequence, a playable archive or the input to someone else\'s image? Follow ',
        { emphasis: '640 × 480' },
        ', Pixilation and Picarty.',
      ] },
      action: 'Explore the image archives and participatory media',
    },
    {
      title: 'Learning, work and agency',
      href: '/community-service/',
      summary: 'What must a system provide before a person can act? The Money Club tests an education method with young people. Capability Works proposes a way to rebuild jobs around actual capabilities.',
      action: 'Explore the education and employment projects',
    },
    {
      title: 'Systems and institutions',
      href: '/systems-and-institutions/',
      summary: 'How do factories and retailers turn decisions into products, shelf space and media? Read an institutional account of the roles, measures and incentives behind Goldberg\'s work in China and Canadian retail.',
      action: 'Explore the systems and institutions',
    },
    {
      title: 'Art and the manufacture of value',
      href: '/art/',
      summary: { parts: [
        'What happens when an artist changes the frame around an object, a name or a price? Enter Duchamped, the historical stage name Jared the Jew, and ',
        { emphasis: 'The Pitch' },
        '.',
      ] },
      action: 'Explore the art practice',
    },
  ],
  about: {
    title: 'About this index',
    paragraphs: [
      'The projects are connected by recurring acts of selection, arrangement, participation and circulation. Those connections are a way to read the work, not a claim that all the projects mean the same thing. This index supplies context. The photographs, interfaces, artworks, programs and first-person accounts live at their own sites.',
    ],
    links: [
      { label: "Read Jared Goldberg's first-person essays and work accounts", href: 'https://jaredgoldberg.ca/writing/' },
      { label: 'Visit the art practice at Duchamped', href: 'https://duchamped.com/' },
    ],
  },
};
