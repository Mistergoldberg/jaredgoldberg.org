import { escapeHTML as e } from '../components/html.mjs';
import { renderFooter, renderPageStart } from '../components/page.mjs';
import {
  renderActionLink,
  renderHeading,
  renderMediaSlot,
  renderMetadata,
  renderProjectRecord,
  renderTextLink,
  renderWritingRecord,
} from '../components/content-patterns.mjs';

const fixtureSite = {
  identity: 'jaredgoldberg.org',
  footerIdentity: 'JAREDGOLDBERG.ORG',
  name: 'Jared Goldberg',
  role: 'Artist · Systems designer · Writer',
};

const fixtureNavigation = [{label:'Development fixture',href:'/'}];

export function renderNewPageFixture({ stylesheet = '/assets/site.css', script = '/assets/navigation.js', media } = {}) {
  const title = 'An unfamiliar title long enough to test a future page without borrowing an existing composition';
  const description = 'Development-only design-system assembly exercise.';
  const start = renderPageStart({
    site:fixtureSite,
    navigation:fixtureNavigation,
    title:`${title} — ${fixtureSite.name}`,
    description,
    stylesheet,
    script,
    path:'/',
    bodyClass:'design-system-fixture',
  });
  return `${start}
<main id="main-content" tabindex="-1" data-page-background>
  <section class="section section--flush"><div class="layout-shell layout-shell--content u-flow">
    ${renderHeading({level:1,text:title})}
    ${renderMetadata([
      {label:'Development fixture',variant:'category'},
      {label:'Not production content',variant:'status'},
      'Mixed metadata without punctuation',
    ])}
    <p class="prose">${e('This deliberately unfamiliar page proves that long headings, mixed metadata, body text, actions and optional media can be assembled from the shared contracts alone. It is generated only under test-results and is never included in the production artifact or navigation.')}</p>
    ${renderMediaSlot({media,placeholder:{label:'Optional media has not been supplied'}})}
    <div class="button-group">${renderActionLink({href:'#records',label:'Review the records',variant:'primary'})}${renderActionLink({href:'#notes',label:'Read implementation notes',variant:'secondary'})}</div>
  </div></section>
  <section id="records" class="section"><div class="layout-shell layout-shell--content u-flow">
    ${renderHeading({level:2,text:'Distinct records remain distinct'})}
    <div class="record-list">${renderProjectRecord({
      title:'A project title that wraps independently from status and summary',
      type:'Future project type',
      status:'Editorial state pending',
      summary:'The project renderer keeps its factual structure and optional destination without asking this page to copy a project-specific class hierarchy.',
      destination:{href:'#notes',label:'Review implementation notes'},
    })}</div>
    <div class="writing-list">${renderWritingRecord({
      title:'A writing record is still text-forward',
      summary:'Writing keeps its own editorial structure instead of being flattened into the project treatment.',
      href:'https://example.com/reference',
    })}</div>
  </div></section>
  <section id="notes" class="section section--tight"><div class="layout-shell layout-shell--reading u-flow">
    ${renderHeading({level:2,text:'Implementation notes'})}
    <p>This fixture uses the shared page shell, typography, layout, metadata, media, action, project and writing APIs. ${renderTextLink({href:'#main-content',label:'Return to the page title'})}</p>
  </div></section>
</main>
${renderFooter(fixtureSite)}`;
}
