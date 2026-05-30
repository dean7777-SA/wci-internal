import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

/**
 * Detects Supabase auth hash fragments (#access_token=...&type=invite|recovery)
 * on any route and redirects to /reset-password so the user can set their password.
 */
export function HashRedirect() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    if (location.pathname === "/reset-password") return;

    if (hash.includes("type=invite") || hash.includes("type=recovery")) {
      navigate("/reset-password" + hash, { replace: true });
      return;
    }

    // Supabase error hashes (#error=access_denied&error_code=otp_expired...)
    if (hash.includes("error=")) {
      const params = new URLSearchParams(hash.slice(1));
      const errorCode = params.get("error_code") ?? params.get("error") ?? "link_invalid";
      navigate("/login?error=" + errorCode, { replace: true });
    }
  }, [location.pathname, navigate]);

  return null;
}
