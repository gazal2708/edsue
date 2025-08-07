import {
  loadHeader,
  loadFooter,
  decorateButtons,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
} from './aem.js';

/**
 * Moves all the attributes from a given elmenet to another given element.
 * @param {Element} from the element to copy attributes from
 * @param {Element} to the element to copy attributes to
 */
export function moveAttributes(from, to, attributes) {
  if (!attributes) {
    // eslint-disable-next-line no-param-reassign
    attributes = [...from.attributes].map(({ nodeName }) => nodeName);
  }
  attributes.forEach((attr) => {
    const value = from.getAttribute(attr);
    if (value) {
      to.setAttribute(attr, value);
      from.removeAttribute(attr);
    }
  });
}

// Standalone definition of convertAemUrlToAssetsUrl for testing
function decorateAemUrlUtil(aemUrl) {
  try {
      // Only convert if the URL starts with the required prefix
      if (!aemUrl.startsWith('https://delivery-p')) {
          return aemUrl;
      }
      // Parse the URL to extract query parameters
      const url = new URL(aemUrl);
      // Get the assetname parameter
      const assetName = url.searchParams.get('assetname');
      if (!assetName) {
          // console.error('No assetname parameter found in URL:', aemUrl);
          return aemUrl; // Return original URL if no assetname found
      }
      // Construct the new assets.ups.com URL
      const convertedUrl = `https://assets.ups.com/dam/assets/${assetName}`;
      return convertedUrl;
  } catch (error) {
      // console.error('Error converting AEM URL:', error);
      return aemUrl; // Return original URL on error
  }
}
// const testUrls = [
// // Should convert
// 'https://delivery-p12345.adobeaemcloud.com/path/to/asset?assetname=myimage.jpg',
// 'https://delivery-p67890.adobeaemcloud.com/another/path?assetname=sample.pdf',
// 'https://delivery-p129624-e1269699.adobeaemcloud.com/adobe/assets/urn:aaid:aem:57fd1397-1dcf-43e0-945d-056ce8d79159/renditions/original/as/LicenseTnC.pdf?assetname=LicenseTnC.pdf',
// 'https://delivery-p66302-e574366.adobeaemcloud.com/adobe/assets/urn:aaid:aem:bab896a1-3210-4674-85e7-ce224b9f9a25/as/sparkles.avif?assetname=sparkles.gif',
// // Should NOT convert
// 'https://some-other-domain.com/path?assetname=shouldnotconvert.jpg',
// 'https://delivery-p12345.adobeaemcloud.com/path/to/asset', // no assetname param
// 'https://delivery-p12345.adobeaemcloud.com/path/to/asset?notassetname=foo',
// ];
// testUrls.forEach((url) => {
// const result = convertAemUrlToAssetsUrl(url);
// console.log(`Input:    ${url}`);
// console.log(`Output:   ${result}`);
// console.log('---');
// });

export function decorateExternalImages(main) {
  main.querySelectorAll('a[href^="https://delivery-p"]:not([href*="/original/"]), a[href^="https://delivery-p"][href$=".gif"], a[href*="assets.ups.com"]:not([href*="/original/"])').forEach((a) => {    
    
    const url = new URL(decorateAemUrlUtil(a.href));
    if (url.hostname.endsWith('.adobeaemcloud.com') || url.hostname.includes('assets.ups.com')) {
      const pic = document.createElement('picture');

      const source1 = document.createElement('source');
      source1.type = 'image/webp';
      source1.srcset = url;

      const source2 = document.createElement('source');
      source2.type = 'image/webp';
      source2.srcset = url;
      source2.media = '(min-width: 600px)';

      const source3 = document.createElement('source');
      source3.type = 'image/jpg';
      source3.media = '(min-width: 600px)';
      source3.srcset = url;

      const img = document.createElement('img');
      img.loading = 'lazy';
      img.src = url;
      if (a.title) {
        img.setAttribute('alt', a.title);
      }
      pic.appendChild(source1);
      pic.appendChild(source2);
      pic.appendChild(source3);
      pic.appendChild(img);
      a.replaceWith(pic);
    }
  });
}

export function decorateImages(main) {
  main.querySelectorAll('p img').forEach((img) => {
    const p = img.closest('p');
    p.className = 'img-wrapper';
  });
}

/**
 * Move instrumentation attributes from a given element to another given element.
 * @param {Element} from the element to copy attributes from
 * @param {Element} to the element to copy attributes to
 */
export function moveInstrumentation(from, to) {
  moveAttributes(
    from,
    to,
    [...from.attributes]
      .map(({ nodeName }) => nodeName)
      .filter((attr) => attr.startsWith('data-aue-') || attr.startsWith('data-richtext-')),
  );
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}


/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks() {
  try {
    // TODO: add auto block, if needed
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  // hopefully forward compatible button decoration
  decorateButtons(main);
  decorateIcons(main);
  decorateExternalImages(main);
  decorateImages(main);
  buildAutoBlocks(main);
  decorateSections(main);
  decorateBlocks(main);
  // decorateExternalImages(main);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    document.body.classList.add('appear');
    await loadSection(main.querySelector('.section'), waitForFirstImage);
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  const main = doc.querySelector('main');
  await loadSections(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadHeader(doc.querySelector('header'));
  loadFooter(doc.querySelector('footer'));

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();
