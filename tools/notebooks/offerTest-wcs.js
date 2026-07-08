#!/usr/bin/env node

/**
 * WCS Offer Test Script
 * 
 * This script tests Adobe Commerce WCS (Web Commerce Services) offers by:
 * 1. Reading offer test configurations from a CSV file (offer ID, plan types, countries)
 * 2. Fetching offer details from AOS (Adobe Offer Service)
 * 3. Getting offer selector IDs for specified plan types
 * 4. Comparing prices between AOS and WCS across specified countries
 * 5. Outputting test results to a CSV file
 * 
 * Input CSV Format:
 *   OFFER_ID,PLAN_TYPES,COUNTRIES
 *   632B3ADD940A7FBB7864AA5AD19B8D28,M2M|ABM|PUF,US|JP
 *   8DF6152F5D87E707D4712BCD23D09FE2,M2M,US|GB|FR
 * 
 * - PLAN_TYPES: Pipe-separated list of plan types (M2M, ABM, PUF) or ALL
 * - COUNTRIES: Pipe-separated list of country codes or ALL
 */

import { readFile, writeFile } from 'fs/promises';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  aosEndPoint: 'https://aos.adobe.io',
  wcsEndPoint: 'https://www.adobe.com',
  api_key: 'wcms-commerce-ims-user-prod',
  environment: 'PROD',
  landscape: 'DRAFT', // or 'PUBLISHED'
  
  // Input/Output files
  inputCsvFile: 'offers.csv',
  outputCsvFile: 'results.csv',
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

/**
 * Write array of objects to CSV file
 */
async function writeCsv(filename, data) {
  if (data.length === 0) {
    console.warn('⚠ No data to write to CSV');
    return;
  }
  const filePath = join(__dirname, filename);
  const headers = Object.keys(data[0]);
  const csvHeader = headers.join(',');
  const csvRows = data.map(row => headers.map(h => row[h] ?? '').join(','));
  await writeFile(filePath, csvHeader + '\n' + csvRows.join('\n'), 'utf-8');
  console.log(`✓ Results written to ${filename}`);
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
 * Get price from AOS for a specific country and plan type
 */
async function getAosPrice(offer, country, planType, apiKey) {
  const params = {
    arrangement_code: offer.product_arrangement_code,
    buying_program: offer.buying_program,
    country,
    customer_segment: offer.customer_segment,
    language: offer.language,
    market_segment: offer.market_segments[0],
    merchant: offer.merchant,
    offer_type: offer.offer_type,
    price_point: offer.price_point,
    sales_channel: offer.sales_channel,
    commitment: PLAN_TYPES[planType].commitment,
    term: PLAN_TYPES[planType].term,
    api_key: apiKey,
    environment: CONFIG.environment,
    landscape: CONFIG.landscape,
    service_providers: 'PRICING',
    page: 0,
    page_size: 1000
  };
  
  const queryString = new URLSearchParams(params).toString();
  const url = new URL(`offers?${queryString}`, CONFIG.aosEndPoint).toString();
  
  const response = await fetch(url, {
    headers: { 'X-Api-Key': apiKey }
  });
  
  if (!response.ok) {
    await logError(response);
    return null;
  }
  
  const details = await response.json();
  
  if (details.length === 0) {
    return null;
  } else if (details.length > 1) {
    console.log(`⚠ Multiple offers found for ${offer.offer_id} ${country} ${planType}`);
  }
  
  return details[0].pricing;
}

/**
 * Get offer from WCS by offer selector ID and country
 */
async function getWcsOffer(offerSelectorId, country) {
  const params = {
    offer_selector_ids: offerSelectorId,
    country,
    landscape: CONFIG.landscape,
    api_key: 'wcms-commerce-ims-ro-user-milo',
    language: 'MULT'
  };
  
  const queryString = new URLSearchParams(params).toString();
  const url = new URL(`web_commerce_artifact?${queryString}`, CONFIG.wcsEndPoint).toString();
  
  const response = await fetch(url);
  
  if (!response.ok) {
    await logError(response);
    return null;
  }
  
  const artifact = await response.json();
  
  if (artifact.resolvedOffers.length === 0) {
    return null;
  } else if (artifact.resolvedOffers.length > 1) {
    console.log(`⚠ Multiple WCS offers found for ${offerSelectorId} ${country}`);
  }
  
  return artifact.resolvedOffers[0];
}

// ============================================================================
// Main Test Logic
// ============================================================================

/**
 * Run offer tests comparing AOS and WCS prices
 */
async function runOfferTests(testConfigs, apiKey, token) {
  const results = [];
  let testCount = 0;
  let passCount = 0;
  let failCount = 0;
  let skipCount = 0;
  
  console.log('\n=== Starting Offer Tests ===\n');
  
  for (const config of testConfigs) {
    console.log(`Testing offer: ${config.OFFER_ID}`);
    console.log(`  Plan types: ${config.planTypes.join(', ')}`);
    console.log(`  Countries: ${config.countries === 'ALL' ? 'ALL' : config.countries.join(', ')}`);
    
    // Get offer details from AOS
    const offer = await getOfferDetails(config.OFFER_ID, apiKey);
    if (!offer) {
      console.log(`✗ Skipping ${config.OFFER_ID} - could not fetch details\n`);
      continue;
    }
    
    // Determine countries to test for this offer
    let countries = config.countries;
    if (countries === 'ALL') {
      countries = offer.countries;
      console.log(`  Testing all ${countries.length} countries available for this offer`);
    }
    
    // Test each plan type specified in the CSV
    for (const planType of config.planTypes) {
      console.log(`\n  Plan Type: ${planType}`);
      
      // Get offer selector ID
      const offerSelector = await getOfferSelectorId(offer, planType, apiKey, token);
      if (!offerSelector) {
        console.log(`  ✗ Could not get offer selector for ${planType}`);
        continue;
      }
      console.log(`  ✓ Offer Selector ID: ${offerSelector.id}`);
      
      // Test each country
      for (const country of countries) {
        testCount++;
        console.log(`    Testing ${country}...`, '');
        
        // Get AOS price
        const aosPrice = await getAosPrice(offer, country, planType, apiKey);
        if (!aosPrice || aosPrice.prices.length === 0) {
          skipCount++;
          console.log(`✗ No AOS price found`);
          continue;
        }
        
        const aosPriceDisplay = aosPrice.prices[0].price_details.display_rules.price;
        
        // Get WCS price
        const wcsOffer = await getWcsOffer(offerSelector.id, country);
        if (!wcsOffer) {
          skipCount++;
          console.log(`✗ No WCS offer found`);
          continue;
        }
        
        const wcsPriceDisplay = wcsOffer.priceDetails.price;
        
        // Compare prices
        const passed = aosPriceDisplay === wcsPriceDisplay;
        const status = passed ? 'PASS' : 'FAIL';
        
        if (passed) {
          passCount++;
          console.log(`✓ ${status}: ${wcsPriceDisplay}`);
        } else {
          failCount++;
          console.log(`✗ ${status}: AOS=${aosPriceDisplay}, WCS=${wcsPriceDisplay}`);
        }
        
        // Store result
        results.push({
          offer_id: offer.offer_id,
          osi: offerSelector.id,
          aos_price: aosPriceDisplay,
          wcs_price: wcsPriceDisplay,
          plan_type: planType,
          country,
          product_arrangement_code: offer.product_arrangement_code,
          start_date: wcsOffer.startDate || '',
          end_date: wcsOffer.endDate || '',
          status
        });
      }
    }
    console.log('');
  }
  
  // Print summary
  console.log('=== Test Summary ===');
  console.log(`Total Tests: ${testCount}`);
  console.log(`Passed: ${passCount} (${testCount > 0 ? Math.round(passCount/testCount*100) : 0}%)`);
  console.log(`Failed: ${failCount} (${testCount > 0 ? Math.round(failCount/testCount*100) : 0}%)`);
  console.log(`Skipped: ${skipCount} (no price data available)`);
  console.log('');
  
  return results;
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main() {
  try {
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║         WCS Offer Test Script                                 ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
    
    // Load environment variables
    loadEnv();
    const token = process.env.OST_TOKEN;
    if (!token) {
      throw new Error('OST_TOKEN not found in environment variables');
    }
    
    // Read input CSV
    console.log(`📄 Reading test configurations from ${CONFIG.inputCsvFile}...`);
    const testConfigs = await readCsv(CONFIG.inputCsvFile);
    console.log(`✓ Found ${testConfigs.length} test configuration(s)`);
    
    // Validate test configurations
    const validConfigs = testConfigs.filter(config => {
      if (!config.OFFER_ID) {
        console.warn(`⚠ Skipping row without OFFER_ID`);
        return false;
      }
      if (config.planTypes.length === 0) {
        console.warn(`⚠ Skipping offer ${config.OFFER_ID} - no valid plan types`);
        return false;
      }
      return true;
    });
    
    if (validConfigs.length === 0) {
      throw new Error('No valid test configurations found in input CSV');
    }
    
    console.log(`✓ ${validConfigs.length} valid configuration(s) ready to test`);
    
    // Run tests
    const results = await runOfferTests(validConfigs, CONFIG.api_key, token);
    
    // Write results
    if (results.length > 0) {
      await writeCsv(CONFIG.outputCsvFile, results);
      console.log(`✓ Test complete! Results saved to ${CONFIG.outputCsvFile}`);
    } else {
      console.log('⚠ No test results to save');
    }
    
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
