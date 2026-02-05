# Offer Test Scripts

Standalone Node.js scripts for testing Adobe Commerce offers. These tools help validate offer configurations, compare pricing, and generate test pages.

## Available Scripts

### 1. offerTest-wcs.js - Price Comparison Testing

Compares AOS (Adobe Offer Service) and WCS (Web Commerce Services) prices across different countries and plan types.

**Use when you need to:**
- ✅ Verify price consistency between AOS and WCS
- ✅ Automate price testing across multiple countries
- ✅ Generate CSV reports of price discrepancies
- ✅ Test specific plan type/country combinations

**Output:** CSV file with price comparison results

📖 [Read full documentation](./README-offerTest-wcs.md)

```bash
# Run the script
npm run test:wcs
# or
node offerTest-wcs.js
```

### 2. offerTest-web.js - Test Page Generator

Generates HTML test pages with merch cards and publishes them to Dark Alley for manual testing.

**Use when you need to:**
- ✅ Create test pages for manual browser testing
- ✅ Test offers in realistic page environments
- ✅ Share test pages with team members
- ✅ Validate merch card rendering across locales

**Output:** HTML pages published to Dark Alley with preview URLs

📖 [Read full documentation](./README-offerTest-web.md)

```bash
# Run the script
npm run test:web
# or
node offerTest-web.js
```

## Quick Start

### Installation

```bash
# 1. Navigate to the notebooks directory
cd tools/notebooks

# 2. Install dependencies
npm install

# 3. Configure environment variables
cat >> ../../.env << EOF
OST_TOKEN=your_ost_token_here
DA_TOKEN=your_da_token_here
EOF

# 4. Create your test configuration
cp offers-sample.csv offers.csv
# Edit offers.csv with your offer IDs
```

### Basic Usage

```bash
# Run WCS price comparison
npm run test:wcs

# Run web test page generator
npm run test:web
```

## Prerequisites

- **Node.js v18+** (required for native `fetch` support)
- **npm** package manager
- **Environment variables** in `../../.env`:
  - `OST_TOKEN` - Required for both scripts
  - `DA_TOKEN` - Required for web script only

Check your Node.js version:
```bash
node --version  # Should be >= v18.0.0
```

## Input File Format

Both scripts use the same CSV input format (`offers.csv`):

```csv
OFFER_ID,PLAN_TYPES,COUNTRIES
632B3ADD940A7FBB7864AA5AD19B8D28,M2M|ABM|PUF,US|JP
8DF6152F5D87E707D4712BCD23D09FE2,M2M,US|GB|FR|DE
758A90EA37A6282731592A76278E8546,ABM|PUF,ALL
```

### CSV Columns

| Column | Required | Description | Example |
|--------|----------|-------------|---------|
| `OFFER_ID` | Yes | Adobe offer ID | `632B3ADD940A7FBB7864AA5AD19B8D28` |
| `PLAN_TYPES` | No | Plan types to test (pipe-separated) | `M2M\|ABM\|PUF` or `ALL` |
| `COUNTRIES` | No | Countries to test (pipe-separated) | `US\|JP\|GB` or `ALL` |

### Plan Types

- **M2M** (Month-to-Month): Monthly commitment, monthly billing
- **ABM** (Annual Billed Monthly): Annual commitment, monthly billing
- **PUF** (Prepaid Upfront): Annual commitment, annual billing

## Feature Comparison

| Feature | WCS Script | Web Script |
|---------|------------|------------|
| Price comparison | ✅ | ❌ |
| CSV output | ✅ | ❌ |
| HTML generation | ❌ | ✅ |
| Dark Alley publishing | ❌ | ✅ |
| Requires DA_TOKEN | ❌ | ✅ |
| Best for | Automated testing | Manual testing |

## Common Configuration

Both scripts share these configuration options:

```javascript
// AOS Configuration
aosEndPoint: 'https://aos.adobe.io'
api_key: 'wcms-commerce-ims-user-prod'
environment: 'PROD'    // or 'STAGE'
landscape: 'DRAFT'      // or 'PUBLISHED'

// Input file
inputCsvFile: 'offers.csv'
```

## Example Workflows

### Workflow 1: Validate New Offers

```bash
# 1. Add offer IDs to offers.csv
echo "NEW_OFFER_ID,ALL,ALL" >> offers.csv

# 2. Run price comparison test
npm run test:wcs

# 3. Review results.csv for any price mismatches
cat results.csv | grep FAIL

# 4. Generate test pages for manual verification
npm run test:web

# 5. Review preview URLs in the console output
```

### Workflow 2: Test Specific Plan Type/Country Combination

```bash
# 1. Create targeted test configuration
cat > offers.csv << EOF
OFFER_ID,PLAN_TYPES,COUNTRIES
632B3ADD940A7FBB7864AA5AD19B8D28,M2M,US|JP
EOF

# 2. Run both tests
npm run test:wcs
npm run test:web
```

### Workflow 3: Comprehensive Offer Testing

```bash
# 1. Test all plan types and countries
cat > offers.csv << EOF
OFFER_ID,PLAN_TYPES,COUNTRIES
632B3ADD940A7FBB7864AA5AD19B8D28,ALL,ALL
EOF

# 2. Run price comparison
npm run test:wcs

# 3. Check for failures
grep FAIL results.csv || echo "All tests passed!"
```

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| `OST_TOKEN not found` | Add token to `../../.env` file |
| `DA_TOKEN not found` | Add token to `../../.env` file (web script only) |
| `Module not found` | Run `npm install` |
| `fetch is not defined` | Upgrade to Node.js v18+ |
| `Request failed with 401` | Refresh expired tokens in `.env` |

### Debug Mode

Enable detailed logging by checking console output. Both scripts provide:
- ✅ Step-by-step progress indicators
- ✅ Detailed error messages with HTTP status
- ✅ Response headers and body for failed requests
- ✅ Summary statistics at completion

### Getting Help

1. Check the script-specific README:
   - [WCS Script Documentation](./README-offerTest-wcs.md)
   - [Web Script Documentation](./README-offerTest-web.md)

2. Review the changes documentation:
   - [Conversion Notes](./CHANGES-offerTest.md)

3. Contact the UPP team for support

## Project Structure

```
tools/notebooks/
├── offerTest-wcs.js           # WCS price comparison script
├── offerTest-web.js           # Web test page generator
├── README-offerTest.md        # This file (overview)
├── README-offerTest-wcs.md    # WCS script documentation
├── README-offerTest-web.md    # Web script documentation
├── CHANGES-offerTest.md       # Conversion notes
├── package.json               # Node.js dependencies
├── offers.csv                 # Input test configurations (create this)
├── offers-sample.csv          # Sample input file
└── results.csv                # Output from WCS script (generated)
```

## Dependencies

Managed via npm (defined in `package.json`):

- **dotenv** (^16.4.5) - Environment variable loading
- **form-data** (^4.0.0) - Multipart form data for uploads

Install with:
```bash
npm install
```

## Development

### Adding New Plan Types

Edit both scripts to add the plan type definition:

```javascript
const PLAN_TYPES = {
  M2M: { commitment: 'MONTH', term: 'MONTHLY' },
  ABM: { commitment: 'YEAR', term: 'MONTHLY' },
  PUF: { commitment: 'YEAR', term: 'ANNUAL' },
  // Add your new plan type
  QUARTERLY: { commitment: 'YEAR', term: 'QUARTERLY' },
};

const ALL_PLAN_TYPES = ['M2M', 'ABM', 'PUF', 'QUARTERLY'];
```

### Customizing Configuration

Each script has a `CONFIG` object at the top that can be modified:

```javascript
const CONFIG = {
  aosEndPoint: 'https://aos.adobe.io',
  api_key: 'wcms-commerce-ims-user-prod',
  environment: 'PROD',
  landscape: 'DRAFT',
  // ... more options
};
```

### Original Sources

These scripts were converted from Jupyter notebooks:
- `offerTest-wcs.ipynb` → `offerTest-wcs.js`
- `offerTest-web.ipynb` → `offerTest-web.js`

The notebooks remain available for interactive development.

## License

See the main project LICENSE file.

## Version History

- **v1.0.0** (2026-02-01) - Initial Node.js conversion from Deno notebooks

## Contributing

When modifying these scripts:

1. Update the relevant README file
2. Test with sample offers
3. Update version in package.json
4. Document breaking changes in CHANGES-offerTest.md

## Support

For issues, questions, or feature requests:
- Contact the UPP team
- Review documentation files
- Check troubleshooting sections

---

**Quick Links:**
- [WCS Script Docs](./README-offerTest-wcs.md) | [Web Script Docs](./README-offerTest-web.md) | [Changes](./CHANGES-offerTest.md)
