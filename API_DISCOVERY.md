# API Discovery — Zumper Property Scraper

## Selected API

- **Source:** `window.__PRELOADED_STATE__` (React server-side hydration payload embedded in HTML)
- **Method:** Browser page load (Playwright Firefox) → `page.evaluate()` to extract JS object
- **Auth:** None required — payload is server-rendered into every search page
- **Pagination:** Query parameter `?page=N` appended to any `/apartments-for-rent/` URL
- **Fields available:** 55+ per listing (see full list below)
- **Fields extracted:** 21 (all non-null, cleaned)
- **Image CDN:** `https://img.zumpercdn.com/{image_id}/1280x960` derived from `image_ids` array

---

## Discovery Process

### 1. URLScan.io Network Analysis

Searched URLScan.io for `domain:zumper.com` scans. Found no standalone JSON API endpoints (no `/api/v1/listings` or `/graphql` endpoints returning listing data directly).

### 2. Checked Standard JSON Sources (in parallel)

| Source | Result |
|--------|--------|
| `script#__NEXT_DATA__` | Not present — Zumper does not use Next.js |
| `script[type="application/ld+json"]` | Only basic site metadata, no listing data |
| XHR/fetch JSON endpoints | No standalone listing API found in network tab |
| `window.__INITIAL_STATE__` | Not present |
| **`window.__PRELOADED_STATE__`** | **Contains full listing data — WINNER** |

### 3. Why `__PRELOADED_STATE__` Was Selected

| Score Factor | Points |
|---|---|
| Returns structured JSON-like data | +30 |
| Has >15 unique fields (55+ per listing) | +25 |
| No auth required (server-rendered) | +20 |
| Has pagination support (`?page=N`) | +15 |
| Matches and extends all desired fields | +10 |
| **Total** | **100** |

---

## Data Location Path

```
window.__PRELOADED_STATE__
  └── currentSearch
        ├── listables
        │     ├── featured[]         → Featured/promoted listings (3 per page)
        │     │     └── [n]._data    → Raw listing object
        │     ├── listables[]        → Regular listings (~25 per page)
        │     │     └── [n]._data    → Raw listing object
        │     └── listingCount       → Total available listings (e.g. 1652)
        ├── hasMoreListables          → Boolean — whether more pages exist
        ├── pathname                  → Current URL path (for pagination logic)
        └── location                  → Location metadata object
```

Each listing is nested inside a wrapper object with a `_data` property containing the actual listing fields.

---

## Available Fields Per Listing (`_data` object)

### Core Identity
| Field | Type | Example |
|-------|------|---------|
| `listing_id` | Number | `12345678` |
| `title` | String | `"1 BR Garden"` |
| `building_name` | String | `"Langara Gardens"` |
| `building_id` | Number | `98765` |
| `url` | String | `"/apartment-buildings/p1367951/langara-gardens..."` |
| `padmapper_url` | String | Alternate listing URL |
| `provider_url` | String | External provider link |
| `listing_type` | Number | Listing type code |
| `listing_status` | String | Status identifier |
| `is_featured` | Boolean | Featured flag |
| `is_pad` | Boolean | Padmapper flag |
| `__typename` | String | GraphQL type name |

### Location
| Field | Type | Example |
|-------|------|---------|
| `address` | String | `"621 West 57th Avenue 101"` |
| `city` | String | `"Vancouver"` |
| `state` | String | `"BC"` |
| `city_state` | String | `"Vancouver, BC"` |
| `zipcode` | String | `"V6P 2B1"` |
| `neighborhood_id` | Number | `1234` |
| `neighborhood_name` | String | `"Oakridge"` |
| `lat` | Number | `49.2191` |
| `lng` | Number | `-123.1198` |
| `tz` | String | Timezone identifier |

### Pricing
| Field | Type | Example |
|-------|------|---------|
| `min_price` | Number | `2190` |
| `max_price` | Number | `3200` |
| `previous_price` | Number/null | Prior price if reduced |

### Property Details
| Field | Type | Example |
|-------|------|---------|
| `property_type` | Number | `4` → "Apartment" |
| `min_bedrooms` | Number | `1` |
| `max_bedrooms` | Number | `2` |
| `min_bathrooms` | Number | `1` |
| `max_bathrooms` | Number | `2` |
| `min_all_bathrooms` | Number | Total bathrooms |
| `max_all_bathrooms` | Number | Total bathrooms |
| `min_square_feet` | Number | `806` |
| `max_square_feet` | Number | `1224` |
| `floorplan_count` | Number | Number of floorplans |
| `min_lease_days` | Number | Minimum lease |
| `max_lease_days` | Number | Maximum lease |
| `lease_type` | String | Lease type |
| `date_available` | String | `"2025-08-01"` |

### Amenities & Features
| Field | Type | Example |
|-------|------|---------|
| `amenities` | Number[] | `[1, 7, 8, 11, 12]` → mapped to names |
| `building_amenities` | Number[] | `[4, 17, 1, 15, 6]` → mapped to names |
| `amenity_tags` | Array | Amenity tag metadata |
| `building_amenity_tags` | Array | Building amenity tags |
| `features` | Array | Additional feature data |
| `pets` | Object/null | Pet policy details |
| `leasing_fee` | Object/null | Fee information |

### Ratings & Media
| Field | Type | Example |
|-------|------|---------|
| `rating` | Number | `9.7` |
| `external_rating` | Number | External review score |
| `image_ids` | Number[] | `[897587067, 882541647, ...]` |
| `internal_video_ids` | Array | Video tour IDs |
| `integrated_tour_types` | Array | Virtual tour types |
| `title` | String | Listing title |
| `short_description` | String | Brief description |

### Metadata
| Field | Type | Example |
|-------|------|---------|
| `created_on` | String | Creation timestamp |
| `modified_on` | String | Last modified timestamp |
| `listed_on` | String | Listing date |
| `group_id` | Number | Listing group |
| `feed_name` | String | Data feed source |
| `brokerage_id` | Number | Brokerage ID |
| `agent_id` | Number | Agent ID |
| `agent_name` | String | Agent name |
| `brokerage_name` | String | Brokerage name |
| `phone` | String | Contact phone |
| `pb_id` | String | Padmapper building ID |
| `pl_id` | String | Padmapper listing ID |
| `promotion` | Object/null | Active promotions |
| `zappable` | Boolean | Zumper instant apply |
| `is_messageable` | Boolean | Can message landlord |
| `has_fees` | Boolean | Has additional fees |
| `pa_should_index` | Boolean | SEO indexing flag |
| `pa_url` | String | Padmapper URL |
| `pl_url` | String | Padmapper listing URL |

---

## Image URL Derivation

Zumper stores listing images as numeric IDs in the `image_ids` array. Full-size image URLs are constructed using the Zumper CDN pattern:

```
Template:  https://img.zumpercdn.com/{image_id}/1280x960
Example:   https://img.zumpercdn.com/897587067/1280x960
```

Optional query parameters for resizing:
```
https://img.zumpercdn.com/{image_id}/1280x960?fit=crop&h=208&w=329   (thumbnail)
https://img.zumpercdn.com/{image_id}/1280x960                          (full size, no crop)
```

The first `image_id` in the array is typically the primary/hero image. All IDs map to distinct photos of the listing.

---

## Pagination

Pagination is handled via the `?page=N` query parameter on any Zumper search URL:

```
Page 1: https://www.zumper.com/apartments-for-rent/vancouver-bc
Page 2: https://www.zumper.com/apartments-for-rent/vancouver-bc?page=2
Page 3: https://www.zumper.com/apartments-for-rent/vancouver-bc?page=3
```

Pagination signals from the API:
- `currentSearch.hasMoreListables` → `true` if more pages exist
- `currentSearch.listables.listingCount` → Total listing count
- Each page returns ~25-28 regular listings + ~3 featured listings

**Note:** URL path pagination (`/page-2`) does NOT work — it returns empty `listables`. Only the `?page=N` query parameter approach is reliable.

---

## Amenity Code Mapping

Zumper encodes amenities as numeric codes. The actor maps these to human-readable names:

| Code | Amenity | Code | Amenity |
|------|---------|------|---------|
| 1 | Cats OK | 22 | Clubhouse |
| 2 | Dogs OK | 23 | Playground |
| 3 | Furnished | 29 | High Speed Internet |
| 4 | Pool | 31 | Refrigerator |
| 5 | Elevator | 32 | Microwave |
| 6 | Garage | 35 | Range/Oven |
| 7 | In-Unit Laundry | 36 | Garbage Disposal |
| 8 | Air Conditioning | 38 | Cable Ready |
| 9 | Patio/Balcony | 41 | High Ceilings |
| 10 | Dishwasher | 48 | Near Transit |
| 11 | Hardwood Floors | 66 | Smoke Free |
| 12 | Carpet | 72 | Yard |
| 13 | Walk-In Closets | 77 | Some Utilities Paid |
| 14 | Fireplace | 78 | Heat Included |
| 15 | On-Site Laundry | 88 | Tennis Court |
| 16 | Wheelchair Access | 91 | Spa |
| 17 | Fitness Center | 92 | Concierge |
| 18 | Storage | 94 | Rooftop Deck |
| 19 | Package Service | 95 | Doorman |
| 20 | Controlled Access | | |
| 21 | Business Center | | |

## Property Type Mapping

| Code | Type |
|------|------|
| 1 | House |
| 2 | Condo |
| 3 | Townhouse |
| 4 | Apartment |
| 5 | Loft |
| 6 | Duplex |
| 7 | Multiplex |

---

## Why Browser (Playwright Firefox) Is Required

The `__PRELOADED_STATE__` payload is a JavaScript object embedded in the page HTML via a `<script>` tag. While theoretically extractable from raw HTML via regex, in practice:

1. **Zumper uses anti-bot protections** — Direct HTTP requests to search pages may receive a challenge page or redirect
2. **Cookie/session requirements** — The hydration payload requires cookies set by prior JS execution
3. **Resource blocking** — Playwright allows blocking images, fonts, ads, and analytics to speed up page loads significantly
4. **Fingerprinting** — Firefox with custom fingerprints avoids detection

The actor uses Playwright Firefox in headless mode with:
- Resource blocking (images, ads, analytics, tracking scripts)
- Session pooling and browser fingerprinting
- `waitForFunction` to ensure `__PRELOADED_STATE__` is available before extraction

---

## Rejected Alternatives

| Approach | Why Rejected |
|----------|-------------|
| Direct HTTP API call (`gotScraping`) | No standalone JSON API found; Zumper serves data only via hydration payload |
| `__NEXT_DATA__` | Zumper does not use Next.js framework |
| JSON-LD structured data | Only contains basic site metadata (name, logo), no listing data |
| HTML/DOM parsing | Fragile, fewer fields, requires maintaining CSS selectors |
| URL path pagination (`/page-2`) | Returns empty `listables` — only `?page=N` query param works |

---

## Extraction Code Pattern

```javascript
// Wait for hydration payload
await page.waitForFunction(
    () => !!window.__PRELOADED_STATE__?.currentSearch?.listables,
    { timeout: 30000 }
);

// Extract all listings
const listingData = await page.evaluate(() => {
    const state = window.__PRELOADED_STATE__;
    const listables = state.currentSearch.listables;
    const featured = (listables.featured || []).map(l => l._data || l);
    const regular = (listables.listables || []).map(l => l._data || l);
    return {
        all: [...featured, ...regular],
        total: listables.listingCount,
        hasMore: state.currentSearch.hasMoreListables,
    };
});
```

---

## Supported URL Patterns

| Pattern | Example | Pagination |
|---------|---------|------------|
| City page | `/apartments-for-rent/vancouver-bc` | Yes (`?page=N`) |
| Neighborhood | `/apartments-for-rent/west-end-vancouver-bc` | Yes (`?page=N`) |
| State/Province | `/apartments-for-rent/california` | Yes (`?page=N`) |
| Building detail | `/apartment-buildings/p1367951/langara-gardens...` | No (single building) |
| Filtered search | `/apartments-for-rent/vancouver-bc?price_max=2500` | Yes (filters preserved) |
