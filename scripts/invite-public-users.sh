#!/usr/bin/env bash
# One-time script: invite the 5 public users with redirect → wallcoverings.co.za
# Run from anywhere: bash scripts/invite-public-users.sh

PROJECT_URL="https://ufjvcpshkmrdqayjrwkh.supabase.co"
# Export this before running: export SUPABASE_SERVICE_KEY="your-service-role-key"
SERVICE_KEY="${SUPABASE_SERVICE_KEY:?SUPABASE_SERVICE_KEY env var is not set}"
REDIRECT="https://www.wallcoverings.co.za"

invite() {
  local EMAIL="$1"
  local NAME="$2"
  echo "Inviting $EMAIL..."
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    "${PROJECT_URL}/auth/v1/invite" \
    -H "apikey: ${SERVICE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${EMAIL}\",\"redirect_to\":\"${REDIRECT}\",\"data\":{\"full_name\":\"${NAME}\",\"context\":\"existing_client\"}}")

  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | head -n -1)

  if [[ "$HTTP_CODE" == "200" ]]; then
    echo "  ✓ Invite sent"
  else
    echo "  ✗ Failed (HTTP $HTTP_CODE): $BODY"
  fi
  echo
}

invite "baranuinteriors@gmail.com"   "Tertia du Plessis"
invite "jamiedakotaambrosy@gmail.com" "Jamie Ambrosy"
invite "roughdiamond.sales@gmail.com" "Tshidi Gule"
invite "shonisani@blharch.co.za"     "Shonisani Ndou"
invite "sohini.nana@gmail.com"       "Sohini Bhavanbhai"

echo "Done. After each user accepts their invite and appears in auth.users,"
echo "run the UUID re-link SQL from the phase4-user-migration.md memory file."
