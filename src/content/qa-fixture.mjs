// TEMPORARY QA FIXTURE. These labels and sections are not approved site architecture.
export const site = { identity: 'jaredgoldberg.org', name: 'Jared Goldberg', nameLines: ['Jared', 'Goldberg'], title: 'jaredgoldberg.org — QA', status: 'QA · Design-system fixture', googleTagId: 'G-N6X517GEQ2' };
export const navigation = [
  { label: 'QA home', href: '/' },
  { label: 'Specimens', children: [
    { label: 'Typography', href: '/#typography' },
    { label: 'Components', children: [
      { label: 'Controls', href: '/#controls' },
      { label: 'Surfaces', href: '/#surfaces' },
    ] },
  ] },
];
export const fixture = {
  introduction: 'A temporary space to review typography, navigation, spacing, and interface details.',
  introductionImage: {
    src: '/images/above-the-fold-prototype.png',
    alt: 'Two people reviewing a mobile interface prototype and paper design sketches.',
    width: 1536,
    height: 1024,
  },
  heading: 'Design-system foundation',
  paragraph: 'This page contains QA specimens. Future content and navigation are still to be defined.',
  sample: 'Regular text, bold emphasis, and a readable line length.',
  footer: 'Temporary QA environment',
  headingSpecimen: 'Heading specimen',
  emphasis: 'Bold emphasis',
  linkPrefix: ' and ',
  linkLabel: 'an inline link',
  caption: 'Caption · Temporary fixture',
  controlsHeading: 'Interface specimens',
  surfaceHeading: 'Surface specimen',
  surfaceCaption: 'Background · Surface · Muted · Ink · Focus',
  swatches: ['background', 'surface', 'muted', 'ink', 'focus'],
  contentPatterns: {
    heading: 'Content-pattern stress test',
    introduction: 'Representative records test long titles, mixed work types, development states, variable summaries, destinations, and unavailable image assets. This is a component specimen, not a homepage layout.',
    records: [
      {
        title: 'The Pitch',
        type: 'Conceptual art',
        status: 'Institutional project in development',
        summary: 'Presented through Duchamped, The Pitch brings the language and machinery of valuation into the artwork. Its associated fractional-share programme is in development.',
        destination: { href: '#content-patterns', label: 'View record' },
      },
      {
        title: 'Capability Works',
        type: 'Civic research',
        status: 'Developing proposal',
        summary: 'Capability Works explores employment arrangements shaped around disabled workers’ capabilities, choices and support needs, alongside real demand for work. It remains a proposal in development.',
        destination: { href: '#content-patterns', label: 'View proposal record' },
      },
      {
        title: 'In-store retail media systems',
        type: 'Professional practice',
        status: 'Employer-owned work',
        summary: 'Across roles at Loblaw, Walmart Connect and Canadian Tire, Goldberg has worked on systems connecting media, stores and measurement. The case studies document his contribution within each employer’s work.',
        destination: { href: '#content-patterns', label: 'View case-study index' },
      },
    ],
    mediaHeading: 'Standard-page banner placeholder',
    mediaLabel: 'Banner image pending',
  },
  actions: [
    {label: 'Typography', href: '#typography', variant: 'primary'},
    {label: 'Surfaces', href: '#surfaces', variant: 'secondary'},
    {label: 'Back to top', href: '#main-content', variant: 'muted'},
  ],
};
