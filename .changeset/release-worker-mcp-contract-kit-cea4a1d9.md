---
"@reaatech/mcp-contract-cli": patch
"@reaatech/mcp-contract-client": patch
"@reaatech/mcp-contract-core": patch
"@reaatech/mcp-contract-observability": patch
"@reaatech/mcp-contract-reporters": patch
"@reaatech/mcp-contract-validators": patch
---

- **@reaatech/mcp-contract-cli** (patch): Patches a critical CVE (GHSA-5xrq-8626-4rwp) in vitest and includes a commander runtime dep bump (12→14); both changesets in the repo explicitly request patch releases for this package.
- **@reaatech/mcp-contract-client** (patch): Patches a critical CVE (GHSA-5xrq-8626-4rwp) in vitest; the merge includes an explicit changeset marking this package for a patch release.
- **@reaatech/mcp-contract-core** (patch): Patches a critical CVE (GHSA-5xrq-8626-4rwp) in vitest; the merge includes an explicit changeset marking this package for a patch release.
- **@reaatech/mcp-contract-observability** (patch): Patches a critical CVE (GHSA-5xrq-8626-4rwp) in vitest; the merge includes an explicit changeset marking this package for a patch release.
- **@reaatech/mcp-contract-reporters** (patch): Patches a critical CVE (GHSA-5xrq-8626-4rwp) in vitest; the merge includes an explicit changeset marking this package for a patch release.
- **@reaatech/mcp-contract-validators** (patch): Patches a critical CVE (GHSA-5xrq-8626-4rwp) in vitest, plus a yaml runtime patch bump (2.8.3→2.8.4) and a fast-uri pnpm override for a transitive security fix.
