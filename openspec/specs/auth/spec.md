# Auth Specification

## Purpose
Manage user authentication, session lifecycle, and role-based access control for the production order management system.

## Requirements

### Requirement: User login
The system SHALL authenticate users with email and password credentials.

#### Scenario: Successful login
- GIVEN a user with valid credentials exists
- WHEN they submit email "admin@factory.local" and password "admin123"
- THEN a session token is created
- AND the user is redirected to the Dashboard

#### Scenario: Invalid credentials
- GIVEN a user submits incorrect password
- WHEN they click Login
- THEN an error message "Invalid email or password" is displayed
- AND no session is created

#### Scenario: Empty fields
- GIVEN the login form is displayed
- WHEN the user clicks Login without filling any fields
- THEN validation errors are shown for both email and password fields

### Requirement: Role-based access
The system SHALL support three roles: Admin, Supervisor, and Operator.

#### Scenario: Role-specific navigation
- GIVEN a user is logged in as Operator
- WHEN they view the sidebar navigation
- THEN the Settings menu item is not visible

#### Scenario: Admin full access
- GIVEN a user is logged in as Admin
- WHEN they view the sidebar navigation
- THEN all menu items are visible including Settings and User Management

### Requirement: Session management
The system SHALL maintain user sessions and support logout.

#### Scenario: Logout
- GIVEN a user is logged in
- WHEN they click the Logout button
- THEN the session is destroyed
- AND the user is redirected to the Login page

### Requirement: Demo accounts
The system SHALL provide pre-configured demo accounts for testing.

#### Scenario: Available demo accounts
- GIVEN the login page is displayed
- WHEN the user looks below the login form
- THEN three demo account buttons are visible: Admin, Supervisor, Operator
- AND clicking any button auto-fills the credentials
