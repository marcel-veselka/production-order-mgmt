# Orders Specification

## Purpose
Manage production orders through a data grid with full CRUD operations, filtering, sorting, pagination, and a multi-step creation wizard.

## Requirements

### Requirement: Orders data grid
The system SHALL display all production orders in a sortable, filterable, paginated data grid.

#### Scenario: Default grid view
- GIVEN a user navigates to the Orders page
- WHEN the page loads
- THEN a data grid is displayed with columns: "Order #", "Product", "Quantity", "Status", "Priority", "Assigned To", "Due Date", "Created"
- AND 10 rows are shown per page by default

#### Scenario: Column sorting
- GIVEN the orders grid is displayed
- WHEN the user clicks the "Due Date" column header
- THEN orders are sorted by due date ascending
- AND clicking again sorts descending

#### Scenario: Status filter
- GIVEN the orders grid is displayed
- WHEN the user selects "In Production" from the Status filter dropdown
- THEN only orders with status "In Production" are displayed

#### Scenario: Search
- GIVEN the orders grid is displayed
- WHEN the user types "ORD-" in the search box
- THEN the grid filters to show only matching order numbers

#### Scenario: Pagination
- GIVEN there are 25 orders in the system
- WHEN the user views the grid with 10 rows per page
- THEN pagination controls show "1 2 3" page numbers
- AND "Showing 1-10 of 25" text is displayed

### Requirement: Create order wizard
The system SHALL provide a multi-step wizard for creating new orders.

#### Scenario: Wizard steps
- GIVEN a user clicks "New Order" button
- WHEN the wizard opens
- THEN 3 steps are shown: "Product Details", "Production Parameters", "Review & Submit"
- AND step indicators show the current progress

#### Scenario: Step 1 - Product Details
- GIVEN the user is on step 1 of the wizard
- WHEN the form is displayed
- THEN fields are shown: Product (dropdown), Quantity (number), Priority (Low/Medium/High/Critical), Due Date (date picker)
- AND all fields are required

#### Scenario: Step 1 - Validation
- GIVEN the user is on step 1 with empty fields
- WHEN they click "Next"
- THEN validation errors appear for all required fields
- AND the wizard does not advance

#### Scenario: Step 2 - Production Parameters
- GIVEN the user completed step 1
- WHEN they advance to step 2
- THEN fields are shown: Production Line (dropdown), Shift (Morning/Afternoon/Night), Notes (textarea)
- AND Production Line is required

#### Scenario: Step 3 - Review
- GIVEN the user completed steps 1 and 2
- WHEN they advance to step 3
- THEN a summary of all entered data is displayed
- AND "Submit Order" and "Back" buttons are shown

#### Scenario: Submit order
- GIVEN the user is on the Review step
- WHEN they click "Submit Order"
- THEN a success notification appears: "Order ORD-XXX created successfully"
- AND the user is redirected to the orders grid
- AND the new order appears at the top with status "Draft"

### Requirement: Order detail view
The system SHALL display full order details when clicking a row.

#### Scenario: View order detail
- GIVEN the orders grid is displayed
- WHEN the user clicks on order "ORD-001"
- THEN a detail panel/page opens showing all order fields
- AND an activity log for that order is displayed

### Requirement: Edit order
The system SHALL allow editing orders in Draft or Returned status.

#### Scenario: Edit draft order
- GIVEN an order with status "Draft" is displayed
- WHEN the user clicks "Edit"
- THEN order fields become editable
- AND "Save" and "Cancel" buttons appear

#### Scenario: Edit locked order
- GIVEN an order with status "In Production" is displayed
- WHEN the user views the detail
- THEN the "Edit" button is disabled
- AND a tooltip says "Cannot edit orders in production"

### Requirement: Delete order
The system SHALL allow deleting orders in Draft status only.

#### Scenario: Delete with confirmation
- GIVEN an order with status "Draft" is displayed
- WHEN the user clicks "Delete"
- THEN a confirmation dialog appears: "Are you sure you want to delete ORD-XXX?"
- AND "Confirm" and "Cancel" buttons are shown

#### Scenario: Confirm delete
- GIVEN the delete confirmation dialog is shown
- WHEN the user clicks "Confirm"
- THEN the order is removed from the grid
- AND a success notification appears
