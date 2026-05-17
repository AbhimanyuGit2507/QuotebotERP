"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const QUERY_MODE = (process.env.LLM_QUERY_HEALTH_MODE || 'both').toLowerCase();
const PROVIDER_LIST = (process.env.LLM_QUERY_HEALTH_PROVIDERS || 'groq,mistral,gemini,openrouter,cerebras,together,deepseek')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value === 'groq' ||
    value === 'cerebras' ||
    value === 'gemini' ||
    value === 'together' ||
    value === 'mistral' ||
    value === 'deepseek' ||
    value === 'openrouter');
const CEREBRAS_MODELS = (process.env.LLM_QUERY_HEALTH_CEREBRAS_MODELS || 'llama3.1-8b')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value === 'gpt-oss-120b' ||
    value === 'llama3.1-8b' ||
    value === 'qwen-3-235b-a22b-instruct-2507' ||
    value === 'zai-glm-4.7');
const CLASSIFIER_PROMPT = [
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
    '- Every input id must appear in either rfq_ids or non_rfq_ids.',
    'Input JSON: [{"id":"m1","subject":"Please quote 10 pumps","body":"Need pricing for 10 pumps."}]',
].join('\n');
const EXTRACTOR_PROMPT = [
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
    'Subject: Please quote for 10 submersible pumps and 5 valves',
    'Body: Hi team, please send pricing for 10 submersible pumps and 5 valves. Thanks.',
].join('\n');
function getModeList() {
    if (QUERY_MODE === 'classifier')
        return ['classifier'];
    if (QUERY_MODE === 'extractor')
        return ['extractor'];
    return ['classifier', 'extractor'];
}
function promptFor(query) {
    return query === 'classifier' ? CLASSIFIER_PROMPT : EXTRACTOR_PROMPT;
}
function getGroqConfig() {
    return {
        apiKey: process.env.GROQ_API_KEY || '',
        baseUrl: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
        model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
    };
}
function getCerebrasConfig() {
    return {
        apiKey: process.env.CEREBRAS_API_KEY || '',
        baseUrl: process.env.CEREBRAS_BASE_URL || 'https://api.cerebras.ai/v1',
        defaultModel: process.env.CEREBRAS_MODEL || 'gpt-oss-120b',
    };
}
function getGeminiConfig() {
    return {
        apiKey: process.env.GEMINI_API_KEY || '',
        baseUrl: process.env.GEMINI_BASE_URL ||
            'https://generativelanguage.googleapis.com/v1beta/models',
        model: process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite',
    };
}
function getTogetherConfig() {
    return {
        apiKey: process.env.TOGETHER_API_KEY || '',
        baseUrl: process.env.TOGETHER_BASE_URL || 'https://api.together.xyz/v1',
        model: process.env.TOGETHER_MODEL || 'mistralai/Mistral-Nemo-Instruct-2407',
    };
}
function getMistralConfig() {
    return {
        apiKey: process.env.MISTRAL_API_KEY || '',
        baseUrl: process.env.MISTRAL_BASE_URL || 'https://api.mistral.ai/v1',
        model: process.env.MISTRAL_MODEL || 'open-mistral-nemo',
    };
}
function getDeepSeekConfig() {
    return {
        apiKey: process.env.DEEPSEEK_API_KEY || '',
        baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
        model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    };
}
function getOpenRouterConfig() {
    return {
        apiKey: process.env.OPENROUTER_API_KEY || '',
        baseUrl: process.env.OPENROUTER_BASE_URL ||
            'https://openrouter.ai/api/v1/chat/completions',
        model: process.env.OPENROUTER_MODEL ||
            'google/gemma-3-27b-it:free',
    };
}
function parseJson(text) {
    try {
        return JSON.parse(text);
    }
    catch {
        return undefined;
    }
}
function parseJsonFlexible(text) {
    const trimmed = String(text || '').trim();
    const direct = parseJson(trimmed);
    if (direct !== undefined) {
        return direct;
    }
    const codeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (codeBlock?.[1]) {
        const parsed = parseJson(codeBlock[1].trim());
        if (parsed !== undefined) {
            return parsed;
        }
    }
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
        return parseJson(trimmed.slice(start, end + 1));
    }
    return undefined;
}
function isValidClassifierResponse(parsed) {
    return (Boolean(parsed) &&
        typeof parsed === 'object' &&
        Array.isArray(parsed.rfq_ids) &&
        Array.isArray(parsed.non_rfq_ids));
}
function isValidExtractorResponse(parsed) {
    return (Boolean(parsed) &&
        typeof parsed === 'object' &&
        typeof parsed.is_rfq === 'boolean' &&
        Array.isArray(parsed.items));
}
function buildStrictJsonMessages(prompt) {
    return [
        {
            role: 'system',
            content: 'You are a strict JSON generator. Return exactly one valid JSON object and nothing else.',
        },
        { role: 'user', content: prompt },
    ];
}
async function callChatCompletion(config, model, prompt) {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
            model,
            temperature: 0,
            messages: buildStrictJsonMessages(prompt),
        }),
    });
    if (!response.ok) {
        const errorText = await response.text();
        return { ok: false, text: '', error: `HTTP ${response.status}: ${errorText.slice(0, 500)}` };
    }
    const payload = await response.json();
    const text = String(payload
        .choices?.[0]?.message?.content || '').trim();
    return { ok: true, text };
}
async function callOpenRouterCompletion(prompt) {
    const config = getOpenRouterConfig();
    const response = await fetch(config.baseUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.apiKey}`,
            'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER || 'http://localhost:3000',
            'X-Title': process.env.OPENROUTER_APP_NAME || 'Quotebot ERP',
        },
        body: JSON.stringify({
            model: config.model,
            temperature: 0,
            messages: buildStrictJsonMessages(prompt),
        }),
    });
    if (!response.ok) {
        const errorText = await response.text();
        return {
            ok: false,
            text: '',
            error: `HTTP ${response.status}: ${errorText.slice(0, 500)}`,
        };
    }
    const payload = await response.json();
    const text = String(payload
        .choices?.[0]?.message?.content || '').trim();
    return { ok: true, text };
}
async function callGeminiCompletion(prompt) {
    const config = getGeminiConfig();
    const response = await fetch(`${config.baseUrl}/${encodeURIComponent(config.model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1 },
        }),
    });
    if (!response.ok) {
        const errorText = await response.text();
        return { ok: false, text: '', error: `HTTP ${response.status}: ${errorText.slice(0, 500)}` };
    }
    const payload = await response.json();
    const text = String(payload
        .candidates?.[0]?.content?.parts?.map((part) => (typeof part.text === 'string' ? part.text.trim() : ''))
        .filter(Boolean)
        .join('\n') || '').trim();
    return { ok: true, text };
}
function buildRepairPrompt(query, originalPrompt, badResponse) {
    return [
        'Your previous answer did not match the requested JSON schema.',
        'Convert the content below into exactly one valid JSON object and nothing else.',
        'Do not add markdown, code fences, explanations, Python, or comments.',
        'Expected schema:',
        query === 'classifier'
            ? '{"rfq_ids":["id1"],"non_rfq_ids":["id2"],"reasons":{"id1":"short reason"}}'
            : '{"is_rfq":true|false,"confidence":"high|medium|low","reason":"string","items":[{"product_name":"string","quantity":1,"unit":"string","notes":"string"}]}',
        'Original prompt:',
        originalPrompt,
        'Previous answer to repair:',
        badResponse,
    ].join('\n');
}
async function runChatQuery(provider, model, query, prompt) {
    const config = provider === 'groq'
        ? getGroqConfig()
        : provider === 'together'
            ? getTogetherConfig()
            : provider === 'mistral'
                ? getMistralConfig()
                : provider === 'deepseek'
                    ? getDeepSeekConfig()
                    : getCerebrasConfig();
    if (!config.apiKey) {
        return {
            provider,
            model,
            query,
            ok: false,
            text: '',
            error: `Missing ${provider.toUpperCase()}_API_KEY`,
        };
    }
    const first = await callChatCompletion(config, model, prompt);
    if (!first.ok) {
        return {
            provider,
            model,
            query,
            ok: false,
            text: first.text,
            error: first.error,
        };
    }
    const parsed = parseJson(first.text);
    const valid = query === 'classifier' ? isValidClassifierResponse(parsed) : isValidExtractorResponse(parsed);
    if (valid) {
        return { provider, model, query, ok: true, text: first.text, parsed };
    }
    const repaired = await callChatCompletion(config, model, buildRepairPrompt(query, prompt, first.text));
    if (!repaired.ok) {
        return { provider, model, query, ok: false, text: repaired.text, error: repaired.error || 'Repair request failed' };
    }
    const repairedParsed = parseJson(repaired.text);
    const repairedValid = query === 'classifier' ? isValidClassifierResponse(repairedParsed) : isValidExtractorResponse(repairedParsed);
    return repairedValid
        ? { provider, model, query, ok: true, text: repaired.text, parsed: repairedParsed }
        : { provider, model, query, ok: false, text: repaired.text, error: 'Output was not valid JSON matching the expected schema' };
}
async function runOpenRouterQuery(query, prompt) {
    const config = getOpenRouterConfig();
    if (!config.apiKey) {
        return {
            provider: 'openrouter',
            model: config.model,
            query,
            ok: false,
            text: '',
            error: 'Missing OPENROUTER_API_KEY',
        };
    }
    const result = await callOpenRouterCompletion(prompt);
    if (!result.ok) {
        return {
            provider: 'openrouter',
            model: config.model,
            query,
            ok: false,
            text: '',
            error: result.error,
        };
    }
    const parsed = parseJsonFlexible(result.text);
    const ok = query === 'classifier' ? isValidClassifierResponse(parsed) : isValidExtractorResponse(parsed);
    return ok
        ? { provider: 'openrouter', model: config.model, query, ok: true, text: result.text, parsed }
        : {
            provider: 'openrouter',
            model: config.model,
            query,
            ok: false,
            text: result.text,
            error: 'Output was not valid JSON matching the expected schema',
        };
}
async function runGeminiQuery(query, prompt) {
    const config = getGeminiConfig();
    if (!config.apiKey) {
        return {
            provider: 'gemini',
            model: config.model,
            query,
            ok: false,
            text: '',
            error: 'Missing GEMINI_API_KEY',
        };
    }
    const result = await callGeminiCompletion(prompt);
    if (!result.ok) {
        return {
            provider: 'gemini',
            model: config.model,
            query,
            ok: false,
            text: '',
            error: result.error,
        };
    }
    const parsed = parseJsonFlexible(result.text);
    const ok = query === 'classifier' ? isValidClassifierResponse(parsed) : isValidExtractorResponse(parsed);
    return ok
        ? { provider: 'gemini', model: config.model, query, ok: true, text: result.text, parsed }
        : {
            provider: 'gemini',
            model: config.model,
            query,
            ok: false,
            text: result.text,
            error: 'Output was not valid JSON matching the expected schema',
        };
}
function printResult(result) {
    console.log(`\n[${result.provider.toUpperCase()}] query=${result.query} model=${result.model}`);
    console.log(`status=${result.ok ? 'OK' : 'FAIL'}`);
    if (result.text) {
        console.log(`raw=${result.text.slice(0, 2000)}`);
    }
    if (result.ok) {
        if (result.parsed) {
            console.log(`parsed=${JSON.stringify(result.parsed).slice(0, 500)}`);
        }
    }
    if (!result.ok) {
        console.log(`error=${result.error || 'Unknown error'}`);
    }
}
async function main() {
    console.log('\n=== LLM Query Health Check ===');
    console.log(`mode=${QUERY_MODE}`);
    console.log(`providers=${PROVIDER_LIST.join(', ') || 'none'}`);
    console.log(`cerebras_models=${CEREBRAS_MODELS.join(', ') || 'none'}`);
    if (PROVIDER_LIST.length === 0) {
        console.error('No valid providers configured in LLM_QUERY_HEALTH_PROVIDERS.');
        process.exit(1);
    }
    const results = [];
    for (const provider of PROVIDER_LIST) {
        if (provider === 'openrouter') {
            for (const query of getModeList()) {
                const result = await runOpenRouterQuery(query, promptFor(query));
                results.push(result);
                printResult(result);
            }
            continue;
        }
        if (provider === 'cerebras') {
            const config = getCerebrasConfig();
            if (!config.apiKey) {
                for (const model of CEREBRAS_MODELS) {
                    for (const query of getModeList()) {
                        const result = {
                            provider,
                            model,
                            query,
                            ok: false,
                            text: '',
                            error: 'Missing CEREBRAS_API_KEY',
                        };
                        results.push(result);
                        printResult(result);
                    }
                }
                continue;
            }
            for (const model of CEREBRAS_MODELS) {
                for (const query of getModeList()) {
                    const result = await runChatQuery(provider, model, query, promptFor(query));
                    results.push(result);
                    printResult(result);
                }
            }
            continue;
        }
        if (provider === 'groq') {
            const config = getGroqConfig();
            for (const query of getModeList()) {
                const result = config.apiKey
                    ? await runChatQuery('groq', config.model, query, promptFor(query))
                    : { provider: 'groq', model: config.model, query, ok: false, text: '', error: 'Missing GROQ_API_KEY' };
                results.push(result);
                printResult(result);
            }
            continue;
        }
        if (provider === 'together' || provider === 'mistral' || provider === 'deepseek') {
            const config = provider === 'together'
                ? getTogetherConfig()
                : provider === 'mistral'
                    ? getMistralConfig()
                    : getDeepSeekConfig();
            for (const query of getModeList()) {
                const result = config.apiKey
                    ? await runChatQuery(provider, config.model, query, promptFor(query))
                    : {
                        provider,
                        model: config.model,
                        query,
                        ok: false,
                        text: '',
                        error: `Missing ${provider.toUpperCase()}_API_KEY`,
                    };
                results.push(result);
                printResult(result);
            }
            continue;
        }
        const config = getGeminiConfig();
        for (const query of getModeList()) {
            const result = config.apiKey
                ? await runGeminiQuery(query, promptFor(query))
                : { provider: 'gemini', model: config.model, query, ok: false, text: '', error: 'Missing GEMINI_API_KEY' };
            results.push(result);
            printResult(result);
        }
    }
    const passed = results.filter((result) => result.ok).length;
    console.log(`\nSummary: ${passed}/${results.length} query checks passed.`);
    if (passed === 0) {
        process.exit(1);
    }
}
void main();
//# sourceMappingURL=test-llm-query-health.js.map