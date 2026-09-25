export const site = {
  identity: 'jaredgoldberg.org',
  name: 'Jared Goldberg',
  nameLines: ['Jared', 'Goldberg'],
  title: 'Jared Goldberg — Artist, systems designer and writer',
  role: 'Artist · Systems designer · Writer',
  googleTagId: 'G-N6X517GEQ2',
};

export const sectionRoutes = [
  { key: 'media', label: 'Media, Archives and Memory', href: '/media-archives-and-memory/' },
  { key: 'community', label: 'Community Service', href: '/community-service/' },
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
    'These four sections provide the shortest route through the practice.',
  ],
  sections: [
    {
      title: 'Media, Archives and Memory',
      href: '/media-archives-and-memory/',
      summary: 'A photo is not a record on its own. Follow 640 x 480 from a cheap digital camera to a vast image stream and the Pixilation player. See how order, code, loss and time can change the past.',
      action: 'Explore Media, Archives and Memory',
    },
    {
      title: 'Community Service',
      href: '/community-service/',
      summary: 'What helps people learn, work and earn? The Money Club gives young people a real build-and-sell loop. Capability Works asks how jobs can be built around what people can do.',
      action: 'Explore Community Service',
    },
    {
      title: 'Systems and Institutions',
      href: '/systems-and-institutions/',
      summary: 'Rules shape what people do. Work in Chinese plants and Canadian mass retail shows how cost, culture, rights and feedback move goods, cash and choice at scale.',
      action: 'Explore Systems and Institutions',
    },
    {
      title: 'Art',
      href: '/art/',
      summary: 'Who can name a work, set a price and make the price count? Jared Goldberg, Jared the Jew, Duchamped and The Pitch form one art system built from name, power and value.',
      action: 'Explore Art',
    },
  ],
};
