# Web Offer Test Script

A standalone Node.js script for generating and publishing HTML test pages for Adobe Commerce offers. The script creates test pages with merch cards that can be previewed in different countries.

> **Note:** This script has been converted from a Jupyter notebook to Node.js. It now runs with standard Node.js (v18+) and uses ES modules.

## Features

- ✅ Reads test configurations from CSV input file (offer ID, plan types, countries)
- ✅ Flexible per-offer configuration for plan types and countries
- ✅ Fetches offer details from AOS API
- ✅ Generates offer selector IDs for specified plan types
- ✅ Creates HTML test pages with merch cards
- ✅ Publishes pages to Dark Alley for different countries
- ✅ Provides preview and live URLs for each test page
- ✅ Includes comprehensive error handling and logging

## Prerequisites

- **Node.js** runtime (v18.x or higher - required for native `fetch` support)
- **npm** package manager
- **Environment variables** configured in `../../.env`:
  - `OST_TOKEN` - OAuth token for AOS API authentication (required)
  - `DA_TOKEN` - Token for Dark Alley admin API (required)

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Ensure you have the required environment variables
echo "OST_TOKEN=your_ost_token_here" >> ../../.env
echo "DA_TOKEN=your_da_token_here" >> ../../.env

# 3. Create or edit your test configuration CSV
cp offers-sample.csv offers.csv
# Edit offers.csv with your offer IDs and test parameters

# 4. Run the script
node offerTest-web.js
# Or if executable:
./offerTest-web.js

# 5. Check the output for preview URLs
```

## Installation

Ensure Node.js v18 or higher is installed:

```bash
# Check your Node.js version
node --version

# Install Node.js using nvm (recommended)
nvm install 18
nvm use 18

# Or using Homebrew (macOS)
brew install node

# Install dependencies
npm install
```

## Usage

### Basic Usage

```bash
# Run with Node.js
node offerTest-web.js

# Or using npm script
npm run test:web

# Or run directly (if executable and has proper shebang)
chmod +x offerTest-web.js
./offerTest-web.js
```

### Input File

Create an `offers.csv` file in the same directory with the following format (or rename `offers-sample.csv`):

```csv
OFFER_ID,PLAN_TYPES,COUNTRIES
632B3ADD940A7FBB7864AA5AD19B8D28,M2M|ABM|PUF,US|JP
8DF6152F5D87E707D4712BCD23D09FE2,M2M,US|GB|FR|DE
758A90EA37A6282731592A76278E8546,ABM|PUF,ALL
```

#### CSV Column Definitions

- **OFFER_ID** (required): The Adobe offer ID to test
- **PLAN_TYPES** (optional): Pipe-separated list of plan types to test
  - Valid values: `M2M`, `ABM`, `PUF`
  - Use `ALL` to test all plan types
  - Defaults to `ALL` if not specified
- **COUNTRIES** (optional): Pipe-separated list of country codes to test
  - Examples: `US`, `JP`, `GB`, `FR`, `DE`, etc.
  - Use `ALL` to test all countries available for the offer
  - Defaults to `ALL` if not specified

#### Plan Type Definitions

- **M2M** (Month-to-Month): Monthly commitment, monthly billing
- **ABM** (Annual Billed Monthly): Annual commitment, monthly billing  
- **PUF** (Prepaid Upfront): Annual commitment, annual billing

### Configuration

Edit the `CONFIG` object at the top of the script to customize settings:

```javascript
const CONFIG = {
  // AOS Configuration
  aosEndPoint: 'https://aos.adobe.io',
  api_key: 'wcms-commerce-ims-user-prod',
  environment: 'PROD',      // PROD or STAGE
  landscape: 'DRAFT',       // DRAFT or PUBLISHED
  
  // Dark Alley Configuration
  daEndPoint: 'https://admin.da.live',
  org: 'adobecom',
  site: 'upp',
  
  // Page Configuration
  pagePath: '/drafts/tsay/offer-test.html',
  
  // Input files
  inputCsvFile: 'offers.csv',
};
```

**Note:** Plan types and countries to test are specified per-offer in the input CSV file, not in the script configuration.

## Output

### Console Output

The script provides detailed console output:

```
╔═══════════════════════════════════════════════════════════════╗
║         Web Offer Test Script                                 ║
╚═══════════════════════════════════════════════════════════════╝

✓ Environment variables loaded successfully

📄 Reading test configurations from offers.csv...
✓ Found 2 test configuration(s)
✓ 2 valid configuration(s) ready to process

=== Processing Offers ===

Processing offer: 632B3ADD940A7FBB7864AA5AD19B8D28
  Plan types: M2M, ABM, PUF
  Countries: US, JP
✓ Retrieved offer details: ccsn_direct_individual
  Getting offer selector for M2M...
  ✓ Offer Selector ID: PpnQ-UmW9NBwZwXlFw79zw2JybhvwIUwMTDYiIlu5qI
  Getting offer selector for ABM...
  ✓ Offer Selector ID: r_JXAnlFI7xD6FxWKl2ODvZriLYBoSL701Kd1hRyhe8
  Getting offer selector for PUF...
  ✓ Offer Selector ID: LzMV-Ok5xsBW10pPKrRMWq7ewtZjtbOqhaPUIO7tFD0
✓ Generated merch cards for 2 country/countries

✓ Generated 2 test page(s)

=== Publishing Pages to Dark Alley ===

Publishing test page for US...
✓ Published successfully
  Edit URL: https://da.live/edit#/adobecom/upp/drafts/tsay/offer-test
  Preview URL: https://main--upp--adobecom.aem.page/drafts/tsay/offer-test
  Live URL: https://main--upp--adobecom.aem.live/drafts/tsay/offer-test

Publishing test page for JP...
✓ Published successfully
  Edit URL: https://da.live/edit#/adobecom/upp/jp/drafts/tsay/offer-test
  Preview URL: https://main--upp--adobecom.aem.page/jp/drafts/tsay/offer-test
  Live URL: https://main--upp--adobecom.aem.live/jp/drafts/tsay/offer-test

╔═══════════════════════════════════════════════════════════════╗
║         Summary                                               ║
╚═══════════════════════════════════════════════════════════════╝

Total pages published: 2

Test pages:
  US: https://main--upp--adobecom.aem.page/drafts/tsay/offer-test
  JP: https://main--upp--adobecom.aem.page/jp/drafts/tsay/offer-test

✓ Test complete!
```

### Generated HTML Pages

Each test page contains merch cards with:
- Product arrangement code
- Customer segment, commitment, and term information
- Link to OST (Offer Selector Tool) for price display
- Link to OST for checkout URL
- Offer ID reference

The pages are published to Dark Alley and accessible via:
- **Edit URL**: For editing the page in Dark Alley
- **Preview URL**: For previewing the page with test data
- **Live URL**: For viewing the published page

## Error Handling

The script includes comprehensive error handling:

- **API Errors**: Detailed logging of HTTP status, headers, and response body
- **Missing Data**: Graceful handling of missing offers or offer selectors
- **Environment**: Clear error messages for missing environment variables
- **File I/O**: Proper error handling for CSV read operations
- **Publishing**: Continues publishing other pages if one fails

## Troubleshooting

### "OST_TOKEN not found in environment variables"

Make sure your `../../.env` file contains:

```env
OST_TOKEN=your_ost_token_here
DA_TOKEN=your_da_token_here
```

### "DA_TOKEN not found in environment variables"

You need a Dark Alley authentication token to publish pages. Add it to your `.env` file:

```env
DA_TOKEN=your_da_token_here
```

### "Request failed with status: 401"

Your `OST_TOKEN` or `DA_TOKEN` may be expired or invalid. Generate new tokens.

### "Failed to publish page for [country]"

- Check that your `DA_TOKEN` is valid
- Verify that you have write permissions for the specified Dark Alley organization and site
- Check that the `pagePath` in the configuration is valid

### Module Import Errors

Ensure you have installed all dependencies:

```bash
npm install
```

If you're using an older Node.js version (< v18), upgrade to Node.js v18 or higher for native `fetch` support.

## API Documentation

### AOS (Adobe Offer Service)

- **Endpoint**: `https://aos.adobe.io`
- **Authentication**: X-Api-Key header + Bearer token for some endpoints
- **Key APIs**:
  - `GET /offers/{offerId}` - Get offer details
  - `POST /offer_selectors` - Create offer selector

### Dark Alley Admin API

- **Endpoint**: `https://admin.da.live`
- **Authentication**: Bearer token in Authorization header
- **Key APIs**:
  - `POST /source/{org}/{site}/{locale}{path}` - Create or update content

## Development

### Dependencies

The script requires the following npm packages (defined in `package.json`):

- **dotenv** (^16.4.5) - For loading environment variables from `.env` file
- **form-data** (^4.0.0) - For creating multipart/form-data requests

Install all dependencies with:

```bash
npm install
```

### Original Source

This script was converted from the Jupyter notebook: `offerTest-web.ipynb` and updated to run on Node.js instead of Deno.

### Extending the Script

To add new plan types, update the `PLAN_TYPES` object:

```javascript
const PLAN_TYPES = {
  M2M: { commitment: 'MONTH', term: 'MONTHLY' },
  ABM: { commitment: 'YEAR', term: 'MONTHLY' },
  PUF: { commitment: 'YEAR', term: 'ANNUAL' },
  // Add new plan types here
  QUARTERLY: { commitment: 'YEAR', term: 'QUARTERLY' },
};
```

Then add the new plan type to `ALL_PLAN_TYPES`:

```javascript
const ALL_PLAN_TYPES = ['M2M', 'ABM', 'PUF', 'QUARTERLY'];
```

You can then use the new plan type in your CSV:

```csv
OFFER_ID,PLAN_TYPES,COUNTRIES
632B3ADD940A7FBB7864AA5AD19B8D28,M2M|QUARTERLY,US
```

### Customizing the HTML Template

Edit the `MERCH_CARD_TEMPLATE` constant to customize the generated merch cards:

```javascript
const MERCH_CARD_TEMPLATE = `        
  <div class="merch-card product">
    <div>
      <div>
        <h3>{{product_arrangement_code}}</h3>
        <!-- Add your custom HTML here -->
      </div>
    </div>
  </div>`;
```

Available template variables:
- `{{product_arrangement_code}}`
- `{{customer_segment}}`
- `{{commitment}}`
- `{{term}}`
- `{{planType}}`
- `{{offerId}}`
- `{{SelectorId}}`
- `{{product_code}}`

## Comparison with offerTest-wcs.js

| Feature | offerTest-web.js | offerTest-wcs.js |
|---------|------------------|------------------|
| Purpose | Generate and publish test pages | Compare AOS vs WCS prices |
| Output | HTML pages to Dark Alley | CSV with price comparison results |
| Requires DA_TOKEN | Yes | No |
| Page generation | Yes | No |
| Price testing | No | Yes |

Use `offerTest-web.js` when you need to:
- Create test pages for manual testing
- Test offers in a browser environment
- Share test pages with team members

Use `offerTest-wcs.js` when you need to:
- Verify price consistency between AOS and WCS
- Automate price testing across countries
- Generate reports of price discrepancies

## License

See the main project LICENSE file.

## Support

For issues or questions, contact the UPP team or create an issue in the repository.
