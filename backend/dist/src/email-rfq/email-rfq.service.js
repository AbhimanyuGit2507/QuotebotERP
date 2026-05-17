"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var EmailRfqService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailRfqService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const rfqs_service_1 = require("../rfqs/rfqs.service");
let EmailRfqService = EmailRfqService_1 = class EmailRfqService {
    prisma;
    rfqsService;
    logger = new common_1.Logger(EmailRfqService_1.name);
    enabled = process.env.BACKEND_RFQ_PIPELINE_ENABLED !== 'false';
    intervalMs = Number(process.env.BACKEND_RFQ_PIPELINE_INTERVAL_MS || 20000);
    runBatchLimit = Math.min(Math.max(Number(process.env.RFQ_PIPELINE_BATCH_LIMIT || 60), 10), 250);
    classifierBatchSize = Math.min(Math.max(Number(process.env.RFQ_CLASSIFIER_BATCH_SIZE || 8), 1), 25);
    classifierSnippetHeadChars = Math.min(Math.max(Number(process.env.RFQ_CLASSIFIER_SNIPPET_HEAD_CHARS || 200), 50), 1000);
    classifierSnippetMaxChars = Math.min(Math.max(Number(process.env.RFQ_CLASSIFIER_SNIPPET_MAX_CHARS || 600), 200), 3000);
    classifierKeywordWindowChars = Math.min(Math.max(Number(process.env.RFQ_CLASSIFIER_KEYWORD_WINDOW_CHARS || 40), 10), 200);
    classifierMaxWindows = Math.min(Math.max(Number(process.env.RFQ_CLASSIFIER_MAX_WINDOWS || 4), 1), 12);
    classifierBatchMaxBytes = Math.min(Math.max(Number(process.env.RFQ_CLASSIFIER_MAX_BATCH_BYTES || 26000), 8000), 30000);
    extractionDelayMs = Math.min(Math.max(Number(process.env.RFQ_EXTRACT_DELAY_MS || 50), 0), 1000);
    timer = null;
    isRunning = false;
    llmRateLimitPerMinute = Number(process.env.LLM_RATE_LIMIT_PER_MINUTE || 10);
    llmCallTimestamps = [];
    providerCooldownUntilMs = new Map();
    constructor(prisma, rfqsService) {
        this.prisma = prisma;
        this.rfqsService = rfqsService;
    }
    onModuleInit() {
        if (!this.enabled) {
            this.logger.log('Backend RFQ pipeline disabled via BACKEND_RFQ_PIPELINE_ENABLED=false');
            return;
        }
        const safeInterval = Number.isFinite(this.intervalMs) && this.intervalMs >= 5000
            ? this.intervalMs
            : 20000;
        this.logger.log(`Backend RFQ pipeline enabled. Interval: ${safeInterval}ms, batchLimit: ${this.runBatchLimit}, classifierBatchSize: ${this.classifierBatchSize}, extractionDelayMs: ${this.extractionDelayMs}`);
        this.timer = setInterval(() => {
            void this.processPendingMessages({ limit: this.runBatchLimit });
        }, safeInterval);
        setTimeout(() => {
            void this.processPendingMessages({ limit: this.runBatchLimit });
        }, 1000);
    }
    onModuleDestroy() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
    normalizeName(value) {
        return String(value || '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, ' ')
            .trim();
    }
    asText(value, fallback = '') {
        if (typeof value === 'string')
            return value;
        if (typeof value === 'number' || typeof value === 'boolean') {
            return String(value);
        }
        return fallback;
    }
    errorToMessage(error) {
        if (error instanceof Error) {
            return error.message;
        }
        if (typeof error === 'string') {
            return error;
        }
        if (error && typeof error === 'object') {
            try {
                return JSON.stringify(error);
            }
            catch {
                return 'Unknown object error';
            }
        }
        if (typeof error === 'number' ||
            typeof error === 'boolean' ||
            typeof error === 'bigint') {
            return String(error);
        }
        return 'Unknown error';
    }
    parseRetryAfterToMs(value) {
        if (!value || value.trim().length === 0) {
            return 0;
        }
        const trimmed = value.trim();
        const seconds = Number(trimmed);
        if (Number.isFinite(seconds) && seconds > 0) {
            return Math.ceil(seconds * 1000);
        }
        const targetTime = Date.parse(trimmed);
        if (!Number.isFinite(targetTime)) {
            return 0;
        }
        return Math.max(0, targetTime - Date.now());
    }
    buildProviderHttpError(providerName, res) {
        const retryAfterMs = this.parseRetryAfterToMs(res.headers.get('retry-after'));
        const error = new Error(`${providerName} request failed with status ${res.status}`);
        error.statusCode = res.status;
        if (retryAfterMs > 0) {
            error.retryAfterMs = retryAfterMs;
        }
        return error;
    }
    sleep(ms) {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }
    parseJsonFlexible(value) {
        if (!value)
            return null;
        if (typeof value === 'object' && !Array.isArray(value)) {
            return value;
        }
        if (typeof value !== 'string')
            return null;
        const trimmed = value.trim();
        try {
            return JSON.parse(trimmed);
        }
        catch (error) {
            this.logger.debug(`Primary JSON parse failed: ${error instanceof Error ? error.message : 'unknown error'}`);
        }
        const codeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
        if (codeBlock?.[1]) {
            try {
                return JSON.parse(codeBlock[1].trim());
            }
            catch (error) {
                this.logger.debug(`Code-block JSON parse failed: ${error instanceof Error ? error.message : 'unknown error'}`);
            }
        }
        const start = trimmed.indexOf('{');
        const end = trimmed.lastIndexOf('}');
        if (start >= 0 && end > start) {
            try {
                return JSON.parse(trimmed.slice(start, end + 1));
            }
            catch (error) {
                this.logger.debug(`Bracket-slice JSON parse failed: ${error instanceof Error ? error.message : 'unknown error'}`);
            }
        }
        return null;
    }
    sanitizeItems(items) {
        if (!Array.isArray(items)) {
            return [];
        }
        const out = [];
        for (const raw of items) {
            if (!raw || typeof raw !== 'object')
                continue;
            const row = raw;
            const product_name = this.asText(row.product_name ?? row.name, '').trim();
            const quantity = Number(row.quantity);
            const unit = this.asText(row.unit, 'unit').trim().toLowerCase();
            const notes = this.asText(row.notes, '').trim();
            if (!product_name || !Number.isFinite(quantity) || quantity <= 0) {
                continue;
            }
            out.push({
                product_name,
                quantity,
                unit,
                ...(notes ? { notes } : {}),
            });
        }
        const dedup = new Map();
        for (const item of out) {
            const key = `${this.normalizeName(item.product_name)}::${item.quantity}::${item.unit || ''}`;
            if (!dedup.has(key)) {
                dedup.set(key, item);
            }
        }
        return Array.from(dedup.values());
    }
    regexExtract(text) {
        const lines = String(text || '')
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);
        const unitPattern = '(pc|pcs|piece|pieces|unit|units|kg|g|ltr|l|box|boxes)';
        const patterns = [
            new RegExp(`^(.+?)\\s*[\\-–:]\\s*(\\d+(?:\\.\\d+)?)\\s*${unitPattern}$`, 'i'),
            new RegExp(`^(.+?)\\s*\\((\\d+(?:\\.\\d+)?)\\s*${unitPattern}\\)$`, 'i'),
            new RegExp(`^(\\d+(?:\\.\\d+)?)\\s*${unitPattern}\\s+(.+)$`, 'i'),
            new RegExp(`^(.+?)\\s+(\\d+)${unitPattern}$`, 'i'),
            new RegExp(`^(.+?)\\s*[\\-–:]\\s*(\\d+(?:\\.\\d+)?)$`, 'i'),
        ];
        const found = [];
        for (const line of lines) {
            const normalizedLine = line.replace(/^\s*(?:\d+[.)]|[-*])\s+/, '');
            for (const pattern of patterns) {
                const m = normalizedLine.match(pattern);
                if (!m)
                    continue;
                const groups = m.slice(1).map((x) => String(x || '').trim());
                let productName = '';
                let qty = 0;
                let unit = 'unit';
                if (pattern === patterns[2]) {
                    qty = Number(groups[0]);
                    unit = groups[1].toLowerCase();
                    productName = groups[2];
                }
                else if (pattern === patterns[3]) {
                    productName = groups[0];
                    qty = Number(groups[1]);
                    unit = groups[2].toLowerCase();
                }
                else if (pattern === patterns[4]) {
                    productName = groups[0];
                    qty = Number(groups[1]);
                    unit = 'unit';
                }
                else {
                    productName = groups[0];
                    qty = Number(groups[1]);
                    unit = groups[2].toLowerCase();
                }
                if (!productName || !Number.isFinite(qty) || qty <= 0) {
                    continue;
                }
                found.push({
                    product_name: productName,
                    quantity: qty,
                    unit,
                    notes: 'Recovered by backend regex fallback',
                });
                break;
            }
        }
        return this.sanitizeItems(found);
    }
    computeQuantityConfidence(items, bodyText) {
        if (items.length === 0) {
            return 0;
        }
        const normalizedBody = this.normalizeName(bodyText);
        let confidentHits = 0;
        for (const item of items) {
            const normalizedName = this.normalizeName(item.product_name);
            const qtyPattern = new RegExp(`\\b${item.quantity}\\b`);
            const hasName = normalizedName.length > 0 && normalizedBody.includes(normalizedName);
            const hasQty = qtyPattern.test(bodyText);
            if (hasName && hasQty) {
                confidentHits += 1;
            }
        }
        return Math.round((confidentHits / items.length) * 100);
    }
    buildKeywordWindows(text) {
        const windows = [];
        const seen = new Set();
        const patterns = [
            /(request\s+for\s+quote|rfq|quotation\s+request|proforma|price\s+quote|best\s+price|kindly\s+quote|please\s+quote|need\s+quote|rate\s+for|pricing\s+for)/gi,
            /(\b\d+(?:\.\d+)?\s*(pc|pcs|piece|pieces|unit|units|kg|g|ltr|l|box|boxes)\b)/gi,
        ];
        const input = String(text || '');
        for (const pattern of patterns) {
            pattern.lastIndex = 0;
            let match;
            while ((match = pattern.exec(input)) &&
                windows.length < this.classifierMaxWindows) {
                const start = Math.max(0, match.index - this.classifierKeywordWindowChars);
                const end = Math.min(input.length, match.index + match[0].length + this.classifierKeywordWindowChars);
                const slice = input.slice(start, end).trim();
                if (!slice)
                    continue;
                const key = slice.toLowerCase();
                if (seen.has(key))
                    continue;
                seen.add(key);
                windows.push(slice);
            }
        }
        return windows;
    }
    buildClassifierSnippet(subject, body) {
        const head = String(body || '').slice(0, this.classifierSnippetHeadChars);
        const windows = this.buildKeywordWindows(body);
        const parts = [
            `Subject: ${subject || '(No subject)'}`,
            `Body: ${head}`,
            ...(windows.length > 0
                ? ['Keyword windows:', ...windows.map((win) => `- ${win}`)]
                : []),
        ];
        const combined = parts.join('\n').trim();
        if (combined.length <= this.classifierSnippetMaxChars) {
            return combined;
        }
        return combined.slice(0, this.classifierSnippetMaxChars);
    }
    parseRetryAfterMs(value) {
        if (!value) {
            return 0;
        }
        const asSeconds = Number.parseFloat(value);
        if (Number.isFinite(asSeconds) && asSeconds > 0) {
            return Math.round(asSeconds * 1000);
        }
        const asDate = new Date(value);
        if (Number.isNaN(asDate.getTime())) {
            return 0;
        }
        return Math.max(0, asDate.getTime() - Date.now());
    }
    classifyRfqByRegex(subject, body) {
        const joined = `${subject || ''}\n${body || ''}`.toLowerCase();
        const rfqIntentPattern = /(request\s+for\s+quote|rfq|quotation\s+request|proforma|price\s+quote|best\s+price|kindly\s+quote|please\s+quote|need\s+quote|rate\s+for|pricing\s+for)/i;
        const nonRfqPattern = /(newsletter|unsubscribe|otp|verification\s+code|password\s+reset|delivery\s+status|bounce\s+notice|calendar\s+invite|out\s+of\s+office|automatic\s+reply|payment\s+received|invoice\s+paid|receipt)/i;
        const hasRfqIntent = rfqIntentPattern.test(joined);
        const hasNonRfqSignal = nonRfqPattern.test(joined);
        const regexItems = this.regexExtract(body || '');
        if (hasNonRfqSignal && !hasRfqIntent && regexItems.length === 0) {
            return {
                verdict: 'non_rfq',
                reason: 'Regex classifier matched non-RFQ email signals',
                confidence: 'high',
            };
        }
        if (regexItems.length >= 1 && hasRfqIntent) {
            return {
                verdict: 'rfq',
                reason: 'Regex classifier detected RFQ intent and quantity-bearing items',
                confidence: 'high',
            };
        }
        if (regexItems.length >= 2) {
            return {
                verdict: 'rfq',
                reason: 'Regex classifier detected multiple quantity-bearing line items',
                confidence: 'medium',
            };
        }
        if (hasRfqIntent) {
            return {
                verdict: 'uncertain',
                reason: 'RFQ intent detected without strong regex item confidence',
                confidence: 'low',
            };
        }
        return {
            verdict: 'uncertain',
            reason: 'Regex classifier could not confidently determine RFQ intent',
            confidence: 'low',
        };
    }
    isRateLimitError(error) {
        const message = error instanceof Error
            ? error.message.toLowerCase()
            : typeof error === 'string'
                ? error.toLowerCase()
                : '';
        return (message.includes('429') ||
            message.includes('rate limited') ||
            message.includes('rate-limited') ||
            message.includes('rate limit'));
    }
    buildStrictJsonMessages(prompt) {
        return [
            {
                role: 'system',
                content: 'You are a strict JSON generation engine. Output exactly one valid JSON object that matches the requested schema. Do not use markdown, code fences, prose, comments, or Python. If unsure, still return valid JSON only.',
            },
            {
                role: 'user',
                content: prompt,
            },
        ];
    }
    buildRepairPrompt(task, originalPrompt, badResponse) {
        const schema = task === 'classifier'
            ? '{"rfq_ids":["id1"],"non_rfq_ids":["id2"],"reasons":{"id1":"short reason"}}'
            : '{"is_rfq":true|false,"confidence":"high|medium|low","reason":"string","items":[{"product_name":"string","quantity":1,"unit":"string","notes":"string"}]}';
        return [
            'Your previous answer did not match the requested JSON schema.',
            'Convert the content below into exactly one valid JSON object and nothing else.',
            'Do not add markdown, code fences, explanations, Python, or comments.',
            `Expected schema: ${schema}`,
            'Original task prompt:',
            originalPrompt,
            'Previous answer to repair:',
            badResponse,
        ].join('\n');
    }
    isValidTaskResponse(task, responseText) {
        const parsed = this.parseJsonFlexible(responseText);
        if (!parsed || typeof parsed !== 'object') {
            return false;
        }
        if (task === 'classifier') {
            return Array.isArray(parsed.rfq_ids) && Array.isArray(parsed.non_rfq_ids);
        }
        return typeof parsed.is_rfq === 'boolean' && Array.isArray(parsed.items);
    }
    async callGroq(prompt, model) {
        const apiKey = process.env.GROQ_API_KEY || '';
        const baseUrl = process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';
        if (!apiKey) {
            throw new Error('Groq API key missing: set GROQ_API_KEY');
        }
        const res = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                temperature: 0,
                messages: this.buildStrictJsonMessages(prompt),
            }),
        });
        if (!res.ok) {
            throw this.buildProviderHttpError('Groq', res);
        }
        const payload = (await res.json());
        const text = String(payload.choices?.[0]?.message?.content || '').trim();
        if (!text) {
            throw new Error('Groq response did not include output text');
        }
        return text;
    }
    async callOpenRouter(prompt, model) {
        const apiKey = process.env.OPENROUTER_API_KEY || '';
        const baseUrl = process.env.OPENROUTER_BASE_URL ||
            'https://openrouter.ai/api/v1/chat/completions';
        if (!apiKey) {
            throw new Error('OpenRouter API key missing: set OPENROUTER_API_KEY');
        }
        const res = await fetch(baseUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
                'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER || 'http://localhost:3000',
                'X-Title': process.env.OPENROUTER_APP_NAME || 'Quotebot ERP',
            },
            body: JSON.stringify({
                model,
                temperature: 0,
                messages: this.buildStrictJsonMessages(prompt),
            }),
        });
        if (!res.ok) {
            throw this.buildProviderHttpError('OpenRouter', res);
        }
        const payload = (await res.json());
        const text = String(payload.choices?.[0]?.message?.content || '').trim();
        if (!text) {
            throw new Error('OpenRouter response did not include output text');
        }
        return text;
    }
    async callCerebras(prompt, model) {
        const apiKey = process.env.CEREBRAS_API_KEY || '';
        const baseUrl = process.env.CEREBRAS_BASE_URL || 'https://api.cerebras.ai/v1';
        if (!apiKey) {
            throw new Error('Cerebras API key missing: set CEREBRAS_API_KEY');
        }
        const res = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                temperature: 0,
                messages: this.buildStrictJsonMessages(prompt),
            }),
        });
        if (!res.ok) {
            throw this.buildProviderHttpError('Cerebras', res);
        }
        const payload = (await res.json());
        const text = String(payload.choices?.[0]?.message?.content || '').trim();
        if (!text) {
            throw new Error('Cerebras response did not include output text');
        }
        return text;
    }
    async callOpenAiCompatible(prompt, model, apiKey, baseUrl, providerName) {
        if (!apiKey) {
            throw new Error(`${providerName} API key missing`);
        }
        const res = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                temperature: 0,
                messages: this.buildStrictJsonMessages(prompt),
            }),
        });
        if (!res.ok) {
            throw this.buildProviderHttpError(providerName, res);
        }
        const payload = (await res.json());
        const text = String(payload.choices?.[0]?.message?.content || '').trim();
        if (!text) {
            throw new Error(`${providerName} response did not include output text`);
        }
        return text;
    }
    async callTogether(prompt, model) {
        return this.callOpenAiCompatible(prompt, model, process.env.TOGETHER_API_KEY || '', process.env.TOGETHER_BASE_URL || 'https://api.together.xyz/v1', 'Together');
    }
    async callMistral(prompt, model) {
        return this.callOpenAiCompatible(prompt, model, process.env.MISTRAL_API_KEY || '', process.env.MISTRAL_BASE_URL || 'https://api.mistral.ai/v1', 'Mistral');
    }
    async callDeepSeek(prompt, model) {
        return this.callOpenAiCompatible(prompt, model, process.env.DEEPSEEK_API_KEY || '', process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com', 'DeepSeek');
    }
    async callGemini(prompt, model) {
        const apiKey = process.env.GEMINI_API_KEY || '';
        const baseUrl = process.env.GEMINI_BASE_URL ||
            'https://generativelanguage.googleapis.com/v1beta/models';
        if (!apiKey) {
            throw new Error('Gemini API key missing: set GEMINI_API_KEY');
        }
        const encodedModel = encodeURIComponent(model);
        const res = await fetch(`${baseUrl}/${encodedModel}:generateContent?key=${encodeURIComponent(apiKey)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.1,
                },
            }),
        });
        if (!res.ok) {
            throw this.buildProviderHttpError('Gemini', res);
        }
        const payload = (await res.json());
        const parts = payload.candidates?.[0]?.content?.parts || [];
        const text = parts
            .map((part) => (typeof part.text === 'string' ? part.text.trim() : ''))
            .filter(Boolean)
            .join('\n')
            .trim();
        if (!text) {
            throw new Error('Gemini response did not include output text');
        }
        return text;
    }
    async callProviderWithRetry(provider, prompt, model) {
        const scopedMaxRetries = process.env.RFQ_CLASSIFIER_MAX_RETRIES !== undefined &&
            prompt.includes('TASK: Classify each email as RFQ or non-RFQ.')
            ? Number(process.env.RFQ_CLASSIFIER_MAX_RETRIES)
            : Number(process.env.RFQ_LLM_MAX_RETRIES || 2);
        const maxRetries = Math.min(Math.max(scopedMaxRetries, 0), 6);
        const retryBaseMs = Math.min(Math.max(Number(process.env.RFQ_LLM_RETRY_BASE_MS || 1000), 200), 10000);
        let lastError = null;
        for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
            const cooldownUntil = this.providerCooldownUntilMs.get(provider) || 0;
            const now = Date.now();
            if (cooldownUntil > now) {
                const waitMs = cooldownUntil - now;
                this.logger.debug(`${provider} cooldown active; waiting ${waitMs}ms before retrying`);
                await this.sleep(waitMs);
            }
            try {
                if (provider === 'groq') {
                    return await this.callGroq(prompt, model);
                }
                if (provider === 'together') {
                    return await this.callTogether(prompt, model);
                }
                if (provider === 'mistral') {
                    return await this.callMistral(prompt, model);
                }
                if (provider === 'deepseek') {
                    return await this.callDeepSeek(prompt, model);
                }
                if (provider === 'cerebras') {
                    return await this.callCerebras(prompt, model);
                }
                if (provider === 'openrouter') {
                    return await this.callOpenRouter(prompt, model);
                }
                return await this.callGemini(prompt, model);
            }
            catch (error) {
                const message = this.errorToMessage(error);
                lastError = error instanceof Error ? error : new Error(message);
                const typedError = error;
                const is429 = typedError.statusCode === 429 || this.isRateLimitError(message);
                const retryAfterMs = typeof typedError.retryAfterMs === 'number' &&
                    typedError.retryAfterMs > 0
                    ? typedError.retryAfterMs
                    : undefined;
                if (attempt < maxRetries &&
                    (is429 || message.toLowerCase().includes('timeout'))) {
                    const delayMs = Math.max(retryAfterMs || 0, retryBaseMs * Math.pow(2, attempt));
                    if (is429) {
                        this.providerCooldownUntilMs.set(provider, Date.now() + delayMs);
                    }
                    this.logger.warn(`${provider} request failed (${message}). Retry ${attempt + 1}/${maxRetries} in ${delayMs}ms`);
                    await this.sleep(delayMs);
                    continue;
                }
                break;
            }
        }
        throw lastError || new Error(`${provider} request failed`);
    }
    resolveProviderModel(provider, task) {
        if (provider === 'groq') {
            return ((task === 'classifier'
                ? process.env.GROQ_CLASSIFIER_MODEL
                : process.env.GROQ_EXTRACTION_MODEL) ||
                process.env.GROQ_MODEL ||
                'openai/gpt-oss-20b');
        }
        if (provider === 'cerebras') {
            return ((task === 'classifier'
                ? process.env.CEREBRAS_CLASSIFIER_MODEL
                : process.env.CEREBRAS_EXTRACTION_MODEL) ||
                process.env.CEREBRAS_MODEL ||
                'llama3.1-8b');
        }
        if (provider === 'together') {
            return ((task === 'classifier'
                ? process.env.TOGETHER_CLASSIFIER_MODEL
                : process.env.TOGETHER_EXTRACTION_MODEL) ||
                process.env.TOGETHER_MODEL ||
                'mistralai/Mistral-Nemo-Instruct-2407');
        }
        if (provider === 'mistral') {
            return ((task === 'classifier'
                ? process.env.MISTRAL_CLASSIFIER_MODEL
                : process.env.MISTRAL_EXTRACTION_MODEL) ||
                process.env.MISTRAL_MODEL ||
                'open-mistral-nemo');
        }
        if (provider === 'deepseek') {
            return ((task === 'classifier'
                ? process.env.DEEPSEEK_CLASSIFIER_MODEL
                : process.env.DEEPSEEK_EXTRACTION_MODEL) ||
                process.env.DEEPSEEK_MODEL ||
                'deepseek-chat');
        }
        if (provider === 'openrouter') {
            return ((task === 'classifier'
                ? process.env.OPENROUTER_CLASSIFIER_MODEL
                : process.env.OPENROUTER_EXTRACTION_MODEL) ||
                process.env.OPENROUTER_MODEL ||
                'google/gemma-3-27b-it:free');
        }
        return ((task === 'classifier'
            ? process.env.GEMINI_CLASSIFIER_MODEL
            : process.env.GEMINI_EXTRACTION_MODEL) ||
            process.env.GEMINI_MODEL ||
            'gemini-2.5-flash-lite');
    }
    async callLlmWithFallbacks(prompt, task) {
        const defaultOrder = [
            'groq',
            'mistral',
            'gemini',
            'openrouter',
            'cerebras',
            'together',
            'deepseek',
        ];
        const configuredOrder = (process.env.RFQ_LLM_FALLBACK_ORDER || '')
            .split(',')
            .map((x) => x.trim().toLowerCase())
            .filter((x) => x === 'groq' ||
            x === 'cerebras' ||
            x === 'gemini' ||
            x === 'together' ||
            x === 'mistral' ||
            x === 'deepseek' ||
            x === 'openrouter');
        const classifierPreferredOrder = [
            'groq',
            'cerebras',
            'mistral',
            'openrouter',
            'gemini',
            'together',
            'deepseek',
        ];
        const order = task === 'classifier' && configuredOrder.length === 0
            ? classifierPreferredOrder
            : configuredOrder.length > 0
                ? configuredOrder
                : defaultOrder;
        this.logger.log(`🔗 LLM fallback chain for ${task}: ${order.join(' → ')}`);
        let lastError = null;
        for (const provider of order) {
            const model = this.resolveProviderModel(provider, task);
            this.logger.debug(`Attempting ${provider} (model: ${model}) for ${task}...`);
            try {
                const result = await this.callProviderWithRetry(provider, prompt, model);
                if (this.isValidTaskResponse(task, result)) {
                    this.logger.log(`✅ ${provider} succeeded for ${task}`);
                    return result;
                }
                this.logger.warn(`⚠️ ${provider} returned non-JSON or invalid schema for ${task}; attempting repair...`);
                const repaired = await this.callProviderWithRetry(provider, this.buildRepairPrompt(task, prompt, result), model);
                if (this.isValidTaskResponse(task, repaired)) {
                    this.logger.log(`✅ ${provider} repaired successfully for ${task}`);
                    return repaired;
                }
                throw new Error('Provider output did not match expected JSON schema');
            }
            catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                this.logger.warn(`❌ ${provider} failed for ${task} (${model}): ${message}`);
                lastError = error instanceof Error ? error : new Error(message);
            }
        }
        throw lastError || new Error('All configured LLM providers failed');
    }
    async callLlmExtraction(subject, body) {
        const prompt = [
            'TASK: Extract RFQ intent and line items from the email below.',
            'OUTPUT CONTRACT:',
            '- Return exactly one valid JSON object and nothing else.',
            '- No markdown, no code fences, no explanation, no Python, no comments.',
            '- Use double quotes for all strings.',
            '- Use the exact keys shown below and no extra keys.',
            'Schema:',
            '{"is_rfq":true|false,"confidence":"high|medium|low","reason":"string","items":[{"product_name":"string","quantity":1,"unit":"string","notes":"string"}]}',
            'Rules:',
            '- Mark is_rfq=true only if this is a quotation/proforma/pricing request.',
            '- Extract every concrete purchasable line item.',
            '- Each item with a distinct product and quantity must become a separate array entry.',
            '- Quantity must come directly from the email and be numeric.',
            '- Do not invent items or quantities.',
            '- If the email is not an RFQ, set is_rfq=false and return items as an empty array.',
            `Subject: ${subject || '(No subject)'}`,
            `Body: ${body || ''}`,
        ].join('\n');
        await this.rateLimitLlmCall();
        const responseText = await this.callLlmWithFallbacks(prompt, 'extractor');
        const parsed = this.parseJsonFlexible(responseText);
        if (!parsed) {
            throw new Error('LLM output invalid JSON');
        }
        const confidenceRaw = this.asText(parsed.confidence, 'low').toLowerCase();
        const confidence = confidenceRaw === 'high' || confidenceRaw === 'medium'
            ? confidenceRaw
            : 'low';
        return {
            is_rfq: Boolean(parsed.is_rfq),
            confidence,
            reason: this.asText(parsed.reason, ''),
            items: this.sanitizeItems(parsed.items),
        };
    }
    async classifyRfqBatch(messages) {
        if (messages.length === 0) {
            return { rfq_ids: [], non_rfq_ids: [] };
        }
        const payloadJson = JSON.stringify(messages);
        const payloadSize = Buffer.byteLength(payloadJson, 'utf8');
        const maxPayloadBytes = 30 * 1024;
        if (payloadSize > maxPayloadBytes) {
            if (messages.length === 1) {
                throw new Error(`Single message payload exceeds max size (${payloadSize} > ${maxPayloadBytes})`);
            }
            this.logger.warn(`Batch RFQ classification payload too large (${payloadSize} bytes), splitting batch of ${messages.length} messages in half`);
            const midpoint = Math.ceil(messages.length / 2);
            const [firstHalf, secondHalf] = [
                messages.slice(0, midpoint),
                messages.slice(midpoint),
            ];
            const [firstResult, secondResult] = await Promise.all([
                this.classifyRfqBatch(firstHalf),
                this.classifyRfqBatch(secondHalf),
            ]);
            return {
                rfq_ids: [...firstResult.rfq_ids, ...secondResult.rfq_ids],
                non_rfq_ids: [...firstResult.non_rfq_ids, ...secondResult.non_rfq_ids],
                reasons: {
                    ...firstResult.reasons,
                    ...secondResult.reasons,
                },
            };
        }
        await this.rateLimitLlmCall();
        const prompt = [
            'TASK: Classify each email as RFQ or non-RFQ.',
            'OUTPUT CONTRACT:',
            '- Return exactly one valid JSON object and nothing else.',
            '- No markdown, no code fences, no explanation, no Python, no comments.',
            '- Use double quotes for all strings.',
            '- Use the exact keys shown below and no extra keys.',
            'Schema:',
            '{"rfq_ids":["id1"],"non_rfq_ids":["id2"],"reasons":{"id1":"short reason"}}',
            'Rules:',
            '- RFQ means a clear request for quote/pricing/proforma with purchasable intent.',
            '- Non-RFQ includes newsletters, notifications, greetings, alerts, internal updates.',
            '- Body may be a partial snippet; favor recall over precision.',
            '- If unsure, mark as RFQ to avoid false negatives.',
            '- Every input id must appear in either rfq_ids or non_rfq_ids.',
            `Input JSON: ${payloadJson}`,
        ].join('\n');
        const responseText = await this.callLlmWithFallbacks(prompt, 'classifier');
        const parsed = this.parseJsonFlexible(responseText);
        if (!parsed) {
            throw new Error('Batch classifier output invalid JSON');
        }
        const rfqIds = Array.isArray(parsed.rfq_ids)
            ? parsed.rfq_ids.map((x) => this.asText(x, '')).filter(Boolean)
            : [];
        const nonRfqIds = Array.isArray(parsed.non_rfq_ids)
            ? parsed.non_rfq_ids.map((x) => this.asText(x, '')).filter(Boolean)
            : [];
        const reasonsRaw = parsed.reasons &&
            typeof parsed.reasons === 'object' &&
            !Array.isArray(parsed.reasons)
            ? parsed.reasons
            : {};
        const reasons = {};
        for (const [id, value] of Object.entries(reasonsRaw)) {
            const normalized = this.asText(value, '').trim();
            if (normalized) {
                reasons[id] = normalized;
            }
        }
        const inputIds = new Set(messages.map((message) => message.id));
        const rfqSet = new Set(rfqIds.filter((id) => inputIds.has(id)));
        const nonRfqSet = new Set(nonRfqIds.filter((id) => inputIds.has(id)));
        for (const id of inputIds) {
            if (!rfqSet.has(id) && !nonRfqSet.has(id)) {
                nonRfqSet.add(id);
            }
        }
        return {
            rfq_ids: Array.from(rfqSet),
            non_rfq_ids: Array.from(nonRfqSet),
            reasons,
        };
    }
    async classifyRfqCandidatesInBatches(candidates) {
        if (candidates.length === 0) {
            return { rfq_ids: [], non_rfq_ids: [], reasons: {} };
        }
        const result = {
            rfq_ids: [],
            non_rfq_ids: [],
            reasons: {},
        };
        const batches = [];
        let currentBatch = [];
        const pushBatch = () => {
            if (currentBatch.length > 0) {
                batches.push(currentBatch);
                currentBatch = [];
            }
        };
        for (const candidate of candidates) {
            const tentative = [...currentBatch, candidate];
            const tentativeSize = Buffer.byteLength(JSON.stringify(tentative), 'utf8');
            if (currentBatch.length > 0 &&
                (tentativeSize > this.classifierBatchMaxBytes ||
                    currentBatch.length >= this.classifierBatchSize)) {
                pushBatch();
            }
            currentBatch.push(candidate);
        }
        pushBatch();
        const totalBatches = Math.max(batches.length, 1);
        const runStart = Date.now();
        for (let index = 0; index < batches.length; index += 1) {
            const batchIndex = index + 1;
            const batch = batches[index];
            const batchStart = Date.now();
            const batchResult = await this.classifyRfqBatch(batch);
            const batchDurationMs = Date.now() - batchStart;
            const elapsedMs = Date.now() - runStart;
            result.rfq_ids.push(...batchResult.rfq_ids);
            result.non_rfq_ids.push(...batchResult.non_rfq_ids);
            result.reasons = {
                ...(result.reasons || {}),
                ...(batchResult.reasons || {}),
            };
            this.logger.log(`[RFQ_TIMING] classify_batch ${batchIndex}/${totalBatches} size=${batch.length} took=${batchDurationMs}ms elapsed=${elapsedMs}ms avg_per_email=${Math.round(batchDurationMs / Math.max(batch.length, 1))}ms`);
        }
        return result;
    }
    async updateMessageProcessing(messageId, patch, options = {}) {
        const existing = await this.prisma.message.findFirst({
            where: { id: messageId },
            select: { raw_payload: true },
        });
        const basePayload = existing?.raw_payload &&
            typeof existing.raw_payload === 'object' &&
            !Array.isArray(existing.raw_payload)
            ? existing.raw_payload
            : {};
        const mergedPayload = {
            ...basePayload,
            ...patch,
        };
        await this.prisma.message.update({
            where: { id: messageId },
            data: {
                processing_status: options.status || 'parsed',
                is_processed: typeof options.isProcessed === 'boolean'
                    ? options.isProcessed
                    : options.status === 'pending'
                        ? false
                        : true,
                raw_payload: mergedPayload,
                updated_at: new Date(),
            },
        });
    }
    async rateLimitLlmCall() {
        const now = Date.now();
        const oneMinuteAgo = now - 60 * 1000;
        this.llmCallTimestamps = this.llmCallTimestamps.filter((ts) => ts > oneMinuteAgo);
        if (this.llmCallTimestamps.length >= this.llmRateLimitPerMinute) {
            const oldestTimestamp = this.llmCallTimestamps[0];
            const waitMs = Math.max(0, oneMinuteAgo + 1000 - oldestTimestamp);
            if (waitMs > 0) {
                this.logger.debug(`LLM rate limit active (${this.llmCallTimestamps.length}/${this.llmRateLimitPerMinute}), waiting ${waitMs}ms...`);
                await this.sleep(waitMs);
            }
        }
        this.llmCallTimestamps.push(now);
    }
    isPayloadTooLargeError(error) {
        const message = this.errorToMessage(error);
        return (message.includes('413') ||
            message.toLowerCase().includes('payload too large') ||
            message.toLowerCase().includes('request entity too large'));
    }
    isRateLimitOrTemporary(error) {
        const message = this.errorToMessage(error);
        const normalized = message.toLowerCase();
        return (normalized.includes('429') ||
            normalized.includes('rate limit') ||
            normalized.includes('rate-limit') ||
            normalized.includes('timeout') ||
            normalized.includes('temporarily') ||
            normalized.includes('overloaded'));
    }
    getMessageRetryBackoffMs(message) {
        const rawPayload = message.raw_payload &&
            typeof message.raw_payload === 'object' &&
            !Array.isArray(message.raw_payload)
            ? message.raw_payload
            : {};
        const retryCount = Number(rawPayload.retry_count || 0);
        const lastAttemptTime = message.updated_at?.getTime() || Date.now();
        const timeSinceLastAttempt = Date.now() - lastAttemptTime;
        const backoffMs = [5, 15, 45, 120, 360, 1440][Math.min(retryCount, 5)] * 60 * 1000;
        return Math.max(0, backoffMs - timeSinceLastAttempt);
    }
    async processPendingMessages(options = {}) {
        if (this.isRunning) {
            return { started: false, reason: 'Pipeline already running' };
        }
        this.isRunning = true;
        const runStartedAt = Date.now();
        const summary = {
            scanned: 0,
            created_rfqs: 0,
            non_rfq: 0,
            unresolved: 0,
            llm_errors: 0,
            skipped: 0,
        };
        const maxAutoRetries = Math.max(0, Number(process.env.RFQ_PIPELINE_MAX_AUTO_RETRIES || 5));
        const retryDelayMinutes = [5, 15, 45, 120, 360, 1440];
        const readPayload = (payload) => {
            if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
                return {};
            }
            return payload;
        };
        const getString = (value, fallback = '') => {
            if (typeof value === 'string')
                return value;
            if (typeof value === 'number' || typeof value === 'boolean') {
                return String(value);
            }
            return fallback;
        };
        const getRetryCount = (payload) => {
            const rawCount = Number(payload.rfq_pipeline_retry_count ?? payload.retry_count ?? 0);
            return Number.isFinite(rawCount) && rawCount > 0 ? rawCount : 0;
        };
        const getNextRetryAt = (payload) => {
            const rawNext = payload.rfq_pipeline_next_retry_at ?? payload.next_retry_at ?? '';
            if (typeof rawNext !== 'string' || rawNext.trim().length === 0) {
                return 0;
            }
            const parsed = Date.parse(rawNext);
            return Number.isFinite(parsed) ? parsed : 0;
        };
        const isRetryDue = (payload) => {
            const nextRetryAt = getNextRetryAt(payload);
            return nextRetryAt === 0 || nextRetryAt <= Date.now();
        };
        const classifyFailure = (error) => {
            const message = this.errorToMessage(error);
            const normalized = message.toLowerCase();
            if (this.isPayloadTooLargeError(error)) {
                return {
                    kind: 'payload_too_large',
                    retryable: true,
                    message,
                };
            }
            if (this.isRateLimitOrTemporary(error) ||
                this.isRateLimitError(error) ||
                normalized.includes('timeout') ||
                normalized.includes('temporarily') ||
                normalized.includes('overloaded') ||
                normalized.includes('503') ||
                normalized.includes('502') ||
                normalized.includes('504') ||
                normalized.includes('fetch failed') ||
                normalized.includes('network')) {
                return {
                    kind: normalized.includes('rate limit') || normalized.includes('429')
                        ? 'rate_limited'
                        : 'temporary_provider',
                    retryable: true,
                    message,
                };
            }
            if (normalized.includes('invalid json') ||
                normalized.includes('schema') ||
                normalized.includes('non-json') ||
                normalized.includes('unexpected token') ||
                normalized.includes('did not include output text') ||
                normalized.includes('empty response')) {
                return {
                    kind: normalized.includes('did not include output text')
                        ? 'empty_response'
                        : normalized.includes('schema')
                            ? 'schema_invalid'
                            : 'invalid_json',
                    retryable: true,
                    message,
                };
            }
            if (normalized.includes('missing api key') ||
                normalized.includes('api key missing') ||
                normalized.includes('not configured')) {
                return {
                    kind: 'fatal_misconfiguration',
                    retryable: false,
                    message,
                };
            }
            return {
                kind: 'fatal_provider_failure',
                retryable: false,
                message,
            };
        };
        const computeBackoffMs = (retryCount, kind) => {
            const index = Math.min(retryCount, retryDelayMinutes.length - 1);
            const baseDelay = retryDelayMinutes[index] * 60 * 1000;
            if (kind === 'payload_too_large') {
                return 30 * 1000;
            }
            if (kind === 'invalid_json' ||
                kind === 'schema_invalid' ||
                kind === 'empty_response') {
                return Math.max(30 * 1000, Math.min(baseDelay, 5 * 60 * 1000));
            }
            if (kind === 'temporary_provider') {
                return Math.max(60 * 1000, baseDelay);
            }
            return baseDelay;
        };
        const buildRetryPayload = (payload, kind, reason, retryCount) => {
            const nextRetryAt = new Date(Date.now() + computeBackoffMs(retryCount, kind)).toISOString();
            return {
                ...payload,
                rfq_pipeline_retry_count: retryCount + 1,
                rfq_pipeline_last_retry_at: new Date().toISOString(),
                rfq_pipeline_next_retry_at: nextRetryAt,
                rfq_pipeline_last_failure_kind: kind,
                rfq_pipeline_last_failure_reason: reason,
            };
        };
        const compactClassifierPrompt = (messages) => {
            const compactRows = messages
                .map((message) => `- ${message.id}\n  subject: ${(message.subject || '').slice(0, 120)}\n  body: ${(message.body || '').slice(0, 1800)}`)
                .join('\n');
            return [
                'TASK: Classify each message as RFQ or non-RFQ.',
                'Return exactly one JSON object and nothing else.',
                'Schema: {"rfq_ids":["id1"],"non_rfq_ids":["id2"],"reasons":{"id1":"short reason"}}',
                'Rules: Use RFQ for a request for quote/pricing/proforma.',
                'Body is a snippet; if unsure, mark RFQ to avoid missing true RFQs.',
                compactRows,
            ].join('\n');
        };
        const compactExtractionPrompt = (subject, body) => {
            return [
                'TASK: Extract RFQ intent and purchasable line items.',
                'Return exactly one JSON object and nothing else.',
                'Schema: {"is_rfq":true|false,"confidence":"high|medium|low","reason":"string","items":[{"product_name":"string","quantity":1,"unit":"string","notes":"string"}]}',
                'Use a compact answer. Do not invent products or quantities.',
                `Subject: ${(subject || '').slice(0, 200)}`,
                `Body: ${(body || '').slice(0, 8000)}`,
            ].join('\n');
        };
        const parseClassification = (responseText, messages) => {
            const parsed = this.parseJsonFlexible(responseText);
            if (!parsed) {
                throw new Error('Batch classifier output invalid JSON');
            }
            const inputIds = new Set(messages.map((message) => message.id));
            const rfqIds = Array.isArray(parsed.rfq_ids)
                ? parsed.rfq_ids
                    .map((value) => getString(value, '').trim())
                    .filter((id) => inputIds.has(id))
                : [];
            const nonRfqIds = Array.isArray(parsed.non_rfq_ids)
                ? parsed.non_rfq_ids
                    .map((value) => getString(value, '').trim())
                    .filter((id) => inputIds.has(id))
                : [];
            const reasonsRaw = parsed.reasons &&
                typeof parsed.reasons === 'object' &&
                !Array.isArray(parsed.reasons)
                ? parsed.reasons
                : {};
            const reasons = {};
            for (const [key, value] of Object.entries(reasonsRaw)) {
                const reason = getString(value, '').trim();
                if (reason) {
                    reasons[key] = reason;
                }
            }
            const rfqSet = new Set(rfqIds);
            const nonRfqSet = new Set(nonRfqIds);
            for (const id of inputIds) {
                if (!rfqSet.has(id) && !nonRfqSet.has(id)) {
                    nonRfqSet.add(id);
                }
            }
            return {
                rfq_ids: Array.from(rfqSet),
                non_rfq_ids: Array.from(nonRfqSet),
                reasons,
            };
        };
        const parseExtraction = (responseText) => {
            const parsed = this.parseJsonFlexible(responseText);
            if (!parsed) {
                throw new Error('LLM output invalid JSON');
            }
            const confidenceRaw = getString(parsed.confidence, 'low').toLowerCase();
            const confidence = confidenceRaw === 'high' || confidenceRaw === 'medium'
                ? confidenceRaw
                : 'low';
            return {
                is_rfq: Boolean(parsed.is_rfq),
                confidence,
                reason: getString(parsed.reason, ''),
                items: this.sanitizeItems(parsed.items),
            };
        };
        const eligibleMessages = [];
        try {
            const take = Math.min(Math.max(Number(options.limit || 30), 1), 200);
            const [pendingMessages, failedMessages] = await Promise.all([
                this.prisma.message.findMany({
                    where: {
                        direction: 'inbound',
                        processing_status: 'pending',
                        ...(options.tenantId ? { tenant_id: options.tenantId } : {}),
                    },
                    orderBy: { created_at: 'asc' },
                    include: { conversation: true },
                    take,
                }),
                this.prisma.message.findMany({
                    where: {
                        direction: 'inbound',
                        processing_status: 'failed',
                        ...(options.tenantId ? { tenant_id: options.tenantId } : {}),
                    },
                    orderBy: { updated_at: 'asc' },
                    include: { conversation: true },
                    take: Math.max(1, Math.ceil(take / 3)),
                }),
            ]);
            summary.scanned = pendingMessages.length + failedMessages.length;
            for (const message of pendingMessages) {
                const payload = readPayload(message.raw_payload);
                if (!isRetryDue(payload)) {
                    summary.skipped += 1;
                    continue;
                }
                eligibleMessages.push({
                    message,
                    payload,
                    retryCount: getRetryCount(payload),
                });
            }
            for (const message of failedMessages) {
                const payload = readPayload(message.raw_payload);
                const retryCount = getRetryCount(payload);
                if (retryCount >= maxAutoRetries) {
                    summary.skipped += 1;
                    continue;
                }
                if (!isRetryDue(payload)) {
                    summary.skipped += 1;
                    continue;
                }
                const retryPayload = buildRetryPayload(payload, 'auto_retry_requeued', 'Automatic retry requeued after previous failure.', retryCount);
                await this.updateMessageProcessing(message.id, {
                    parsing_source: 'backend_auto_retry',
                    parsing_confidence: 'low',
                    parsing_error: '',
                    parsed_items: [],
                    auto_rfq_created: false,
                    pipeline_stage: 'retry_requeued',
                    ...retryPayload,
                }, {
                    status: 'pending',
                    isProcessed: false,
                });
                eligibleMessages.push({
                    message,
                    payload: retryPayload,
                    retryCount: retryCount + 1,
                });
            }
            const pendingById = new Map(eligibleMessages.map((entry) => [entry.message.id, entry]));
            const regexRfqCandidates = [];
            const uncertainCandidates = [];
            for (const entry of eligibleMessages) {
                const fullBody = this.asText(entry.payload.body_text, entry.message.body || '');
                const candidate = {
                    id: entry.message.id,
                    subject: getString(entry.message.conversation?.subject, ''),
                    body: fullBody,
                };
                const regexDecision = this.classifyRfqByRegex(candidate.subject, candidate.body);
                if (regexDecision.verdict === 'non_rfq') {
                    summary.non_rfq += 1;
                    await this.updateMessageProcessing(candidate.id, {
                        parsing_source: 'backend_regex_classifier',
                        parsing_confidence: regexDecision.confidence,
                        parsing_error: regexDecision.reason,
                        parsed_items: [],
                        auto_rfq_created: false,
                        pipeline_stage: 'classified_non_rfq_regex',
                        rfq_pipeline_last_error_kind: 'regex_non_rfq',
                    }, { status: 'parsed' });
                    continue;
                }
                if (regexDecision.verdict === 'rfq') {
                    const classifiedAt = typeof entry.payload.rfq_classified_at === 'string' &&
                        entry.payload.rfq_classified_at.trim().length > 0
                        ? entry.payload.rfq_classified_at
                        : new Date().toISOString();
                    regexRfqCandidates.push(candidate);
                    await this.updateMessageProcessing(candidate.id, {
                        parsing_source: 'backend_regex_classifier',
                        parsing_confidence: regexDecision.confidence,
                        parsing_error: '',
                        parsed_items: [],
                        auto_rfq_created: false,
                        pipeline_stage: 'extracting_items_regex_gate',
                        rfq_classified_at: classifiedAt,
                    }, {
                        status: 'pending',
                        isProcessed: false,
                    });
                    continue;
                }
                uncertainCandidates.push(candidate);
            }
            let classification = {
                rfq_ids: [],
                non_rfq_ids: [],
                reasons: {},
            };
            let classificationFailed = false;
            const classifyStageStartedAt = Date.now();
            const classifierCandidates = uncertainCandidates.map((candidate) => ({
                ...candidate,
                body: this.buildClassifierSnippet(candidate.subject, candidate.body),
            }));
            if (classifierCandidates.length > 0) {
                try {
                    classification =
                        await this.classifyRfqCandidatesInBatches(classifierCandidates);
                }
                catch (error) {
                    const failure = classifyFailure(error);
                    if (failure.retryable) {
                        try {
                            classification = parseClassification(await this.callLlmWithFallbacks(compactClassifierPrompt(classifierCandidates), 'classifier'), classifierCandidates);
                        }
                        catch (compactError) {
                            classificationFailed = true;
                            const compactFailure = classifyFailure(compactError);
                            const firstUncertainEntry = classifierCandidates[0]
                                ? pendingById.get(classifierCandidates[0].id)
                                : undefined;
                            const finalFailure = compactFailure.retryable &&
                                getRetryCount(readPayload(firstUncertainEntry?.message.raw_payload)) < maxAutoRetries
                                ? compactFailure
                                : failure;
                            for (const candidate of classifierCandidates) {
                                const entry = pendingById.get(candidate.id);
                                if (!entry)
                                    continue;
                                const retryCount = getRetryCount(entry.payload);
                                const shouldRetry = finalFailure.retryable && retryCount < maxAutoRetries;
                                const retryPayload = shouldRetry
                                    ? buildRetryPayload(entry.payload, finalFailure.kind, `Batch RFQ classification ${finalFailure.kind.replace(/_/g, ' ')}. Details: ${finalFailure.message}`, retryCount)
                                    : entry.payload;
                                await this.updateMessageProcessing(candidate.id, {
                                    parsing_source: 'backend_llm_classifier',
                                    parsing_confidence: 'low',
                                    parsing_error: shouldRetry
                                        ? `Batch RFQ classification ${finalFailure.kind.replace(/_/g, ' ')}. Automatic retry scheduled. Details: ${finalFailure.message}`
                                        : `Batch RFQ classification failed. Details: ${finalFailure.message}`,
                                    parsed_items: [],
                                    auto_rfq_created: false,
                                    pipeline_stage: shouldRetry
                                        ? 'classification_retry_scheduled'
                                        : 'classification_failed',
                                    ...retryPayload,
                                }, {
                                    status: shouldRetry ? 'pending' : 'failed',
                                    isProcessed: shouldRetry ? false : undefined,
                                });
                            }
                            summary.llm_errors += classifierCandidates.length;
                            if (finalFailure.retryable) {
                                summary.skipped += classifierCandidates.length;
                            }
                        }
                    }
                    else {
                        classificationFailed = true;
                        for (const candidate of classifierCandidates) {
                            const entry = pendingById.get(candidate.id);
                            if (!entry)
                                continue;
                            await this.updateMessageProcessing(candidate.id, {
                                parsing_source: 'backend_llm_classifier',
                                parsing_confidence: 'low',
                                parsing_error: `Batch RFQ classification failed. Details: ${failure.message}`,
                                parsed_items: [],
                                auto_rfq_created: false,
                                pipeline_stage: 'classification_failed',
                                rfq_pipeline_last_error_kind: failure.kind,
                            }, { status: 'failed' });
                        }
                        summary.llm_errors += classifierCandidates.length;
                    }
                }
            }
            const classifyStageDurationMs = Date.now() - classifyStageStartedAt;
            if (classifierCandidates.length > 0) {
                this.logger.log(`[RFQ_TIMING] classify_stage size=${classifierCandidates.length} took=${classifyStageDurationMs}ms avg_per_email=${Math.round(classifyStageDurationMs / Math.max(classifierCandidates.length, 1))}ms`);
            }
            const llmRfqIdSet = new Set(classification.rfq_ids);
            const extractionCandidates = [
                ...regexRfqCandidates,
                ...uncertainCandidates.filter((candidate) => llmRfqIdSet.has(candidate.id)),
            ];
            if (!classificationFailed) {
                for (const candidate of uncertainCandidates) {
                    const entry = pendingById.get(candidate.id);
                    if (!entry)
                        continue;
                    if (!llmRfqIdSet.has(candidate.id)) {
                        summary.non_rfq += 1;
                        await this.updateMessageProcessing(candidate.id, {
                            parsing_source: 'backend_llm_classifier',
                            parsing_confidence: 'medium',
                            parsing_error: classification.reasons?.[candidate.id] ||
                                'Classified as non-RFQ email',
                            parsed_items: [],
                            auto_rfq_created: false,
                            pipeline_stage: 'classified_non_rfq',
                        }, { status: 'parsed' });
                        continue;
                    }
                    const classifiedAt = typeof entry.payload.rfq_classified_at === 'string' &&
                        entry.payload.rfq_classified_at.trim().length > 0
                        ? entry.payload.rfq_classified_at
                        : new Date().toISOString();
                    await this.updateMessageProcessing(candidate.id, {
                        parsing_source: 'backend_llm_classifier',
                        parsing_confidence: 'medium',
                        parsing_error: classification.reasons?.[candidate.id] || '',
                        parsed_items: [],
                        auto_rfq_created: false,
                        pipeline_stage: 'extracting_items',
                        rfq_classified_at: classifiedAt,
                    }, {
                        status: 'pending',
                        isProcessed: false,
                    });
                }
            }
            const extractWithFallback = async (candidate) => {
                try {
                    return await this.callLlmExtraction(candidate.subject, candidate.body);
                }
                catch (error) {
                    const failure = classifyFailure(error);
                    if (!failure.retryable) {
                        throw error;
                    }
                    const compactResponse = await this.callLlmWithFallbacks(compactExtractionPrompt(candidate.subject, candidate.body), 'extractor');
                    return parseExtraction(compactResponse);
                }
            };
            const extractionStageStartedAt = Date.now();
            for (const candidate of extractionCandidates) {
                const entry = pendingById.get(candidate.id);
                if (!entry)
                    continue;
                const messageStart = Date.now();
                const retryCount = getRetryCount(entry.payload);
                const currentPayload = entry.payload;
                let extraction;
                try {
                    extraction = await extractWithFallback(candidate);
                }
                catch (error) {
                    const failure = classifyFailure(error);
                    summary.llm_errors += 1;
                    const shouldRetry = failure.retryable && retryCount < maxAutoRetries;
                    const retryPayload = shouldRetry
                        ? buildRetryPayload(currentPayload, failure.kind, `LLM extraction ${failure.kind.replace(/_/g, ' ')}. Details: ${failure.message}`, retryCount)
                        : currentPayload;
                    await this.updateMessageProcessing(candidate.id, {
                        parsing_source: 'backend_llm_extractor',
                        parsing_confidence: 'low',
                        parsing_error: shouldRetry
                            ? `LLM extraction ${failure.kind.replace(/_/g, ' ')}. Automatic retry scheduled. Details: ${failure.message}`
                            : `LLM extraction failed. Details: ${failure.message}`,
                        parsed_items: [],
                        auto_rfq_created: false,
                        pipeline_stage: shouldRetry
                            ? 'extraction_retry_scheduled'
                            : 'extraction_failed',
                        ...retryPayload,
                    }, {
                        status: shouldRetry ? 'pending' : 'failed',
                        isProcessed: shouldRetry ? false : undefined,
                    });
                    if (shouldRetry) {
                        summary.skipped += 1;
                    }
                    continue;
                }
                const extractedItems = this.sanitizeItems(extraction.items);
                if (!extraction.is_rfq || extractedItems.length === 0) {
                    summary.unresolved += 1;
                    await this.updateMessageProcessing(candidate.id, {
                        parsing_source: 'rfq_unresolved',
                        parsing_confidence: extraction.confidence,
                        parsing_error: extraction.reason ||
                            'RFQ detected but no valid line items with explicit quantity found',
                        parsed_items: extractedItems,
                        auto_rfq_created: false,
                        pipeline_stage: 'extraction_completed',
                    }, { status: 'parsed' });
                    continue;
                }
                try {
                    const tenantId = getString(entry.message.tenant_id, '').trim();
                    const clientEmail = getString(entry.message.sender_email, '').trim();
                    if (!tenantId) {
                        summary.unresolved += 1;
                        await this.updateMessageProcessing(candidate.id, {
                            parsing_source: 'backend_llm_pipeline',
                            parsing_confidence: extraction.confidence,
                            parsing_error: 'RFQ creation skipped because tenant_id is missing on source message.',
                            parsed_items: extractedItems,
                            auto_rfq_created: false,
                            pipeline_stage: 'rfq_create_failed',
                        }, { status: 'failed' });
                        continue;
                    }
                    const preview = await this.rfqsService.previewFromEmail(tenantId, {
                        client_email: clientEmail,
                        message_id: candidate.id,
                        items: extractedItems,
                    });
                    const matchedItems = Array.isArray(preview.matched_items)
                        ? preview.matched_items
                        : [];
                    if (matchedItems.length === 0) {
                        summary.unresolved += 1;
                        await this.updateMessageProcessing(candidate.id, {
                            parsing_source: 'rfq_unresolved',
                            parsing_confidence: extraction.confidence,
                            parsing_error: getString(preview.summary, 'No valid catalog match found'),
                            parsed_items: extractedItems,
                            rejected_items: preview.unmatched_items,
                            auto_rfq_created: false,
                            pipeline_stage: 'extraction_completed',
                        }, { status: 'parsed' });
                        continue;
                    }
                    await this.rfqsService.createFromEmail(tenantId, {
                        client_email: clientEmail,
                        message_id: candidate.id,
                        items: matchedItems,
                        parsing_confidence: extraction.confidence,
                        parsing_source: 'backend_llm_pipeline',
                    });
                    await this.updateMessageProcessing(candidate.id, {
                        parsing_source: 'backend_llm_pipeline',
                        parsing_confidence: extraction.confidence,
                        parsing_error: '',
                        parsed_items: matchedItems,
                        rejected_items: preview.unmatched_items,
                        auto_rfq_created: true,
                        pipeline_stage: 'rfq_created',
                        rfq_pipeline_retry_count: 0,
                        rfq_pipeline_next_retry_at: '',
                        rfq_pipeline_last_failure_kind: '',
                        rfq_pipeline_last_failure_reason: '',
                    }, { status: 'parsed' });
                    summary.created_rfqs += 1;
                }
                catch (error) {
                    const message = this.errorToMessage(error);
                    if (error instanceof common_1.BadRequestException) {
                        summary.unresolved += 1;
                        await this.updateMessageProcessing(candidate.id, {
                            parsing_source: 'backend_llm_pipeline',
                            parsing_confidence: extraction.confidence,
                            parsing_error: message,
                            parsed_items: extractedItems,
                            auto_rfq_created: false,
                            pipeline_stage: 'rfq_create_failed',
                        }, { status: 'failed' });
                        continue;
                    }
                    summary.llm_errors += 1;
                    const failure = classifyFailure(error);
                    const shouldRetry = failure.retryable && retryCount < maxAutoRetries;
                    const retryPayload = shouldRetry
                        ? buildRetryPayload(currentPayload, failure.kind, `RFQ creation failed after extraction. Details: ${message}`, retryCount)
                        : currentPayload;
                    await this.updateMessageProcessing(candidate.id, {
                        parsing_source: 'backend_llm_pipeline',
                        parsing_confidence: extraction.confidence,
                        parsing_error: shouldRetry
                            ? `RFQ creation failed. Automatic retry scheduled. Details: ${message}`
                            : `RFQ creation failed. Details: ${message}`,
                        parsed_items: extractedItems,
                        auto_rfq_created: false,
                        pipeline_stage: shouldRetry
                            ? 'rfq_create_retry_scheduled'
                            : 'rfq_create_failed',
                        ...retryPayload,
                    }, {
                        status: shouldRetry ? 'pending' : 'failed',
                        isProcessed: shouldRetry ? false : undefined,
                    });
                }
                if (extraction.confidence !== 'high') {
                    await this.sleep(this.extractionDelayMs);
                }
                const messageDurationMs = Date.now() - messageStart;
                this.logger.debug(`[RFQ_TIMING] extract_message id=${candidate.id} took=${messageDurationMs}ms`);
            }
            const extractionStageDurationMs = Date.now() - extractionStageStartedAt;
            if (extractionCandidates.length > 0) {
                this.logger.log(`[RFQ_TIMING] extraction_stage size=${extractionCandidates.length} took=${extractionStageDurationMs}ms avg_per_email=${Math.round(extractionStageDurationMs /
                    Math.max(extractionCandidates.length, 1))}ms`);
            }
            const totalDurationMs = Date.now() - runStartedAt;
            this.logger.log(`[RFQ_TIMING] run_complete scanned=${summary.scanned} processed=${summary.created_rfqs + summary.non_rfq + summary.unresolved} created_rfqs=${summary.created_rfqs} non_rfq=${summary.non_rfq} unresolved=${summary.unresolved} llm_errors=${summary.llm_errors} skipped=${summary.skipped} took=${totalDurationMs}ms avg_per_scanned=${Math.round(totalDurationMs / Math.max(summary.scanned, 1))}ms`);
            return {
                started: true,
                ...summary,
            };
        }
        finally {
            this.isRunning = false;
        }
    }
};
exports.EmailRfqService = EmailRfqService;
exports.EmailRfqService = EmailRfqService = EmailRfqService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        rfqs_service_1.RfqsService])
], EmailRfqService);
//# sourceMappingURL=email-rfq.service.js.map