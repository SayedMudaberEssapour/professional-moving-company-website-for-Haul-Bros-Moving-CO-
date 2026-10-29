# Structured data implementation — October 29, 2026

This is a static HTML site. There is no shared layout/head or CMS. JSON-LD is generated at edit/build time by `python3 scripts/update-structured-data.py`, not injected by client-side JavaScript. Visible body HTML was compared against Git HEAD and remains byte-for-byte unchanged.

## Implemented

- 185 content pages: one JSON-LD graph and one self-referencing canonical per page.
- Homepage: supplied business facts, corrected coordinates, Organization/MovingCompany, WebSite and WebPage. Unknown hours and price range are omitted. Stable identity: `https://www.haulbrosmoving.com/#organization` and `https://www.haulbrosmoving.com/#website`.
- 93 Service nodes: 70 locations, 12 named service pages, 10 long-distance routes and the services hub. Location names/states derive from each visible H1, including Maryland and Washington, DC. No fictional local branch addresses. Long-distance destination coverage derives from route pages.
- BreadcrumbList on all 184 inner content pages. There is no locations index, so location breadcrumbs link directly from Home to the location.
- 75 BlogPosting nodes: 69 /blog/ posts plus six legacy editorial guides outside /blog/. Existing dates and person authors are retained when available; organization authors/publishers reference the shared business ID.
- FAQPage on /faq/ only, generated from the visible expandable questions and answers. Other visible FAQs are preserved but their FAQPage markup is removed as requested.
- No review or aggregateRating markup. No duplicate business definitions on inner pages.
- Sitemap rebuilt from the 185 local canonical content pages; 78 redirect stubs excluded. Redirect stubs retain their destination canonical rather than an inappropriate self-canonical.
- Image alt audit found no missing alt attributes on content pages; no visible image changes were needed.

## Validation completed

`python3 scripts/validate-structured-data.py` passes: JSON parsing, required known article data, unique IDs, stable provider/publisher references, local schema image existence, breadcrumb targets/order, canonical counts, alt attributes and sitemap parity. All 185 canonical URLs returned HTTP 200 from a local static server. Re-running generation produced no HTML changes. `git diff --check` passes. This verifies local files, not deployed production responses or search-engine indexing.

## Missing source information (not invented)

Six legacy guides have no available publication date or editorial image: the three /Navbars/moving-guides/*.html pages, /long-distance-moving-from-northern-virginia/, /office-commercial-moving-northern-virginia/ and /professional-packing-services-northern-virginia/. Those unknown fields are omitted.

Five /blog/ posts have no available editorial image: average-moving-costs-fairfax-county-va, haul-bros-vs-diy-moving, how-to-move-a-washer-and-dryer, local-vs-long-distance-moving-costs, and military-family-moving-tips-pcs-guide. Image is omitted from those schemas. The DIY post already references a nonexistent visible file `/assets/haul-bros-vs-diy.png`; it has not been replaced with an unrelated image. See `schema-inventory.json` for the per-page review list.

The three existing schema blocks initially flagged by the audit were valid JSON arrays, not malformed JSON; generation now handles arrays and graphs.

## Location URL migration — proposed, not applied

Review `location-redirect-map.csv`: 140 old paths (70 directories plus their .html aliases) mapped to 70 lowercase hyphenated /locations/ paths, including corrected bealeton, falls-church, lake-ridge, dumfries, woodbridge and great-falls.

No files or links have been migrated yet. The hosting platform has not been identified; the repo includes a GitHub remote and CNAME, but no server redirect configuration. JavaScript and meta refresh are not HTTP 301 redirects. The actual host/edge configuration is needed to implement real 301s. Applying redirects, moving pages and updating all internal links/canonicals/sitemap must be a separate commit after this map is reviewed, as requested.

## Final robots.txt (unchanged)

```text
User-agent: *
Allow: /

Sitemap: https://www.haulbrosmoving.com/sitemap.xml
```

This allows Googlebot, Bingbot, OAI-SearchBot, GPTBot, PerplexityBot, ClaudeBot and Google-Extended. No crawler-specific disallow exists in this file.

## Files and pages

- Full changed-file list: `changed-files.txt`.
- Every schema page and its types/canonical: `schema-inventory.json`.
- Generator/config: `scripts/update-structured-data.py`, `scripts/homepage-schema.json`, `scripts/legacy-article-data.json`.
- Validator: `scripts/validate-structured-data.py`.

## External validation still required

The modified files are local and have not been deployed. Google's Rich Results Test and schema.org Validator have not been run on these modified files; no claim of an external pass is made. They may report missing optional recommendations for known/omitted fields, and Service/WebSite do not necessarily produce a Google rich result.

After deployment, test the homepage, /local-movers/, /Locations/Occoquan/, /faq/ and a dated blog post at https://validator.schema.org/ and https://search.google.com/test/rich-results . Alternatively use each tool's code input with the complete updated page source before deployment. Inspect the live canonical, robots and sitemap, then review Search Console after recrawling. Structured data does not guarantee rich-result display.
