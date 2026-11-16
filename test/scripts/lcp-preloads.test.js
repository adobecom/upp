import { readFile } from '@web/test-runner-commands';
import { expect } from '@esm-bundle/chai';
import { addLcpPreloads } from '../../upp/scripts/utils.js';

describe('LCP preloads', () => {
  const libs = 'https://main--milo--adobecom.aem.live/libs';
  afterEach(() => {
    document.head.querySelectorAll('link[href*="lcp-test"]').forEach((l) => l.remove());
  });

  it('adds hints for valid rows and resolves {libs}', () => {
    addLcpPreloads([
      { rel: 'modulepreload', href: '{libs}/lcp-test/a.js', crossorigin: 'anonymous', priority: 'low' },
      { rel: 'preload', href: '{libs}/lcp-test/b.css', as: 'style' },
      { rel: '', href: '{libs}/lcp-test/no-rel.js' },
      { rel: 'stylesheet', href: '{libs}/lcp-test/bad-rel.css' },
    ], libs);
    const module = document.head.querySelector(`link[href="${libs}/lcp-test/a.js"]`);
    expect(module.rel).to.equal('modulepreload');
    expect(module.getAttribute('crossorigin')).to.equal('anonymous');
    expect(module.getAttribute('fetchpriority')).to.equal('low');
    expect(document.head.querySelector(`link[href="${libs}/lcp-test/b.css"]`).as).to.equal('style');
    expect(document.head.querySelector('link[href*="lcp-test/no-rel.js"]')).to.be.null;
    expect(document.head.querySelector('link[href*="lcp-test/bad-rel.css"]')).to.be.null;
  });

  it('skips a malformed row without dropping the others', () => {
    addLcpPreloads([
      { rel: 'preload', href: 'https://', as: 'script' },
      { rel: 'modulepreload', href: '{libs}/lcp-test/after-bad.js' },
    ], libs);
    expect(document.head.querySelector('link[href*="lcp-test/after-bad.js"]')).to.exist;
  });

  it('adds preconnects as bare origins and does not duplicate Milo\'s', () => {
    const milo = Object.assign(document.createElement('link'), { rel: 'preconnect', href: 'https://lcp-test.typekit.net' });
    milo.setAttribute('href', 'https://lcp-test.typekit.net');
    document.head.append(milo);
    addLcpPreloads([
      { rel: 'preconnect', href: 'https://lcp-test.typekit.net', crossorigin: 'anonymous' },
      { rel: 'preconnect', href: 'https://p.lcp-test.typekit.net/', crossorigin: 'anonymous' },
    ], libs);
    const hrefs = [...document.head.querySelectorAll('link[rel="preconnect"][href*="lcp-test"]')].map((l) => l.getAttribute('href'));
    expect(hrefs).to.deep.equal(['https://lcp-test.typekit.net', 'https://p.lcp-test.typekit.net']);
  });

  it('does not add the same hint twice', () => {
    const row = { rel: 'modulepreload', href: '{libs}/lcp-test/dup.js' };
    addLcpPreloads([row, row], libs);
    expect(document.head.querySelectorAll('link[href*="lcp-test/dup.js"]')).to.have.length(1);
  });

  it('head.html picks the sheet per environment and page metadata', async () => {
    const headHtml = await readFile({ path: '../../head.html' });
    const script = headHtml.split('<script>').map((x) => x.split('</script>')[0])
      .find((x) => x.includes("'c2-lcp-preloads'"));
    const originalHead = document.head.innerHTML;
    const optedIn = { foundation: 'c2', 'preload-c2-resources': 'on' };
    const sheetFor = (url, meta = optedIn) => {
      document.head.innerHTML = Object.entries(meta)
        .map(([name, content]) => `<meta name="${name}" content="${content}">`).join('');
      // eslint-disable-next-line no-new-func
      new Function('window', script)({ location: new URL(url) });
      return document.getElementById('c2-lcp-preloads')?.href ?? null;
    };
    const path = '/federal/preloads/c2-preloads-default.json';
    [
      ['https://www.adobe.com/x', `https://www.adobe.com${path}`],
      ['https://www.stage.adobe.com/x', `https://www.stage.adobe.com${path}`],
      ['https://main--upp--adobecom.aem.live/x', `https://main--federal--adobecom.aem.live${path}`],
      ['https://main--upp--adobecom.aem.page/x', `https://main--federal--adobecom.aem.page${path}`],
      ['http://localhost:3000/x', `https://main--federal--adobecom.aem.page${path}`],
    ].forEach(([url, expected]) => expect(sheetFor(url)).to.equal(expected));
    const page = 'https://www.stage.adobe.com/x';
    expect(sheetFor(page, { foundation: 'c1', 'preload-c2-resources': 'on' })).to.be.null;
    expect(sheetFor(page, { foundation: 'c2' })).to.be.null;
    const withSource = (source) => sheetFor(page, { ...optedIn, 'preload-c2-source': source });
    expect(withSource('/federal/preloads/page.json')).to.equal('https://www.stage.adobe.com/federal/preloads/page.json');
    expect(withSource('https://main--federal--adobecom.aem.live/federal/preloads/page.json'))
      .to.equal('https://www.stage.adobe.com/federal/preloads/page.json');
    expect(withSource('https://www.adobe.com/drafts/page.json')).to.equal(`https://www.stage.adobe.com${path}`);
    document.head.innerHTML = originalHead;
  });
});
