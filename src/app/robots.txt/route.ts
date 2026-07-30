/**
 * Keep robots.txt as an explicit Route Handler instead of a static metadata
 * file. Production returned the previous static file body with HTTP 404 and a
 * one-year shared cache, which made Yandex Webmaster treat robots.txt as
 * missing. Clean-param is Yandex-specific and is not supported by
 * MetadataRoute.Robots, so the response stays plain text.
 */
export const dynamic = "force-dynamic";

export const ROBOTS_TEXT = `User-agent: Yandex
Allow: /
Disallow: /admin
Clean-param: color&memory&sort&model&sim&condition&min&max&battery
Clean-param: utm_source&utm_medium&utm_campaign&utm_term&utm_content&yclid&gclid&from
Clean-param: page&etext&url&butrub&tubl&tuble&tuble3&phone&teh&aks&w&q&tubl6

User-agent: GPTBot
User-agent: OAI-SearchBot
User-agent: ChatGPT-User
User-agent: ClaudeBot
User-agent: PerplexityBot
User-agent: Perplexity-User
User-agent: Google-Extended
User-agent: Applebot-Extended
Allow: /
Disallow: /admin
Disallow: /account
Disallow: /cart
Disallow: /auth
Disallow: /search

User-agent: *
Allow: /
Disallow: /admin

Sitemap: https://phonetrade31.ru/sitemap.xml
`;

export function GET() {
  return new Response(ROBOTS_TEXT, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      // Keep the incident fix observable quickly and prevent a stale error
      // response from surviving for months at a shared proxy.
      "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=3600",
    },
  });
}
