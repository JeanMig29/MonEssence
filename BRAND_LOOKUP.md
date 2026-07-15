# Serveur d'Enrichissement de Marques (Pappers/Société.com)

Ce serveur Node.js enrichit les stations essence avec les informations d'enseigne depuis Pappers (API payante) ou des patterns locaux.

## ⚙️ Installation

```bash
# Install dépendances (aucune par défaut - utilise Node.js natif)
npm init  # Facultatif, juste pour initialiser package.json

# Lancer le serveur
node societe-lookup.js
```

Serveur écoute par défaut sur: **http://localhost:3001**

## 🔑 Configuration Pappers (optionnel)

Si tu as une clé Pappers (https://www.pappers.fr/api):

```bash
PAPPERS_API_KEY="sk_..." node societe-lookup.js
```

Le serveur essaiera Pappers en priorité, puis fallback sur patterns locaux.

## 📍 Utilisation dans l'app

1. **Lance le serveur** (terminal séparé):
   ```bash
   node societe-lookup.js
   ```

2. **Dans l'app MonEssence**:
   - Ouvre les réglages (onglet "Réglages Gemini")
   - Secteur "Enrichissement marques (Pappers/Société.com)"
   - Saisis: `http://localhost:3001/lookup`
   - Clique sur "Tester la connexion"

3. **Les stations seront enrichies** avec logos et noms d'enseigne via:
   - Pappers (si clé dispo)
   - Patterns textes locaux (gratuit, immédiat)

## 🔌 API Endpoint

```bash
POST http://localhost:3001/lookup
Content-Type: application/json

{
  "adresse": "RN 94",
  "ville": "Montgenèvre", 
  "cp": "05100"
}
```

**Réponse:**
```json
{
  "enseigne": "E.Leclerc",
  "brandKey": "leclerc",
  "source": "local-pattern|pappers"
}
```

## 📊 Stratégie de lookup

1. **Pappers** (si clé API): cherche par adresse exacte + CP
2. **Patterns locaux**: match texte (Leclerc, Carrefour, etc.)
3. **Null**: pas de match

## ⚠️ Limitations

- **Pappers** est payant (~€900+/an)
- **Patterns locaux** couvrent ~80% des grandes chaînes, indépendants restent "Enseigne inconnue"
- **Société.com** n'a pas d'API libre officielle (scraping = fragile)
- **infogreffe** (RCS officiel) nécessite SOAP (complexe)

## 🚀 Améliorations futures

1. Intégrer infogreffe SOAP pour lookup RCS complet (gratuit)
2. Cache Redis en production
3. Batch requests pour performances
4. Scraper Société.com avec respect ToS (ou Pappers light)

## 🐛 Troubleshooting

- **Port 3001 déjà utilisé**: `PORT=3002 node societe-lookup.js`
- **CORS bloqué**: Serveur répond avec Access-Control headers, doit fonctionner
- **Timeout serveur**: Augmente le timeout dans index.html `// timeout: 2000`
