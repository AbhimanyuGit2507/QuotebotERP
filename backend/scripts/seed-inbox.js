/**
 * Inbox Seeding Script
 * Generates realistic conversations and messages linked to RFQs and Quotations
 * Includes both RFQ-related and general business conversations
 * Supports Email and WhatsApp channels
 */

require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create Prisma adapter
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Message templates for RFQ conversations
const RFQ_CONVERSATION_TEMPLATES = {
  initial_rfq_email: [
    "Hi! I'd like to submit an RFQ for the products mentioned below. Could you please provide a quotation?",
    "We need the following items. Please send us your best quote.",
    "Request for quotation - see details attached. Please respond with your pricing.",
    "Hi, I'm interested in your products. Could you provide a quote for these items?",
  ],
  rfq_inquiry: [
    "Do you have these items in stock? What's the delivery timeline?",
    "Are there any bulk discounts available for these quantities?",
    "Can you provide a breakdown of the pricing?",
    "What are your payment terms?",
    "Do you offer technical support with this product?",
  ],
  rfq_follow_up: [
    "Just following up on the RFQ I sent earlier. When can I expect a quote?",
    "Any updates on the quotation we requested?",
    "Hi! Could you please check on the status of our RFQ?",
    "We need this urgently. Can you expedite the quote?",
  ],
  quote_received_response: [
    "Thanks for the quotation! It looks good. We'd like to proceed.",
    "Thank you for the quote. Could we discuss the terms a bit?",
    "Great! Please go ahead and prepare the formal quotation.",
    "The pricing looks interesting. Can we schedule a call to discuss?",
  ],
  quote_negotiation: [
    "Could you reconsider the pricing? We were expecting a better deal.",
    "Is there any flexibility on the price for bulk orders?",
    "Can you match the competitor's offer?",
    "What if we increase the quantity? Would that bring down the unit cost?",
  ],
  quote_acceptance: [
    "Perfect! Please proceed with the order. We accept your quotation.",
    "Confirmed! Please send the formal order document.",
    "Let's move forward. When can you deliver?",
  ],
  quote_rejection: [
    "Sorry, your pricing is a bit higher than what we expected. Thank you anyway.",
    "We appreciate the quote, but we've decided to go with another vendor.",
    "Thanks for the offer. We'll keep you in mind for future needs.",
  ],
};

// General business conversations (not RFQ-related)
const GENERAL_CONVERSATION_SUBJECTS = [
  "Product inquiry - Server Hardware",
  "Order status update",
  "New product information",
  "Account inquiry",
  "Technical support needed",
  "Payment arrangement",
  "Complaint regarding delivery",
  "Feedback on previous order",
  "Volume discount discussion",
  "Partnership opportunity",
];

const GENERAL_CONVERSATION_MESSAGES = {
  inquiry: [
    "Hi! I'd like to know more about your pricing and delivery options.",
    "Can you send us your product catalog?",
    "Do you have these specific models in stock?",
    "What's your minimum order quantity?",
  ],
  support: [
    "We have an issue with the product we ordered. Can you help?",
    "The unit we received seems to have a defect. What's the warranty?",
    "Can I get technical support on this?",
    "How do I register the product for warranty?",
  ],
  commercial: [
    "Can we negotiate on the bulk pricing?",
    "Can you offer a discount for a quarterly contract?",
    "What are your preferred payment terms?",
    "Do you offer any loyalty programs?",
  ],
  follow_up: [
    "Just checking in. How are you doing?",
    "Thanks for the help last time!",
    "Looking forward to working with you.",
    "Great service! We'd like to place another order.",
  ],
};

function getRandomDate(daysBack = 90) {
  const now = new Date();
  const days = Math.floor(Math.random() * daysBack);
  now.setDate(now.getDate() - days);
  
  // Add random hours and minutes
  now.setHours(Math.floor(Math.random() * 24));
  now.setMinutes(Math.floor(Math.random() * 60));
  
  return now;
}

function formatDateTime(date) {
  return date.toISOString();
}

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

async function seedInbox() {
  try {
    console.log('🌱 Starting inbox seeding...\n');

    // Get tenant (use the most recent one)
    const tenant = await prisma.tenant.findFirst({
      orderBy: { created_at: 'desc' }
    });
    if (!tenant) {
      console.error('❌ No tenant found. Please run the main seed script first.');
      process.exit(1);
    }
    console.log(`📦 Using Tenant: ${tenant.company_name}\n`);

    // Get data
    const users = await prisma.user.findMany({ where: { tenant_id: tenant.id } });
    const clients = await prisma.client.findMany({ where: { tenant_id: tenant.id } });
    const rfqs = await prisma.rFQ.findMany({ where: { tenant_id: tenant.id }, include: { client: true } });
    const quotations = await prisma.quotation.findMany({ where: { tenant_id: tenant.id } });

    console.log(`📊 Found: ${users.length} users, ${clients.length} clients, ${rfqs.length} RFQs, ${quotations.length} quotations\n`);

    let conversationCount = 0;
    let messageCount = 0;

    // 1. Create conversations for existing RFQs
    console.log('💬 Creating RFQ-related conversations...');
    for (const rfq of rfqs) {
      const subject = `RFQ ${rfq.number} - Quote Discussion`;
      
      const conversation = await prisma.conversation.create({
        data: {
          tenant_id: tenant.id,
          client_id: rfq.client_id,
          subject: subject,
          channel: rfq.channel,
          status: rfq.status === 'accepted' ? 'closed' : 'open',
          rfq_id: rfq.id,
          unread_count: Math.random() > 0.6 ? Math.floor(Math.random() * 3) : 0,
          last_message_at: getRandomDate(60),
        },
      });
      conversationCount++;

      // Create initial RFQ message from client
      const conversationDate = getRandomDate(60);
      const initialMessage = await prisma.message.create({
        data: {
          conversation_id: conversation.id,
          tenant_id: tenant.id,
          sender_id: null, // From client
          sender_name: rfq.client.name,
          sender_email: rfq.client.email,
          body: getRandomElement(RFQ_CONVERSATION_TEMPLATES.initial_rfq_email),
          channel: rfq.channel,
          is_read: true,
          created_at: conversationDate,
        },
      });
      messageCount++;

      // Add 1-3 follow-up messages from internal user
      const followUpCount = Math.floor(Math.random() * 3);
      for (let i = 0; i < followUpCount; i++) {
        const msgDate = new Date(conversationDate);
        msgDate.setHours(msgDate.getHours() + (i + 1) * 4 + Math.floor(Math.random() * 24));
        
        let messageBody;
        if (i === 0) {
          messageBody = "Thanks for your inquiry! Let me check our inventory and get back to you.";
        } else if (i === 1) {
          messageBody = "Great news! We have all the items in stock. Please find the quotation attached.";
        } else {
          messageBody = "Let me know if you have any questions about the pricing!";
        }

        await prisma.message.create({
          data: {
            conversation_id: conversation.id,
            tenant_id: tenant.id,
            sender_id: getRandomElement(users).id,
            sender_name: getRandomElement(users).name,
            sender_email: getRandomElement(users).email,
            body: messageBody,
            channel: rfq.channel,
            is_read: true,
            created_at: msgDate,
          },
        });
        messageCount++;
      }

      // Add client response if status is not pending
      if (rfq.status !== 'pending') {
        const responseDate = new Date(conversationDate);
        responseDate.setDate(responseDate.getDate() + Math.floor(Math.random() * 7) + 1);
        
        let clientResponse;
        if (rfq.status === 'quoted') {
          clientResponse = getRandomElement(RFQ_CONVERSATION_TEMPLATES.quote_received_response);
        } else if (rfq.status === 'accepted') {
          clientResponse = getRandomElement(RFQ_CONVERSATION_TEMPLATES.quote_acceptance);
        } else {
          clientResponse = getRandomElement(RFQ_CONVERSATION_TEMPLATES.quote_rejection);
        }

        await prisma.message.create({
          data: {
            conversation_id: conversation.id,
            tenant_id: tenant.id,
            sender_id: null,
            sender_name: rfq.client.name,
            sender_email: rfq.client.email,
            body: clientResponse,
            channel: rfq.channel,
            is_read: true,
            created_at: responseDate,
          },
        });
        messageCount++;
      }
    }
    console.log(`✅ Created ${conversationCount} RFQ conversations with ${messageCount} messages\n`);

    // 2. Create conversations for existing Quotations
    console.log('💬 Creating Quotation-related conversations...');
    let quotationConvCount = 0;
    let quotationMsgCount = 0;
    for (const quotation of quotations) {
      const quotClient = clients.find(c => c.id === quotation.client_id);
      if (!quotClient) continue;

      const subject = `Quote ${quotation.number} - Discussion`;
      
      const conversation = await prisma.conversation.create({
        data: {
          tenant_id: tenant.id,
          client_id: quotation.client_id,
          subject: subject,
          channel: 'email', // Quotations are typically via email
          status: quotation.status === 'accepted' ? 'closed' : 'open',
          quotation_id: quotation.id,
          unread_count: quotation.status === 'pending' ? Math.floor(Math.random() * 2) : 0,
          last_message_at: getRandomDate(30),
        },
      });
      quotationConvCount++;

      // Create initial quotation message from internal user
      const quotDate = new Date(quotation.created_at);
      await prisma.message.create({
        data: {
          conversation_id: conversation.id,
          tenant_id: tenant.id,
          sender_id: getRandomElement(users).id,
          sender_name: getRandomElement(users).name,
          sender_email: getRandomElement(users).email,
          body: `Hi ${quotClient.name}, Please find the quotation attached. Please let me know if you have any questions.`,
          channel: 'email',
          is_read: true,
          created_at: quotDate,
        },
      });
      quotationMsgCount++;

      // Add client response if status is not draft
      if (quotation.status !== 'draft') {
        const responseDate = new Date(quotDate);
        responseDate.setDate(responseDate.getDate() + Math.floor(Math.random() * 5) + 1);
        
        let clientReply;
        if (quotation.status === 'sent') {
          clientReply = "Thanks for the quote! We're reviewing it.";
        } else if (quotation.status === 'accepted') {
          clientReply = "Perfect! Please proceed with the order. We're ready!";
        } else if (quotation.status === 'pending') {
          clientReply = "Thank you for the quotation. We're currently evaluating your offer.";
        } else {
          clientReply = "Thanks for the quote. We appreciated your offer but have decided on another supplier.";
        }

        await prisma.message.create({
          data: {
            conversation_id: conversation.id,
            tenant_id: tenant.id,
            sender_id: null,
            sender_name: quotClient.name,
            sender_email: quotClient.email,
            body: clientReply,
            channel: 'email',
            is_read: true,
            created_at: responseDate,
          },
        });
        quotationMsgCount++;
      }
    }
    console.log(`✅ Created ${quotationConvCount} quotation conversations with ${quotationMsgCount} messages\n`);

    // 3. Create general business conversations (not linked to RFQ/Quote)
    console.log('💬 Creating general business conversations...');
    let generalConvCount = 0;
    let generalMsgCount = 0;
    
    const generalConvCount_ = Math.floor(clients.length * 0.6); // 60% of clients have general conversations
    for (let i = 0; i < generalConvCount_; i++) {
      const client = getRandomElement(clients);
      const channel = Math.random() > 0.4 ? 'email' : 'whatsapp';
      const subject = getRandomElement(GENERAL_CONVERSATION_SUBJECTS);
      
      const conversation = await prisma.conversation.create({
        data: {
          tenant_id: tenant.id,
          client_id: client.id,
          subject: subject,
          channel: channel,
          status: Math.random() > 0.3 ? 'open' : 'closed',
          unread_count: Math.random() > 0.7 ? Math.floor(Math.random() * 2) : 0,
          last_message_at: getRandomDate(90),
        },
      });
      generalConvCount++;

      // Create initial message from client or internal user randomly
      const isClientInitiated = Math.random() > 0.4;
      const msgDate = getRandomDate(90);
      
      if (isClientInitiated) {
        let messageCategory = getRandomElement(Object.keys(GENERAL_CONVERSATION_MESSAGES));
        const messageBody = getRandomElement(GENERAL_CONVERSATION_MESSAGES[messageCategory]);

        await prisma.message.create({
          data: {
            conversation_id: conversation.id,
            tenant_id: tenant.id,
            sender_id: null,
            sender_name: client.name,
            sender_email: client.email,
            body: messageBody,
            channel: channel,
            is_read: true,
            created_at: msgDate,
          },
        });
        generalMsgCount++;
      } else {
        const responseBody = "Hi! How can I help you today?";
        await prisma.message.create({
          data: {
            conversation_id: conversation.id,
            tenant_id: tenant.id,
            sender_id: getRandomElement(users).id,
            sender_name: getRandomElement(users).name,
            sender_email: getRandomElement(users).email,
            body: responseBody,
            channel: channel,
            is_read: true,
            created_at: msgDate,
          },
        });
        generalMsgCount++;
      }

      // Add 1-2 follow-up messages
      const followUpMessages = Math.floor(Math.random() * 2) + 1;
      for (let j = 0; j < followUpMessages; j++) {
        const followUpDate = new Date(msgDate);
        followUpDate.setDate(followUpDate.getDate() + j + 1);
        
        const isFromClient = j % 2 === 0;
        let followUpBody;
        
        if (isFromClient) {
          followUpBody = getRandomElement(Object.values(GENERAL_CONVERSATION_MESSAGES).flat());
        } else {
          followUpBody = ["Let me check that for you.", "I'll get back to you shortly.", "Thanks for your patience!"][j % 3];
        }

        await prisma.message.create({
          data: {
            conversation_id: conversation.id,
            tenant_id: tenant.id,
            sender_id: isFromClient ? null : getRandomElement(users).id,
            sender_name: isFromClient ? client.name : getRandomElement(users).name,
            sender_email: isFromClient ? client.email : getRandomElement(users).email,
            body: followUpBody,
            channel: channel,
            is_read: true,
            created_at: followUpDate,
          },
        });
        generalMsgCount++;
      }
    }
    console.log(`✅ Created ${generalConvCount} general conversations with ${generalMsgCount} messages\n`);

    // Summary
    console.log('═══════════════════════════════════════════════════════');
    console.log('✨ INBOX SEEDING COMPLETED SUCCESSFULLY!\n');
    console.log('📊 Summary:');
    console.log(`  • RFQ Conversations: ${conversationCount}`);
    console.log(`  • RFQ Messages: ${messageCount}`);
    console.log(`  • Quotation Conversations: ${quotationConvCount}`);
    console.log(`  • Quotation Messages: ${quotationMsgCount}`);
    console.log(`  • General Conversations: ${generalConvCount}`);
    console.log(`  • General Messages: ${generalMsgCount}`);
    console.log(`  • Total Conversations: ${conversationCount + quotationConvCount + generalConvCount}`);
    console.log(`  • Total Messages: ${messageCount + quotationMsgCount + generalMsgCount}`);
    console.log('═══════════════════════════════════════════════════════\n');
    
    console.log('💬 Channel Breakdown:');
    const allConversations = conversationCount + quotationConvCount + generalConvCount;
    const emailConvCount = await prisma.conversation.count({
      where: { tenant_id: tenant.id, channel: 'email' }
    });
    const whatsappConvCount = await prisma.conversation.count({
      where: { tenant_id: tenant.id, channel: 'whatsapp' }
    });
    console.log(`  • Email: ${emailConvCount} (${Math.round((emailConvCount/allConversations)*100)}%)`);
    console.log(`  • WhatsApp: ${whatsappConvCount} (${Math.round((whatsappConvCount/allConversations)*100)}%)`);
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error during inbox seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding
seedInbox()
  .then(() => {
    console.log('✅ Inbox seed script completed!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Inbox seed script failed:', error);
    process.exit(1);
  });
