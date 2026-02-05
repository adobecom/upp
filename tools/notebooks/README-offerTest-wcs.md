# WCS Offer Test Script

A standalone Node.js script for testing Adobe Commerce WCS (Web Commerce Services) offers by comparing prices between AOS (Adobe Offer Service) and WCS across different countries and plan types.

> **Note:** This script has been converted from Deno to Node.js. It now runs with standard Node.js (v18+) and uses ES modules.

## Features

- ✅ Reads test configurations from CSV input file (offer ID, plan types, countries)
- ✅ Flexible per-offer configuration for plan types and countries
- ✅ Fetches offer details from AOS API
- ✅ Generates offer selector IDs for specified plan types
- ✅ Compares AOS and WCS prices across specified countries
- ✅ Outputs detailed test results to CSV
- ✅ Provides clear pass/fail status for each test
- ✅ Includes comprehensive error handling and logging

## Prerequisites

- **Node.js** runtime (v18.x or higher - required for native `fetch` support)
- **npm** package manager
- **Environment variables** configured in `../../.env`:
  - `OST_TOKEN` - OAuth token for AOS API authentication
  - `DA_TOKEN` (optional) - Token for Dark Alley admin API

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Ensure you have the required environment variable
echo "OST_TOKEN=your_token_here" >> ../../.env

# 3. Create or edit your test configuration CSV
cp offers-sample.csv offers.csv
# Edit offers.csv with your offer IDs and test parameters

# 4. Run the script
node offerTest-wcs.js
# Or if executable:
./offerTest-wcs.js

# 5. Check the results
cat results.csv
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
node offerTest-wcs.js

# Or run directly (if executable and has proper shebang)
chmod +x offerTest-wcs.js
./offerTest-wcs.js
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

Edit the `CONFIG` object at the top of the script to customize API settings:

```javascript
const CONFIG = {
  // API endpoints
  aosEndPoint: 'https://aos.adobe.io',
  wcsEndPoint: 'https://www.adobe.com',
  
  // API credentials
  api_key: 'wcms-commerce-ims-user-prod',
  
  // Environment settings
  environment: 'PROD',      // PROD or STAGE
  landscape: 'DRAFT',       // DRAFT or PUBLISHED
  
  // File paths
  inputCsvFile: 'offers.csv',
  outputCsvFile: 'results.csv',
};
```

**Note:** Plan types and countries to test are now specified per-offer in the input CSV file, not in the script configuration.

## Output

### Console Output

The script provides detailed console output:

```
╔═══════════════════════════════════════════════════════════════╗
║         WCS Offer Test Script                                 ║
╚═══════════════════════════════════════════════════════════════╝

✓ Environment variables loaded successfully

📄 Reading test configurations from offers.csv...
✓ Found 2 test configuration(s)
✓ 2 valid configuration(s) ready to test

=== Starting Offer Tests ===

Testing offer: 632B3ADD940A7FBB7864AA5AD19B8D28
  Plan types: M2M, ABM, PUF
  Countries: US, JP

  Plan Type: M2M
  ✓ Offer Selector ID: PpnQ-UmW9NBwZwXlFw79zw2JybhvwIUwMTDYiIlu5qI
    Testing US... ✓ PASS: 54.99
    Testing JP... ✓ PASS: 7480

  Plan Type: ABM
  ✓ Offer Selector ID: r_JXAnlFI7xD6FxWKl2ODvZriLYBoSL701Kd1hRyhe8
    Testing US... ✓ PASS: 54.99
    Testing JP... ✓ PASS: 7480
    ...

=== Test Summary ===
Total Tests: 12
Passed: 12 (100%)
Failed: 0 (0%)
Skipped: 0 (no price data available)

✓ Test complete! Results saved to results.csv
```

### CSV Output

Results are saved to `results.csv` with the following columns:

| Column | Description |
|--------|-------------|
| `offer_id` | The AOS offer ID |
| `osi` | Offer selector ID |
| `aos_price` | Price from AOS API |
| `wcs_price` | Price from WCS API |
| `plan_type` | Plan type tested (M2M, ABM, PUF) |
| `country` | Country code |
| `product_arrangement_code` | Product arrangement code |
| `start_date` | Offer start date |
| `end_date` | Offer end date |
| `status` | Test result (PASS/FAIL) |

Example output:

```csv
offer_id,osi,aos_price,wcs_price,plan_type,country,product_arrangement_code,start_date,end_date,status
632B3ADD940A7FBB7864AA5AD19B8D28,PpnQ-UmW9NBwZwXlFw79zw2JybhvwIUwMTDYiIlu5qI,54.99,54.99,M2M,US,ccsn_direct_individual,2025-07-24T18:00:00.000Z,,PASS
632B3ADD940A7FBB7864AA5AD19B8D28,PpnQ-UmW9NBwZwXlFw79zw2JybhvwIUwMTDYiIlu5qI,7480,7480,M2M,JP,ccsn_direct_individual,2025-07-24T18:00:00.000Z,,PASS
```

## Error Handling

The script includes comprehensive error handling:

- **API Errors**: Detailed logging of HTTP status, headers, and response body
- **Missing Data**: Graceful handling of missing offers or prices
- **Environment**: Clear error messages for missing environment variables
- **File I/O**: Proper error handling for CSV read/write operations

## Troubleshooting

### "OST_TOKEN not found in environment variables"

Make sure your `../../.env` file contains:

```env
OST_TOKEN=your_token_here
```

### "Request failed with status: 401"

Your `OST_TOKEN` may be expired or invalid. Generate a new token.

### "No AOS price found"

The offer may not be available in the specified country or plan type combination.

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
  - `GET /offers` - Query offers with filters

### WCS (Web Commerce Service)

- **Endpoint**: `https://www.adobe.com`
- **Authentication**: API key in query params
- **Key APIs**:
  - `GET /web_commerce_artifact` - Get resolved offer with pricing

## Development

### Dependencies

The script requires the following npm packages (defined in `package.json`):

- **dotenv** (^16.4.5) - For loading environment variables from `.env` file

Install all dependencies with:

```bash
npm install
```

### Original Source

This script was converted from the Jupyter notebook: `offerTest-wcs.ipynb` and updated to run on Node.js instead of Deno.

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

## License

See the main project LICENSE file.

## Support

For issues or questions, contact the UPP team or create an issue in the repository.
