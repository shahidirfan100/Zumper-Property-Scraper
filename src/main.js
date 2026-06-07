import { readFile } from 'node:fs/promises';

import { Actor, log } from 'apify';
import { Dataset } from 'crawlee';
import { gotScraping } from 'got-scraping';

const BROWSER_HEADER_GENERATOR_OPTIONS = {
    browsers: [
        { name: 'chrome', minVersion: 120, maxVersion: 137 },
        { name: 'firefox', minVersion: 120, maxVersion: 139 },
    ],
    devices: ['desktop'],
    operatingSystems: ['windows', 'linux', 'macos'],
    locales: ['en-US', 'en'],
};

const BASE_BROWSER_HEADERS = {
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    DNT: '1',
    Origin: 'https://www.zumper.com',
    Pragma: 'no-cache',
    Referer: 'https://www.zumper.com/',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
};

const PRELOADED_STATE_MARKER = 'window.__PRELOADED_STATE__ = ';

const AMENITY_MAP = {
    1: 'Cats OK',
    2: 'Dogs OK',
    3: 'Furnished',
    4: 'Pool',
    5: 'Elevator',
    6: 'Garage',
    7: 'In-Unit Laundry',
    8: 'Air Conditioning',
    9: 'Patio/Balcony',
    10: 'Dishwasher',
    11: 'Hardwood Floors',
    12: 'Carpet',
    13: 'Walk-In Closets',
    14: 'Fireplace',
    15: 'On-Site Laundry',
    16: 'Wheelchair Access',
    17: 'Fitness Center',
    18: 'Storage',
    19: 'Package Service',
    20: 'Controlled Access',
    21: 'Business Center',
    22: 'Clubhouse',
    23: 'Playground',
    29: 'High Speed Internet',
    31: 'Refrigerator',
    32: 'Microwave',
    35: 'Range/Oven',
    36: 'Garbage Disposal',
    38: 'Cable Ready',
    41: 'High Ceilings',
    48: 'Near Transit',
    66: 'Smoke Free',
    72: 'Yard',
    77: 'Some Utilities Paid',
    78: 'Heat Included',
    88: 'Tennis Court',
    91: 'Spa',
    92: 'Concierge',
    94: 'Rooftop Deck',
    95: 'Doorman',
};

const PROPERTY_TYPE_MAP = {
    1: 'House',
    2: 'Condo',
    3: 'Townhouse',
    4: 'Apartment',
    5: 'Loft',
    6: 'Duplex',
    7: 'Multiplex',
};

function mapAmenities(codes) {
    if (!Array.isArray(codes) || codes.length === 0) return null;

    const mapped = codes
        .map((code) => AMENITY_MAP[code] || `Code ${code}`)
        .filter(Boolean);

    return mapped.length > 0 ? mapped : null;
}

function buildImageUrls(imageIds) {
    if (!Array.isArray(imageIds) || imageIds.length === 0) return null;
    return imageIds.map((id) => `https://img.zumpercdn.com/${id}/1280x960`);
}

function normalizeZipcode(zipcode) {
    if (typeof zipcode !== 'string') return zipcode ?? null;
    if (zipcode === 'None' || zipcode.includes('None')) return null;
    return zipcode.trim() || null;
}

function createSquareFootage(raw) {
    const minSqft = raw.min_square_feet > 0 && raw.min_square_feet < 99999 ? raw.min_square_feet : null;
    const maxSqft = raw.max_square_feet > 0 && raw.max_square_feet < 99999 ? raw.max_square_feet : null;

    if (minSqft && maxSqft) return `${minSqft}-${maxSqft}`;
    if (minSqft) return String(minSqft);
    return null;
}

function createListingKey(listing) {
    return String(
        listing.group_id
        ?? listing.listing_id
        ?? listing.url
        ?? listing.pa_url
        ?? `${listing.address}-${listing.min_price}-${listing.max_price}`,
    );
}

function removeEmptyFields(item) {
    return Object.fromEntries(
        Object.entries(item).filter(([, value]) => {
            if (value === null || value === undefined || value === '') return false;
            if (Array.isArray(value) && value.length === 0) return false;
            return true;
        }),
    );
}

function cleanListing(raw) {
    if (!raw) return null;

    const item = {
        title: raw.title || null,
        building_name: raw.building_name || null,
        address: raw.address || null,
        neighborhood: raw.neighborhood_name || null,
        city: raw.city || null,
        state: raw.state || null,
        zipcode: normalizeZipcode(raw.zipcode),
        min_price: raw.min_price ?? null,
        max_price: raw.max_price ?? null,
        min_bedrooms: raw.min_bedrooms ?? null,
        max_bedrooms: raw.max_bedrooms ?? null,
        min_bathrooms: raw.min_bathrooms ?? null,
        max_bathrooms: raw.max_bathrooms ?? null,
        sqft: createSquareFootage(raw),
        property_type: PROPERTY_TYPE_MAP[raw.property_type] || null,
        available_date: raw.date_available || null,
        rating: raw.rating ?? raw.external_rating ?? null,
        amenities: mapAmenities(raw.amenities),
        building_amenities: mapAmenities(raw.building_amenities),
        latitude: raw.lat ?? null,
        longitude: raw.lng ?? null,
        url: raw.url ? `https://www.zumper.com${raw.url}` : null,
        image_gallery: buildImageUrls(raw.image_ids),
    };

    const cleaned = removeEmptyFields(item);
    return Object.keys(cleaned).length > 0 ? cleaned : null;
}

function setPageUrl(url, page) {
    const nextUrl = new URL(url);

    if (page <= 1) nextUrl.searchParams.delete('page');
    else nextUrl.searchParams.set('page', String(page));

    return nextUrl.href;
}

function extractPreloadedState(html) {
    const markerIndex = html.indexOf(PRELOADED_STATE_MARKER);
    if (markerIndex === -1) {
        throw new Error('Could not find window.__PRELOADED_STATE__ in the response.');
    }

    const jsonStart = markerIndex + PRELOADED_STATE_MARKER.length;
    let depth = 0;
    let inString = false;
    let escaped = false;
    let jsonEnd = -1;

    for (let index = jsonStart; index < html.length; index++) {
        const char = html[index];

        if (escaped) {
            escaped = false;
            continue;
        }

        if (char === '\\') {
            escaped = true;
            continue;
        }

        if (char === '"') {
            inString = !inString;
            continue;
        }

        if (inString) continue;

        if (char === '{') {
            depth++;
            continue;
        }

        if (char === '}') {
            depth--;
            if (depth === 0) {
                jsonEnd = index + 1;
                break;
            }
        }
    }

    if (jsonEnd === -1) {
        throw new Error('Could not determine the end of window.__PRELOADED_STATE__.');
    }

    return JSON.parse(html.slice(jsonStart, jsonEnd));
}

function unwrapListing(item) {
    if (!item || typeof item !== 'object') return item;
    // eslint-disable-next-line no-underscore-dangle
    return Object.hasOwn(item, '_data') ? item._data : item;
}

function extractListingsFromState(state) {
    const currentSearch = state?.currentSearch;
    const listables = currentSearch?.listables;

    if (!listables) {
        throw new Error('This page does not expose currentSearch.listables.');
    }

    const featured = (listables.featured || []).map(unwrapListing);
    const regular = (listables.listables || []).map(unwrapListing);

    return {
        pathname: currentSearch?.pathname || '',
        hasMore: Boolean(currentSearch?.hasMoreListables),
        total: listables?.listingCount ?? featured.length + regular.length,
        listings: [...featured, ...regular].filter(Boolean),
    };
}

async function fetchPageState(url, proxyConfiguration) {
    const proxyUrl = proxyConfiguration ? await proxyConfiguration.newUrl() : undefined;
    const targetUrl = new URL(url);
    const response = await gotScraping({
        url,
        proxyUrl,
        headerGeneratorOptions: BROWSER_HEADER_GENERATOR_OPTIONS,
        headers: {
            ...BASE_BROWSER_HEADERS,
            Host: targetUrl.host,
            Origin: targetUrl.origin,
            Referer: pageReferer(url),
        },
        timeout: { request: 30000 },
        retry: { limit: 2 },
    });

    return extractPreloadedState(response.body);
}

function pageReferer(url) {
    const targetUrl = new URL(url);
    const refererUrl = new URL(url);
    refererUrl.searchParams.delete('page');
    if (targetUrl.searchParams.get('page') === '1') {
        refererUrl.search = targetUrl.search;
    }

    return refererUrl.href;
}

async function loadFallbackInput() {
    try {
        const fallbackInput = await readFile(new URL('../INPUT.json', import.meta.url), 'utf8');
        return JSON.parse(fallbackInput);
    } catch (error) {
        log.warning(`Could not load INPUT.json fallback: ${error.message}`);
        return {};
    }
}

function hasRuntimeInput(input) {
    return Boolean(input) && Object.keys(input).length > 0;
}

async function main() {
    await Actor.init();

    try {
        const runtimeInput = (await Actor.getInput()) || {};
        const fallbackInput = await loadFallbackInput();
        const input = hasRuntimeInput(runtimeInput)
            ? { ...fallbackInput, ...runtimeInput }
            : fallbackInput;

        if (!hasRuntimeInput(runtimeInput) && Object.keys(fallbackInput).length > 0) {
            log.info('No runtime input provided. Falling back to INPUT.json defaults.');
        }

        const {
            url: inputUrl,
            startUrl,
            startUrls,
            results_wanted: resultsWantedRaw = 20,
            max_pages: maxPagesRaw = 20,
            proxyConfiguration,
        } = input;

        const resultsWanted = Number.isFinite(+resultsWantedRaw)
            ? Math.max(1, +resultsWantedRaw)
            : Number.MAX_SAFE_INTEGER;

        const maxPages = Number.isFinite(+maxPagesRaw)
            ? Math.max(1, +maxPagesRaw)
            : 20;

        let startUrlFinal;
        if (inputUrl) startUrlFinal = inputUrl;
        else if (startUrl) startUrlFinal = startUrl;
        else if (Array.isArray(startUrls) && startUrls.length > 0) startUrlFinal = startUrls[0].url || startUrls[0];
        else {
            throw new Error('No URL provided. Please supply a Zumper URL.');
        }

        if (!startUrlFinal.startsWith('http')) {
            startUrlFinal = `https://www.zumper.com${startUrlFinal.startsWith('/') ? '' : '/'}${startUrlFinal}`;
        }

        const proxyConf = proxyConfiguration
            ? await Actor.createProxyConfiguration({ ...proxyConfiguration })
            : undefined;

        const seenKeys = new Set();
        let duplicatesSkipped = 0;
        let saved = 0;
        let lastKnownHasMore = false;

        log.info(`Starting URL: ${startUrlFinal}`);
        log.info(`Results wanted: ${resultsWanted}, Max pages: ${maxPages}`);

        for (let pageNo = 1; pageNo <= maxPages && saved < resultsWanted; pageNo++) {
            const pageUrl = setPageUrl(startUrlFinal, pageNo);
            const state = await fetchPageState(pageUrl, proxyConf);
            const pageData = extractListingsFromState(state);
            lastKnownHasMore = pageData.hasMore;

            log.info(
                `Page ${pageNo}: Found ${pageData.listings.length} listings `
                + `(${pageData.total} total available, hasMore: ${pageData.hasMore})`,
            );

            const uniqueItems = [];

            for (const listing of pageData.listings) {
                if (saved + uniqueItems.length >= resultsWanted) break;

                const key = createListingKey(listing);
                if (seenKeys.has(key)) {
                    duplicatesSkipped++;
                    continue;
                }

                const cleaned = cleanListing(listing);
                if (!cleaned) continue;

                seenKeys.add(key);
                uniqueItems.push(cleaned);
            }

            if (uniqueItems.length > 0) {
                await Dataset.pushData(uniqueItems);
                saved += uniqueItems.length;
                log.info(`Pushed ${uniqueItems.length} unique listings (total saved: ${saved})`);
            } else {
                log.warning(`Page ${pageNo} produced no new unique listings.`);
            }

            if (!pageData.pathname.includes('/apartments-for-rent/')) break;
            if (!pageData.hasMore || pageData.listings.length === 0) break;
        }

        log.info(`Finished. Saved ${saved} listings. Duplicates skipped: ${duplicatesSkipped}`);

        if (saved === 0) {
            throw new Error('No listings were extracted.');
        }

        if (lastKnownHasMore && saved < resultsWanted) {
            log.warning('Stopped before reaching the requested result count due to page limits or repeated results.');
        }
    } finally {
        await Actor.exit();
    }
}

main().catch((error) => {
    log.error(`Fatal: ${error.message}`);
    process.exit(1);
});
