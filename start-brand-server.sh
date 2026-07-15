#!/bin/bash
# Lanceur du serveur brand lookup avec support Pappers
set -e

PORT=${PORT:-3001}
API_KEY=${PAPPERS_API_KEY:-}

if [ -z "$API_KEY" ]; then
  echo "ℹ️  Lancement sans clé Pappers (patterns locaux seul)"
  echo "   Pour Pappers: PAPPERS_API_KEY=sk_... bash start-brand-server.sh"
else
  echo "✓ Utilisation Pappers API"
fi

echo ""
echo "🚀 Serveur écoute sur http://localhost:$PORT"
echo ""
echo "Depuis MonEssence:"
echo "  1. Réglages → Enrichissement marques"
echo "  2. Saisis: http://localhost:$PORT/lookup"
echo "  3. Clique Tester la connexion"
echo ""

exec env PORT=$PORT PAPPERS_API_KEY="$API_KEY" node "$(dirname "$0")/societe-lookup.js"
