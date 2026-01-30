# SmartTriage — Testing and Documentation Guide

This document outlines testing procedures, API documentation, and code documentation standards for the SmartTriage project.

---

## Table of Contents

1. [Testing Overview](#testing-overview)
2. [Manual Testing Procedures](#manual-testing-procedures)
3. [API Testing](#api-testing)
4. [Frontend Testing](#frontend-testing)
5. [API Endpoint Documentation](#api-endpoint-documentation)
6. [Code Documentation Standards](#code-documentation-standards)
7. [Test Data Setup](#test-data-setup)

---

## 1. Testing Overview

SmartTriage uses a combination of manual testing, API endpoint testing, and frontend integration testing. The application follows a test-driven approach where features are verified through:

- **Manual UI Testing**: User workflows and visual verification
- **API Testing**: REST endpoint validation using tools like Postman, curl, or automated scripts
- **Integration Testing**: End-to-end user flows
- **Code Review**: TypeScript type checking and ESLint validation

### Prerequisites for Testing

- Node.js 18+ installed
- PostgreSQL database configured with connection string in `server/.env`
- Frontend and backend servers running
- Test user accounts (admin and agent roles)

---

## 2. Manual Testing Procedures

### 2.1 Authentication Testing

#### Login Flow
- [ ] **Valid Credentials**: Login with correct email/password → Should redirect to `/dashboard`
- [ ] **Invalid Credentials**: Login with wrong password → Should show error message
- [ ] **Missing Fields**: Submit form without email/password → Should show validation errors
- [ ] **Token Persistence**: Login, refresh page → Should remain logged in (token in localStorage)
- [ ] **Logout**: Click logout → Should clear token and redirect to `/login`

#### Protected Routes
- [ ] **Unauthenticated Access**: Navigate to `/dashboard` without login → Should redirect to `/login`
- [ ] **Authenticated Access**: Navigate to `/dashboard` after login → Should show dashboard
- [ ] **Role-Based Access**: Agent tries to access `/users` → Should redirect to `/dashboard` (admin-only)

### 2.2 Ticket Management Testing

#### Ticket List Dashboard (`/dashboard`)
- [ ] **Display Tickets**: Page loads → Should show list of tickets with pagination
- [ ] **Filter by Status**: Select "open" → Should filter tickets by status
- [ ] **Filter by Priority**: Select "high" → Should filter tickets by priority
- [ ] **Search Functionality**: Type search term → Should filter tickets by title/description
- [ ] **Pagination**: Click next page → Should load next set of tickets
- [ ] **Empty State**: No tickets match filters → Should show "No tickets found" message

#### Create Ticket (`/tickets/create`)
- [ ] **Valid Ticket**: Fill title (min 3 chars) and description (min 10 chars) → Should create ticket and redirect
- [ ] **Missing Title**: Submit without title → Should show validation error
- [ ] **Short Description**: Description < 10 chars → Should show validation error
- [ ] **With Deadline**: Set deadline date → Should save deadline with ticket
- [ ] **Priority Selection**: Select priority level → Should save priority

#### Ticket Details (`/tickets/:id`)
- [ ] **Load Ticket**: Open ticket from list → Should display full ticket details
- [ ] **AI Analysis Display**: View ticket → Should show category, urgency, sentiment, priority, summary, suggested steps
- [ ] **Re-analyze**: Click "Re-analyze" → Should refresh AI analysis
- [ ] **Update Status**: Change status dropdown → Should update ticket status
- [ ] **Assign Ticket**: Select user from assign dropdown → Should assign ticket
- [ ] **Unassign Ticket**: Select "Unassign" → Should remove assignment
- [ ] **Add Comment**: Type comment and submit → Should add comment to activity log
- [ ] **Update Deadline**: Change deadline → Should update deadline
- [ ] **Delete Ticket**: Click delete → Should confirm and remove ticket

### 2.3 User Management Testing (Admin Only)

#### User List (`/users`)
- [ ] **Admin Access**: Admin navigates to `/users` → Should show user list
- [ ] **Agent Access**: Agent navigates to `/users` → Should redirect to dashboard
- [ ] **Display Users**: Page loads → Should show all users with roles
- [ ] **Create User**: Fill form and submit → Should create new user
- [ ] **Update Role**: Change user role → Should update role in database
- [ ] **Deactivate User**: Toggle active status → Should deactivate user

### 2.4 Profile & Settings Testing (`/profile`)

- [ ] **Load Profile**: Navigate to profile → Should show current user info
- [ ] **Update Password**: Enter current + new password → Should update password
- [ ] **Password Validation**: Wrong current password → Should show error
- [ ] **Update Preferences**: Change notification/AI preferences → Should save preferences
- [ ] **Preference Persistence**: Refresh page → Should retain saved preferences

### 2.5 Analytics Testing (`/analytics`)

- [ ] **Admin Access**: Admin navigates to `/analytics` → Should show analytics dashboard
- [ ] **Display Metrics**: Page loads → Should show ticket statistics, charts, trends
- [ ] **Data Accuracy**: Verify numbers match actual ticket counts

### 2.6 AI Analysis Testing

- [ ] **High Urgency Detection**: Create ticket with "system down" → Should detect high/critical urgency
- [ ] **Sentiment Analysis**: Create ticket with angry language → Should detect "angry" sentiment
- [ ] **Category Prediction**: Create technical ticket → Should predict appropriate category
- [ ] **Priority Scoring**: Create urgent ticket → Should assign high/critical priority
- [ ] **Summary Generation**: Create ticket → Should generate readable summary
- [ ] **Suggested Steps**: View ticket → Should show actionable suggested steps

---

## 3. API Testing

### 3.1 Setup for API Testing

**Base URL**: `http://localhost:4000` (or value from `server/.env`)

**Authentication**: Include JWT token in Authorization header:
```
Authorization: Bearer <token>
```

### 3.2 Testing Tools

- **Postman**: Import collection (see below for endpoints)
- **curl**: Command-line testing
- **Browser DevTools**: Network tab for frontend API calls
- **REST Client**: VS Code extension or similar

### 3.3 Authentication Endpoints

#### POST `/api/auth/login`
**Request Body**:
```json
{
  "email": "agent@example.com",
  "password": "password123"
}
```

**Success Response** (200):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "agent@example.com",
    "role": "agent"
  }
}
```

**Test Cases**:
- [ ] Valid credentials → Returns token and user object
- [ ] Invalid email → Returns 401 error
- [ ] Invalid password → Returns 401 error
- [ ] Missing fields → Returns 400 validation error

---

### 3.4 Ticket Endpoints

#### GET `/api/tickets`
**Query Parameters**:
- `status` (optional): `open`, `in_progress`, `resolved`
- `priority` (optional): `low`, `medium`, `high`, `critical`
- `search` (optional): Search term
- `page` (optional): Page number (default: 1)
- `pageSize` (optional): Items per page (default: 20, max: 100)

**Headers**: `Authorization: Bearer <token>`

**Success Response** (200):
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Ticket title",
      "description": "Description",
      "status": "open",
      "priority": "high",
      "category": "technical",
      "urgency_score": 8.5,
      "sentiment_label": "frustrated",
      "assigned_to": "user-uuid",
      "deadline": "2026-02-15T00:00:00Z",
      "created_at": "2026-01-30T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

**Test Cases**:
- [ ] No filters → Returns all tickets (paginated)
- [ ] Filter by status → Returns filtered tickets
- [ ] Filter by priority → Returns filtered tickets
- [ ] Search query → Returns matching tickets
- [ ] Pagination → Returns correct page
- [ ] Unauthorized request → Returns 401

#### POST `/api/tickets`
**Request Body**:
```json
{
  "title": "System is down",
  "description": "Users cannot access the application",
  "priority": "high",
  "deadline": "2026-02-15T00:00:00Z"
}
```

**Success Response** (201):
```json
{
  "ticket": {
    "id": "uuid",
    "title": "System is down",
    "status": "open",
    "priority": "high",
    "ai_analysis": {
      "predicted_category": "technical",
      "urgency_score": 9.0,
      "priority_level": "critical",
      "summary": "System outage preventing user access"
    }
  }
}
```

**Test Cases**:
- [ ] Valid ticket → Creates ticket with AI analysis
- [ ] Title < 3 chars → Returns 400 validation error
- [ ] Description < 10 chars → Returns 400 validation error
- [ ] Invalid priority → Returns 400 validation error
- [ ] Missing required fields → Returns 400 validation error

#### GET `/api/tickets/:id`
**Test Cases**:
- [ ] Valid ID → Returns ticket details with AI analysis
- [ ] Invalid ID → Returns 404
- [ ] Unauthorized → Returns 401

#### PATCH `/api/tickets/:id`
**Request Body** (all fields optional):
```json
{
  "status": "in_progress",
  "priority": "high",
  "assignedTo": "user-uuid",
  "deadline": "2026-02-15T00:00:00Z"
}
```

**Test Cases**:
- [ ] Update status → Updates ticket status
- [ ] Update priority → Updates priority
- [ ] Assign ticket → Updates assigned_to
- [ ] Unassign (null) → Removes assignment
- [ ] Update deadline → Updates deadline
- [ ] Invalid status → Returns 400 validation error

#### POST `/api/tickets/:id/re-analyze`
**Test Cases**:
- [ ] Valid ticket ID → Re-runs AI analysis and updates ticket
- [ ] Invalid ID → Returns 404

#### POST `/api/tickets/:id/comments`
**Request Body**:
```json
{
  "message": "Working on this issue"
}
```

**Test Cases**:
- [ ] Valid comment → Adds comment to ticket
- [ ] Empty message → Returns 400 validation error

#### GET `/api/tickets/:id/comments`
**Test Cases**:
- [ ] Valid ticket → Returns list of comments
- [ ] No comments → Returns empty array

#### DELETE `/api/tickets/:id`
**Test Cases**:
- [ ] Valid ticket → Deletes ticket
- [ ] Invalid ID → Returns 404
- [ ] Unauthorized → Returns 401

---

### 3.5 User Endpoints

#### GET `/api/users`
**Headers**: `Authorization: Bearer <admin-token>`

**Test Cases**:
- [ ] Admin access → Returns user list
- [ ] Agent access → Returns 403 Forbidden
- [ ] Unauthorized → Returns 401

#### GET `/api/users/me`
**Test Cases**:
- [ ] Authenticated user → Returns current user profile
- [ ] Unauthorized → Returns 401

#### PATCH `/api/users/me/password`
**Request Body**:
```json
{
  "currentPassword": "oldpass",
  "newPassword": "newpass123"
}
```

**Test Cases**:
- [ ] Valid passwords → Updates password
- [ ] Wrong current password → Returns 401
- [ ] Weak new password → Returns 400 validation error

#### PATCH `/api/users/me/preferences`
**Request Body**:
```json
{
  "notification_preferences": {
    "email": true,
    "slack": false
  },
  "ai_preferences": {
    "auto_assign": true
  }
}
```

**Test Cases**:
- [ ] Valid preferences → Updates preferences
- [ ] Invalid structure → Returns 400 validation error

#### POST `/api/users`
**Request Body**:
```json
{
  "name": "New User",
  "email": "newuser@example.com",
  "role": "agent",
  "password": "password123"
}
```

**Test Cases**:
- [ ] Admin creates user → Creates new user
- [ ] Duplicate email → Returns 400 error
- [ ] Invalid role → Returns 400 validation error

#### PATCH `/api/users/:id/role`
**Request Body**:
```json
{
  "role": "admin"
}
```

**Test Cases**:
- [ ] Admin updates role → Updates user role
- [ ] Agent tries to update → Returns 403

---

## 4. Frontend Testing

### 4.1 Component Testing Checklist

#### Layout Components
- [ ] **Header**: Displays logo, user info, logout button
- [ ] **Sidebar**: Shows navigation links based on user role
- [ ] **Layout**: Wraps pages correctly, responsive design

#### Page Components
- [ ] **Login**: Form validation, error display, redirect on success
- [ ] **Dashboard**: Ticket list, filters, search, pagination
- [ ] **Create Ticket**: Form validation, submission, redirect
- [ ] **Ticket Details**: Loads data, displays AI analysis, updates work
- [ ] **Profile**: Loads user data, updates password/preferences
- [ ] **User Management**: Admin-only access, CRUD operations
- [ ] **Analytics**: Loads and displays statistics

### 4.2 Integration Testing Scenarios

#### Complete User Flow: Create and Resolve Ticket
1. Login as agent
2. Navigate to Create Ticket
3. Fill form and submit
4. Verify ticket appears in dashboard
5. Open ticket details
6. Verify AI analysis is displayed
7. Update status to "in_progress"
8. Add comment
9. Update status to "resolved"
10. Verify ticket shows as resolved in dashboard

#### Admin Flow: Manage Users
1. Login as admin
2. Navigate to User Management
3. Create new user
4. Update user role
5. Deactivate user
6. Verify changes persist

#### Authentication Flow
1. Access protected route without login → Redirects to login
2. Login with valid credentials → Redirects to dashboard
3. Refresh page → Remains logged in
4. Logout → Clears token, redirects to login

---

## 5. API Endpoint Documentation

### 5.1 Authentication Routes (`/api/auth`)

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/api/auth/login` | No | Login and receive JWT token |

### 5.2 Ticket Routes (`/api/tickets`)

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/api/tickets` | Yes | List tickets with filters and pagination |
| POST | `/api/tickets` | Yes | Create new ticket with AI analysis |
| GET | `/api/tickets/:id` | Yes | Get ticket details |
| PATCH | `/api/tickets/:id` | Yes | Update ticket (status, priority, assign, deadline) |
| DELETE | `/api/tickets/:id` | Yes | Delete ticket |
| POST | `/api/tickets/:id/re-analyze` | Yes | Re-run AI analysis on ticket |
| GET | `/api/tickets/:id/comments` | Yes | Get ticket comments |
| POST | `/api/tickets/:id/comments` | Yes | Add comment to ticket |
| GET | `/api/tickets/summary/stats` | Yes | Get ticket statistics |
| POST | `/api/tickets/:id/smart-assign` | Yes | AI-suggested ticket assignment |
| GET | `/api/tickets/export/:format` | Yes | Export tickets (csv/json) |
| POST | `/api/tickets/suggest-sort` | Yes | Get suggested ticket sorting |

### 5.3 User Routes (`/api/users`)

| Method | Endpoint | Auth Required | Admin Only | Description |
|--------|----------|---------------|------------|-------------|
| GET | `/api/users` | Yes | Yes | List all users |
| POST | `/api/users` | Yes | Yes | Create new user |
| GET | `/api/users/me` | Yes | No | Get current user profile |
| PATCH | `/api/users/me/password` | Yes | No | Update own password |
| PATCH | `/api/users/me/preferences` | Yes | No | Update own preferences |
| PATCH | `/api/users/:id/role` | Yes | Yes | Update user role |
| PATCH | `/api/users/:id/active` | Yes | Yes | Activate/deactivate user |

### 5.4 Error Responses

All endpoints return consistent error format:

**400 Bad Request** (Validation Error):
```json
{
  "error": "Validation failed",
  "message": "Title must be at least 3 characters"
}
```

**401 Unauthorized**:
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing token"
}
```

**403 Forbidden**:
```json
{
  "error": "Forbidden",
  "message": "Admin access required"
}
```

**404 Not Found**:
```json
{
  "error": "Not Found",
  "message": "Ticket not found"
}
```

**500 Internal Server Error**:
```json
{
  "error": "Internal Server Error",
  "message": "Database connection failed"
}
```

---

## 6. Code Documentation Standards

### 6.1 File Structure Documentation

Each major file should include a header comment describing its purpose:

```typescript
/**
 * Ticket Routes
 * 
 * Handles all HTTP endpoints related to ticket management:
 * - CRUD operations (create, read, update, delete)
 * - AI analysis and re-analysis
 * - Comments and activity logs
 * - Smart assignment
 * - Export functionality
 * 
 * All routes require authentication via JWT token.
 */
```

### 6.2 Function Documentation

Use JSDoc-style comments for functions:

```typescript
/**
 * Analyzes a ticket using rule-based NLP to predict category,
 * urgency, sentiment, and priority.
 * 
 * @param input - Ticket title and description
 * @returns AI analysis result with scores and predictions
 * 
 * @example
 * const analysis = await analyzeTicket({
 *   title: "System is down",
 *   description: "Users cannot access the application"
 * });
 * // Returns: { predicted_category: "technical", urgency_score: 9.0, ... }
 */
export async function analyzeTicket(input: AiAnalysisInput): Promise<AiAnalysisResult> {
  // Implementation
}
```

### 6.3 Type/Interface Documentation

Document complex types:

```typescript
/**
 * AI Analysis Result
 * 
 * Contains all predictions and scores generated by the AI service
 * for a given ticket.
 */
export interface AiAnalysisResult {
  /** Predicted ticket category (e.g., "technical", "billing") */
  predicted_category: string
  
  /** Confidence score for category prediction (0-1) */
  category_confidence: number
  
  /** Urgency score (0-10) */
  urgency_score: number
  
  /** Urgency level classification */
  urgency_level: 'low' | 'medium' | 'high'
  
  /** Sentiment score (-1 to 1) */
  sentiment_score: number
  
  /** Sentiment label */
  sentiment_label: 'calm' | 'frustrated' | 'angry'
  
  /** Calculated priority score */
  priority_score: number
  
  /** Priority level classification */
  priority_level: 'low' | 'medium' | 'high' | 'critical'
  
  /** Human-readable summary of the ticket */
  summary: string
  
  /** Suggested next steps for handling the ticket */
  suggested_steps: string
  
  /** Raw explanation data */
  explanation_json: Record<string, any>
}
```

### 6.4 Inline Comments

Use inline comments for complex logic:

```typescript
// Calculate priority score as weighted combination of urgency and sentiment
// Higher urgency and negative sentiment increase priority
const priorityScore = (urgencyScore * 0.7) + (Math.abs(sentimentScore) * 0.3);
```

### 6.5 README Updates

Keep `README.md` updated with:
- New features added
- API changes
- Environment variable changes
- Database migration notes

---

## 7. Test Data Setup

### 7.1 Creating Test Users

Use the server scripts or API to create test users:

**Admin User**:
```sql
INSERT INTO users (id, email, password_hash, role, name, is_active)
VALUES (
  gen_random_uuid(),
  'admin@test.com',
  '$2b$10$hashedpassword', -- Use bcrypt to hash 'admin123'
  'admin',
  'Test Admin',
  true
);
```

**Agent User**:
```sql
INSERT INTO users (id, email, password_hash, role, name, is_active)
VALUES (
  gen_random_uuid(),
  'agent@test.com',
  '$2b$10$hashedpassword', -- Use bcrypt to hash 'agent123'
  'agent',
  'Test Agent',
  true
);
```

### 7.2 Sample Tickets

Create sample tickets with varying:
- Statuses (open, in_progress, resolved)
- Priorities (low, medium, high, critical)
- Categories (technical, billing, feature_request)
- Urgency levels
- Sentiment labels

### 7.3 Database Reset Script

Create a script to reset test database:
```bash
# Drop and recreate tables
# Run migrations
# Insert test data
```

---

## 8. Testing Checklist Summary

Before deploying or submitting:

- [ ] All manual test cases pass
- [ ] All API endpoints tested and documented
- [ ] Frontend components render correctly
- [ ] Authentication and authorization work correctly
- [ ] AI analysis produces expected results
- [ ] Error handling works (validation, 401, 403, 404, 500)
- [ ] Database migrations run successfully
- [ ] Code follows documentation standards
- [ ] README is up to date
- [ ] No console errors in browser
- [ ] No TypeScript compilation errors
- [ ] ESLint passes (`npm run lint`)

---

## 9. Future Testing Improvements

Consider adding:

1. **Automated Unit Tests**: Jest/Vitest for services and utilities
2. **Integration Tests**: Supertest for API endpoints
3. **E2E Tests**: Playwright or Cypress for full user flows
4. **Performance Tests**: Load testing for API endpoints
5. **AI Analysis Tests**: Test cases for edge cases in AI logic
6. **Accessibility Tests**: WCAG compliance checking

---

*Last Updated: January 30, 2026*
