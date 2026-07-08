#!/usr/bin/env node

/**
 * Web Offer Test Script
 * 
 * This script creates HTML test pages for Adobe Commerce offers by:
 * 1. Reading offer test configurations from a CSV file
 * 2. Fetching offer details from AOS (Adobe Offer Service)
 * 3. Getting offer selector IDs for specified plan types
 * 4. Generating HTML pages with merch cards for testing
 * 5. Publishing the pages to Dark Alley (DA) for different countries
 * 
 * Input CSV Format:
 *   OFFER_ID,PLAN_TYPES,COUNTRIES
 *   632B3ADD940A7FBB7864AA5AD19B8D28,M2M|ABM|PUF,US|JP
 *   8DF6152F5D87E707D4712BCD23D09FE2,M2M,US|GB|FR
 * 
 * - PLAN_TYPES: Pipe-separated list of plan types (M2M, ABM, PUF) or ALL
 * - COUNTRIES: Pipe-separated list of country codes or ALL
 */

import { readFile } from 'fs/promises';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import FormData from 'form-data';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  // AOS Configuration
  aosEndPoint: 'https://aos.adobe.io',
  api_key: 'wcms-commerce-ims-user-prod',
  environment: 'PROD',
  landscape: 'DRAFT', // or 'PUBLISHED'
  
  // Dark Alley Configuration
  daEndPoint: 'https://admin.da.live',
  org: 'adobecom',
  site: 'upp',
  
  // Page Configuration
  pagePath: '/drafts/tsay/offer-test.html',
  
  // Input files
  inputCsvFile: 'offers.csv',
};

const PLAN_TYPES = {
  M2M: {
    commitment: 'MONTH',
    term: 'MONTHLY',
  },
  ABM: {
    commitment: 'YEAR',
    term: 'MONTHLY',
  },
  PUF: {
    commitment: 'YEAR',
    term: 'ANNUAL',
  }
};

const ALL_PLAN_TYPES = ['M2M', 'ABM', 'PUF'];

// HTML template for merch cards
const MERCH_CARD_TEMPLATE = `        
  <div class="merch-card product">
    <div>
      <div>
        <h3>{{product_arrangement_code}}</h3>
        <h3>{{customer_segment}} – {{commitment}} - {{term}} ({{planType}})<br><a href="https://milo.adobe.com/tools/ost?osi={{SelectorId}}&#x26;type=price">PRICE - {{term}} - {{product_code}}</a></h3>
        <p>Offer ID: {{offerId}}</p>
        <p><a href="https://milo.adobe.com/tools/ost?osi={{SelectorId}}&#x26;type=checkoutUrl&#x26;text=buy-now&#x26;workflowStep=commitment">CTA {{buy-now}}</a></p>
      </div>
    </div>
  </div>`;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Load environment variables from .env file
 */
function loadEnv() {
  const envPath = join(__dirname, '../../.env');
  try {
    config({ path: envPath, override: true });
    console.log('✓ Environment variables loaded successfully');
  } catch (error) {
    console.error('✗ Error loading environment variables:', error.message);
    throw error;
  }
}

/**
 * Log detailed error information from API responses
 */
async function logError(response) {
  console.error(`✗ Request failed with status: ${response.status} ${response.statusText}`);
  console.error('Response Headers:');
  for (const [key, value] of response.headers.entries()) {
    console.error(`  ${key}: ${value}`);
  }
  const errorData = await response.text();
  console.error('Error Response Body:', errorData);
}

/**
 * Read CSV file and convert to array of test configuration objects
 */
async function readCsv(filename) {
  const filePath = join(__dirname, filename);
  const csv = await readFile(filePath, 'utf-8');
  const rows = csv.split('\n').filter(row => row.trim());
  
  if (rows.length === 0) {
    throw new Error('CSV file is empty');
  }
  
  const headers = rows[0].split(',').map(h => h.trim());
  const data = rows.slice(1).map(row => row.split(','));
  
  return data.map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index]?.trim() || '';
    });
    
    // Parse PLAN_TYPES (pipe-separated or ALL)
    if (obj.PLAN_TYPES) {
      if (obj.PLAN_TYPES.toUpperCase() === 'ALL') {
        obj.planTypes = ALL_PLAN_TYPES;
      } else {
        obj.planTypes = obj.PLAN_TYPES.split('|').map(p => p.trim()).filter(p => p);
      }
    } else {
      obj.planTypes = ALL_PLAN_TYPES;
    }
    
    // Parse COUNTRIES (pipe-separated or ALL)
    if (obj.COUNTRIES) {
      if (obj.COUNTRIES.toUpperCase() === 'ALL') {
        obj.countries = 'ALL'; // Will be replaced with offer's countries later
      } else {
        obj.countries = obj.COUNTRIES.split('|').map(c => c.trim()).filter(c => c);
      }
    } else {
      obj.countries = 'ALL';
    }
    
    // Validate plan types
    obj.planTypes = obj.planTypes.filter(pt => {
      if (!PLAN_TYPES[pt]) {
        console.warn(`⚠ Unknown plan type '${pt}' in offer ${obj.OFFER_ID}, skipping`);
        return false;
      }
      return true;
    });
    
    return obj;
  }).filter(obj => obj.OFFER_ID); // Filter out rows without offer ID
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Get offer details from AOS by offer ID
 */
async function getOfferDetails(offerId, apiKey) {
  const params = {
    environment: CONFIG.environment,
    landscape: CONFIG.landscape,
    api_key: apiKey,
  };
  const queryString = new URLSearchParams(params).toString();
  const url = new URL(`offers/${offerId}?${queryString}`, CONFIG.aosEndPoint).toString();
  
  const response = await fetch(url, {
    headers: { 'X-Api-Key': apiKey }
  });
  
  if (!response.ok) {
    await logError(response);
    return null;
  }
  
  const details = await response.json();
  
  if (details.length === 0) {
    console.log(`✗ ${offerId} has no offers`);
    return null;
  } else if (details.length > 1) {
    console.log(`⚠ ${offerId} has multiple offers, using first one`);
  }
  
  return details[0];
}

/**
 * Get offer selector ID from AOS
 */
async function getOfferSelectorId(offer, planType, apiKey, token) {
  const params = { api_key: apiKey };
  const body = {
    buying_program: offer.buying_program,
    commitment: PLAN_TYPES[planType].commitment,
    customer_segment: offer.customer_segment,
    market_segment: offer.market_segments[0],
    merchant: offer.merchant,
    offer_type: offer.offer_type,
    price_point: offer.price_point,
    product_arrangement_code: offer.product_arrangement_code,
    sales_channel: offer.sales_channel,
    term: PLAN_TYPES[planType].term,
  };
  
  const queryString = new URLSearchParams(params).toString();
  const url = new URL(`offer_selectors?${queryString}`, CONFIG.aosEndPoint).toString();
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'X-Api-Key': apiKey,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    await logError(response);
    return null;
  }
  
  return await response.json();
}

/**
 * Publish HTML page to Dark Alley
 */
async function publishToDarkAlley(country, htmlContent, daToken) {
  const basename = CONFIG.pagePath.split('/').pop();
  let locale = country.toLowerCase();
  locale = locale === 'us' ? '' : `/${locale}`;
  
  const url = new URL(
    `source/${CONFIG.org}/${CONFIG.site}${locale}${CONFIG.pagePath}`,
    CONFIG.daEndPoint
  ).toString();
  
  const formData = new FormData();
  formData.append('data', Buffer.from(htmlContent), {
    filename: basename,
    contentType: 'text/html',
  });
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${daToken}`,
      ...formData.getHeaders(),
    },
    body: formData,
  });
  
  if (!response.ok) {
    await logError(response);
    throw new Error(`Failed to publish page for ${country}`);
  }
  
  return await response.json();
}

// ============================================================================
// Main Test Logic
// ============================================================================

/**
 * Generate HTML content for a country's test page
 */
function generateHtmlPage(merchCards) {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Offer Test Page</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .merch-card { border: 1px solid #ccc; padding: 15px; margin: 10px 0; border-radius: 5px; }
    .merch-card h3 { margin: 5px 0; color: #333; }
    .merch-card p { margin: 5px 0; }
    .merch-card a { color: #1473e6; text-decoration: none; }
    .merch-card a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <main>
    <div>
${merchCards}
    </div>
  </main>
</body>
</html>`;
}

/**
 * Create merch card HTML from template
 */
function createMerchCard(offer, planType, offerSelectorId) {
  return MERCH_CARD_TEMPLATE
    .replaceAll('{{product_arrangement_code}}', offer.product_arrangement_code)
    .replaceAll('{{customer_segment}}', offer.customer_segment)
    .replaceAll('{{term}}', offer.term)
    .replaceAll('{{commitment}}', offer.commitment)
    .replaceAll('{{offerId}}', offer.offer_id)
    .replaceAll('{{SelectorId}}', offerSelectorId)
    .replaceAll('{{planType}}', planType)
    .replaceAll('{{product_code}}', offer.product_code || 'N/A');
}

/**
 * Process offers and generate test pages
 */
async function processOffers(testConfigs, apiKey, ostToken, daToken) {
  console.log('\n=== Processing Offers ===\n');
  
  const pages = {}; // country -> HTML content
  
  for (const config of testConfigs) {
    console.log(`Processing offer: ${config.OFFER_ID}`);
    console.log(`  Plan types: ${config.planTypes.join(', ')}`);
    console.log(`  Countries: ${config.countries === 'ALL' ? 'ALL' : config.countries.join(', ')}`);
    
    // Get offer details from AOS
    const offer = await getOfferDetails(config.OFFER_ID, apiKey);
    if (!offer) {
      console.log(`✗ Skipping ${config.OFFER_ID} - could not fetch details\n`);
      continue;
    }
    
    console.log(`✓ Retrieved offer details: ${offer.product_arrangement_code}`);
    
    // Determine countries to test
    let countries = config.countries;
    if (countries === 'ALL') {
      countries = offer.countries;
      console.log(`  Using all ${countries.length} countries from offer`);
    }
    
    // Get offer selectors for each plan type
    const offerSelectors = {};
    for (const planType of config.planTypes) {
      console.log(`  Getting offer selector for ${planType}...`);
      const offerSelector = await getOfferSelectorId(offer, planType, apiKey, ostToken);
      if (!offerSelector) {
        console.log(`  ✗ Could not get offer selector for ${planType}`);
        continue;
      }
      offerSelectors[planType] = offerSelector;
      console.log(`  ✓ Offer Selector ID: ${offerSelector.id}`);
    }
    
    // Generate HTML for each country
    for (const country of countries) {
      if (!pages[country]) {
        pages[country] = '';
      }
      
      for (const planType of config.planTypes) {
        if (!offerSelectors[planType]) continue;
        
        const offerWithPlan = { ...offer, ...PLAN_TYPES[planType] };
        const merchCard = createMerchCard(
          offerWithPlan,
          planType,
          offerSelectors[planType].id
        );
        pages[country] += merchCard;
      }
    }
    
    console.log(`✓ Generated merch cards for ${countries.length} country/countries\n`);
  }
  
  return pages;
}

/**
 * Publish all pages to Dark Alley
 */
async function publishPages(pages, daToken) {
  console.log('\n=== Publishing Pages to Dark Alley ===\n');
  
  const results = [];
  
  for (const [country, merchCards] of Object.entries(pages)) {
    console.log(`Publishing test page for ${country}...`);
    
    const htmlContent = generateHtmlPage(merchCards);
    
    try {
      const result = await publishToDarkAlley(country, htmlContent, daToken);
      console.log(`✓ Published successfully`);
      console.log(`  Edit URL: ${result.source.editUrl}`);
      console.log(`  Preview URL: ${result.aem.previewUrl}`);
      console.log(`  Live URL: ${result.aem.liveUrl}\n`);
      
      results.push({
        country,
        ...result,
      });
    } catch (error) {
      console.error(`✗ Failed to publish page for ${country}: ${error.message}\n`);
    }
  }
  
  return results;
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main() {
  try {
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║         Web Offer Test Script                                 ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
    
    // Load environment variables
    loadEnv();
    const ostToken = process.env.OST_TOKEN;
    const daToken = process.env.DA_TOKEN;
    
    if (!ostToken) {
      throw new Error('OST_TOKEN not found in environment variables');
    }
    if (!daToken) {
      throw new Error('DA_TOKEN not found in environment variables');
    }
    
    // Read input CSV
    console.log(`📄 Reading test configurations from ${CONFIG.inputCsvFile}...`);
    const testConfigs = await readCsv(CONFIG.inputCsvFile);
    console.log(`✓ Found ${testConfigs.length} test configuration(s)`);
    
    // Validate test configurations
    const validConfigs = testConfigs.filter(testConfig => {
      if (!testConfig.OFFER_ID) {
        console.warn(`⚠ Skipping row without OFFER_ID`);
        return false;
      }
      if (testConfig.planTypes.length === 0) {
        console.warn(`⚠ Skipping offer ${testConfig.OFFER_ID} - no valid plan types`);
        return false;
      }
      return true;
    });
    
    if (validConfigs.length === 0) {
      throw new Error('No valid test configurations found in input CSV');
    }
    
    console.log(`✓ ${validConfigs.length} valid configuration(s) ready to process`);
    
    // Process offers and generate pages
    const pages = await processOffers(validConfigs, CONFIG.api_key, ostToken, daToken);
    
    if (Object.keys(pages).length === 0) {
      console.log('⚠ No pages generated');
      return;
    }
    
    console.log(`✓ Generated ${Object.keys(pages).length} test page(s)`);
    
    // Publish pages to Dark Alley
    const results = await publishPages(pages, daToken);
    
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║         Summary                                               ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
    console.log(`Total pages published: ${results.length}`);
    console.log('\nTest pages:');
    results.forEach(result => {
      console.log(`  ${result.country}: ${result.aem.previewUrl}`);
    });
    console.log('\n✓ Test complete!');
    
  } catch (error) {
    console.error('\n✗ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
