#!/usr/bin/env bash
# One-time script: invite team members with redirect → wci-internal
# Run from anywhere: bash scripts/invite-team-members.sh

PROJECT_URL="https://ufjvcpshkmrdqayjrwkh.supabase.co"
# Export this before running: export SUPABASE_SERVICE_KEY="your-service-role-key"
SERVICE_KEY="${SUPABASE_SERVICE_KEY:?SUPABASE_SERVICE_KEY env var is not set}"
REDIRECT="https://wci-internal.vercel.app"

invite() {
  local EMAIL="$1"
  local NAME="$2"
  echo "Inviting $EMAIL..."
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    "${PROJECT_URL}/auth/v1/invite" \
    -H "apikey: ${SERVICE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${EMAIL}\",\"redirect_to\":\"${REDIRECT}\",\"data\":{\"full_name\":\"${NAME}\",\"context\":\"team\"}}")

  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | head -n -1)

  if [[ "$HTTP_CODE" == "200" ]]; then
    echo "  ✓ Invite sent"
  else
    echo "  ✗ Failed (HTTP $HTTP_CODE): $BODY"
  fi
  echo
}

# Note: dean@wallcoverings.co.za uses the same email as an imported profile.
# After they accept + appear in auth.users, run the UUID re-link SQL.
invite "dean@wallcoverings.co.za"        "Dean Bassett"
invite "alana@wallcoverings.co.za"       "Alana Lai Wing"
invite "amelia@wallcoverings.co.za"      "Amelia Schreuder"
invite "michael@wallcoverings.co.za"     "Michael Nemusunda"
invite "gavin@wallcoverings.co.za"       "Gavin Bassett"
invite "lorraine@wallcoverings.co.za"    "Lorraine Rode"
invite "felicity@wallcoverings.co.za"    "Felicity Bassett"
invite "amelia@urbandigitalprinting.com" "Amelia Schreuder"

echo "Done. After each person accepts their invite and appears in auth.users,"
echo "run the UUID re-link SQL from the phase4-user-migration.md memory file."
