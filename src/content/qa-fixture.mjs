// TEMPORARY QA FIXTURE. These labels and sections are not approved site architecture.
export const site = { identity: 'jaredgoldberg.org', name: 'Jared Goldberg', nameLines: ['Jared', 'Goldberg'], title: 'jaredgoldberg.org — QA', status: 'QA · Design-system fixture' };
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
  actions: [
    {label: 'Typography', href: '#typography', variant: 'primary'},
    {label: 'Surfaces', href: '#surfaces', variant: 'secondary'},
    {label: 'Back to top', href: '#main-content', variant: 'muted'},
  ],
};
