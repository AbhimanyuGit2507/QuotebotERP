# Quotebot Inbox Seeding - Complete Guide

## ✅ Inbox Seeding Status

The inbox database has been successfully seeded with **213 realistic messages** across **89 conversations**, with proper relationships to RFQs, quotations, and clients.

## 📊 Inbox Data Summary

### Conversation Breakdown:

```
✅ Total Conversations: 89
   
   RFQ-Related: 45 conversations
   ├─ Email: 28 conversations
   ├─ WhatsApp: 17 conversations
   └─ Status: Varies by RFQ status (open/closed)
   
   Quotation-Related: 35 conversations
   ├─ Email: 35 conversations (all email)
   └─ Status: Varies by quotation status
   
   General Business: 9 conversations
   ├─ Email: 5 conversations (55%)
   ├─ WhatsApp: 4 conversations (45%)
   └─ Topics: Orders, Support, Inquiries, Payments

Total Messages: 213
├─ RFQ Messages: 125
├─ Quotation Messages: 67
└─ General Messages: 21
```

### Channel Distribution:

```
Email: 58 conversations (65%)
├─ RFQs: 28 (responses about quotations)
├─ Quotations: 35 (formal quotes)
└─ General: 5 (business inquiries)

WhatsApp: 20 conversations (22%) 
├─ RFQs: 17 (quick discussions)
├─ General: 4 (informal chats)
└─ Quotations: 0 (formal channel)

Manual: Tracked in RFQ channel
```

## 💬 Conversation Types

### 1. RFQ-Related Conversations (45 total)
**Purpose**: Track communication around request for quotations

**Components**:
- Initial client inquiry message
- 1-3 internal user responses (inventory check, quotation prep)
- Client follow-up message (varies by RFQ status)

**Message Examples**:
- Initial: "Can you provide a quotation for these items?"
- Internal: "Thanks for your inquiry! Let me check our inventory..."
- Response: "Great news! We have all items in stock..."
- Follow-up: "Perfect! Please proceed with the order."

**Linked To**: 
- RFQ ID (each conversation tied to specific RFQ)
- Client ID (auto-linked)
- RFQ Channel (email, whatsapp, manual)

**Status Flow**:
```
Pending RFQ  → Open conversation (no final response)
Quoted RFQ   → Open conversation (client received quote)
Accepted RFQ → Closed conversation (order confirmed)
Rejected RFQ → Closed conversation (declined)
```

### 2. Quotation Discussions (35 total)
**Purpose**: Formal quotation exchanges and acceptance/rejection

**Components**:
- Sales user sends quotation
- Follow-up messages with details
- Client response (varies by status)

**Message Examples Variations**:
- **Draft Status**: "Just sending the formal quote document..."
- **Sent Status**: "Quotation attached. Pricing valid for 30 days."
- **Accepted**: "Thank you! Please proceed with the order."
- **Pending**: "We're still evaluating your offer..."
- **Declined**: "Thanks for your quote. We've chosen another vendor."

**Linked To**:
- Quotation ID (each conversation tied to specific quotation)
- Client ID (auto-linked)
- Always Email channel (formal communication)

### 3. General Business Conversations (9 total)
**Purpose**: Non-RFQ/Quote conversations (support, inquiries, etc.)

**Subjects**:
- Product Inquiries: "Do you have these models available?"
- Order Status: "What's the status of my recent order?"
- Technical Support: "Having an issue with the product..."
- Payment Arrangements: "Discuss invoice and payment terms"
- Account Inquiries: "Information about our account"
- Feedback: "Great service! Thanks for the support"

**Channels**:
- Email (55% - formal inquiries)
- WhatsApp (45% - quick chit-chat)

**Message Patterns**:
1. **Client Initiated** → Support asked
   - "I need technical support..."
   - "Can you help with..."
2. **Internal Initiated** → Follow-up
   - "How can I help you?"
   - "Let me check that for you"
3. **Building Conversation** → 1-2 more exchanges
   - Back and forth informal
   - Resolution-focused

## 👤 Message Senders

### Internal Users (4 total):
- Admin User (admin@quotebot.com)
- John Manager (john@quotebot.com)
- Sarah Sales (sarah@quotebot.com)
- Mike Support (mike@quotebot.com)

**Identified By**:
- `sender_id` = User ID
- `sender_name` = User name
- `sender_email` = User email

### External Senders (Clients):
- 15 different clients across 89 conversations
- **Identified By**:
  - `sender_id` = NULL (external)
  - `sender_name` = Client name
  - `sender_email` = Client email

## 🔗 Message Properties

Each message includes:

```json
{
  "id": "cuid",
  "conversation_id": "linked to Conversation",
  "tenant_id": "shared tenant",
  "sender_id": "User ID or null (if client)",
  "sender_name": "Display name",
  "sender_email": "Email address",
  "body": "Message content",
  "channel": "email or whatsapp",
  "is_read": false or true,
  "created_at": "ISO timestamp"
}
```

## 📅 Timeline

**All Conversations**:
- Created within last 90 days
- Realistic spacing between messages (hours/days apart)
- RFQ conversations older than quotation conversations
- General conversations randomly distributed

**Time Progression**:
```
90 days ago  ← First RFQ conversations
60 days ago  ← More RFQs + General chats
30 days ago  ← Quotation conversations
Today        ← Most recent messages
```

## 🗂️ Database Access

### View Conversations:

```sql
-- All conversations
SELECT id, subject, channel, status, created_at FROM "Conversation" ORDER BY created_at DESC;

-- RFQ-linked conversations
SELECT c.id, c.subject, c.channel, c.status, c.rfq_id 
FROM "Conversation" c
WHERE c.rfq_id IS NOT NULL;

-- Quotation-linked conversations
SELECT c.id, c.subject, c.channel, c.status, c.quotation_id 
FROM "Conversation" c
WHERE c.quotation_id IS NOT NULL;

-- Unread conversations
SELECT c.id, c.subject, c.unread_count 
FROM "Conversation" c
WHERE c.unread_count > 0;

-- Messages per client
SELECT c.client_id, COUNT(m.id) as message_count
FROM "Conversation" c
LEFT JOIN "Message" m ON c.id = m.conversation_id
GROUP BY c.client_id
ORDER BY message_count DESC;
```

### View Messages:

```sql
-- All messages
SELECT id, sender_name, body, channel, is_read, created_at 
FROM "Message" 
ORDER BY created_at DESC
LIMIT 50;

-- Messages from specific conversation
SELECT m.* FROM "Message" m
WHERE m.conversation_id = 'conversation_id_here'
ORDER BY m.created_at ASC;

-- Unread messages
SELECT m.* FROM "Message" m
WHERE m.is_read = false
ORDER BY m.created_at DESC;

-- Messages by channel
SELECT channel, COUNT(*) as count FROM "Message" GROUP BY channel;

-- Messages by sender
SELECT sender_name, COUNT(*) as message_count
FROM "Message"
WHERE sender_id IS NOT NULL
GROUP BY sender_name;
```

## 🔄 Regenerating Inbox Data

To reset and reseed only the inbox (keeping business data):

```bash
cd /home/avi/Projects/Quotebot/backend

# Delete conversation and message data
npx prisma db execute "DELETE FROM \"Message\"; DELETE FROM \"Conversation\";"

# Run inbox seed
node scripts/seed-inbox.js
```

To regenerate everything (database + inbox):

```bash
# Reset entire database
npx prisma migrate reset --force

# Seed main business data
node scripts/seed-database.js

# Seed inbox conversations
node scripts/seed-inbox.js
```

## 📋 Seeding Scripts

### Location:
- Main Database: `/backend/scripts/seed-database.js`
- Inbox Data: `/backend/scripts/seed-inbox.js`

### Main Database Script Features:
- ✅ 1 Tenant, 4 Users, 4 Roles
- ✅ 6 Categories, 15 Products
- ✅ 15 Clients (5 top, 6 regular, 4 new tier)
- ✅ 45 RFQs (email 40%, whatsapp 35%, manual 25%)
- ✅ 35 Quotations (various statuses)
- ✅ 83 Activities, 30 Audit Logs

### Inbox Script Features:
- ✅ 45 RFQ conversations + messages
- ✅ 35 Quotation conversations + messages
- ✅ 9 General business conversations
- ✅ 213 total messages
- ✅ Realistic timelines and spacing
- ✅ Both email and WhatsApp channels
- ✅ Internal user attribution
- ✅ Client message attribution

## 🎯 Frontend Integration

### Inbox Page Should Display:
1. **Conversation List** (left panel):
   - 89 total conversations
   - Filtered by: All, RFQ, Quote, General
   - Sorted by: Last activity
   - Unread indicator (varies by conversation)

2. **Message View** (main panel):
   - Full message thread
   - Sender info (name, email, avatar)
   - Timestamp for each message
   - Channel badge (Email/WhatsApp)
   - Read/Unread status

3. **Message Details**:
   - Linked RFQ (if applicable)
   - Linked Quotation (if applicable)
   - Client name and contact
   - Conversation status (open/closed)

### Expected Analytics:
- **Total Conversations**: 89
- **Total Messages**: 213
- **Active Conversations**: ~65 (open status)
- **Closed**: ~24 (archived/completed)
- **Email**: 65%
- **WhatsApp**: 35%
- **Avg Messages/Conversation**: 2.4

## 📝 Notes

- All messages have realistic content based on business context
- External senders (clients) properly identified with null `sender_id`
- Internal senders have valid User IDs
- Timestamps realistic with proper spacing
- Conversations linked to actual RFQs/Quotations
- Channel matches parent RFQ channel when applicable
- Unread counts vary to show engagement

## ✨ Next Steps

1. **Frontend Inbox Component**: Display 89 conversations
2. **Message Threading**: Show full conversation history
3. **Search & Filter**: By client, channel, date range
4. **Export**: Export conversations as PDF/CSV
5. **Notifications**: Mark as read/unread
6. **Reply**: Add new messages to existing conversations

---

**Last Updated**: March 17, 2026
**Inbox Database Tables**: 2 (Conversation, Message)
**Total Inbox Records**: 302 (89 conversations + 213 messages)
**Seed Script Status**: ✅ Automated and reproducible
