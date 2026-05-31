#!/usr/bin/env bash
# Send migration notice emails to all affected users after Phase 4.
# Users are told to re-register on the appropriate site.
#
# Usage:
#   export SUPABASE_SERVICE_KEY="your-service-role-key"
#   bash scripts/send-migration-notices.sh

set -euo pipefail

FUNCTION_URL="https://ufjvcpshkmrdqayjrwkh.supabase.co/functions/v1/send-transactional-email"
PUBLIC_URL="https://www.wallcoverings.co.za"
TEAM_URL="https://wci-internal.vercel.app"

send_notice() {
  local EMAIL="$1"
  local NAME="$2"
  local CONTEXT="$3"
  local REGISTER_URL="$4"

  echo "Sending migration notice to ${EMAIL} (${CONTEXT})..."

  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${FUNCTION_URL}" \
    -H "Content-Type: application/json" \
    -d "{
      \"templateName\": \"migration-notice\",
      \"recipientEmail\": \"${EMAIL}\",
      \"templateData\": {
        \"recipientName\": \"${NAME}\",
        \"context\": \"${CONTEXT}\",
        \"registerUrl\": \"${REGISTER_URL}\"
      }
    }")

  if [[ "$RESPONSE" == "200" || "$RESPONSE" == "201" ]]; then
    echo "  ✓ Sent (HTTP ${RESPONSE})"
  else
    echo "  ✗ Failed (HTTP ${RESPONSE})"
  fi
}

echo "========================================"
echo " PUBLIC USERS — register at wallcoverings.co.za"
echo "========================================"
send_notice "baranuinteriors@gmail.com"    "Tertia du Plessis"      "public" "$PUBLIC_URL"
send_notice "jamiedakotaambrosy@gmail.com" "Jamie Ambrosy"          "public" "$PUBLIC_URL"
send_notice "roughdiamond.sales@gmail.com" "Tshidi Gule"            "public" "$PUBLIC_URL"
send_notice "shonisani@blharch.co.za"     "Shonisani Ndou"         "public" "$PUBLIC_URL"
send_notice "sohini.nana@gmail.com"       "Sohini Bhavanbhai"      "public" "$PUBLIC_URL"

echo ""
echo "========================================"
echo " TEAM MEMBERS — register at wci-internal.vercel.app"
echo "========================================"
send_notice "alana@wallcoverings.co.za"         "Alana"             "team" "$TEAM_URL"
send_notice "amelia@wallcoverings.co.za"        "Amelia"            "team" "$TEAM_URL"
send_notice "michael@wallcoverings.co.za"       "Michael"           "team" "$TEAM_URL"
send_notice "gavin@wallcoverings.co.za"         "Gavin"             "team" "$TEAM_URL"
send_notice "lorraine@wallcoverings.co.za"      "Lorraine"          "team" "$TEAM_URL"
send_notice "felicity@wallcoverings.co.za"      "Felicity"          "team" "$TEAM_URL"
send_notice "amelia@urbandigitalprinting.com"   "Amelia"            "team" "$TEAM_URL"

echo ""
echo "Done."
