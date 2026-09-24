import test from 'node:test';
import assert from 'node:assert/strict';
import {
  renderActionLink,
  renderArchiveExcerpt,
  renderCategoryLabel,
  renderInquiryRecord,
  renderMediaPlaceholder,
  renderProjectRecord,
  renderTextLink,
  renderStatusLabel,
  renderWritingRecord,
} from '../src/components/content-patterns.mjs';

const projects = [
  ['The Pitch', 'Conceptual art', 'Institutional project in development', 'Presented through Duchamped, The Pitch brings the language and machinery of valuation into the artwork. Its associated fractional-share programme is in development.'],
  ['Meta Munchkins', 'Artwork', 'Series', 'Existing images and objects become the ground for new interventions. The series asks what changes when an inherited picture or physical carrier acquires another author and another context.'],
  ['640×480', 'Photography', 'Archive', 'Individual digital photographs form sequences whose order and presentation matter to the work. Pixilation is one way of encountering those sequences; the archive also records the images and the interfaces built around them.'],
  ['Narcissus As Narcosis', 'Participatory art', 'Software', 'Participants make choices, software generates composites, and Goldberg selects particular outcomes as artworks. Its Mashup and Picarty manifestations reveal how authorship is divided across those stages.'],
  ['The Money Club', 'Nonprofit', 'Educational program', 'Young people build products, set prices and test ideas with other people. Money, design and feedback become things they can work with, rather than concepts encountered only in a lesson.'],
  ['Capability Works', 'Civic research', 'Developing proposal', 'Capability Works explores employment arrangements shaped around disabled workers’ capabilities, choices and support needs, alongside real demand for work. It remains a proposal in development.'],
  ['In-store retail media systems', 'Professional practice', 'Employer-owned work', 'Across roles at Loblaw, Walmart Connect and Canadian Tire, Goldberg has worked on systems connecting media, stores and measurement. The case studies document his contribution within each employer’s work.'],
];

const inquiries = [
  ['Systems and Institutions', 'How rules, incentives and organizations shape behaviour. This inquiry runs through professional platforms, civic initiatives and artist-made institutions.'],
  ['Media, Archives and Memory', 'How photographs, sequences, memoirs and interfaces become records—and how preservation, editing or obscurity changes what those records can tell us.'],
  ['Design, Participation and Interfaces', 'How a tool distributes decisions among its designer, its users and the system itself. The question appears in participatory art, software and product design.'],
  ['Capability, Learning and Work', 'What conditions allow people to learn, contribute and earn. The Money Club tests those conditions through education; Capability Works develops a proposal for their redesign around employment.'],
  ['Art, Authorship and Valuation', 'How names, ownership, circulation and price affect the meaning of an artwork. This area includes the works, institutions and artist personae that make those mechanisms visible.'],
];

test('all approved project types, statuses and summary lengths fit one record API', () => {
  const output = projects.map(([title, type, status, summary]) => renderProjectRecord({
    title, type, status, summary,
    destination: { href: `/projects/${encodeURIComponent(title)}`, label: 'View record' },
  })).join('');
  assert.equal((output.match(/class="record record--project"/g) ?? []).length, 7);
  for (const [title, type, status, summary] of projects) {
    assert.ok(output.includes(title));
    assert.ok(output.includes(type));
    assert.ok(output.includes(status));
    assert.ok(output.includes(summary));
  }
  assert.doesNotMatch(output, /available|for sale|now open/i);
});

test('five parallel inquiries use a common semantic record without equal-height assumptions', () => {
  const output = inquiries.map(([title, summary]) => renderInquiryRecord({ title, summary })).join('');
  assert.equal((output.match(/class="record record--inquiry"/g) ?? []).length, 5);
  for (const [title, summary] of inquiries) {
    assert.ok(output.includes(title));
    assert.ok(output.includes(summary));
  }
});

test('archive excerpts and writing records retain different editorial semantics', () => {
  const archive = renderArchiveExcerpt({
    body: 'Shanghaied records writing from Goldberg’s Shanghai years through distinct historical presentations, including readable and glyph-obfuscated versions.',
    destination: { href: '/archive/', label: 'Explore Archive & Chronology' },
  });
  const writing = renderWritingRecord({
    title: 'The Conditions of Dignity Are a Systems Output',
    summary: 'Dignity is inherent. The essay follows the connections among work, transport, support and choice that determine whether it is respected in daily life.',
    href: 'https://jaredgoldberg.ca/writing/dignity-is-a-systems-output/',
  });
  assert.match(archive, /^<article class="editorial-excerpt">/);
  assert.match(writing, /^<article class="writing-record">/);
  assert.doesNotMatch(writing, /target="_blank"/);
  assert.match(writing, /text-link--external/);
});

test('links, actions and placeholders enforce stable accessible contracts', () => {
  assert.match(renderTextLink({ href: '#local', label: 'Continue' }), /class="text-link"/);
  assert.match(renderTextLink({ href: 'https:\/\/example.com', label: 'External', newTab: true }), /target="_blank" rel="noopener noreferrer"/);
  assert.match(renderActionLink({ href: '/index/', label: 'Open the complete index', variant: 'primary' }), /class="btn btn--primary"/);
  assert.equal(renderCategoryLabel('Civic research'), '<span class="category-label">Civic research</span>');
  assert.equal(renderStatusLabel('Developing proposal'), '<span class="status-label">Developing proposal</span>');
  assert.throws(() => renderActionLink({ href: '/bad', label: 'Bad', variant: 'invented' }), /Unsupported/);
  assert.throws(() => renderTextLink({ href: 'http:\/\/example.com', label: 'Bad' }), /must be/);
  assert.match(renderMediaPlaceholder({ label: 'Banner image pending' }), /role="img" aria-label="Banner image pending"/);
  assert.match(renderMediaPlaceholder({ decorative: true }), /aria-hidden="true"/);
});
