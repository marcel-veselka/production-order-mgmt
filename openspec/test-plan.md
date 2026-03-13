# Production Order Management — Functional Test Plan

**Total:** 250 test cases (TC001–TC250)
**Roles:** Admin, Supervisor, Operator
**Priority:** 1 (critical) → 5 (low)

### Execution Results (2026-03-12)

| Metric | Value |
| ------ | ----- |
| Executed | 250 |
| Passed | 238 (95.2%) |
| Failed | 7 |
| Skipped | 5 |
| Total Duration | 12m 10s |

**Failed:** TC057, TC106, TC107, TC194, TC213, TC214, TC224
**Skipped:** TC030, TC173, TC189, TC249, TC250

| Priority | Count | % |
| -------- | ----- | --- |
| 1 | 52 | 21% |
| 2 | 74 | 30% |
| 3 | 58 | 23% |
| 4 | 44 | 18% |
| 5 | 22 | 9% |

| Feature | TC Range | Count |
| ------- | -------- | ----- |
| Auth | TC001–TC030 | 30 |
| Dashboard | TC031–TC055 | 25 |
| Orders | TC056–TC125 | 70 |
| Workflows (Kanban) | TC126–TC190 | 65 |
| Settings | TC191–TC230 | 40 |
| Cross-cutting / Nav | TC231–TC250 | 20 |

---

## AUTH (TC001–TC030)

| TC# | Title | P | Role(s) | Description | Status | Duration |
| --- | ----- | - | ------- | ----------- | ------ | -------- |
| TC001 | Login with valid Admin credentials | 1 | Admin | Enter admin@factory.local / admin123, verify redirect to Dashboard | PASS | 18s |
| TC002 | Login with valid Supervisor credentials | 1 | Supervisor | Enter valid supervisor credentials, verify successful login | PASS | 22s |
| TC003 | Login with valid Operator credentials | 1 | Operator | Enter valid operator credentials, verify successful login | PASS | 18s |
| TC004 | Login with invalid email | 1 | All | Enter non-existent email, verify "Invalid email or password" error | PASS | 15s |
| TC005 | Login with invalid password | 1 | All | Enter valid email + wrong password, verify error message | PASS | 12s |
| TC006 | Login with empty email field | 2 | All | Submit with empty email, verify validation error on email field | PASS | 10s |
| TC007 | Login with empty password field | 2 | All | Submit with empty password, verify validation error on password field | PASS | 10s |
| TC008 | Login with both fields empty | 2 | All | Submit completely empty form, verify validation errors on both fields | PASS | 8s |
| TC009 | Demo account button — Admin | 1 | Admin | Click Admin demo button, verify credentials auto-fill, then login succeeds | PASS | 15s |
| TC010 | Demo account button — Supervisor | 1 | Supervisor | Click Supervisor demo button, verify auto-fill and login | PASS | 15s |
| TC011 | Demo account button — Operator | 1 | Operator | Click Operator demo button, verify auto-fill and login | PASS | 15s |
| TC012 | Bearer token stored after login | 1 | All | After login, verify localStorage contains auth token | PASS | 5s |
| TC013 | Token is base64-encoded user ID | 2 | All | Decode stored token, verify it matches logged-in user's ID | PASS | 3s |
| TC014 | Session persists on page refresh | 1 | All | Login, refresh browser, verify still authenticated | PASS | 8s |
| TC015 | Session persists in new tab | 2 | All | Login, open app in new tab, verify session active | PASS | 12s |
| TC016 | Logout destroys session | 1 | All | Click Logout, verify token removed from localStorage | PASS | 8s |
| TC017 | Logout redirects to login page | 1 | All | Click Logout, verify redirect to /login | PASS | 5s |
| TC018 | Protected route without token | 1 | All | Clear token, navigate to /dashboard, verify redirect to login | PASS | 8s |
| TC019 | Protected route with invalid token | 2 | All | Set garbage token, navigate to app, verify redirect to login | PASS | 8s |
| TC020 | Admin sees Settings in navigation | 1 | Admin | Login as Admin, verify Settings nav item visible | PASS | 5s |
| TC021 | Supervisor cannot see Settings nav | 1 | Supervisor | Login as Supervisor, verify Settings nav item hidden | PASS | 5s |
| TC022 | Operator cannot see Settings nav | 1 | Operator | Login as Operator, verify Settings nav item hidden | PASS | 5s |
| TC023 | Admin role label displayed in UI | 3 | Admin | Verify user role shown as "Admin" in header/sidebar | PASS | 3s |
| TC024 | Supervisor role label displayed | 3 | Supervisor | Verify role shows "Supervisor" | PASS | 3s |
| TC025 | Operator role label displayed | 3 | Operator | Verify role shows "Operator" | PASS | 3s |
| TC026 | Login form retains email on failed attempt | 4 | All | Submit wrong password, verify email field still populated | PASS | 12s |
| TC027 | Password field is masked | 5 | All | Verify password input renders as dots/bullets | PASS | 3s |
| TC028 | Three demo buttons visible on login page | 3 | All | Verify Admin, Supervisor, Operator demo buttons all rendered | PASS | 3s |
| TC029 | Error message clears on new login attempt | 4 | All | Trigger error, modify fields and resubmit, verify error clears | PASS | 15s |
| TC030 | Login button disabled during API call | 4 | All | Submit login, verify button shows loading/disabled state | SKIP | 0s |

---

## DASHBOARD (TC031–TC055)

| TC# | Title | P | Role(s) | Description | Status | Duration |
| --- | ----- | - | ------- | ----------- | ------ | -------- |
| TC031 | Dashboard loads after login | 1 | All | Verify Dashboard page renders after successful login | PASS | 5s |
| TC032 | KPI card: Total Orders value | 1 | All | Verify "Total Orders" card shows numeric value matching order count | PASS | 3s |
| TC033 | KPI card: In Production value | 1 | All | Verify "In Production" card shows count of orders in production | PASS | 3s |
| TC034 | KPI card: Completed Today value | 2 | All | Verify "Completed Today" card shows correct count | PASS | 3s |
| TC035 | KPI card: Quality Hold value | 2 | All | Verify "Quality Hold" card shows correct count | PASS | 3s |
| TC036 | KPI trend: Total Orders percentage | 3 | All | Verify trend arrow + percentage shown on Total Orders card | PASS | 2s |
| TC037 | KPI trend: In Production percentage | 3 | All | Verify trend indicator on In Production card | PASS | 2s |
| TC038 | KPI trend: Completed Today percentage | 4 | All | Verify trend indicator on Completed Today card | PASS | 2s |
| TC039 | KPI trend: Quality Hold percentage | 4 | All | Verify trend indicator on Quality Hold card | PASS | 2s |
| TC040 | Bar chart renders 7 bars | 2 | All | Verify "Daily Production Output" chart shows 7 bars for last 7 days | PASS | 5s |
| TC041 | Bar chart axis labels | 3 | All | Verify x-axis shows dates, y-axis shows unit counts | PASS | 3s |
| TC042 | Bar chart data matches API response | 2 | Admin | Compare displayed values with /api/dashboard response | PASS | 8s |
| TC043 | Recent orders table: 5 rows | 2 | All | Verify recent orders table contains exactly 5 rows | PASS | 3s |
| TC044 | Recent orders columns: Order #, Product, Status, Due Date | 2 | All | Verify all 4 column headers present | PASS | 2s |
| TC045 | Recent orders sorted by creation date desc | 3 | All | Verify most recent order appears first | PASS | 5s |
| TC046 | Recent orders: status shown as formatted label | 3 | All | Verify status renders as styled badge, not raw text | PASS | 3s |
| TC047 | Activity feed: 10 events displayed | 2 | All | Verify activity feed shows 10 entries | PASS | 3s |
| TC048 | Activity feed: timestamps present | 3 | All | Verify each activity entry has a timestamp | PASS | 2s |
| TC049 | Activity feed: sorted most recent first | 3 | All | Verify descending chronological order | PASS | 2s |
| TC050 | Activity feed: includes status changes | 3 | All | Verify feed contains order status transition events | PASS | 2s |
| TC051 | KPI updates after status change | 2 | Admin | Change an order status, refresh dashboard, verify KPI values update | PASS | 20s |
| TC052 | Dashboard accessible by all roles | 2 | All | Login as each role, verify Dashboard renders for all | PASS | 2s |
| TC053 | Activity feed: includes approval events | 4 | All | Verify approval actions appear in feed | PASS | 2s |
| TC054 | Activity feed: includes quality hold events | 4 | All | Verify quality hold actions appear in feed | PASS | 2s |
| TC055 | Dashboard bar chart title correct | 5 | All | Verify chart titled "Daily Production Output" | PASS | 2s |

---

## ORDERS (TC056–TC125)

| TC# | Title | P | Role(s) | Description | Status | Duration |
| --- | ----- | - | ------- | ----------- | ------ | -------- |
| TC056 | Orders page loads with data grid | 1 | All | Navigate to Orders, verify grid renders with data | PASS | 2s |
| TC057 | Grid columns correct | 1 | All | Verify: Order#, Product, Quantity, Status, Priority, Assigned To, Due Date, Created | FAIL | 0s |
| TC058 | Default 10 rows per page | 2 | All | Verify grid shows 10 rows by default | PASS | 0s |
| TC059 | Pagination info text | 2 | All | Verify "Showing 1-10 of N" format | PASS | 0s |
| TC060 | Pagination: next page | 2 | All | Click next, verify rows 11-20 load | PASS | 2s |
| TC061 | Pagination: previous page | 3 | All | Go to page 2 then back, verify page 1 rows | PASS | 2s |
| TC062 | Pagination: page numbers displayed | 3 | All | Verify page number buttons rendered | PASS | 0s |
| TC063 | Pagination: last page partial rows | 4 | All | Navigate to last page, verify correct row count | PASS | 0s |
| TC064 | Sort by Order# ascending | 3 | All | Click Order# header, verify ascending sort | PASS | 2s |
| TC065 | Sort by Order# descending | 3 | All | Click twice, verify descending sort | PASS | 2s |
| TC066 | Sort by Due Date ascending | 3 | All | Sort by Due Date, verify chronological order | PASS | 2s |
| TC067 | Sort by Due Date descending | 3 | All | Click twice, verify reverse chronological | PASS | 2s |
| TC068 | Sort by Priority | 4 | All | Sort by Priority column, verify ordering | PASS | 2s |
| TC069 | Sort by Status | 4 | All | Sort by Status, verify ordering | PASS | 2s |
| TC070 | Status filter dropdown present | 2 | All | Verify status filter dropdown exists | PASS | 1s |
| TC071 | Filter by Draft status | 2 | All | Select Draft, verify only Draft orders shown | PASS | 1s |
| TC072 | Filter by In Production status | 2 | All | Select In Production, verify filtered results | PASS | 1s |
| TC073 | Filter by Completed status | 3 | All | Select Completed, verify filtered results | PASS | 1s |
| TC074 | Filter by Submitted status | 3 | All | Select Submitted, verify filtered results | PASS | 1s |
| TC075 | Clear filter restores all orders | 3 | All | Apply filter, clear it, verify all orders return | PASS | 1s |
| TC076 | Search by full order number | 2 | All | Type "ORD-001", verify matching result | PASS | 1s |
| TC077 | Search by partial order number | 3 | All | Type "ORD-", verify filtered results | PASS | 1s |
| TC078 | Search with no matches | 3 | All | Search "NONEXISTENT", verify empty state | PASS | 1s |
| TC079 | Clear search restores all orders | 4 | All | Type search, clear field, verify all orders return | PASS | 1s |
| TC080 | New Order button opens wizard | 1 | All | Click "New Order", verify wizard opens with step 1 | PASS | 2s |
| TC081 | Wizard shows 3 step indicators | 2 | All | Verify step labels: Product Details, Production Parameters, Review & Submit | PASS | 0s |
| TC082 | Step 1: Product dropdown populated with 6 products | 1 | All | Verify dropdown lists all 6 seed products | PASS | 0s |
| TC083 | Step 1: Quantity field accepts numbers | 2 | All | Enter numeric quantity, verify acceptance | PASS | 0s |
| TC084 | Step 1: Priority options (Low/Medium/High/Critical) | 2 | All | Verify all 4 priority options in dropdown | PASS | 0s |
| TC085 | Step 1: Due Date picker present | 2 | All | Verify date input renders | PASS | 0s |
| TC086 | Step 1: All fields required — empty submission | 1 | All | Click Next with all empty, verify validation errors on all 4 fields | PASS | 1s |
| TC087 | Step 1: Product required | 2 | All | Leave only product empty, verify required error | PASS | 2s |
| TC088 | Step 1: Quantity required | 2 | All | Leave only quantity empty, verify required error | PASS | 2s |
| TC089 | Step 1: Due Date required | 2 | All | Leave only due date empty, verify required error | PASS | 2s |
| TC090 | Step 1 to Step 2 navigation | 2 | All | Fill all step 1 fields, click Next, verify step 2 loads | PASS | 2s |
| TC091 | Step 2: Production Line dropdown with 4 lines | 1 | All | Verify dropdown lists all 4 seed production lines | PASS | 0s |
| TC092 | Step 2: Production Line required | 2 | All | Try to proceed without selecting line, verify error | PASS | 1s |
| TC093 | Step 2: Shift options (Morning/Afternoon/Night) | 3 | All | Verify 3 shift options in dropdown | PASS | 0s |
| TC094 | Step 2: Notes textarea present | 4 | All | Verify notes field renders and accepts text | PASS | 1s |
| TC095 | Step 2: Shift is optional | 3 | All | Proceed without shift, verify no error | PASS | 1s |
| TC096 | Step 2: Notes is optional | 4 | All | Proceed without notes, verify no error | PASS | 0s |
| TC097 | Step 2 to Step 3 navigation | 2 | All | Fill step 2, click Next, verify review step loads | PASS | 1s |
| TC098 | Step 3: Review summary shows all entered data | 2 | All | Verify product name, quantity, priority, due date, line name, shift, notes all displayed | PASS | 0s |
| TC099 | Back from Step 2 preserves Step 1 data | 3 | All | Go back from step 2, verify step 1 fields still populated | PASS | 1s |
| TC100 | Back from Step 3 preserves Step 2 data | 3 | All | Go back from step 3, verify step 2 fields populated | PASS | 1s |
| TC101 | Submit order creates Draft order | 1 | All | Click Submit on review step, verify success notification | PASS | 3s |
| TC102 | Success message shows order number | 2 | All | Verify notification includes "ORD-XXX created successfully" | PASS | 0s |
| TC103 | New order appears in grid after creation | 1 | All | Return to orders list, verify new order visible | PASS | 2s |
| TC104 | New order has Draft status | 1 | All | Verify newly created order shows "Draft" status | PASS | 0s |
| TC105 | Create order as Admin | 1 | Admin | Full wizard flow as Admin | PASS | 0s |
| TC106 | Create order as Supervisor | 1 | Supervisor | Full wizard flow as Supervisor | FAIL | 5s |
| TC107 | Create order as Operator | 1 | Operator | Full wizard flow as Operator | FAIL | 5s |
| TC108 | Order detail: all fields displayed | 1 | All | Click order row, verify all fields shown on detail page | PASS | 3s |
| TC109 | Order detail: activity log present | 2 | All | Verify activity log section on detail page | PASS | 0s |
| TC110 | Order detail: product name resolved (not ID) | 2 | All | Verify product shows name, not productId | PASS | 0s |
| TC111 | Order detail: assigned user name resolved | 2 | All | Verify assigned user shows name, not userId | PASS | 0s |
| TC112 | Order detail: production line name resolved | 3 | All | Verify production line shows name, not lineId | PASS | 0s |
| TC113 | Edit Draft order: fields become editable | 1 | All | Open Draft order, click Edit, verify fields editable | PASS | 4s |
| TC114 | Edit Draft order: product uses dropdown | 2 | All | Verify product field is a dropdown in edit mode | PASS | 0s |
| TC115 | Edit Draft order: save changes | 1 | All | Modify quantity, save, verify change persisted | PASS | 3s |
| TC116 | Edit Submitted order: edit disabled | 2 | All | Open Submitted order, verify Edit button disabled | PASS | 2s |
| TC117 | Edit In Production order: edit disabled | 2 | All | Open In Production order, verify Edit disabled with tooltip | PASS | 2s |
| TC118 | Edit Completed order: edit disabled | 2 | All | Open Completed order, verify cannot edit | PASS | 0s |
| TC119 | Delete Draft order: confirmation dialog | 1 | All | Click Delete on Draft order, verify "Are you sure?" dialog | PASS | 2s |
| TC120 | Delete Draft order: confirm removes order | 1 | All | Confirm deletion, verify order gone from grid | PASS | 4s |
| TC121 | Delete Draft order: cancel preserves order | 2 | All | Cancel deletion, verify order still in grid | PASS | 2s |
| TC122 | Delete non-Draft order: not allowed | 1 | All | Verify Delete option disabled/hidden for non-Draft orders | PASS | 0s |
| TC123 | Status displayed as formatted labels | 3 | All | Verify status cells use styled badges | PASS | 1s |
| TC124 | Priority displayed as colored badges | 3 | All | Verify priority renders with color coding | PASS | 0s |
| TC125 | Seed data: 15 orders present | 2 | All | Verify 15 orders on fresh deployment | PASS | 1s |

---

## WORKFLOWS / KANBAN (TC126–TC190)

| TC# | Title | P | Role(s) | Description | Status | Duration |
| --- | ----- | - | ------- | ----------- | ------ | -------- |
| TC126 | Kanban board loads with 7 columns | 1 | All | Verify: Draft, Submitted, Approved, In Production, Quality Check, Quality Hold, Completed | PASS | 2s |
| TC127 | Column headers show order count | 2 | All | Verify each column header displays card count | PASS | 0s |
| TC128 | Cards show order number | 2 | All | Verify order number (ORD-XXX) on each card | PASS | 0s |
| TC129 | Cards show product name | 2 | All | Verify product name displayed | PASS | 0s |
| TC130 | Cards show priority badge | 3 | All | Verify priority badge on cards | PASS | 0s |
| TC131 | Cards show quantity | 3 | All | Verify quantity displayed | PASS | 0s |
| TC132 | Cards show assigned user name | 3 | All | Verify assigned user (name, not ID) | PASS | 0s |
| TC133 | Drag Draft → Submitted (submit) | 1 | Operator | Drag card, verify transition and success notification | PASS | 3s |
| TC134 | Drag Submitted → Approved (approve) as Admin | 1 | Admin | Drag card, verify approval transition | PASS | 1s |
| TC135 | Drag Submitted → Approved as Supervisor | 1 | Supervisor | Drag card, verify approval | PASS | 2s |
| TC136 | Drag Submitted → Draft (reject) as Admin | 1 | Admin | Drag card back to Draft | PASS | 2s |
| TC137 | Drag Submitted → Draft (reject) as Supervisor | 1 | Supervisor | Drag card back to Draft | PASS | 2s |
| TC138 | Drag Approved → In Production (start_production) | 1 | Admin | Drag card, verify transition | PASS | 1s |
| TC139 | Drag In Production → Quality Check (complete_production) | 1 | Operator | Drag card, verify transition | PASS | 1s |
| TC140 | Drag Quality Check → Completed (complete) | 1 | Admin | Drag card, verify final transition | PASS | 1s |
| TC141 | Drag Quality Check → Quality Hold | 1 | Admin | Drag card to Quality Hold | PASS | 1s |
| TC142 | Drag Quality Hold → Quality Check (release) | 1 | Admin | Drag card back to Quality Check | PASS | 1s |
| TC143 | Invalid: Draft → Approved | 1 | All | Drag attempt rejected, error notification | PASS | 1s |
| TC144 | Invalid: Draft → In Production | 2 | All | Drag rejected | PASS | 1s |
| TC145 | Invalid: Draft → Completed | 2 | All | Drag rejected, "Cannot move from Draft to Completed" | PASS | 1s |
| TC146 | Invalid: Submitted → In Production (skip) | 2 | All | Drag rejected | PASS | 1s |
| TC147 | Invalid: Approved → Completed (skip) | 2 | All | Drag rejected | PASS | 1s |
| TC148 | Invalid: In Production → Completed (skip) | 2 | All | Drag rejected | PASS | 1s |
| TC149 | Invalid: Quality Hold → Completed | 2 | All | Drag rejected | PASS | 1s |
| TC150 | Completed orders not draggable | 1 | All | Verify cards in Completed column cannot be dragged | PASS | 2s |
| TC151 | Valid target highlights green on drop | 2 | All | Drag card, verify valid column highlights green | PASS | 1s |
| TC152 | Invalid target highlights red on hover | 2 | All | Drag over invalid column, verify red highlight | PASS | 0s |
| TC153 | Valid target shows blue dashed border during drag | 3 | All | Verify blue dashed border on valid drop targets | PASS | 0s |
| TC154 | Operator cannot approve (drag Submitted → Approved) | 1 | Operator | Drop rejected with 403, role restriction message | PASS | 1s |
| TC155 | Operator cannot reject (drag Submitted → Draft) | 1 | Operator | Drop rejected with role restriction | PASS | 1s |
| TC156 | Operator cannot start production (drag Approved → In Production) | 2 | Operator | Verify role enforcement on start production | PASS | 0s |
| TC157 | Operator cannot quality hold | 2 | Operator | Verify Operator blocked from Quality Hold transition | PASS | 0s |
| TC158 | Operator cannot mark complete | 2 | Operator | Verify Operator blocked from Quality Check → Completed | PASS | 0s |
| TC159 | Action button: Submit (Draft → Submitted) | 2 | All | Click submit button on card, verify transition | PASS | 3s |
| TC160 | Action button: Approve as Admin | 1 | Admin | Click Approve button, verify transition | PASS | 2s |
| TC161 | Action button: Approve as Supervisor | 2 | Supervisor | Click Approve button, verify transition | PASS | 4s |
| TC162 | Action button: Reject as Admin | 1 | Admin | Click Reject button, verify return to Draft | PASS | 4s |
| TC163 | Action button: Reject as Supervisor | 2 | Supervisor | Click Reject button | PASS | 4s |
| TC164 | Action button: Start Production | 2 | Admin | Click Start Production button | PASS | 3s |
| TC165 | Action button: Complete Production | 2 | Operator | Click Complete Production button | PASS | 5s |
| TC166 | Action button: Quality Hold | 2 | Admin | Click Quality Hold button | PASS | 3s |
| TC167 | Action button: Release Hold | 2 | Admin | Click Release Hold button | PASS | 2s |
| TC168 | Action button: Mark Complete | 2 | Admin | Click Mark Complete button | PASS | 2s |
| TC169 | Operator sees no Approve/Reject buttons | 1 | Operator | Verify approve/reject buttons hidden for Operator | PASS | 3s |
| TC170 | Supervisor sees Approve/Reject buttons | 2 | Supervisor | Verify buttons visible | PASS | 1s |
| TC171 | Admin sees all action buttons | 2 | Admin | Verify all workflow action buttons visible | PASS | 1s |
| TC172 | Optimistic update: card moves immediately | 2 | All | Drag card, verify it appears in target column before API response | PASS | 2s |
| TC173 | Rollback on API failure | 2 | All | Simulate API failure, verify card returns to original column | SKIP | 0s |
| TC174 | Column count updates after transition | 3 | All | Verify source -1, target +1 after successful move | PASS | 1s |
| TC175 | Full lifecycle: Draft → Completed via drag | 1 | Admin | Walk one order through all statuses using drag-and-drop | PASS | 6s |
| TC176 | Full lifecycle via action buttons | 2 | Admin | Walk one order through all statuses using buttons | PASS | 0s |
| TC177 | Quality Hold loop: hold → release → hold → release | 3 | Admin | Move to Quality Hold and back twice | PASS | 0s |
| TC178 | Reject and resubmit flow | 2 | Admin+Operator | Reject as Admin, resubmit as Operator, approve as Admin | PASS | 1s |
| TC179 | Multiple cards in same column display correctly | 3 | All | Verify multiple cards render without overlap | PASS | 1s |
| TC180 | Seed data distributed across columns | 3 | All | Verify 15 seed orders across multiple status columns | PASS | 0s |
| TC181 | Success notification shows transition details | 3 | All | Verify notification: "ORD-XXX: OldStatus → NewStatus" | PASS | 0s |
| TC182 | Error notification on invalid drag | 3 | All | Verify error: "Cannot move from X to Y" | PASS | 0s |
| TC183 | Invalid: Approved → Draft (backward) | 3 | All | Attempt backward drag, verify rejection | PASS | 0s |
| TC184 | Invalid: In Production → Approved (backward) | 3 | All | Attempt backward drag, verify rejection | PASS | 0s |
| TC185 | Invalid: Quality Check → In Production (backward) | 3 | All | Attempt backward drag, verify rejection | PASS | 0s |
| TC186 | Invalid: Quality Hold → Draft | 3 | All | Attempt invalid transition, verify rejection | PASS | 0s |
| TC187 | Invalid: Quality Hold → Approved | 3 | All | Attempt invalid transition, verify rejection | PASS | 0s |
| TC188 | Kanban accessible by all roles | 2 | All | Verify Admin, Supervisor, Operator can all view Workflows page | PASS | 0s |
| TC189 | Drag cancelled by dropping outside columns | 4 | All | Drop card outside any column, verify it returns to origin | SKIP | 0s |
| TC190 | Card returns to original column on role-enforcement failure | 2 | Operator | After 403 error, verify card returns to source column | PASS | 0s |

---

## SETTINGS (TC191–TC230)

| TC# | Title | P | Role(s) | Description | Status | Duration |
| --- | ----- | - | ------- | ----------- | ------ | -------- |
| TC191 | Admin can access Settings page | 1 | Admin | Navigate to /settings, verify page loads | PASS | 1s |
| TC192 | Supervisor redirected from Settings | 1 | Supervisor | Navigate to /settings, verify redirect to Dashboard | PASS | 3s |
| TC193 | Operator redirected from Settings | 1 | Operator | Navigate to /settings, verify redirect to Dashboard | PASS | 3s |
| TC194 | "Access denied" notification for non-admin | 1 | Supervisor, Operator | Verify error notification on redirect | FAIL | 0s |
| TC195 | Users tab: table renders | 2 | Admin | Verify Users table loads with data | PASS | 0s |
| TC196 | Users table columns: Name, Email, Role, Status, Last Login | 2 | Admin | Verify all 5 column headers | PASS | 0s |
| TC197 | Users table: 5 seed users displayed | 2 | Admin | Verify 5 users listed | PASS | 0s |
| TC198 | Create user: Add User button opens form | 2 | Admin | Click Add User, verify form opens | PASS | 1s |
| TC199 | Create user: form fields (Name, Email, Role, Status) | 2 | Admin | Verify all form fields present | PASS | 0s |
| TC200 | Create user: all required fields validation | 1 | Admin | Submit empty form, verify validation errors | PASS | 2s |
| TC201 | Create user: Name required | 2 | Admin | Submit without name, verify error | PASS | 2s |
| TC202 | Create user: Email required | 2 | Admin | Submit without email, verify error | PASS | 2s |
| TC203 | Create user: Role dropdown options | 3 | Admin | Verify Admin/Supervisor/Operator options | PASS | 0s |
| TC204 | Create user: valid submission | 1 | Admin | Fill all fields, submit, verify user created | PASS | 2s |
| TC205 | Create user: duplicate email rejected | 2 | Admin | Use existing email, verify "Email already in use" error | PASS | 2s |
| TC206 | Edit user: form pre-filled | 1 | Admin | Click edit icon, verify form opens with current values | PASS | 2s |
| TC207 | Edit user: save changes | 1 | Admin | Modify fields, save, verify changes persisted | PASS | 2s |
| TC208 | Delete user: confirmation dialog | 1 | Admin | Click delete icon, verify confirmation dialog | PASS | 1s |
| TC209 | Delete user: confirm removes user | 1 | Admin | Confirm deletion, verify user removed | PASS | 2s |
| TC210 | Delete user: cancel preserves user | 3 | Admin | Cancel dialog, verify user still listed | PASS | 1s |
| TC211 | Production Lines tab: table renders | 2 | Admin | Switch to Production Lines tab, verify table | PASS | 3s |
| TC212 | Production Lines columns: Name, Location, Capacity, Status | 2 | Admin | Verify all column headers | PASS | 1s |
| TC213 | Production Lines: 4 seed lines displayed | 2 | Admin | Verify 4 lines listed | FAIL | 2s |
| TC214 | Create production line: valid submission | 1 | Admin | Fill form, submit, verify line created | FAIL | 8s |
| TC215 | Create production line: required validation | 2 | Admin | Submit empty, verify errors | PASS | 3s |
| TC216 | Edit production line | 1 | Admin | Modify line, save, verify changes | PASS | 5s |
| TC217 | Delete production line: confirm | 1 | Admin | Delete line, confirm, verify removal | PASS | 4s |
| TC218 | Delete production line: cancel | 4 | Admin | Cancel delete, verify preserved | PASS | 3s |
| TC219 | Products tab: table renders | 2 | Admin | Switch to Products tab, verify table | PASS | 2s |
| TC220 | Products columns: Code, Name, Category, Unit, Active | 2 | Admin | Verify all column headers | PASS | 1s |
| TC221 | Products: 6 seed products displayed | 2 | Admin | Verify 6 products listed | PASS | 1s |
| TC222 | Create product: valid submission | 1 | Admin | Fill form, submit, verify product created | PASS | 5s |
| TC223 | Create product: required validation | 2 | Admin | Submit empty, verify errors | PASS | 3s |
| TC224 | Create product: Unit of Measure options | 3 | Admin | Verify pcs/kg/liters/meters options | FAIL | 1s |
| TC225 | Edit product | 1 | Admin | Modify product, save, verify changes | PASS | 4s |
| TC226 | Delete product: confirm | 1 | Admin | Delete product, confirm, verify removal | PASS | 4s |
| TC227 | Delete product: cancel | 4 | Admin | Cancel delete, verify preserved | PASS | 3s |
| TC228 | New user appears in Orders Assigned To dropdown | 3 | Admin | Create user in Settings, verify appears in Orders wizard | PASS | 3s |
| TC229 | New production line appears in wizard Step 2 | 3 | Admin | Create line, verify appears in wizard dropdown | PASS | 5s |
| TC230 | New product appears in wizard Step 1 | 3 | Admin | Create product, verify appears in wizard dropdown | PASS | 3s |

---

## CROSS-CUTTING / NAVIGATION (TC231–TC250)

| TC# | Title | P | Role(s) | Description | Status | Duration |
| --- | ----- | - | ------- | ----------- | ------ | -------- |
| TC231 | Sidebar nav: Admin sees all items | 1 | Admin | Verify Dashboard, Orders, Workflows, Settings in nav | PASS | 2s |
| TC232 | Sidebar nav: Supervisor sees 3 items | 1 | Supervisor | Verify Dashboard, Orders, Workflows (no Settings) | PASS | 4s |
| TC233 | Sidebar nav: Operator sees 3 items | 1 | Operator | Verify Dashboard, Orders, Workflows (no Settings) | PASS | 4s |
| TC234 | Navigate Dashboard → Orders via sidebar | 2 | All | Click Orders nav, verify page loads | PASS | 2s |
| TC235 | Navigate Orders → Workflows via sidebar | 2 | All | Click Workflows nav, verify page loads | PASS | 2s |
| TC236 | Navigate Workflows → Dashboard via sidebar | 2 | All | Click Dashboard nav, verify page loads | PASS | 2s |
| TC237 | Active nav item highlighted | 4 | All | Verify current page has active styling in nav | PASS | 2s |
| TC238 | Success toast on order creation | 3 | All | Create order, verify green success toast | PASS | 8s |
| TC239 | Success toast on status transition | 3 | All | Transition order, verify success toast | PASS | 4s |
| TC240 | Error toast on invalid action | 2 | All | Trigger error, verify red error toast | PASS | 5s |
| TC241 | Toast auto-dismisses | 5 | All | Trigger toast, verify it disappears after timeout | PASS | 7s |
| TC242 | Success toast on Settings CRUD | 3 | Admin | Create/edit/delete in Settings, verify toast | PASS | 2s |
| TC243 | Direct URL: /orders loads correctly | 3 | All | Enter URL directly with valid session | PASS | 2s |
| TC244 | Direct URL: /workflows loads correctly | 3 | All | Enter URL directly with valid session | PASS | 2s |
| TC245 | Direct URL: /settings loads for Admin only | 2 | Admin, Operator | Admin sees page, Operator redirected | PASS | 5s |
| TC246 | App loads at localhost:3333 | 2 | All | Access http://localhost:3333, verify app renders | PASS | 2s |
| TC247 | Unknown route shows 404 or redirects | 4 | All | Navigate to /nonexistent, verify handling | PASS | 2s |
| TC248 | Browser back button works | 5 | All | Navigate between pages, use back, verify correct page | PASS | 6s |
| TC249 | API error: network disconnect shows error | 4 | All | Disconnect network, attempt action, verify error message | SKIP | 0s |
| TC250 | API error: 500 response shows user-friendly error | 4 | All | Trigger server error, verify error toast | SKIP | 0s |
