# @reaatech/mcp-contract-client

## 0.2.0

### Minor Changes

- Make the HTTP client work correctly against MCP Streamable HTTP servers:

  - Send `Accept: application/json, text/event-stream` by default (the transport otherwise answers HTTP 406). Header names are normalized to lowercase so an explicit `--header Accept` cleanly overrides it.
  - Capture the server-assigned `Mcp-Session-Id` from the `initialize` response and echo it on every subsequent request, instead of generating a throwaway id. Without this, post-initialize requests (`tools/list`, tool calls) were rejected with HTTP 400.
  - Return JSON-RPC error responses carried on a non-2xx HTTP status (e.g. `400` for "Invalid Request") instead of throwing them away as transport errors, so validators can inspect the actual JSON-RPC error.

  Validators: per JSON-RPC 2.0, accept a `null` id on Invalid Request (`-32600`) and Parse error (`-32700`) responses (the id can't be reliably associated), rather than flagging an id mismatch.

## 0.1.1

### Patch Changes

- [#20](https://github.com/reaatech/mcp-contract-kit/pull/20) [`cea4a1d`](https://github.com/reaatech/mcp-contract-kit/commit/cea4a1d9f5a75dc51367669ae0080939124a9107) Thanks [@reaatech](https://github.com/reaatech)! - Fix critical CVE (GHSA-5xrq-8626-4rwp) by bumping vitest from ^3.1.1 to ^4.1.0

- [`71b018a`](https://github.com/reaatech/mcp-contract-kit/commit/71b018a44bd2127d12bc8dbd8066ef35a184288c) Thanks [@reaatech](https://github.com/reaatech)! - - **@reaatech/mcp-contract-cli** (patch): Patches a critical CVE (GHSA-5xrq-8626-4rwp) in vitest and includes a commander runtime dep bump (12→14); both changesets in the repo explicitly request patch releases for this package.

  - **@reaatech/mcp-contract-client** (patch): Patches a critical CVE (GHSA-5xrq-8626-4rwp) in vitest; the merge includes an explicit changeset marking this package for a patch release.
  - **@reaatech/mcp-contract-core** (patch): Patches a critical CVE (GHSA-5xrq-8626-4rwp) in vitest; the merge includes an explicit changeset marking this package for a patch release.
  - **@reaatech/mcp-contract-observability** (patch): Patches a critical CVE (GHSA-5xrq-8626-4rwp) in vitest; the merge includes an explicit changeset marking this package for a patch release.
  - **@reaatech/mcp-contract-reporters** (patch): Patches a critical CVE (GHSA-5xrq-8626-4rwp) in vitest; the merge includes an explicit changeset marking this package for a patch release.
  - **@reaatech/mcp-contract-validators** (patch): Patches a critical CVE (GHSA-5xrq-8626-4rwp) in vitest, plus a yaml runtime patch bump (2.8.3→2.8.4) and a fast-uri pnpm override for a transitive security fix.

- [#20](https://github.com/reaatech/mcp-contract-kit/pull/20) [`cea4a1d`](https://github.com/reaatech/mcp-contract-kit/commit/cea4a1d9f5a75dc51367669ae0080939124a9107) Thanks [@reaatech](https://github.com/reaatech)! - Fix: CI failing on main: Security Audit

  Closes [#19](https://github.com/reaatech/mcp-contract-kit/issues/19)

- Updated dependencies [[`cea4a1d`](https://github.com/reaatech/mcp-contract-kit/commit/cea4a1d9f5a75dc51367669ae0080939124a9107), [`71b018a`](https://github.com/reaatech/mcp-contract-kit/commit/71b018a44bd2127d12bc8dbd8066ef35a184288c), [`cea4a1d`](https://github.com/reaatech/mcp-contract-kit/commit/cea4a1d9f5a75dc51367669ae0080939124a9107)]:
  - @reaatech/mcp-contract-core@0.1.1
  - @reaatech/mcp-contract-observability@0.1.1
