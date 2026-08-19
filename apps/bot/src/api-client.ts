export interface TelegramUser { id: number; first_name: string; last_name?: string; username?: string; }
export interface OnboardResult { accessToken: string; needsCurrency: boolean; user: { firstName: string }; }

export class ApiClient {
  constructor(private readonly baseUrl: string, private readonly botSecret: string) {}
  private async request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
    const headers = new Headers(init.headers); headers.set('content-type', 'application/json'); headers.set('x-telegram-bot-secret', this.botSecret); if (token) headers.set('authorization', `Bearer ${token}`);
    const response = await fetch(`${this.baseUrl}${path}`, { ...init, headers }); const body = await response.json() as T & { message?: string }; if (!response.ok) throw new Error(body.message ?? `API request failed (${response.status})`); return body;
  }
  onboard(user: TelegramUser, currency?: 'UZS' | 'KRW' | 'USD') { return this.request<OnboardResult>('/telegram/onboard', { method: 'POST', body: JSON.stringify({ user, currency }) }); }
  parse(text: string, token: string) { return this.request<{ parsed: { amount: string; currency: string; type: string; description: string; confidence: number }; created: { id: string; amount: string; currency: string; description: string; transactionDate: string } | null; requiresConfirmation: boolean }>('/transactions/parse', { method: 'POST', body: JSON.stringify({ text, commit: true }) }, token); }
  removeTransaction(id: string, token: string) { return this.request<{ success: boolean }>(`/transactions/${id}`, { method: 'DELETE' }, token); }
  accounts(token: string) { return this.request<Array<{ name: string; currency: string; balance: string }>>('/accounts', {}, token); }
  transactions(token: string) { return this.request<{ data: Array<{ description: string; amount: string; currency: string; transactionDate: string; type: string }> }>('/transactions?limit=10', {}, token); }
}
