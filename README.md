# Zumper Property Scraper

Extract comprehensive apartment and rental property listings from Zumper.com with ease. Collect detailed property data including pricing, bedrooms, bathrooms, amenities, ratings, image galleries, and neighborhood information across any US or Canadian city. Perfect for real estate research, rental market analysis, and property data collection.

## Features

- **City-wide extraction** — Scrape all apartment listings from any Zumper city or neighborhood page
- **Automatic pagination** — Handles multi-page results automatically to collect your desired number of listings
- **Rich property data** — Extracts pricing, bedrooms, bathrooms, square footage, amenities, ratings, and more
- **Faster collection** — Completes city and neighborhood runs much more quickly for the same result counts
- **Image galleries** — Collects full-size property image URLs for every listing
- **Amenity mapping** — Converts numeric amenity codes into readable names for easy analysis
- **Duplicate protection** — Skips repeated listings across featured and paginated results
- **No null fields** — Clean dataset with empty fields automatically removed
- **Proxy support** — Built-in proxy configuration for reliable data collection at scale

## Use Cases

### Rental Market Research
Analyze rental prices, availability, and trends across cities and neighborhoods. Compare average rents, identify affordable areas, and track market shifts over time for investment decisions.

### Property Investment Analysis
Evaluate rental properties by comparing prices, amenities, and ratings across buildings. Identify high-rated buildings with competitive pricing for potential investment opportunities.

### Relocation Planning
Gather comprehensive rental options before moving to a new city. Filter by budget, bedroom count, and preferred neighborhoods to shortlist apartments quickly.

### Competitive Intelligence
Monitor competitor pricing and amenity offerings in your market area. Stay ahead by tracking new listings, price changes, and occupancy trends.

### Real Estate Data Enrichment
Build comprehensive property databases for business intelligence, lead generation, or data-driven applications. Combine with other datasets for deeper market insights.

---

## Input Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `url` | String | No | — | Full Zumper URL to scrape, e.g. `https://www.zumper.com/apartments-for-rent/vancouver-bc`. |
| `results_wanted` | Integer | No | `100` | Maximum number of property listings to collect. |
| `max_pages` | Integer | No | `20` | Maximum number of search result pages to visit. |
| `proxyConfiguration` | Object | No | Apify Proxy (Residential) | Proxy settings for reliable access. |

---

## Output Data

Each item in the dataset contains:

| Field | Type | Description |
|-------|------|-------------|
| `title` | String | Listing title or floor plan name |
| `building_name` | String | Name of the building or property |
| `address` | String | Street address of the property |
| `neighborhood` | String | Neighborhood name |
| `city` | String | City name |
| `state` | String | State or province abbreviation |
| `zipcode` | String | Postal or ZIP code |
| `min_price` | Number | Minimum monthly rent |
| `max_price` | Number | Maximum monthly rent |
| `min_bedrooms` | Number | Minimum bedrooms available |
| `max_bedrooms` | Number | Maximum bedrooms available |
| `min_bathrooms` | Number | Minimum bathrooms available |
| `max_bathrooms` | Number | Maximum bathrooms available |
| `sqft` | String | Square footage range (e.g. `806-1224`) |
| `property_type` | String | Type of property (e.g. Apartment, House, Condo) |
| `available_date` | String | Date the unit becomes available |
| `rating` | Number | Property rating score |
| `amenities` | Array | List of unit amenities (e.g. Cats OK, In-Unit Laundry) |
| `building_amenities` | Array | List of building amenities (e.g. Fitness Center, Pool) |
| `latitude` | Number | Latitude coordinate |
| `longitude` | Number | Longitude coordinate |
| `url` | String | Full URL to the listing on Zumper |
| `image_gallery` | Array | List of full-size property image URLs |

---

## Usage Examples

### Scrape a City URL

Extract apartments for rent from Vancouver, BC:

```json
{
    "url": "https://www.zumper.com/apartments-for-rent/vancouver-bc",
    "results_wanted": 100,
    "max_pages": 10
}
```

### Scrape a Specific Neighborhood

Extract listings from a neighborhood page:

```json
{
    "url": "https://www.zumper.com/apartments-for-rent/west-end-vancouver-bc",
    "results_wanted": 25
}
```

### Large-Scale Collection

Collect all available listings from New York with proxy:

```json
{
    "url": "https://www.zumper.com/apartments-for-rent/new-york-ny",
    "results_wanted": 500,
    "max_pages": 50,
    "proxyConfiguration": {
        "useApifyProxy": true,
        "apifyProxyGroups": ["RESIDENTIAL"]
    }
}
```

---

## Sample Output

```json
{
    "title": "1 BR Garden",
    "building_name": "Langara Gardens",
    "address": "621 West 57th Avenue 101",
    "neighborhood": "Oakridge",
    "city": "Vancouver",
    "state": "BC",
    "zipcode": "V6P 2B1",
    "min_price": 2190,
    "max_price": 3200,
    "min_bedrooms": 1,
    "max_bedrooms": 2,
    "min_bathrooms": 1,
    "max_bathrooms": 2,
    "sqft": "806-1224",
    "property_type": "Apartment",
    "rating": 9.7,
    "amenities": ["Cats OK", "In-Unit Laundry", "Air Conditioning", "Hardwood Floors", "Carpet"],
    "building_amenities": ["Pool", "Fitness Center", "Cats OK", "On-Site Laundry", "Garage"],
    "latitude": 49.2191,
    "longitude": -123.1198,
    "url": "https://www.zumper.com/apartment-buildings/p1367951/langara-gardens-oakridge-vancouver-bc",
    "image_gallery": [
        "https://img.zumpercdn.com/900775369/1280x960",
        "https://img.zumpercdn.com/884389517/1280x960",
        "https://img.zumpercdn.com/884389518/1280x960"
    ]
}
```

---

## Tips for Best Results

### Choose Valid URLs
- Use Zumper city or neighborhood URLs like `https://www.zumper.com/apartments-for-rent/city-state`
- Verify the URL loads correctly in a browser before running the actor

### Optimize Collection Size
- Start with 20-50 results for testing before scaling up
- Each page returns approximately 25-28 listings
- Set `max_pages` to control how deep the scraper goes

### Proxy Configuration
- Residential proxies are recommended for large runs
- Apify Proxy with `RESIDENTIAL` group works well for Zumper
- For small test runs, proxy is not required

### Supported URL Patterns
- City pages: `/apartments-for-rent/vancouver-bc`
- Neighborhood pages: `/apartments-for-rent/west-end-vancouver-bc`
- State pages: `/apartments-for-rent/california`
- Any valid Zumper search URL

---

## Integrations

Connect your Zumper property data with:

- **Google Sheets** — Export listings for price comparison and analysis
- **Airtable** — Build a searchable property database
- **Slack** — Get notified when new listings match your criteria
- **Webhooks** — Send data to custom endpoints in real-time
- **Make** — Automate workflows with property data triggers
- **Zapier** — Connect to hundreds of apps and services

### Export Formats

- **JSON** — For developers and API integrations
- **CSV** — For spreadsheet analysis in Excel or Google Sheets
- **Excel** — For business reporting and presentations
- **XML** — For system integrations

---

## Frequently Asked Questions

### How many listings can I collect?
You can collect all available listings from any Zumper search. Some cities have thousands of listings. Use `results_wanted` and `max_pages` to control the output size.

### Does it work for both US and Canadian cities?
Yes, the scraper works with any Zumper city or neighborhood page in the United States or Canada.

### Can I scrape a specific building?
Building detail pages (`/apartment-buildings/...`) are also supported. The scraper extracts available floor plans from the building page.

### What if a field is missing?
Fields that are not available for a particular listing are automatically excluded from the output, keeping your dataset clean.

### How often should I run this actor?
For market monitoring, running daily or weekly provides good coverage of new listings and price changes. Use Apify scheduling for automated runs.

### Can I filter by price or bedrooms?
Use Zumper's URL filters. For example, `https://www.zumper.com/apartments-for-rent/vancouver-bc?price_max=2500&beds_min=2` to filter by max price and minimum bedrooms.

---

## Support

For issues or feature requests, contact support through the Apify Console.

### Resources

- [Apify Documentation](https://docs.apify.com/)
- [API Reference](https://docs.apify.com/api/v2)
- [Scheduling Runs](https://docs.apify.com/schedules)

---

## Legal Notice

This actor is designed for legitimate data collection purposes. Users are responsible for ensuring compliance with Zumper's terms of service and applicable laws. Use data responsibly and respect rate limits.
