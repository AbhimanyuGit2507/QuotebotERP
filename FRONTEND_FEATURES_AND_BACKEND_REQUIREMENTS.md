# Quotebot Frontend Features & Backend Requirements

**Document Date:** March 12, 2026  
**Frontend Status:** ✅ Complete (All features functional with dummy data)  
**Backend Status:** 🔴 Not Started (Endpoints required)

---

## 📑 Table of Contents

1. [Frontend Pages Overview](#frontend-pages-overview)
2. [Detailed Page Features](#detailed-page-features)
3. [Global Features](#global-features)
4. [Backend API Endpoints Required](#backend-api-endpoints-required)
5. [Data Models](#data-models)
6. [Implementation Priority](#implementation-priority)

---

## 🏠 Frontend Pages Overview

| Page | Route | Status | Key Features |
|------|-------|--------|--------------|
| Dashboard | `/` | ✅ Complete | KPI cards, charts, quick actions, activity feed |
| Quotations | `/quotations` | ✅ Complete | CRUD, PDF export, email, duplicate, CSV export |
| Products | `/products` | ✅ Complete | CRUD, CSV export, category/status filters |
| ClientLedger | `/clients` | ✅ Complete | CRUD, CSV export, tier filters, transaction history |
| RFQInbox | `/rfq-inbox` | ✅ Complete | CRUD, convert to quote, CSV export, channel filters |
| Inbox | `/inbox` | ✅ Complete | Message parsing, convert to RFQ, CSV export |
| Analytics | `/analytics` | ✅ Complete | 6 report types, period filters, CSV export |
| SystemConfig | `/settings` | ✅ Complete | Company, email, WhatsApp, automation settings |

---

## 🎯 Detailed Page Features

### 1️⃣ **Dashboard** (`/`)

#### **UI Components:**
- **Top Navigation Bar**
  - Quick Action Buttons:
    - Create Quote → navigates to `/quotations`
    - Go to RFQ Inbox → navigates to `/rfq-inbox`
    - Manage Products → navigates to `/products`
  - Last updated timestamp with Refresh button

- **KPI Cards (6 total)** - ALL CLICKABLE
  - Total RFQs → navigate to `/rfq-inbox`
  - Quotes Sent → navigate to `/quotations`
  - Accepted Quotes → navigate to `/quotations`
  - Declined Quotes → navigate to `/quotations`
  - Products → navigate to `/products`
  - Clients → navigate to `/clients`

- **Charts (3 total)** - ALL CLICKABLE
  1. **RFQ vs Quote Trend** (7-day bar chart) → navigate to `/rfq-inbox`
  2. **Quote Status** (pie chart: Accepted/Declined/Pending) → navigate to `/quotations`
  3. **RFQ by Channel** (horizontal bars: Email/WhatsApp/Manual) → navigate to `/rfq-inbox`

- **Recent RFQs Table**
  - Columns: Date, RFQ Number, Client, Items, Value, Status, Action button
  - Max 5 rows
  - View All button → navigate to `/rfq-inbox`

- **Right Sidebar**
  - Activity Feed (recent RFQs and quotes)
  - System Status (WhatsApp, Email, Pending RFQs)
  - Quick Stats (Products, Clients, Gold tier clients, Draft quotes)

#### **Functional Buttons:**
- ✅ All KPI cards (6) - navigate to pages
- ✅ All charts (3) - navigate to pages
- ✅ Refresh dashboard
- ✅ Create Quote button
- ✅ Go to RFQ Inbox button
- ✅ Manage Products button
- ✅ View All RFQs button
- ✅ Recent RFQ rows (View button)
- ✅ Activity feed action buttons

#### **Data Displayed:**
- Total RFQs (count + pending count)
- Quotes Sent (count + total)
- Accepted Quotes (count + acceptance rate %)
- Declined Quotes (count + decline rate %)
- Active Products (count)
- Gold Tier Clients (count)
- 7-day RFQ trend data
- Quote status distribution (%)
- RFQ channel distribution (%)
- Recent RFQs (date, number, client, items, value, status)
- Activity feed messages (time, action, link)

#### **Backend Endpoints Needed:**
```
GET /api/dashboard/kpis
GET /api/dashboard/charts/rfq-vs-quotes
GET /api/dashboard/charts/quote-status
GET /api/dashboard/charts/rfq-by-channel
GET /api/rfqs?limit=5&sort=-date
GET /api/dashboard/activity-feed
GET /api/dashboard/system-status
```

---

### 2️⃣ **Quotations** (`/quotations`)

#### **UI Components:**

- **Left Panel - Quote List**
  - Search bar (by quote number or client name)
  - Status filter dropdown (All/Draft/Sent/Accepted/Declined)
  - Export CSV button
  - New Quote button
  - List of quotes with:
    - Quote number
    - Client name
    - Date
    - Status badge
    - Selected state highlighting

- **Right Panel - Quote Details**
  - Quote Header (number, date, status)
  - Bill To Section
    - Client name, email, phone, GST
  - Line Items Table
    - Columns: Product, Qty, Unit, Price, Tax %, Total
    - Add/Edit/Delete row buttons
  - Summary Section
    - Subtotal, Tax (%), Tax Amount, Total
  - Action Buttons:
    - ✅ Print (generates PDF)
    - ✅ Email (opens mailto)
    - ✅ Duplicate (creates copy)
    - ✅ Delete (with confirm)
    - Edit button
    - Save button (when editing)
  - Valid Until date
  - Terms & Conditions textarea
  - Attachments section

#### **Functional Buttons:**
- ✅ Search quotes (by number/client)
- ✅ Filter by status
- ✅ CSV export (filtered quotes)
- ✅ New Quote (opens modal)
- ✅ Select quote (loads details)
- ✅ Print Quote (PDF generation)
- ✅ Email Quote (mailto link)
- ✅ Duplicate Quote (creates copy)
- ✅ Delete Quote (confirm modal)
- ✅ Edit Quote (inline editing)
- ✅ Add Line Item
- ✅ Delete Line Item
- ✅ Save Changes

#### **Keyboard Shortcuts:**
- `Ctrl+N` - New Quote
- `Ctrl+P` - Print Quote
- `Ctrl+E` - Email Quote
- `Ctrl+D` - Duplicate Quote
- `Ctrl+Shift+Q` - Navigate to this page

#### **Data Displayed:**
- Quote number, date, client, status
- Client details (email, phone, GST)
- Line items (product, qty, unit, price, tax, total)
- Subtotal, tax amount, total amount
- Valid until date
- Terms & conditions

#### **Backend Endpoints Needed:**
```
GET /api/quotations
GET /api/quotations/:id
POST /api/quotations (create)
PUT /api/quotations/:id (update)
DELETE /api/quotations/:id
POST /api/quotations/:id/duplicate
POST /api/quotations/:id/send-email
GET /api/quotations?search=&status=
```

---

### 3️⃣ **Products** (`/products`)

#### **UI Components:**

- **Left Panel - Product List**
  - Search bar (by name/SKU)
  - Category filter dropdown
  - Status filter dropdown (All/Active/Inactive)
  - CSV export button
  - New Product button
  - Product list with:
    - SKU, Name, Category
    - Price, Stock
    - Status badge
    - Selected highlighting

- **Right Panel - Product Details**
  - Product Header (SKU, name)
  - Basic Info Section
    - Name, SKU, Category, Unit
    - Price, Cost
    - Stock quantity
    - Reorder level
  - Tax & Compliance Section
    - HSN Code
    - GST %
    - Description
  - Stock Management
    - Current stock
    - Reorder level
    - Stock status indicator
  - Status toggle (Active/Inactive)
  - Action Buttons:
    - ✅ Edit
    - ✅ Delete (with confirm)
    - ✅ Save (when editing)
    - ✅ Upload Image (placeholder)

#### **Functional Buttons:**
- ✅ Search products (by name/SKU)
- ✅ Filter by category
- ✅ Filter by status
- ✅ CSV export (filtered products)
- ✅ New Product (opens modal)
- ✅ Select product (loads details)
- ✅ Edit Product (inline editing)
- ✅ Delete Product (confirm modal)
- ✅ Save Changes
- ✅ Toggle status (Active/Inactive)
- ✅ Upload Image

#### **Keyboard Shortcuts:**
- `Ctrl+N` - New Product
- `Ctrl+F` - Focus search
- `Ctrl+Shift+E` - Export CSV
- `Ctrl+Shift+P` - Navigate to this page

#### **Data Displayed:**
- SKU, Name, Category, Unit
- Price, Cost, Margin
- Stock, Reorder level
- HSN, GST %
- Description
- Status

#### **Backend Endpoints Needed:**
```
GET /api/products
GET /api/products/:id
POST /api/products (create)
PUT /api/products/:id (update)
DELETE /api/products/:id
GET /api/products/categories
GET /api/products?search=&category=&status=
POST /api/products/:id/upload-image
```

---

### 4️⃣ **ClientLedger** (`/clients`)

#### **UI Components:**

- **Left Panel - Client List**
  - Search bar (by name/email)
  - Tier filter dropdown (All/VIP/Regular/New)
  - CSV export button
  - New Client button
  - Client list with:
    - Name, Type (B2B/B2C)
    - Email, Phone
    - Tier badge
    - Selected highlighting

- **Right Panel - Client Details**
  - Client Header (name, type)
  - Contact Information
    - Email, Phone
    - City, State
    - Website (optional)
  - Tax Information
    - GST number
    - PAN
  - Client Tier
    - Tier dropdown (VIP/Regular/New)
    - Edit button
  - Transaction History (5 most recent)
    - Date, Quote Number, Amount, Status
    - View Quote button
  - Summary Statistics
    - Total Orders
    - Total Value
    - Average Order Value
    - Last Order Date
  - Action Buttons:
    - ✅ Edit
    - ✅ Delete (with confirm)
    - ✅ Create Quote (navigate to quotations)
    - ✅ View History
    - ✅ Save

#### **Functional Buttons:**
- ✅ Search clients (by name/email)
- ✅ Filter by tier
- ✅ CSV export (filtered clients)
- ✅ New Client (opens modal)
- ✅ Select client (loads details)
- ✅ Edit Client (inline editing)
- ✅ Delete Client (confirm modal)
- ✅ Create Quote (navigate to quotations)
- ✅ View Quote (from history)
- ✅ Save Changes

#### **Keyboard Shortcuts:**
- `Ctrl+N` - New Client
- `Ctrl+Shift+C` - Navigate to this page

#### **Data Displayed:**
- Name, Type, Email, Phone
- City, State, Website
- GST, PAN
- Tier (VIP/Regular/New)
- Total Orders, Total Value, Average Order Value
- Last Order Date
- Transaction history (date, quote, amount, status)

#### **Backend Endpoints Needed:**
```
GET /api/clients
GET /api/clients/:id
POST /api/clients (create)
PUT /api/clients/:id (update)
DELETE /api/clients/:id
GET /api/clients/:id/transactions
GET /api/clients?search=&tier=
PUT /api/clients/:id/tier
```

---

### 5️⃣ **RFQInbox** (`/rfq-inbox`)

#### **UI Components:**

- **Left Panel - RFQ List**
  - Search bar (by RFQ number/client)
  - Status filter dropdown (All/Pending/Quoted/Converted/Expired)
  - Channel filter dropdown (All/Email/WhatsApp/Manual)
  - CSV export button
  - New RFQ button
  - RFQ list with:
    - Date, RFQ number
    - Client name
    - Channel icon (email/WhatsApp)
    - Priority badge
    - Status badge
    - Selected highlighting

- **Right Panel - RFQ Details**
  - RFQ Header (number, date, status)
  - Client Information
    - Client name, email, phone
    - GST
  - RFQ Details
    - Channel (Email/WhatsApp/Manual)
    - Priority level (High/Medium/Low)
    - Received date
    - Due date (if set)
  - Requested Items Table
    - Columns: Product, Quantity, Unit, Notes
  - Confidence Score
    - % indicator
    - Color-coded (green/amber/red)
  - Action Buttons:
    - ✅ Convert to Quote (creates quote)
    - ✅ Reply (opens modal)
    - ✅ Forward (opens modal)
    - ✅ Mark as Spam (updates status)
    - ✅ Delete (with confirm)
    - ✅ Edit (inline)
    - ✅ Save

#### **Functional Buttons:**
- ✅ Search RFQs (by number/client)
- ✅ Filter by status
- ✅ Filter by channel
- ✅ CSV export (filtered RFQs)
- ✅ New RFQ (opens modal)
- ✅ Select RFQ (loads details)
- ✅ Convert to Quote (creates quote, marks as converted)
- ✅ Reply to RFQ (mailto/WhatsApp)
- ✅ Forward RFQ
- ✅ Mark as Spam
- ✅ Delete RFQ (confirm modal)
- ✅ Edit RFQ (inline)
- ✅ Save Changes

#### **Keyboard Shortcuts:**
- `Ctrl+N` - New RFQ
- `Ctrl+Shift+R` - Navigate to this page
- `Ctrl+Shift+E` - Export CSV

#### **Data Displayed:**
- RFQ number, date, client, status
- Channel, Priority
- Client details (email, phone, GST)
- Requested items (product, qty, unit, notes)
- Confidence score
- Due date
- Quote history (if converted)

#### **Backend Endpoints Needed:**
```
GET /api/rfqs
GET /api/rfqs/:id
POST /api/rfqs (create)
PUT /api/rfqs/:id (update)
DELETE /api/rfqs/:id
POST /api/rfqs/:id/convert-to-quote
POST /api/rfqs/:id/reply
POST /api/rfqs/:id/forward
PUT /api/rfqs/:id/status
GET /api/rfqs?search=&status=&channel=
```

---

### 6️⃣ **Inbox** (`/inbox`)

#### **UI Components:**

- **Left Panel - Message List**
  - Unread count badge
  - Search bar (by sender/subject)
  - Channel filter dropdown (All/Email/WhatsApp)
  - Status filter dropdown (All/New/Parsed/Needs Review/Duplicate/Failed)
  - CSV export button
  - Message list with:
    - Date & Time
    - Sender (email/phone)
    - Subject
    - Channel icon
    - Status badge
    - Unread indicator
    - Confidence score
    - Selected highlighting

- **Right Panel - Message Details**
  - 3 Tabs: Raw | Parsed | Attachments
  - **Raw Tab:**
    - Raw email/message content
    - Full headers/metadata
  - **Parsed Tab:**
    - Parsed message body
    - Extracted items table:
      - Product, Quantity, Unit
    - Confidence indicator
  - **Attachments Tab:**
    - List of attachments (if any)
    - Download buttons
  - Action Buttons:
    - ✅ Convert to RFQ (creates RFQ, marks as parsed)
    - ✅ Mark as Read
    - ✅ Mark Needs Review
    - ✅ Archive
    - ✅ Delete (with confirm)
    - ✅ Reply
  - Metadata Section
    - Sender, Date, Time
    - Channel, Status
    - Confidence score

#### **Functional Buttons:**
- ✅ Search messages (by sender/subject)
- ✅ Filter by channel
- ✅ Filter by status
- ✅ CSV export (filtered messages)
- ✅ Select message (loads details)
- ✅ Convert to RFQ (creates RFQ, marks parsed)
- ✅ Mark as Read (if unread)
- ✅ Mark Needs Review (status change)
- ✅ Archive (status change)
- ✅ Delete Message (confirm modal)
- ✅ Reply to Sender
- ✅ Download attachments

#### **Keyboard Shortcuts:**
- `Ctrl+Shift+I` - Navigate to this page

#### **Data Displayed:**
- Sender (email/phone), Date, Time
- Subject, Body, Raw content
- Channel (Email/WhatsApp)
- Status (New/Parsed/Needs Review/Duplicate/Failed)
- Extracted items (product, qty, unit)
- Confidence score (%)
- Attachments list
- Full message headers

#### **Backend Endpoints Needed:**
```
GET /api/inbox
GET /api/inbox/:id
PUT /api/inbox/:id (mark as read, etc.)
DELETE /api/inbox/:id
POST /api/inbox/:id/convert-to-rfq
POST /api/inbox/:id/parse-message
GET /api/inbox?search=&channel=&status=
GET /api/inbox/:id/attachments
POST /api/inbox/:id/reply
```

#### **Internal Email Integration Endpoints (n8n):**
```
POST /api/internal/email/inbound
     (X-Internal-Key header required)
     Request: { email_account_id, external_id, thread_id, provider, 
                sender_email, sender_name, subject, body, raw_payload, received_at }
     Response: { success, message, conversation_id, client_id, is_duplicate }

GET /api/internal/email/outbound?status=pending
    (X-Internal-Key and X-Tenant-ID headers required)
    Response: { data: [...emails pending send...], count }

PATCH /api/internal/email/outbound/:id
      (X-Internal-Key header required)
      Request: { status, provider?, last_error?, attempts? }
      Response: { success, data: {...updated record} }
```

---

### 7️⃣ **Analytics** (`/analytics`)

#### **UI Components:**

- **Left Panel - Report Selection**
  - 6 Report Options (clickable list):
    1. Sales Trends - Revenue over time
    2. RFQ Analysis - RFQ volume and conversion
    3. Quote Performance - Quote success rates
    4. Product Performance - Best selling products
    5. Client Insights - Client activity and value
    6. Channel Breakdown - RFQ sources analysis

- **Main Content - Report View**
  - **Toolbar:**
    - Period filter dropdown (This Week/Month/Quarter/Year)
    - Apply button
    - Print button
    - Export CSV button
    - Refresh button

  - **Report Header:**
    - Report name, generation date, period
    - Total Revenue display
    - Average Deal Size display

  - **KPI Cards (4 columns):**
    - Report-specific metrics with icons and colors
    - E.g., for RFQ Analysis:
      - Total RFQs (blue)
      - Pending RFQs (yellow)
      - Overall Quote Rate (green)
      - Quote Success Rate (purple)

  - **Detailed Report Data:**
    - Tables/charts specific to report type
    - Sortable columns
    - Row-level details

#### **Functional Buttons:**
- ✅ Select report (loads report data)
- ✅ Filter by period (week/month/quarter/year)
- ✅ Apply filters
- ✅ Print report (window.print)
- ✅ CSV export (smart export based on report type)
- ✅ Refresh report data

#### **Keyboard Shortcuts:**
- `Ctrl+Shift+A` - Navigate to this page

#### **Data Displayed (by Report Type):**
1. **Sales Trends:**
   - Revenue by period (line chart)
   - Top products by revenue
   - Daily/weekly/monthly sales

2. **RFQ Analysis:**
   - Total RFQs, Pending, Quoted
   - RFQ trend chart
   - Average items per RFQ
   - Top 10 clients by RFQ count

3. **Quote Performance:**
   - Total quotes, Accepted, Declined, Pending
   - Conversion rate (%)
   - Average quote value
   - Quote success trend

4. **Product Performance:**
   - Top 10 products by sales
   - Product revenue ranking
   - Stock levels
   - Product performance trend

5. **Client Insights:**
   - Total clients, Gold tier, Regular, New
   - Client lifetime value distribution
   - Top 10 clients by value
   - Client activity timeline

6. **Channel Breakdown:**
   - RFQ volume by channel (Email/WhatsApp/Manual)
   - Conversion rate by channel
   - Channel performance comparison
   - Channel growth trend

#### **Backend Endpoints Needed:**
```
GET /api/analytics/sales-trends?period=
GET /api/analytics/rfq-analysis?period=
GET /api/analytics/quote-performance?period=
GET /api/analytics/product-performance?period=
GET /api/analytics/client-insights?period=
GET /api/analytics/channel-breakdown?period=
GET /api/analytics/top-products?limit=10&period=
GET /api/analytics/top-clients?limit=10&period=
```

---

### 8️⃣ **SystemConfig** (`/settings`)

#### **UI Components:**

- **Left Sidebar - Config Tabs (9 tabs):**
  1. Company
  2. Communication
  3. WhatsApp
  4. Templates
  5. Automation
  6. Notifications
  7. Integrations
  8. Billing
  9. Security

- **Top Toolbar:**
  - Save button
  - Discard button (if unsaved changes)
  - Unsaved indicator badge

#### **Tab 1: Company Settings**
  - Company Name (text input)
  - Trading Name (text input)
  - Logo Upload (file input)
  - GSTIN (text input with validation)
  - PAN (text input with validation)
  - Address (textarea)
  - City (text input)
  - State (dropdown)
  - Currency (dropdown - INR selected)
  - ✅ Save and Discard buttons

#### **Tab 2: Communication**
  - **Email Providers Section:**
    - 4 provider cards (Gmail, Outlook, SMTP, Quotebot Email)
    - Connected/Not Connected badges
    - Connect/Disconnect buttons
    - Default send-from dropdown
  - ✅ Each provider has connect modal with auth fields

#### **Tab 3: WhatsApp Settings**
  - WhatsApp Connection Status toggle
  - Business Name (text input)
  - Business Phone (text input)
  - WhatsApp Category (dropdown)
  - Logo/Avatar Upload
  - Auto-reply toggle
  - Auto-reply message (textarea)
  - ✅ Connect WhatsApp button (opens modal)
  - Test connection button

#### **Tab 4: Templates**
  - Quote Template Editor (textarea)
  - RFQ Response Template (textarea)
  - Email Signature (textarea)
  - SMS Template (textarea - for future)
  - Default variables help text
  - ✅ Preview button
  - ✅ Save templates

#### **Tab 5: Automation**
  - **Automation Rules List:**
    - Rules table with columns: Condition, Action, Active (toggle)
    - 4 sample rules
    - Add New Rule button
    - Edit/Delete buttons per rule
  - **New Rule Modal:**
    - Condition dropdown (multiple options)
    - Action dropdown
    - Active toggle
    - Save button

#### **Tab 6: Notifications**
  - **Email Notifications (8 checkboxes):**
    - New RFQ received
    - Quote sent successfully
    - Quote viewed by client
    - Quote accepted
    - Quote declined
    - Processing failures
    - Daily summary report
    - Weekly analytics digest
  - **Push Notifications:**
    - Enable push toggle
  - **SMS Notifications (optional for future):**
    - Enable SMS toggle
    - SMS credits display

#### **Tab 7: Integrations**
  - **Connected Services:**
    - Gmail integration status
    - WhatsApp integration status
    - Zapier integration (future)
  - **API Settings:**
    - API Key display (masked)
    - Copy API Key button
    - Regenerate API Key button
  - **Webhooks (future):**
    - Webhook URL configuration

#### **Tab 8: Billing**
  - **Plan Information:**
    - Current plan badge
    - Features included
    - Next billing date
  - **Usage Statistics:**
    - Quotes sent this month
    - RFQs processed
    - API calls used
  - **Payment Method Section:**
    - Saved card info
    - Update payment method button
  - **Invoices:**
    - Previous invoices table
    - Download buttons

#### **Tab 9: Security**
  - **Two-Factor Authentication:**
    - 2FA toggle
    - Setup authenticator button
  - **Password:**
    - Change password button (opens modal)
  - **Active Sessions:**
    - List of active sessions
    - Device info, last active time
    - Logout from session button
  - **Login History:**
    - Table of recent logins
    - Date, device, IP, status

#### **Functional Buttons (All Tabs):**
- ✅ Save Settings (all tabs)
- ✅ Discard Changes (all tabs)
- ✅ Upload Logo/Avatar/Images
- ✅ Connect Email/WhatsApp integrations
- ✅ Toggle notifications (8+ options)
- ✅ Toggle automation rules
- ✅ Add/Edit/Delete automation rules
- ✅ Preview templates
- ✅ Copy API Key
- ✅ Regenerate API Key
- ✅ Download invoices
- ✅ Update payment method
- ✅ Change password
- ✅ Enable/Disable 2FA
- ✅ Logout from sessions
- ✅ Test integrations

#### **Keyboard Shortcuts:**
- `Ctrl+,` - Navigate to Settings
- `Ctrl+S` - Save settings (on any tab)

#### **Data Displayed:**
- Company info (name, GSTIN, PAN, address)
- Email providers (connection status)
- WhatsApp settings (phone, business name)
- Templates (quote, RFQ, email)
- Automation rules (4 sample rules)
- Notification preferences (8+ options)
- Integrations (status, API key)
- Billing (plan, usage, invoices)
- Security (2FA, password, sessions, history)

#### **Backend Endpoints Needed:**
```
GET /api/settings/company
PUT /api/settings/company
GET /api/settings/email-providers
POST /api/settings/email-providers/connect
POST /api/settings/email-providers/:id/disconnect
GET /api/settings/whatsapp
PUT /api/settings/whatsapp
POST /api/settings/whatsapp/connect
POST /api/settings/whatsapp/test
GET /api/settings/templates
PUT /api/settings/templates
GET /api/settings/automation-rules
POST /api/settings/automation-rules
PUT /api/settings/automation-rules/:id
DELETE /api/settings/automation-rules/:id
GET /api/settings/notifications
PUT /api/settings/notifications
GET /api/settings/integrations
GET /api/settings/api-key
POST /api/settings/api-key/regenerate
GET /api/settings/billing
GET /api/settings/invoices
GET /api/settings/security/2fa
POST /api/settings/security/2fa/enable
POST /api/settings/security/password-change
GET /api/settings/security/sessions
POST /api/settings/security/sessions/:id/logout
GET /api/settings/security/login-history
POST /api/settings/file-upload (for images)
```

---

## 🌍 Global Features

### **Navigation**
- Top navigation bar with logo and menu
- Sidebar navigation with 8 main pages
- Breadcrumb navigation (if nested pages)
- Mobile responsive sidebar toggle

### **Keyboard Shortcuts (20+ total)**
| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Global search |
| `Ctrl+/` | Show shortcuts help |
| `Ctrl+,` | Open Settings |
| `Ctrl+N` | New item (context-aware) |
| `Ctrl+P` | Print (context-aware) |
| `Ctrl+E` | Email/Export (context-aware) |
| `Ctrl+D` | Duplicate (context-aware) |
| `Ctrl+S` | Save (context-aware) |
| `Ctrl+Shift+D` | Navigate to Dashboard |
| `Ctrl+Shift+I` | Navigate to Inbox |
| `Ctrl+Shift+R` | Navigate to RFQ Inbox |
| `Ctrl+Shift+Q` | Navigate to Quotations |
| `Ctrl+Shift+P` | Navigate to Products |
| `Ctrl+Shift+C` | Navigate to Clients |
| `Ctrl+Shift+A` | Navigate to Analytics |

### **Data Export (CSV)**
- ✅ Quotations page - Export all/filtered quotes
- ✅ Products page - Export all/filtered products
- ✅ ClientLedger page - Export all/filtered clients
- ✅ RFQInbox page - Export all/filtered RFQs
- ✅ Inbox page - Export all/filtered messages
- ✅ Analytics page - Smart export (exports relevant data for each report)

### **PDF Generation**
- ✅ Quotations - Generate professional quote PDF
  - Company header with GSTIN
  - Bill-to client info
  - Line items table
  - 18% GST calculation
  - Terms & conditions
  - Print-ready format

### **Toast Notifications**
- ✅ Success messages (green)
- ✅ Error messages (red)
- ✅ Info messages (blue)
- ✅ Warning messages (yellow)

### **Confirm Modals**
- ✅ Delete confirmations (quotes, products, clients, RFQs)
- ✅ Discard changes confirmation
- ✅ Dangerous action confirmations

### **Search Functionality**
- ✅ Global search available on all pages
- ✅ Page-specific search filters
- ✅ Keyboard focus for search (`Ctrl+F`)

### **Responsive Design**
- ✅ Desktop-optimized layout
- ✅ Sidebar collapsible (for mobile)
- ✅ Mobile-friendly components

---

## 📡 Backend API Endpoints Required

### **Base URL:** `https://api.quotebot.com/api`

### **1. Authentication Endpoints** (Not yet implemented in frontend)
```
POST   /auth/register           - Register new user
POST   /auth/login              - Login user
POST   /auth/logout             - Logout user
POST   /auth/refresh-token      - Refresh JWT token
POST   /auth/forgot-password    - Request password reset
POST   /auth/reset-password     - Reset password
POST   /auth/2fa/setup          - Setup 2FA
POST   /auth/2fa/verify         - Verify 2FA code
```

### **2. Dashboard Endpoints**
```
GET    /dashboard/kpis                           - Get KPI data
GET    /dashboard/charts/rfq-vs-quotes?days=7   - RFQ vs Quote trend
GET    /dashboard/charts/quote-status            - Quote status distribution
GET    /dashboard/charts/rfq-by-channel          - RFQ by channel breakdown
GET    /dashboard/activity-feed                  - Recent activities
GET    /dashboard/system-status                  - System health status
```

### **3. Quotations Endpoints**
```
GET    /quotations                      - List all quotes
GET    /quotations/:id                  - Get quote details
POST   /quotations                      - Create new quote
PUT    /quotations/:id                  - Update quote
DELETE /quotations/:id                  - Delete quote
POST   /quotations/:id/send-email       - Send quote via email
POST   /quotations/:id/duplicate        - Create duplicate quote
GET    /quotations?search=&status=      - Filter quotes
POST   /quotations/:id/convert-to-invoice - Convert to invoice (future)
```

### **4. Products Endpoints**
```
GET    /products                        - List all products
GET    /products/:id                    - Get product details
POST   /products                        - Create new product
PUT    /products/:id                    - Update product
DELETE /products/:id                    - Delete product
GET    /products/categories             - Get all categories
GET    /products?search=&category=&status= - Filter products
POST   /products/:id/upload-image       - Upload product image
GET    /products/:id/image              - Get product image
```

### **5. Clients Endpoints**
```
GET    /clients                         - List all clients
GET    /clients/:id                     - Get client details
POST   /clients                         - Create new client
PUT    /clients/:id                     - Update client
DELETE /clients/:id                     - Delete client
GET    /clients/:id/transactions        - Get client transaction history
GET    /clients/:id/quotes              - Get client quotes
PUT    /clients/:id/tier                - Update client tier
GET    /clients?search=&tier=           - Filter clients
```

### **6. RFQ Endpoints**
```
GET    /rfqs                            - List all RFQs
GET    /rfqs/:id                        - Get RFQ details
POST   /rfqs                            - Create new RFQ (manual)
PUT    /rfqs/:id                        - Update RFQ
DELETE /rfqs/:id                        - Delete RFQ
POST   /rfqs/:id/convert-to-quote       - Convert RFQ to quote
POST   /rfqs/:id/reply                  - Reply to RFQ
POST   /rfqs/:id/forward                - Forward RFQ
PUT    /rfqs/:id/status                 - Update RFQ status
GET    /rfqs?search=&status=&channel=   - Filter RFQs
```

### **7. Inbox/Email Endpoints**
```
GET    /inbox                           - List all messages
GET    /inbox/:id                       - Get message details
PUT    /inbox/:id                       - Update message (mark read, etc.)
DELETE /inbox/:id                       - Delete message
POST   /inbox/:id/convert-to-rfq        - Convert message to RFQ
POST   /inbox/:id/parse-message         - Parse message content
GET    /inbox/:id/attachments           - Get message attachments
POST   /inbox/:id/reply                 - Reply to message
GET    /inbox?search=&channel=&status=  - Filter messages
GET    /inbox/sync-emails               - Sync email inbox
POST   /inbox/webhook/email             - Webhook for incoming emails
```

### **8. Analytics Endpoints**
```
GET    /analytics/sales-trends?period=     - Sales trend report
GET    /analytics/rfq-analysis?period=     - RFQ analysis report
GET    /analytics/quote-performance?period= - Quote performance report
GET    /analytics/product-performance?period= - Product performance report
GET    /analytics/client-insights?period=  - Client insights report
GET    /analytics/channel-breakdown?period= - Channel breakdown report
GET    /analytics/top-products?limit=&period= - Top products
GET    /analytics/top-clients?limit=&period= - Top clients
GET    /analytics/metrics?period=          - Custom metrics
```

### **9. Settings/Configuration Endpoints**
```
GET    /settings/company                - Get company settings
PUT    /settings/company                - Update company settings
POST   /settings/company/upload-logo    - Upload company logo

GET    /settings/email-providers        - List email providers
POST   /settings/email-providers/connect - Connect email provider
POST   /settings/email-providers/:id/disconnect - Disconnect email
POST   /settings/email-providers/:id/test - Test email connection

GET    /settings/whatsapp               - Get WhatsApp settings
PUT    /settings/whatsapp               - Update WhatsApp settings
POST   /settings/whatsapp/connect       - Connect WhatsApp
POST   /settings/whatsapp/test          - Test WhatsApp connection

GET    /settings/templates              - Get all templates
PUT    /settings/templates              - Update templates

GET    /settings/automation-rules       - List automation rules
POST   /settings/automation-rules       - Create automation rule
PUT    /settings/automation-rules/:id   - Update automation rule
DELETE /settings/automation-rules/:id   - Delete automation rule

GET    /settings/notifications          - Get notification settings
PUT    /settings/notifications          - Update notification settings

GET    /settings/integrations           - Get integrations status
POST   /settings/integrations/:id/connect - Connect integration

GET    /settings/api-key                - Get API key
POST   /settings/api-key/regenerate     - Regenerate API key

GET    /settings/billing                - Get billing info
GET    /settings/invoices               - Get invoices list
GET    /settings/invoices/:id           - Download invoice

GET    /settings/security/2fa           - Get 2FA status
POST   /settings/security/2fa/enable    - Enable 2FA
POST   /settings/security/2fa/disable   - Disable 2FA

POST   /settings/security/password-change - Change password

GET    /settings/security/sessions      - Get active sessions
POST   /settings/security/sessions/:id/logout - Logout session

GET    /settings/security/login-history - Get login history

POST   /settings/file-upload            - Upload file (logo, image)
```

### **10. Global/Utility Endpoints**
```
GET    /health                          - API health check
GET    /currencies                      - Get supported currencies
GET    /countries                       - Get supported countries
GET    /states                          - Get states by country
GET    /search                          - Global search across all data
POST   /export                          - Generic export endpoint
POST   /import                          - Generic import endpoint
```

---

## 📊 Data Models

### **Quote Model**
```typescript
interface Quote {
  id: string;
  number: string;           // e.g., "QT/25-26/1001"
  clientId: string;
  client: string;
  clientEmail: string;
  clientPhone: string;
  clientGST: string;
  date: string;             // YYYY-MM-DD
  validUntil: string;       // YYYY-MM-DD
  items: QuoteItem[];
  subtotal: number;
  tax: number;              // 18%
  total: number;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined';
  termsConditions: string;
  createdAt: string;
  updatedAt: string;
}

interface QuoteItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxPercent: number;
  total: number;
}
```

### **Product Model**
```typescript
interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;             // e.g., "Unit", "Box", "Pack"
  price: number;
  cost: number;
  margin: number;
  stock: number;
  reorderLevel: number;
  hsn: string;
  gst: number;              // e.g., 18
  description: string;
  imageUrl?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}
```

### **Client Model**
```typescript
interface Client {
  id: string;
  name: string;
  type: 'B2B' | 'B2C';
  email: string;
  phone: string;
  website?: string;
  address: string;
  city: string;
  state: string;
  gst: string;
  pan: string;
  tier: 'gold' | 'silver' | 'bronze';  // or 'vip' | 'regular' | 'new'
  totalOrders: number;
  totalValue: number;
  lastOrderDate?: string;
  createdAt: string;
  updatedAt: string;
}
```

### **RFQ Model**
```typescript
interface RFQ {
  id: string;
  number: string;           // e.g., "RFQ/25-26/2001"
  clientId: string;
  client: string;
  clientEmail: string;
  clientPhone: string;
  clientGST: string;
  date: string;             // YYYY-MM-DD
  dueDate?: string;
  items: number;            // e.g., 3
  value: string;
  status: 'pending' | 'quoted' | 'converted' | 'expired' | 'declined';
  channel: 'email' | 'whatsapp' | 'manual';
  priority: 'high' | 'medium' | 'low';
  confidenceScore: number;  // 0-100
  createdAt: string;
  updatedAt: string;
}
```

### **Inbox Message Model**
```typescript
interface InboxMessage {
  id: string;
  date: string;
  time: string;
  sender: string;           // email or phone number
  subject: string;
  body: string;
  channel: 'email' | 'whatsapp';
  status: 'new' | 'parsed' | 'needs_review' | 'duplicate' | 'failed';
  isRead: boolean;
  extractedItems: QuoteItem[];
  confidence: number;       // 0-100
  attachments: Attachment[];
  rawContent?: string;
  createdAt: string;
}

interface Attachment {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  url: string;
}
```

### **User/Session Model** (For future auth)
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'sales' | 'manager' | 'user';
  company: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## 🎯 Implementation Priority

### **Phase 1: Core CRUD Operations (Week 1-2)**
Essential for basic functionality:
1. **Quotations** - GET, POST, PUT, DELETE
2. **Products** - GET, POST, PUT, DELETE
3. **Clients** - GET, POST, PUT, DELETE
4. **RFQs** - GET, POST, PUT, DELETE
5. **Auth** - Login, Logout, Token refresh

### **Phase 2: Business Logic (Week 3-4)**
Enhanced functionality:
1. RFQ to Quote conversion
2. Email integration (send quotes)
3. Message parsing (inbox)
4. Automation rules
5. File uploads (images, logos)

### **Phase 3: Integrations (Week 5-6)**
External services:
1. Email provider integration (Gmail, Outlook, SMTP)
2. WhatsApp Business API integration
3. Webhook for incoming emails
4. File storage (AWS S3 or similar)

### **Phase 4: Analytics & Reports (Week 7-8)**
Data insights:
1. Dashboard KPIs
2. Sales trends
3. RFQ analysis
4. Quote performance
5. Product performance
6. Client insights
7. Channel breakdown

### **Phase 5: Advanced Features (Week 9-10)**
Premium functionality:
1. 2FA/Security
2. API key generation
3. Billing integration
4. Advanced automation
5. Custom report builder

---

## 📋 Quick Checklist for Backend Development

### **Must Have (MVP)**
- [ ] User authentication (login/logout)
- [ ] Quote CRUD + PDF generation
- [ ] Product CRUD
- [ ] Client CRUD
- [ ] RFQ CRUD + convert to quote
- [ ] Inbox message sync (at least email)
- [ ] CSV export endpoints
- [ ] Dashboard KPIs
- [ ] Settings save/load

### **Should Have (Phase 2)**
- [ ] Email sending (send quotes)
- [ ] WhatsApp integration
- [ ] Message parsing (AI/NLP)
- [ ] Automation engine
- [ ] Analytics reports
- [ ] File uploads
- [ ] Email provider connections

### **Nice to Have (Phase 3)**
- [ ] Advanced search
- [ ] Custom reports
- [ ] Bulk import/export
- [ ] Webhook integrations
- [ ] API for third-party apps
- [ ] AI-powered insights
- [ ] Mobile app

---

## 🚀 Summary for Backend Team

**Total Pages:** 8  
**Total Buttons:** 100+  
**Total Functional Features:** 50+  
**Total API Endpoints Required:** 80+  
**Estimated Backend Development:** 8-10 weeks  

**Frontend Status:** ✅ COMPLETE - All UI elements functional with dummy data  
**Backend Status:** 🔴 TO START - Implement above endpoints  

All frontend features expect corresponding backend APIs. Frontend handles all UI logic, filtering, searching, and data presentation. Backend should focus on:
1. Data persistence (database)
2. Business logic validation
3. Integration with external services (Email, WhatsApp)
4. Analytics computation
5. Security & authentication

