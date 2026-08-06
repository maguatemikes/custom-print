/**
 * Read the public request origin exposed by the root loader, so route `meta`
 * functions can build **absolute** canonical / og:url values (Lighthouse and
 * social scrapers require absolute URLs — relative ones fail the SEO audit).
 *
 * Usage in a route meta:
 *   export const meta = ({data, matches}) => {
 *     const url = `${siteOrigin(matches)}/collections/all`;
 *     ...
 *   };
 *
 * Falls back to '' (relative) if the root data isn't available.
 */
export function siteOrigin(matches: ReadonlyArray<unknown>): string {
  const root = matches.find(
    (m): m is {id: string; data?: unknown} =>
      !!m &&
      typeof m === 'object' &&
      (m as {id?: unknown}).id === 'root',
  );
  const data = root?.data as {origin?: string} | undefined;
  return data?.origin ?? '';
}
