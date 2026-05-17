# Quotebot Database Seeding - Complete Guide

## ✅ Seeding Status

The database has been successfully seeded with comprehensive, interconnected dummy data for testing the entire Quotebot platform, including the Analytics page.

## 📊 Data Summary

### Core Entities Created:

```
✅ Tenant: 1
   - ID: cmmutylk90000tne8bo8xwqbj
   - Name: Quotebot Demo

✅ Roles: 4
   - Admin, Manager, Sales, Support

✅ Users: 4
   - Admin User (admin@quotebot.com)
   - John Manager (john@quotebot.com) 
   - Sarah Sales (sarah@quotebot.com)
   - Mike Support (mike@quotebot.com)

✅ Product Categories: 6
   - Electronics, Hardware, Software, Services, Supplies, Equipment

✅ Products: 15
   - Server Hardware, Network Switch, Router, UPS Battery, Database License, CRM Software
   - Backup Solution, IT Consulting, Office Supplies, Printer, Scanner, Monitor, Projector, Access Point
   - Stock: 50-1000 units per product
   - Prices: ₹5,000 - ₹100,000

✅ Clients: 15
   - Top Tier: 5 (Acme, Tech Solutions, Global Enterprises, Manufacturing Pro, Healthcare Plus)
   - Regular Tier: 6 (Innovation Labs, Digital Marketing, Future Systems, Cloud Dynamics, Energy Solutions, Education Network)
   - New Tier: 4 (StartUp Alpha, Quick Services, Retail Hub, Finance First)

✅ RFQs: 45
   - Email Channel: 15 (40%)
   - WhatsApp Channel: 12 (35%)
   - Manual Channel: 18 (25%)
   - Status Distribution: Pending, Quoted, Accepted, Rejected
   - Due Dates: Random dates within last 60 days
   - Confidence Scores: 0-100

✅ Quotations: 35
   - Draft: 8
   - Sent: 7
   - Accepted: 3
   - Declined: 9
   - Pending: 8
   - Items per Quote: 2-5 products
   - Calculated Totals: Subtotal + 18% GST Tax
   - Validity: 30 days from creation

✅ Activities: 87
   - RFQ Creation Records
   - Quotation Actions (Created, Sent)

✅ Audit Logs: 30
   - Product Creation Logs
   - Client Creation Logs
```

## 🔗 Data Relationships

The seeded data is fully interconnected:

```
Clients
  ├── RFQs (45 total from 15 clients)
  │   └── RFQ Items (1-4 items per RFQ)
  │       └── Products (linked)
  └── Quotations (35 total from various clients)
      └── Quotation Items (2-5 items per quote)
          └── Products (with pricing & quantity)

Products (15 total, 6 categories)
  ├── Used in RFQ Items
  └── Used in Quotation Items

Users (4 total)
  ├── Activities (87 records)
  └── Audit Logs (30 records)
```

## 📈 Analytics Data Available

The seeded data provides rich analytics including:

### KPI Cards (on Analytics Dashboard):
- **Total RFQs**: 45
- **Pending RFQs**: Varies based on status distribution
- **Total Quotes**: 35
- **Accepted Quotes**: 3
- **Conversion Rate**: ~9%
- **Top Tier Clients**: 5
- **Regular Tier Clients**: 6  
- **New Tier Clients**: 4
- **Total Products**: 15
- **Active Products**: 15

### Channel Breakdown:
- **Email RFQs**: 40% (15 out of 45)
- **WhatsApp RFQs**: 35% (12 out of 45)
- **Manual RFQs**: 25% (18 out of 45)

### Quotation Status Distribution:
- Draft: 23%
- Sent: 20%
- Accepted: 9%
- Declined: 26%
- Pending: 23%

## 🔐 Test Credentials

Use these credentials to test the application:

```ini
Email:    admin@quotebot.com
Password: Password@123

Alternative Users:
- john@quotebot.com (Manager role)
- sarah@quotebot.com (Sales role)
- mike@quotebot.com (Support role)

All use the same password: Password@123
```

## 🚀 Backend API Endpoints for Analytics

The seeded data can be accessed via these Analytics endpoints:

```bash
# Sales Trends Report
GET /api/analytics/sales-trends?period=month

# RFQ Analysis Report
GET /api/analytics/rfq-analysis?period=quarter

# Quote Performance Report
GET /api/analytics/quote-performance?period=year

# Product Performance Report
GET /api/analytics/product-performance

# Client Insights Report
GET /api/analytics/client-insights

# Channel Breakdown Report
GET /api/analytics/channel-breakdown?period=month
```

## 🗂️ Database Access

### Connection Details:
```
Host: localhost
Port: 5432
Database: quotebot_db
```

### View Data in Database:

```sql
-- Check all clients with tier distribution
SELECT tier, COUNT(*) as count FROM "Client" GROUP BY tier;

-- View RFQs by channel
SELECT channel, COUNT(*) as count FROM "RFQ" GROUP BY channel;

-- Check quotation status distribution
SELECT status, COUNT(*) as count FROM "Quotation" GROUP BY status;

-- See products with stock levels
SELECT name, sku, price, stock FROM "Product" ORDER BY price DESC;

-- View all RFQ items linked to products
SELECT r.number, p.name, i.quantity 
FROM "RFQItem" i
JOIN "RFQ" r ON i.rfq_id = r.id
JOIN "Product" p ON i.product_id = p.id
LIMIT 20;
```

## 🔄 Regenerating the Seed Data

To reset and reseed the database with fresh data:

```bash
# Navigate to backend directory
cd /home/avi/Projects/Quotebot/backend

# Reset the database (deletes all data)
npx prisma migrate reset --force

# Run the seed script
node scripts/seed-database.js
```

## 📋 Seeding Script Details

**Location**: `/home/avi/Projects/Quotebot/backend/scripts/seed-database.js`

**Features**:
- ✅ Creates realistic, connected data
- ✅ Generates random but valid data for all entities
- ✅ Maintains referential integrity (foreign keys)
- ✅ Creates varied quotation statuses
- ✅ Distributes data across channels appropriately
- ✅ Calculates totals with 18% GST tax
- ✅ Maintains client tier distribution
- ✅ Creates audit trails for entities

**Generates**:
- Unique SKUs for products
- Unique emails for clients
- Phone numbers and GST/PAN numbers
- Realistic product categories
- Random dates within 90-day window
- Varied item quantities and prices

## 🎯 Using the Data for Testing

### Frontend Testing:
1. Login with any test credential
2. Navigate to Analytics page
3. View all 6 report types:
   - Sales Trends
   - RFQ Analysis
   - Quote Performance
   - Product Performance
   - Client Insights
   - Channel Breakdown
4. Filter by period (Week/Month/Quarter/Year)
5. Export analytics as CSV

### Backend Testing:
1. Get auth token via login endpoint
2. Call analytics endpoints with the token
3. Verify calculations match UI
4. Test filtering by period and channels

### Load Testing:
The seeded data provides a good baseline:
- 15 clients with varied activity
- 45 RFQs across 3 channels
- 35 quotations with mixed statuses
- 15 products linked to quotes
- 87 activity records
- 30 audit logs

## 📝 Notes

- All data uses realistic Indian business context (GST rates, phone formats, cities)
- Product prices range from ₹5,000 to ₹100,000
- Client tiers follow the distribution: 33% top, 40% regular, 27% new
- RFQ channels follow real-world distribution (email >  WhatsApp > manual)
- Quotation items use real product data with proper relationships
- All dates are auto-generated within the last 90 days for realistic trending

## ✨ Next Steps

1. **Frontend**: Open the app and navigate to Analytics page - all data will be visible
2. **API Testing**: Test analytics endpoints with the seeded data
3. **Filtering**: Test period filters and channel breakdowns
4. **Export**: Try exporting reports as CSV
5. **Custom Data**: Modify the seed script to match your specific business data

---

**Last Updated**: March 17, 2026
**Database Version**: PostgreSQL 12+
**Prisma Version**: ^7.5.0
