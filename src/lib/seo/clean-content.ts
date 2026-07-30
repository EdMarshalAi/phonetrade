const INJECTED_SEO_BLOCK =
  /\s*<!--seo-kw-->[\s\S]*?<!--\/seo-kw-->\s*/giu;

/**
 * Removes the June 2026 search-keyword append while preserving the authored
 * product/category copy around it. The marker makes the rollback deterministic:
 * no unmarked editorial content is changed.
 */
export function stripInjectedSeoBlocks(
  value: string | null | undefined
): string {
  return String(value ?? "")
    .replace(INJECTED_SEO_BLOCK, "\n")
    .trim();
}
