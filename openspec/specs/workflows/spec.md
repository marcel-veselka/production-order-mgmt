# Workflows Specification

## Purpose
Manage production order status transitions through an approval workflow with role-based actions, drag-and-drop Kanban board, and status history.

## Requirements

### Requirement: Order status lifecycle
The system SHALL enforce the following status transitions: Draft → Submitted → Approved → In Production → Quality Check → Completed. Additionally: Submitted → Draft (reject), Quality Check → Quality Hold → Quality Check (release).

#### Scenario: Submit for approval
- GIVEN an order with status "Draft"
- WHEN an Operator clicks "Submit for Approval"
- THEN the status changes to "Submitted"
- AND a success notification appears
- AND the activity log records the transition with timestamp and user

#### Scenario: Approve order
- GIVEN an order with status "Submitted"
- WHEN a Supervisor or Admin clicks "Approve"
- THEN the status changes to "Approved"

#### Scenario: Reject order
- GIVEN an order with status "Submitted"
- WHEN a Supervisor or Admin clicks "Reject"
- THEN the status changes back to "Draft"
- AND the rejection is recorded in the activity log

#### Scenario: Start production
- GIVEN an order with status "Approved"
- WHEN a Supervisor or Admin clicks "Start Production"
- THEN the status changes to "In Production"

#### Scenario: Complete production
- GIVEN an order with status "In Production"
- WHEN an Operator clicks "Complete Production"
- THEN the status changes to "Quality Check"

#### Scenario: Quality hold
- GIVEN an order with status "Quality Check"
- WHEN a Supervisor or Admin clicks "Quality Hold"
- THEN the status changes to "Quality Hold"

#### Scenario: Release from hold
- GIVEN an order with status "Quality Hold"
- WHEN a Supervisor or Admin clicks "Release"
- THEN the status changes back to "Quality Check"

#### Scenario: Mark complete
- GIVEN an order with status "Quality Check"
- WHEN a Supervisor or Admin clicks "Mark Complete"
- THEN the status changes to "Completed"

### Requirement: Workflow actions are role-gated
The system SHALL restrict workflow actions based on user role.

#### Scenario: Operator restrictions
- GIVEN an Operator views a "Submitted" order
- WHEN they look at available actions
- THEN "Approve" and "Reject" buttons are not visible
- AND only Supervisors and Admins can approve/reject

#### Scenario: Supervisor capabilities
- GIVEN a Supervisor views a "Submitted" order
- WHEN they look at available actions
- THEN "Approve" and "Reject" buttons are visible

### Requirement: Activity log
The system SHALL maintain a complete audit trail for each order.

#### Scenario: Activity log entries
- GIVEN an order detail view is displayed
- WHEN the user scrolls to the Activity Log section
- THEN all status transitions are listed with: timestamp, user ID, action performed, previous status, new status, and comment

### Requirement: Workflow Kanban board
The system SHALL provide a Kanban-style board showing orders grouped by status with drag-and-drop support.

#### Scenario: Kanban board display
- GIVEN a user navigates to the Workflows page
- WHEN the page loads
- THEN columns are displayed for each status: Draft, Submitted, Approved, In Production, Quality Check, Quality Hold, Completed
- AND each order is shown as a card with order number, product name, priority badge, quantity, and assigned user name
- AND each column header shows the count of orders in that status

#### Scenario: Drag card to valid column
- GIVEN the Kanban board is displayed
- WHEN the user drags an order card from "Draft" to "Submitted"
- THEN the "Submitted" column highlights green indicating a valid drop target
- AND upon dropping, the backend transition API is called with action "submit"
- AND the card moves to the "Submitted" column
- AND a success notification appears: "ORD-XXX: Draft → Submitted"

#### Scenario: Drag card to invalid column
- GIVEN the Kanban board is displayed
- WHEN the user drags an order card from "Draft" to "Completed"
- THEN the "Completed" column highlights red indicating an invalid drop target
- AND the drop is rejected
- AND an error notification appears: "Cannot move from Draft to Completed"

#### Scenario: Valid drop targets highlight during drag
- GIVEN the user starts dragging a card from the "Approved" column
- THEN only the "In Production" column shows a blue dashed border (valid target)
- AND all other columns remain neutral or show red on hover

#### Scenario: Completed orders are not draggable
- GIVEN the Kanban board is displayed
- WHEN the user tries to drag a card in the "Completed" column
- THEN the card does not respond to drag (draggable is disabled)

#### Scenario: Role enforcement on drag-and-drop
- GIVEN an Operator drags a "Submitted" card to "Approved"
- WHEN they drop it
- THEN the backend returns a 403 error
- AND an error notification appears with the role restriction message
- AND the card returns to its original column

#### Scenario: Optimistic update with rollback
- GIVEN a user drags a card to a valid column
- WHEN the backend API call fails (network error or server error)
- THEN the board refetches all orders from the server
- AND the card returns to its correct position
