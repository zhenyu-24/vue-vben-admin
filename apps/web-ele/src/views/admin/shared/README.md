# System Management Helpers

Keep business fields, payload conversion and API calls in each page. Reuse only the lifecycle shared by multiple system-management pages.

Prefer the existing components exported by `@vben/common-ui` and the Vben plugins for pages, forms, grids, modals, drawers, buttons, tooltips, avatars and descriptions. Use Element Plus for controls without a suitable Vben component through the existing adapter and `@vben/styles/ele`. Follow the shared theme tokens instead of hardcoding colors or replacing component styles.

Toolbar commands use `VbenButton` with `gap-2` and static icons from `@vben/icons`: `Plus` for create/install and `Trash2` for batch deletion, both `size-4 shrink-0` and `aria-hidden="true"`. Use `VbenIconButton` with a tooltip and an accessible label for icon-only commands. Keep page-specific grid tools opt-in; do not enable print unless the page requires it.

- `useAdminGrid`: grid defaults, locale updates and an `onQuery` lifecycle for clearing selection on every query. Supply `columns`, `schema` and `query`; override table behavior with `gridOptions` and `gridEvents`.
- `pagedQuery`: translate grid pagination into an API's `page` and `size`.
- `useFormSubmit`: validate, guard duplicate submissions, save, close and refresh. Use `canSubmit` when a modal must finish loading its options first.
- `useDeleteRow` and `useBatchDelete`: preserve identifier types, prevent duplicate deletion and move back a page when the current page becomes empty.
- `useAsyncResource`: loading, retry and stale-response protection. Call `refresh` explicitly; scope disposal invalidates pending responses.
- `departmentField`: tree-select configuration. Pass `disableInactive: true` for user assignment; inactive nodes remain readable but cannot be selected.

Department and role IDs can be Snowflake strings. Do not cast IDs to numbers. For department editing, derive the exact parent ID from tree links using `findParentId`; a numeric `parent_id` from the detail API can be rounded by JSON parsing.

Place all future tests and browser regression scripts under `apps/web-ele/test`, not alongside source files. See [the test directory conventions](../../../../test/README.md).
