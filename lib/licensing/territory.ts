/**
 * Reads the country code injected by Vercel's edge network.
 * Fail closed when geolocation is unavailable: licensed content must not
 * be exposed based on a guessed or client-supplied country.
 */
export function getVercelViewerCountry(headers: Headers): string | null {
  const country = headers.get("x-vercel-ip-country")?.trim().toUpperCase();
  return country && /^[A-Z]{2}$/.test(country) ? country : null;
}
