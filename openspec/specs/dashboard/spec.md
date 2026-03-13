# Dashboard Specification

## Purpose
Provide an overview of production KPIs, recent orders, and system status through summary cards, charts, and activity feeds.

## Requirements

### Requirement: KPI summary cards
The system SHALL display four summary cards at the top of the dashboard.

#### Scenario: Cards content
- GIVEN a user is logged in and views the Dashboard
- WHEN the page loads
- THEN four cards are displayed: "Total Orders", "In Production", "Completed Today", "Quality Hold"
- AND each card shows a numeric value and a trend indicator (up/down arrow with percentage)

### Requirement: Production chart
The system SHALL display a bar chart showing daily production output for the last 7 days.

#### Scenario: Chart rendering
- GIVEN a user views the Dashboard
- WHEN the page loads
- THEN a bar chart titled "Daily Production Output" is displayed
- AND it shows 7 bars representing the last 7 days with unit counts

### Requirement: Recent orders table
The system SHALL display the 5 most recent orders in a compact table.

#### Scenario: Recent orders display
- GIVEN a user views the Dashboard
- WHEN the page loads
- THEN a table with columns "Order #", "Product", "Status", "Due Date" is displayed
- AND it contains 5 rows sorted by creation date descending

### Requirement: Activity feed
The system SHALL display a timeline of the 10 most recent system events.

#### Scenario: Activity feed content
- GIVEN a user views the Dashboard
- WHEN the page loads
- THEN a list of recent activities is shown with timestamps
- AND activities include order status changes, approvals, and quality holds
