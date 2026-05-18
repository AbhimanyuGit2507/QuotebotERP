/* eslint-disable no-console */

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@quotebot.com';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'Admin@123';
const INTERNAL_KEY = process.env.INTERNAL_API_KEY || '';
const INTERNAL_TENANT_ID = process.env.TEST_INTERNAL_TENANT_ID || 'test-tenant-email-api';

const failures = [];
const results = [];

let token = '';
let cookieJar = {}; // name -> value

const state = {
  userId: null,
  productId: null,
  clientId: null,
  rfqId: null,
  quotationId: null,
  quotationIds: [],
  templateId: null,
  ruleId: null,
  fileId: null,
  categoryId: null,
};

function nowTag() {
  return Date.now().toString().slice(-8);
}

async function callApi({
  name,
  method = 'GET',
  path,
  body,
  auth = true,
  expected = [200],
  responseType = 'json',
  customHeaders = {},
}) {
  const headers = { 'X-Requested-With': 'XMLHttpRequest', ...customHeaders };

  // Send stored cookies for authenticated requests
  if (auth && Object.keys(cookieJar).length) {
    headers.Cookie = Object.entries(cookieJar)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  // Fallback: also send Bearer token if available
  if (auth && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const startedAt = Date.now();
  let response;
  let parsedBody = null;
  let rawText = '';

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    // Capture Set-Cookie headers and store in cookie jar
    const setCookies = response.headers.getSetCookie
      ? response.headers.getSetCookie()
      : (response.headers.get('set-cookie') || '').split(/,(?=\s*\w+=)/).filter(Boolean);
    for (const sc of setCookies) {
      const match = sc.match(/^([^=]+)=([^;]*)/);
      if (match) {
        cookieJar[match[1].trim()] = match[2].trim();
      }
    }

    if (responseType === 'buffer') {
      const bytes = await response.arrayBuffer();
      parsedBody = { bytes: bytes.byteLength };
    } else {
      rawText = await response.text();
      try {
        parsedBody = rawText ? JSON.parse(rawText) : null;
      } catch {
        parsedBody = rawText;
      }
    }
  } catch (error) {
    const failure = {
      name,
      method,
      path,
      status: 'NETWORK_ERROR',
      error: error instanceof Error ? error.message : String(error),
      response: null,
    };
    failures.push(failure);
    results.push({ ...failure, ok: false, durationMs: Date.now() - startedAt });
    return { ok: false, body: null, status: 0 };
  }

  const ok = expected.includes(response.status);
  const result = {
    name,
    method,
    path,
    status: response.status,
    ok,
    durationMs: Date.now() - startedAt,
  };

  results.push(result);

  if (!ok) {
    failures.push({
      name,
      method,
      path,
      status: response.status,
      error:
        (parsedBody && parsedBody.message) ||
        (parsedBody && parsedBody.error) ||
        'Unexpected status',
      response: parsedBody,
    });
  }

  return {
    ok,
    status: response.status,
    body: parsedBody,
  };
}

function printSummary() {
  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;

  console.log('\n========================================');
  console.log('Endpoint Smoke Test Summary');
  console.log('========================================');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Total: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (!failures.length) {
    console.log('\nAll tested endpoints passed.');
    return;
  }

  console.log('\nFailed endpoints:');
  failures.forEach((f, index) => {
    console.log(`\n${index + 1}. ${f.method} ${f.path} (${f.name})`);
    console.log(`   Status: ${f.status}`);
    console.log(`   Error: ${typeof f.error === 'string' ? f.error : JSON.stringify(f.error)}`);
    if (f.response !== null) {
      console.log(`   Response: ${JSON.stringify(f.response).slice(0, 800)}`);
    }
  });
}

async function run() {
  const tag = nowTag();

  // Public health/docs/auth endpoints
  await callApi({ name: 'Health Root', path: '/', auth: false, expected: [200] });
  await callApi({ name: 'Health Detailed', path: '/health', auth: false, expected: [200] });
  await callApi({ name: 'Docs', path: '/docs', auth: false, expected: [200] });

  const login = await callApi({
    name: 'Auth Login',
    method: 'POST',
    path: '/auth/login',
    auth: false,
    expected: [200],
    body: {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    },
  });

  // Token is set via HTTP-only cookie (qb_access_token), not in response body
  const cookieToken = cookieJar['qb_access_token'] || '';
  if (!login.ok || (!login.body?.access_token && !cookieToken)) {
    console.error('\nLogin succeeded with HTTP 200 but no token found in body or cookies.');
    printSummary();
    process.exit(1);
    return;
  }

  token = login.body?.access_token || cookieToken;

  await callApi({ name: 'Auth Me', path: '/auth/me', expected: [200] });
  await callApi({ name: 'Auth Validate', method: 'POST', path: '/auth/validate', expected: [200] });
  await callApi({ name: 'Auth Admin Check', path: '/auth/admin-check', expected: [200] });

  // Users
  await callApi({ name: 'Users List', path: '/users', expected: [200] });

  const createdUser = await callApi({
    name: 'Users Create',
    method: 'POST',
    path: '/users',
    expected: [201],
    body: {
      email: `api-test-user-${tag}@quotebot.com`,
      name: `API Test User ${tag}`,
      password: 'Password@123',
      role: 'user',
      status: 'active',
    },
  });

  state.userId = createdUser.body?.id || null;

  if (state.userId) {
    await callApi({ name: 'Users Get One', path: `/users/${state.userId}`, expected: [200] });
    await callApi({
      name: 'Users Update',
      method: 'PUT',
      path: `/users/${state.userId}`,
      expected: [200],
      body: {
        status: 'inactive',
        permissions: {
          modules: [
            {
              module: 'Dashboard',
              fullAccess: true,
              view: true,
              create: true,
              alter: true,
              delete: false,
              print: true,
              special: 'All',
            },
          ],
        },
      },
    });
  }

  // Products
  const categories = await callApi({ name: 'Products Categories', path: '/products/categories', expected: [200] });
  state.categoryId = categories.body?.[0]?.id || null;

  await callApi({ name: 'Products List', path: '/products', expected: [200] });
  await callApi({ name: 'Products Export CSV', path: '/products/export/csv', expected: [200], responseType: 'buffer' });

  if (state.categoryId) {
    const createdProduct = await callApi({
      name: 'Products Create',
      method: 'POST',
      path: '/products',
      expected: [201],
      body: {
        sku: `SKU-${tag}`,
        name: `API Product ${tag}`,
        category_id: state.categoryId,
        unit: 'pcs',
        price: 100,
        cost: 70,
        stock: 10,
        reorder_level: 2,
        hsn: '8471',
        gst_percent: 18,
        description: 'API smoke test product',
        status: 'active',
      },
    });

    state.productId = createdProduct.body?.id || null;

    if (state.productId) {
      await callApi({ name: 'Products Get One', path: `/products/${state.productId}`, expected: [200] });
      await callApi({
        name: 'Products Update',
        method: 'PUT',
        path: `/products/${state.productId}`,
        expected: [200],
        body: { price: 120, stock: 15 },
      });
      await callApi({
        name: 'Products Upload Image',
        method: 'POST',
        path: `/products/${state.productId}/upload-image`,
        expected: [200, 201],
        body: { image_url: 'https://example.com/prod.png' },
      });
    }
  } else {
    failures.push({
      name: 'Products Create',
      method: 'POST',
      path: '/products',
      status: 'SKIPPED',
      error: 'No product category found in database',
      response: null,
    });
  }

  // Clients
  await callApi({ name: 'Clients List', path: '/clients', expected: [200] });
  await callApi({ name: 'Clients Export CSV', path: '/clients/export/csv', expected: [200], responseType: 'buffer' });

  const createdClient = await callApi({
    name: 'Clients Create',
    method: 'POST',
    path: '/clients',
    expected: [201],
    body: {
      name: `API Client ${tag}`,
      type: 'B2B',
      email: `api-client-${tag}@example.com`,
      phone: '9999999999',
      website: 'https://example.com',
      address: '123 Test Street',
      city: 'Bangalore',
      state: 'KA',
      gst: '29ABCDE1234F1Z5',
      pan: 'ABCDE1234F',
      tier: 'regular',
    },
  });

  state.clientId = createdClient.body?.id || null;

  if (state.clientId) {
    await callApi({ name: 'Clients Get One', path: `/clients/${state.clientId}`, expected: [200] });
    await callApi({ name: 'Clients Transactions', path: `/clients/${state.clientId}/transactions`, expected: [200] });
    await callApi({
      name: 'Clients Update Tier',
      method: 'PUT',
      path: `/clients/${state.clientId}/tier`,
      expected: [200],
      body: { tier: 'top' },
    });
    await callApi({
      name: 'Clients Update',
      method: 'PUT',
      path: `/clients/${state.clientId}`,
      expected: [200],
      body: { city: 'Mumbai' },
    });
  }

  // RFQs
  await callApi({ name: 'RFQs List', path: '/rfqs', expected: [200] });
  await callApi({ name: 'RFQs Export CSV', path: '/rfqs/export/csv', expected: [200], responseType: 'buffer' });

  if (state.clientId && state.productId) {
    const createdRfq = await callApi({
      name: 'RFQs Create',
      method: 'POST',
      path: '/rfqs',
      expected: [201],
      body: {
        client_id: state.clientId,
        channel: 'manual',
        priority: 'medium',
        status: 'pending',
        confidence_score: 90,
        due_date: '2030-01-01',
        items: [
          {
            product_id: state.productId,
            product_name: `API Product ${tag}`,
            quantity: 5,
            unit: 'pcs',
            notes: 'API smoke test item',
          },
        ],
      },
    });

    state.rfqId = createdRfq.body?.id || null;

    if (state.rfqId) {
      await callApi({ name: 'RFQs Get One', path: `/rfqs/${state.rfqId}`, expected: [200] });
      await callApi({
        name: 'RFQs Update',
        method: 'PUT',
        path: `/rfqs/${state.rfqId}`,
        expected: [200],
        body: { priority: 'high' },
      });
      await callApi({
        name: 'RFQs Update Status',
        method: 'PUT',
        path: `/rfqs/${state.rfqId}/status`,
        expected: [200],
        body: { status: 'quoted' },
      });

      const converted = await callApi({
        name: 'RFQs Convert To Quotation',
        method: 'POST',
        path: `/rfqs/${state.rfqId}/convert-to-quotation`,
        expected: [201],
      });

      const convertedId = converted.body?.id || converted.body?.quotation?.id || null;
      if (convertedId) {
        state.quotationId = state.quotationId || convertedId;
        state.quotationIds.push(convertedId);
      }
    }
  }

  // Quotations
  await callApi({ name: 'Quotations List', path: '/quotations', expected: [200] });
  await callApi({ name: 'Quotations Export CSV', path: '/quotations/export/csv', expected: [200], responseType: 'buffer' });

  if (!state.quotationId && state.clientId && state.productId) {
    const createdQuotation = await callApi({
      name: 'Quotations Create',
      method: 'POST',
      path: '/quotations',
      expected: [201],
      body: {
        client_id: state.clientId,
        date: '2030-01-01',
        valid_until: '2030-01-15',
        status: 'draft',
        terms_conditions: 'API smoke test',
        items: [
          {
            product_id: state.productId,
            product_name: `API Product ${tag}`,
            quantity: 3,
            unit: 'pcs',
            unit_price: 100,
            tax_percent: 18,
          },
        ],
      },
    });
    const createdId = createdQuotation.body?.id || null;
    state.quotationId = createdId;
    if (createdId) {
      state.quotationIds.push(createdId);
    }
  }

  if (state.quotationId) {
    await callApi({ name: 'Quotations Get One', path: `/quotations/${state.quotationId}`, expected: [200] });
    await callApi({ name: 'Quotations PDF', path: `/quotations/${state.quotationId}/pdf`, expected: [200], responseType: 'buffer' });
    await callApi({
      name: 'Quotations Update',
      method: 'PUT',
      path: `/quotations/${state.quotationId}`,
      expected: [200],
      body: { status: 'sent' },
    });
    await callApi({
      name: 'Quotations Update Status',
      method: 'PUT',
      path: `/quotations/${state.quotationId}/status`,
      expected: [200],
      body: { status: 'accepted' },
    });
    const duplicated = await callApi({
      name: 'Quotations Duplicate',
      method: 'POST',
      path: `/quotations/${state.quotationId}/duplicate`,
      expected: [201],
    });
    const duplicateId = duplicated.body?.id || duplicated.body?.quotation?.id || null;
    if (duplicateId) {
      state.quotationIds.push(duplicateId);
    }
  }

  // Dashboard and analytics
  await callApi({ name: 'Dashboard KPIs', path: '/dashboard/kpis', expected: [200] });
  await callApi({ name: 'Dashboard RFQ vs Quotes', path: '/dashboard/charts/rfq-vs-quotes', expected: [200] });
  await callApi({ name: 'Dashboard Quote Status', path: '/dashboard/charts/quote-status', expected: [200] });
  await callApi({ name: 'Dashboard RFQ by Channel', path: '/dashboard/charts/rfq-by-channel', expected: [200] });
  await callApi({ name: 'Dashboard Activity Feed', path: '/dashboard/activity-feed', expected: [200] });
  await callApi({ name: 'Dashboard System Status', path: '/dashboard/system-status', expected: [200] });

  await callApi({ name: 'Analytics Sales Trends', path: '/analytics/sales-trends', expected: [200] });
  await callApi({ name: 'Analytics RFQ Analysis', path: '/analytics/rfq-analysis', expected: [200] });
  await callApi({ name: 'Analytics Quote Performance', path: '/analytics/quote-performance', expected: [200] });
  await callApi({ name: 'Analytics Product Performance', path: '/analytics/product-performance', expected: [200] });
  await callApi({ name: 'Analytics Client Insights', path: '/analytics/client-insights', expected: [200] });
  await callApi({ name: 'Analytics Channel Breakdown', path: '/analytics/channel-breakdown', expected: [200] });
  await callApi({ name: 'Analytics Export CSV', path: '/analytics/sales-trends/csv', expected: [200], responseType: 'buffer' });

  // Settings
  await callApi({ name: 'Settings Company Get', path: '/settings/company', expected: [200] });
  await callApi({
    name: 'Settings Company Update',
    method: 'PUT',
    path: '/settings/company',
    expected: [200],
    body: { currency: 'INR', logo_url: 'https://example.com/logo.png' },
  });

  await callApi({ name: 'Settings Notifications Get', path: '/settings/notifications', expected: [200] });
  await callApi({
    name: 'Settings Notifications Update',
    method: 'PUT',
    path: '/settings/notifications',
    expected: [200],
    body: {
      new_rfq: true,
      quote_sent: true,
      quote_viewed: true,
      quote_accepted: true,
      quote_declined: false,
    },
  });

  await callApi({ name: 'Settings Templates List', path: '/settings/templates', expected: [200] });
  const template = await callApi({
    name: 'Settings Template Create',
    method: 'POST',
    path: '/settings/templates',
    expected: [201],
    body: { template_key: `api_tpl_${tag}`, content: 'Hello {{name}}' },
  });
  state.templateId = template.body?.id || null;

  if (state.templateId) {
    await callApi({
      name: 'Settings Template Update',
      method: 'PUT',
      path: `/settings/templates/${state.templateId}`,
      expected: [200],
      body: { content: 'Updated {{name}}' },
    });
  }

  await callApi({ name: 'Settings Rules List', path: '/settings/automation-rules', expected: [200] });
  const rule = await callApi({
    name: 'Settings Rule Create',
    method: 'POST',
    path: '/settings/automation-rules',
    expected: [201],
    body: {
      name: `api_rule_${tag}`,
      condition: 'rfq.priority==high',
      action: 'notify_admin',
      active: true,
    },
  });
  state.ruleId = rule.body?.id || null;

  if (state.ruleId) {
    await callApi({
      name: 'Settings Rule Update',
      method: 'PUT',
      path: `/settings/automation-rules/${state.ruleId}`,
      expected: [200],
      body: { active: false },
    });
  }

  // Files
  await callApi({ name: 'Files List', path: '/files', expected: [200] });
  const file = await callApi({
    name: 'Files Upload',
    method: 'POST',
    path: '/files/upload',
    expected: [201],
    body: {
      filename: `test-${tag}.txt`,
      mime_type: 'text/plain',
      size: 12,
      storage_path: `/tmp/test-${tag}.txt`,
    },
  });
  state.fileId = file.body?.id || null;

  if (state.fileId) {
    await callApi({ name: 'Files Get One', path: `/files/${state.fileId}`, expected: [200] });
  }

  // Activity and audit endpoints
  await callApi({ name: 'Activities List', path: '/activities', expected: [200] });
  await callApi({ name: 'Audit Logs List', path: '/audit-logs', expected: [200] });

  if (state.productId) {
    await callApi({ name: 'Activities Entity', path: `/activities/product/${state.productId}`, expected: [200] });
    await callApi({ name: 'Audit Entity', path: `/audit-logs/product/${state.productId}`, expected: [200] });
  }

  // Internal Email Endpoints (no JWT auth, uses X-Internal-Key)
  if (!INTERNAL_KEY) {
    throw new Error(
      'INTERNAL_API_KEY is required to run internal endpoint smoke checks',
    );
  }

  const internalKeyHeader = {
    'X-Internal-Key': INTERNAL_KEY,
    'X-Tenant-ID': INTERNAL_TENANT_ID,
  };

  // Create an outbound email record first (would normally come from quotation send)
  state.outboundEmailId = null;

  // Note: Testing inbound endpoint (it will auto-create client)
  const inboundResult = await callApi({
    name: 'Email Inbound - POST /internal/email/inbound',
    method: 'POST',
    path: '/internal/email/inbound',
    auth: false,
    expected: [201, 400], // 400 expected if email account doesn't exist (which is fine for this test)
    customHeaders: internalKeyHeader,
    body: {
      email_account_id: `test-acc-${tag}`,
      external_id: `msg-${tag}-001`,
      thread_id: `thread-${tag}`,
      provider: 'gmail',
      sender_email: `client-${tag}@test.com`,
      sender_name: `Test Client ${tag}`,
      subject: 'Test RFQ Email',
      body: 'We need 100 units of your product',
      received_at: new Date().toISOString(),
    },
  });

  // Test outbound email fetch (GET)
  await callApi({
    name: 'Email Outbound - GET /internal/email/outbound',
    method: 'GET',
    path: '/internal/email/outbound?status=pending&limit=10',
    auth: false,
    expected: [200],
    customHeaders: internalKeyHeader,
  });

  // Test outbound email update (PATCH) - using a mock ID (will 400 if not found, which is ok)
  await callApi({
    name: 'Email Outbound - PATCH /internal/email/outbound/:id',
    method: 'PATCH',
    path: `/internal/email/outbound/test-outbound-${tag}`,
    auth: false,
    expected: [200, 400], // 400 expected if outbound email doesn't exist
    customHeaders: internalKeyHeader,
    body: {
      status: 'sent',
      provider: 'gmail',
      attempts: 1,
    },
  });

  // Cleanup (reverse order)
  if (state.fileId) {
    await callApi({ name: 'Files Delete', method: 'DELETE', path: `/files/${state.fileId}`, expected: [200] });
  }
  if (state.ruleId) {
    await callApi({ name: 'Settings Rule Delete', method: 'DELETE', path: `/settings/automation-rules/${state.ruleId}`, expected: [200] });
  }
  if (state.templateId) {
    await callApi({ name: 'Settings Template Delete', method: 'DELETE', path: `/settings/templates/${state.templateId}`, expected: [200] });
  }
  const uniqueQuotationIds = [...new Set(state.quotationIds.filter(Boolean))].reverse();
  for (const quotationId of uniqueQuotationIds) {
    await callApi({
      name: `Quotations Delete (${quotationId})`,
      method: 'DELETE',
      path: `/quotations/${quotationId}?forceDeleteLinkedRfq=true&forceDelete=true`,
      expected: [200],
    });
  }
  if (state.rfqId) {
    // RFQ may already be deleted by the force-delete of its linked quotation above
    await callApi({ name: 'RFQs Delete', method: 'DELETE', path: `/rfqs/${state.rfqId}?forceDeleteLinkedQuotation=true&forceDelete=true`, expected: [200, 404] });
  }
  if (state.clientId) {
    await callApi({ name: 'Clients Delete', method: 'DELETE', path: `/clients/${state.clientId}?forceDelete=true`, expected: [200] });
  }
  if (state.productId) {
    await callApi({ name: 'Products Delete', method: 'DELETE', path: `/products/${state.productId}?forceDelete=true`, expected: [200] });
  }
  if (state.userId) {
    await callApi({ name: 'Users Delete', method: 'DELETE', path: `/users/${state.userId}`, expected: [200] });
  }

  printSummary();

  if (failures.length) {
    process.exit(1);
    return;
  }

  process.exit(0);
}

run().catch((error) => {
  console.error('\nSmoke test script crashed:', error);
  process.exit(1);
});
