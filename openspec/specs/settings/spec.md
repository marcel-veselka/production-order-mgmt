# Settings Specification

## Purpose
Manage users, production lines, and products through standard CRUD interfaces. Admin-only access.

## Requirements

### Requirement: User management
The system SHALL provide a CRUD interface for managing user accounts.

#### Scenario: Users list
- GIVEN an Admin navigates to Settings → Users
- WHEN the page loads
- THEN a table displays all users with columns: Name, Email, Role, Status (Active/Inactive), Last Login

#### Scenario: Create user
- GIVEN an Admin clicks "Add User"
- WHEN the form opens
- THEN fields are shown: Name, Email, Role (dropdown: Admin/Supervisor/Operator), Status toggle
- AND all fields except Status are required

#### Scenario: Create user validation
- GIVEN the Add User form is displayed
- WHEN the Admin submits with an already-used email
- THEN an error appears: "Email already in use"

#### Scenario: Edit user
- GIVEN the Users table is displayed
- WHEN an Admin clicks the edit icon on a row
- THEN the user form opens pre-filled with current values
- AND a "Save" button replaces "Create"

#### Scenario: Delete user with confirmation
- GIVEN the Users table is displayed
- WHEN an Admin clicks the delete icon on a row
- THEN a confirmation dialog appears
- AND upon confirmation the user is removed from the list

### Requirement: Production lines management
The system SHALL provide a CRUD interface for production lines.

#### Scenario: Production lines list
- GIVEN an Admin navigates to Settings → Production Lines
- WHEN the page loads
- THEN a table displays: Line Name, Location, Capacity (units/hour), Status (Active/Maintenance/Offline)

#### Scenario: Create production line
- GIVEN an Admin clicks "Add Line"
- WHEN the form opens
- THEN fields are shown: Line Name, Location, Capacity (number), Status (dropdown)

### Requirement: Products catalog
The system SHALL provide a CRUD interface for the product catalog.

#### Scenario: Products list
- GIVEN an Admin navigates to Settings → Products
- WHEN the page loads
- THEN a table displays: Product Code, Product Name, Category, Unit of Measure, Active (yes/no)

#### Scenario: Create product
- GIVEN an Admin clicks "Add Product"
- WHEN the form opens
- THEN fields are shown: Product Code, Product Name, Category (dropdown), Unit of Measure (dropdown: pcs/kg/liters/meters), Active toggle

### Requirement: Settings access control
The system SHALL restrict Settings access to Admin role only.

#### Scenario: Non-admin access attempt
- GIVEN an Operator is logged in
- WHEN they try to access /settings via URL
- THEN they are redirected to the Dashboard
- AND a notification appears: "Access denied"
