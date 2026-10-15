# System Management Helpers

Keep business fields, payload conversion and API calls in each page. Reuse only the lifecycle shared by multiple system-management pages.

- `useAdminGrid`: grid defaults, locale updates and an `onQuery` lifecycle for clearing selection on every query. Supply `columns`, `schema` and `query`; override table behavior with `gridOptions` and `gridEvents`.
- `pagedQuery`: translate grid pagination into an API's `page` and `size`.
- `useFormSubmit`: validate, guard duplicate submissions, save, close and refresh. Use `canSubmit` when a modal must finish loading its options first.
- `useDeleteRow` and `useBatchDelete`: preserve identifier types, prevent duplicate deletion and move back a page when the current page becomes empty.
- `useAsyncResource`: loading, retry and stale-response protection. Call `refresh` explicitly; scope disposal invalidates pending responses.
- `departmentField`: tree-select configuration. Pass `disableInactive: true` for user assignment; inactive nodes remain readable but cannot be selected.

Department and role IDs can be Snowflake strings. Do not cast IDs to numbers. For department editing, derive the exact parent ID from tree links using `findParentId`; a numeric `parent_id` from the detail API can be rounded by JSON parsing.

Verification from the repository root:

```powershell
pnpm exec vitest run apps/web-ele/src/views/admin
$env:E2E_BROWSER_CHANNEL = 'msedge'
$env:E2E_BASE_URL = 'http://127.0.0.1:5777'
node apps/web-ele/e2e/organization.mjs
node apps/web-ele/e2e/system-management.mjs
```

Both browser scripts intercept all `/api/` traffic with in-memory fixtures. They do not change the real database.
