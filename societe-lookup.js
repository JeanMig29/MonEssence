#!/usr/bin/env node
/**
 * Serveur simple pour enrichir les stations via Société.com
 * Usage: node societe-lookup.js
 * 
 * Endpoints:
 *   POST /lookup { adresse, ville, cp }
 *     → { enseigne, siret, codeNaf }
 * 
 * Exemple:
 *   curl -X POST http://localhost:3001/lookup \
 *     -H "Content-Type: application/json" \
 *     -d '{"adresse":"Prom Leclerc","ville":"Paris","cp":"75001"}'
 */

const http = require('http');
const https = require('https');
const url = require('url');

const PORT = process.env.PORT || 3001;

function normalizeText(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .trim();
}

async function fetchPappersApi(adresse, ville, cp) {
  const papperKey = process.env.PAPPERS_API_KEY;
  if (!papperKey) return null;
  
  /**
   * API Pappers: https://www.pappers.fr/api
   * Cherche une entreprise par :
   *   - siret, siren, ou
   *   - dénomination + localité
   * 
   * Pour recherche adresse: utiliser endpoint /search
   */
  try {
    const searchQuery = `${adresse} ${cp}`.replace(/\s+/g, '+');
    const fetchUrl = `https://api.pappers.fr/v2/search?query=${searchQuery}&limit=1`;
    
    const options = {
      headers: {
        'Authorization': `Bearer ${papperKey}`,
        'Accept': 'application/json'
      },
      timeout: 3000
    };
    
    const response = await new Promise((resolve, reject) => {
      https.get(fetchUrl, options, resolve).on('error', reject);
    });
    
    if (response.statusCode !== 200) {
      console.log(`[Pappers] HTTP ${response.statusCode}`);
      return null;
    }
    
    let data = '';
    response.on('data', chunk => data += chunk);
    
    return new Promise((resolve) => {
      response.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.results && json.results.length > 0) {
            const company = json.results[0];
            console.log(`[Pappers] ✓ Trouvé: ${company.nom_entreprise} (${company.siret})`);
            resolve({
              enseigne: company.nom_entreprise,
              siret: company.siret,
              source: 'pappers',
              naf: company.code_naf
            });
          } else {
            resolve(null);
          }
        } catch (e) {
          console.error(`[Pappers] Parse error:`, e.message);
          resolve(null);
        }
      });
    });
  } catch (error) {
    console.error(`[Pappers] Error:`, error.message);
    return null;
  }
}

async function fetchFromSocietecom(adresse, ville, cp) {
  /**
   * Stratégie multi-source:
   * 1. Pappers (si clé API dispo)
   * 2. Patterns locaux (rapide, fiable)
   * 3. Rien ne matche → retour null
   */
  
  console.log(`[Lookup] Cherche: ${adresse}, ${cp} ${ville}`);
  
  // Essayer Pappers en premier (seule API payante mais officielle)
  const pappersResult = await fetchPappersApi(adresse, ville, cp);
  if (pappersResult) return pappersResult;
  
  // FALLBACK: patterns detection locaux (comme detectBrand du front)
  const query = normalizeText(`${adresse} ${ville}`);
  
  const brands = {
    leclerc: { name: 'E.Leclerc', logo: 'leclerc' },
    carrefour: { name: 'Carrefour', logo: 'carrefour' },
    intermarche: { name: 'Intermarché', logo: 'intermarche' },
    total: { name: 'TotalEnergies', logo: 'total' },
    esso: { name: 'Esso', logo: 'esso' },
    shell: { name: 'Shell', logo: 'shell' },
    lidl: { name: 'Lidl', logo: 'lidl' },
    cora: { name: 'Cora', logo: 'cora' },
    casino: { name: 'Casino', logo: 'casino' },
    systeme_u: { name: 'Système U', logo: 'u' },
  };
  
  for (const [key, brand] of Object.entries(brands)) {
    const pattern = key.replace(/_/g, '\\s*');
    if (new RegExp(`\\b${pattern}\\b`).test(query)) {
      return { enseigne: brand.name, brandKey: brand.logo, source: 'local-pattern' };
    }
  }
  
  return null;
}

async function handleRequest(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }
  
  const parsedUrl = url.parse(req.url, true);
  
  if (parsedUrl.pathname === '/lookup') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { adresse, ville, cp } = JSON.parse(body);
        const result = await fetchFromSocietecom(adresse, ville, cp);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result || { source: 'no-match' }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
}

const server = http.createServer(handleRequest);
server.listen(PORT, () => {
  console.log(`✓ Serveur Société.com lookup sur http://localhost:${PORT}`);
  console.log(`  POST /lookup { adresse, ville, cp }`);
  console.log(`\n⚠️  NOTE: Ce serveur utilise actuellement des patterns locaux.`);
  console.log(`  Pour un vrai lookup Société.com, intégrer:`);
  console.log(`    • Pappers API (payant): https://www.pappers.fr/api`);
  console.log(`    • infogreffe.fr SOAP (gratuit mais complexe)`);
  console.log(`    • Scraper Société.com (fragile, ToS)`);
});
