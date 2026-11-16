/*
 * Copyright 2022 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

/**
 * The decision engine for where to get Milo's libs from.
 */
export const [setLibs, getLibs] = (() => {
  let libs;
  return [
    (prodLibs, location) => {
      libs = (() => {
        const { hostname, search } = location || window.location;
        if (!/\.hlx\.|\.aem\.|\.da\.|local|stage/.test(hostname)) return prodLibs;
        const branch = new URLSearchParams(search).get('milolibs') || 'main';
        // Validate the branch name to mitigate potential security risks
        if (!/^[a-zA-Z0-9-_]+$/.test(branch)) {
          throw new Error('Invalid branch name.');
        }
        if (branch === 'main' && hostname === 'www.stage.adobe.com') return '/libs';
        if (branch === 'local') return 'http://localhost:6456/libs';
        return branch.includes('--') ? `https://${branch}.aem.live/libs` : `https://${branch}--milo--adobecom.aem.live/libs`;
      })();
      return libs;
    }, () => libs,
  ];
})();

const LCP_PRELOAD_RELS = ['preload', 'modulepreload', 'preconnect'];

export function addLcpPreloads(rows = [], libs = getLibs()) {
  rows.forEach(({ rel, href, as, crossorigin, priority }) => {
    if (!LCP_PRELOAD_RELS.includes(rel) || !href) return;
    let resolved;
    try {
      resolved = new URL(href.replace('{libs}', libs), window.location.href);
    } catch {
      return;
    }
    if ([...document.head.querySelectorAll(`link[rel="${rel}"]`)].some((l) => l.href === resolved.href)) return;
    // Absolute, so href-based "already loaded" checks don't mistake a preload for the file.
    // Preconnects use the bare origin, as Milo's warmTypekit() does, so they aren't duplicated.
    const url = rel === 'preconnect' ? resolved.origin : resolved.href;
    const link = document.createElement('link');
    link.setAttribute('rel', rel);
    link.setAttribute('href', url);
    if (as) link.setAttribute('as', as);
    if (crossorigin) link.setAttribute('crossorigin', crossorigin);
    if (priority) link.setAttribute('fetchpriority', priority);
    document.head.append(link);
  });
}
