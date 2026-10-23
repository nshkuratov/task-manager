import { TIMEZONE_COOKIE } from "@/contracts/cookies";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Inline `<head>` script that stores the viewer's IANA time zone so server components can render
 * deadlines in it. It compares against the encoded value instead of decoding the stored one, so a
 * malformed cookie is rewritten rather than throwing a `URIError` before first paint. Free identifiers
 * are limited to `document`, `location`, `Intl` and `encodeURIComponent`.
 */
export const TIMEZONE_COOKIE_SCRIPT = `(function(){var n=${JSON.stringify(TIMEZONE_COOKIE)};var z=Intl.DateTimeFormat().resolvedOptions().timeZone;if(!z)return;var c=n+"="+encodeURIComponent(z);var p=document.cookie?document.cookie.split("; "):[];for(var i=0;i<p.length;i++){if(p[i]===c)return;}document.cookie=c+"; path=/; SameSite=Lax; max-age=${ONE_YEAR_SECONDS}"+(location.protocol==="https:"?"; Secure":"");})();`;

/** A server component on purpose: a script added by a client component does not run on client navigation. */
export function TimezoneCookieScript() {
  return <script dangerouslySetInnerHTML={{ __html: TIMEZONE_COOKIE_SCRIPT }} />;
}
