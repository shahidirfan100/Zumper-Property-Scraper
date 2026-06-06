// Zumper Property Scraper – API-based extraction via __PRELOADED_STATE__
import { Actor, log } from 'apify';
import { Dataset,PlaywrightCrawler } from 'crawlee';
import { firefox } from 'playwright';

await Actor.init();

// ── Amenity code mapping ──────────────────────────────────────────────────
const AMENITY_MAP = {
    1: 'Cats OK', 2: 'Dogs OK', 3: 'Furnished', 4: 'Pool',
    5: 'Elevator', 6: 'Garage', 7: 'In-Unit Laundry', 8: 'Air Conditioning',
    9: 'Patio/Balcony', 10: 'Dishwasher', 11: 'Hardwood Floors', 12: 'Carpet',
    13: 'Walk-In Closets', 14: 'Fireplace', 15: 'On-Site Laundry',
    16: 'Wheelchair Access', 17: 'Fitness Center', 18: 'Storage',
    19: 'Package Service', 20: 'Controlled Access', 21: 'Business Center',
    22: 'Clubhouse', 23: 'Playground', 29: 'High Speed Internet',
    31: 'Refrigerator', 32: 'Microwave', 35: 'Range/Oven', 36: 'Garbage Disposal',
    38: 'Cable Ready', 41: 'High Ceilings', 48: 'Near Transit',
    66: 'Smoke Free', 72: 'Yard', 77: 'Some Utilities Paid',
    78: 'Heat Included', 88: 'Tennis Court', 91: 'Spa', 92: 'Concierge',
    94: 'Rooftop Deck', 95: 'Doorman',
};

// ── Property type mapping ─────────────────────────────────────────────────
const PROPERTY_TYPE_MAP = {
    1: 'House', 2: 'Condo', 3: 'Townhouse', 4: 'Apartment',
    5: 'Loft', 6: 'Duplex', 7: 'Multiplex',
};

function mapAmenities(codes) {
    if (!Array.isArray(codes) || !codes.length) return null;
    const mapped = codes.map(c => AMENITY_MAP[c] || `Code ${c}`).filter(Boolean);
    return mapped.length ? mapped : null;
}

// ── Build full-size image URLs from image_ids ────────────────────────────
function buildImageUrls(imageIds) {
    if (!Array.isArray(imageIds) || !imageIds.length) return null;
    return imageIds.map(id => `https://img.zumpercdn.com/${id}/1280x960`);
}

// ── Clean a single listing ─────────────────────────────────────────────────
function cleanListing(d) {
    if (!d) return null;
    const minSqft = d.min_square_feet > 0 && d.min_square_feet < 99999 ? d.min_square_feet : null;
    const maxSqft = d.max_square_feet > 0 && d.max_square_feet < 99999 ? d.max_square_feet : null;
    let sqft = null;
    if (minSqft && maxSqft) sqft = `${minSqft}-${maxSqft}`;
    else if (minSqft) sqft = String(minSqft);

    const item = {
        title: d.title || null,
        building_name: d.building_name || null,
        address: d.address || null,
        neighborhood: d.neighborhood_name || null,
        city: d.city || null,
        state: d.state || null,
        zipcode: (d.zipcode && d.zipcode !== 'None' && !d.zipcode.includes('None')) ? d.zipcode : null,
        min_price: d.min_price || null,
        max_price: d.max_price || null,
        min_bedrooms: d.min_bedrooms ?? null,
        max_bedrooms: d.max_bedrooms ?? null,
        min_bathrooms: d.min_bathrooms ?? null,
        max_bathrooms: d.max_bathrooms ?? null,
        sqft,
        property_type: PROPERTY_TYPE_MAP[d.property_type] || null,
        available_date: d.date_available || null,
        rating: d.rating || d.external_rating || null,
        amenities: mapAmenities(d.amenities),
        building_amenities: mapAmenities(d.building_amenities),
        latitude: d.lat || null,
        longitude: d.lng || null,
        url: d.url ? `https://www.zumper.com${d.url}` : null,
        image_gallery: buildImageUrls(d.image_ids),
    };

    // Remove null fields
    Object.keys(item).forEach(k => { if (item[k] === null) delete item[k]; });
    return Object.keys(item).length ? item : null;
}

// ── Add/replace page parameter in URL ─────────────────────────────────────
function setPageUrl(url, page) {
    const u = new URL(url);
    u.searchParams.set('page', String(page));
    return u.href;
}

// ── Main ──────────────────────────────────────────────────────────────────
async function main() {
    try {
        const input = (await Actor.getInput()) || {};
        const {
            url: inputUrl,
            startUrl,
            startUrls,
            results_wanted: RESULTS_WANTED_RAW = 100,
            max_pages: MAX_PAGES_RAW = 20,
            proxyConfiguration,
        } = input;

        const RESULTS_WANTED = Number.isFinite(+RESULTS_WANTED_RAW)
            ? Math.max(1, +RESULTS_WANTED_RAW)
            : Number.MAX_SAFE_INTEGER;
        const MAX_PAGES = Number.isFinite(+MAX_PAGES_RAW)
            ? Math.max(1, +MAX_PAGES_RAW)
            : 20;

        // Determine start URL – user input always wins
        let startUrlFinal;
        if (inputUrl) startUrlFinal = inputUrl;
        else if (startUrl) startUrlFinal = startUrl;
        else if (Array.isArray(startUrls) && startUrls.length) startUrlFinal = startUrls[0].url || startUrls[0];
        else {
            log.error('No URL provided. Please supply a Zumper URL.');
            await Actor.exit();
            return;
        }

        // Ensure absolute URL
        if (!startUrlFinal.startsWith('http')) {
            startUrlFinal = `https://www.zumper.com${startUrlFinal.startsWith('/') ? '' : '/'}${startUrlFinal}`;
        }

        log.info(`Starting URL: ${startUrlFinal}`);
        log.info(`Results wanted: ${RESULTS_WANTED}, Max pages: ${MAX_PAGES}`);

        const proxyConf = proxyConfiguration
            ? await Actor.createProxyConfiguration({ ...proxyConfiguration })
            : undefined;

        let saved = 0;

        const crawler = new PlaywrightCrawler({
            proxyConfiguration: proxyConf,
            maxRequestRetries: 3,
            useSessionPool: true,
            maxConcurrency: 2,
            requestHandlerTimeoutSecs: 120,
            launchContext: {
                launcher: firefox,
                launchOptions: {
                    headless: true,
                    args: ['--disable-blink-features=AutomationControlled'],
                },
            },
            browserPoolOptions: {
                useFingerprints: true,
                fingerprintOptions: {
                    fingerprintGeneratorOptions: {
                        browsers: [{ name: 'firefox', minVersion: 115 }],
                        devices: ['desktop'],
                        operatingSystems: ['windows', 'linux', 'macos'],
                    },
                },
            },
            preNavigationHooks: [
                async ({ page }) => {
                    // Block heavy resources to speed up page load
                    await page.route('**/*.{png,jpg,jpeg,gif,svg,webp,ico,woff,woff2,ttf,eot}', route => route.abort());
                    await page.route('**/doubleclick.net/**', route => route.abort());
                    await page.route('**/googletagmanager.com/**', route => route.abort());
                    await page.route('**/google-analytics.com/**', route => route.abort());
                    await page.route('**/facebook.net/**', route => route.abort());
                    await page.route('**/analytics.google.com/**', route => route.abort());
                    await page.route('**/ads/**', route => route.abort());
                    await page.route('**/cookielaw.org/**', route => route.abort());
                    await page.route('**/mixpanel.com/**', route => route.abort());
                    await page.route('**/sentryv2.zumper.com/**', route => route.abort());
                    await page.route('**/optimizely.com/**', route => route.abort());
                    await page.route('**/anonymised.io/**', route => route.abort());
                    await page.route('**/blueshift.com/**', route => route.abort());
                    await page.route('**/bing.com/bat.js', route => route.abort());
                    await page.route('**/hadronid.net/**', route => route.abort());
                },
            ],
            async requestHandler({ page, request, log: crawlerLog }) {
                if (saved >= RESULTS_WANTED) return;

                const pageNo = request.userData?.pageNo || 1;

                // Wait for __PRELOADED_STATE__ to be available
                await page.waitForFunction(
                    // eslint-disable-next-line no-underscore-dangle
                    () => !!window.__PRELOADED_STATE__?.currentSearch?.listables,
                    { timeout: 30000 },
                ).catch(() => null);

                // Extract listing data from the embedded API state
                 
                const listingData = await page.evaluate(() => {
                    // eslint-disable-next-line no-underscore-dangle
                    const state = window.__PRELOADED_STATE__;
                    if (!state?.currentSearch) return null;

                    const cs = state.currentSearch;
                    const listables = cs.listables || {};
                    // eslint-disable-next-line no-underscore-dangle
                    const featured = (listables.featured || []).map(l => l._data || l);
                    // eslint-disable-next-line no-underscore-dangle
                    const regular = (listables.listables || []).map(l => l._data || l);

                    return {
                        all: [...featured, ...regular],
                        total: listables.listingCount || 0,
                        hasMore: cs.hasMoreListables || false,
                        pathname: cs.pathname || '',
                        location: cs.location || {},
                    };
                });

                if (!listingData || !listingData.all || listingData.all.length === 0) {
                    crawlerLog.warning(`No listings found on ${request.url}`);
                    return;
                }

                crawlerLog.info(
                    `Page ${pageNo}: Found ${listingData.all.length} listings ` +
                    `(${listingData.total} total available, hasMore: ${listingData.hasMore})`,
                );

                // Process and push listings
                const items = [];
                for (const d of listingData.all) {
                    if (saved >= RESULTS_WANTED) break;
                    const cleaned = cleanListing(d);
                    if (cleaned) {
                        items.push(cleaned);
                        saved++;
                    }
                }

                if (items.length) {
                    await Dataset.pushData(items);
                    crawlerLog.info(`Pushed ${items.length} listings (total saved: ${saved})`);
                }

                // Pagination – only for search/listing pages, not building detail pages
                const isSearchPage = listingData.pathname.includes('/apartments-for-rent/');
                if (
                    isSearchPage &&
                    saved < RESULTS_WANTED &&
                    pageNo < MAX_PAGES &&
                    listingData.hasMore
                ) {
                    const nextUrl = setPageUrl(startUrlFinal, pageNo + 1);
                    crawlerLog.info(`Enqueuing next page: ${nextUrl}`);
                    await crawler.addRequests([
                        { url: nextUrl, userData: { label: 'PAGE', pageNo: pageNo + 1 } },
                    ]);
                }
            },
            failedRequestHandler({ request, log: crawlerLog }, error) {
                crawlerLog.error(`Request failed: ${request.url} – ${error.message}`);
            },
        });

        await crawler.run([
            { url: startUrlFinal, userData: { label: 'PAGE', pageNo: 1 } },
        ]);

        log.info(`Finished. Saved ${saved} listings.`);
    } finally {
        await Actor.exit();
    }
}

main().catch(err => { log.error(`Fatal: ${err.message}`); process.exit(1); });
