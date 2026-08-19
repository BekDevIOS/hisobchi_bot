import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiParsedTransaction, AiProvider, AiTransactionContext } from './ai-provider.interface';
import { parsedTransactionSchema } from './schemas/parsed-transaction.schema';

@Injectable()
export class AiService {
  constructor(private readonly config: ConfigService) {}
  isEnabled() { return this.config.get('AI_ENABLED', 'false') === 'true'; }
  async parse(text: string, context: AiTransactionContext): Promise<AiParsedTransaction> {
    if (!this.isEnabled()) throw new ServiceUnavailableException('AI fallback is disabled');
    const provider: AiProvider = new GeminiProvider(this.config.get<string>('GEMINI_API_KEY'), this.config.get<string>('GEMINI_MODEL', 'gemini-1.5-flash'));
    const parsed = await provider.parseTransaction(text, context);
    return parsedTransactionSchema.parse(parsed);
  }
}

class GeminiProvider implements AiProvider {
  constructor(private readonly apiKey?: string, private readonly model = 'gemini-1.5-flash') {}
  async parseTransaction(text: string, context: AiTransactionContext): Promise<AiParsedTransaction> {
    if (!this.apiKey) throw new ServiceUnavailableException('AI provider is not configured');
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
    const response = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: `Parse this personal finance message into JSON only. Use one of the listed categories and currencies. Never invent an amount. Context: ${JSON.stringify(context)}. Message: ${text}` }] }], generationConfig: { responseMimeType: 'application/json', responseSchema: { type: 'OBJECT', properties: { intent: { type: 'STRING' }, type: { type: 'STRING' }, amount: { type: 'STRING' }, currency: { type: 'STRING' }, category: { type: 'STRING' }, description: { type: 'STRING' }, transactionDate: { type: 'STRING' }, confidence: { type: 'NUMBER' } }, required: ['intent', 'type', 'amount', 'currency', 'category', 'description', 'transactionDate', 'confidence'] } } }) });
    if (!response.ok) throw new ServiceUnavailableException('AI provider request failed');
    const body = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }; const raw = body.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) throw new ServiceUnavailableException('AI provider returned no content');
    try { return JSON.parse(raw.replace(/^```json\s*/i, '').replace(/```$/i, '').trim()) as AiParsedTransaction; } catch { throw new ServiceUnavailableException('AI provider returned invalid JSON'); }
  }
}
