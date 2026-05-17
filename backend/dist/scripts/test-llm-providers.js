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
const TEST_PROMPT = process.env.LLM_SMOKE_TEST_PROMPT ||
    'Return strictly valid JSON: {"ok":true,"provider":"name","note":"short"}';
async function testGroq() {
    const apiKey = process.env.GROQ_API_KEY || '';
    const baseUrl = process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';
    const model = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';
    if (!apiKey) {
        return {
            provider: 'groq',
            ok: false,
            model,
            text: '',
            error: 'Missing GROQ_API_KEY',
        };
    }
    try {
        const res = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                temperature: 0.1,
                messages: [{ role: 'user', content: TEST_PROMPT }],
            }),
        });
        if (!res.ok) {
            const errText = await res.text();
            return {
                provider: 'groq',
                ok: false,
                model,
                text: '',
                error: `HTTP ${res.status}: ${errText.slice(0, 500)}`,
            };
        }
        const payload = (await res.json());
        const text = String(payload.choices?.[0]?.message?.content || '').trim();
        return {
            provider: 'groq',
            ok: text.length > 0,
            model,
            text,
            ...(text.length === 0 ? { error: 'Empty output text' } : {}),
        };
    }
    catch (error) {
        return {
            provider: 'groq',
            ok: false,
            model,
            text: '',
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
async function testCerebras() {
    const apiKey = process.env.CEREBRAS_API_KEY || '';
    const baseUrl = process.env.CEREBRAS_BASE_URL || 'https://api.cerebras.ai/v1';
    const model = process.env.CEREBRAS_MODEL || 'gpt-oss-120b';
    if (!apiKey) {
        return {
            provider: 'cerebras',
            ok: false,
            model,
            text: '',
            error: 'Missing CEREBRAS_API_KEY',
        };
    }
    try {
        const res = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                temperature: 0.1,
                messages: [{ role: 'user', content: TEST_PROMPT }],
            }),
        });
        if (!res.ok) {
            const errText = await res.text();
            return {
                provider: 'cerebras',
                ok: false,
                model,
                text: '',
                error: `HTTP ${res.status}: ${errText.slice(0, 500)}`,
            };
        }
        const payload = (await res.json());
        const text = String(payload.choices?.[0]?.message?.content || '').trim();
        return {
            provider: 'cerebras',
            ok: text.length > 0,
            model,
            text,
            ...(text.length === 0 ? { error: 'Empty output text' } : {}),
        };
    }
    catch (error) {
        return {
            provider: 'cerebras',
            ok: false,
            model,
            text: '',
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
async function testGemini() {
    const apiKey = process.env.GEMINI_API_KEY || '';
    const baseUrl = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/models';
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
    if (!apiKey) {
        return {
            provider: 'gemini',
            ok: false,
            model,
            text: '',
            error: 'Missing GEMINI_API_KEY',
        };
    }
    try {
        const res = await fetch(`${baseUrl}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: TEST_PROMPT }] }],
                generationConfig: { temperature: 0.1 },
            }),
        });
        if (!res.ok) {
            const errText = await res.text();
            return {
                provider: 'gemini',
                ok: false,
                model,
                text: '',
                error: `HTTP ${res.status}: ${errText.slice(0, 500)}`,
            };
        }
        const payload = (await res.json());
        const text = (payload.candidates?.[0]?.content?.parts || [])
            .map((part) => (typeof part.text === 'string' ? part.text.trim() : ''))
            .filter(Boolean)
            .join('\n')
            .trim();
        return {
            provider: 'gemini',
            ok: text.length > 0,
            model,
            text,
            ...(text.length === 0 ? { error: 'Empty output text' } : {}),
        };
    }
    catch (error) {
        return {
            provider: 'gemini',
            ok: false,
            model,
            text: '',
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
async function main() {
    console.log('\n=== LLM Provider Smoke Test ===');
    console.log(`Prompt: ${TEST_PROMPT}`);
    const results = await Promise.all([testGroq(), testCerebras(), testGemini()]);
    for (const r of results) {
        console.log(`\n[${r.provider.toUpperCase()}] model=${r.model}`);
        console.log(`status=${r.ok ? 'OK' : 'FAIL'}`);
        if (r.ok) {
            console.log(`output=${r.text.slice(0, 500)}`);
        }
        else {
            console.log(`error=${r.error || 'Unknown error'}`);
        }
    }
    const passed = results.filter((r) => r.ok).length;
    console.log(`\nSummary: ${passed}/${results.length} providers passed.`);
    if (passed === 0) {
        process.exit(1);
    }
}
void main();
//# sourceMappingURL=test-llm-providers.js.map