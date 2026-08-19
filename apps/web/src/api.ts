const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export type Currency = 'UZS' | 'KRW' | 'USD';
export interface Account { id: string; name: string; type: string; currency: Currency; balance: string; initialBalance: string; isActive: boolean; }
export interface Category { id: string; name: string; slug: string; icon: string; type: 'INCOME' | 'EXPENSE'; }
export interface Transaction { id: string; type: 'INCOME' | 'EXPENSE'; amount: string; currency: Currency; description: string; transactionDate: string; account: Account; category: Category; }
export interface Dashboard { balances: Record<Currency, string>; accounts: Array<Pick<Account, 'id' | 'name' | 'currency' | 'type'>>; monthly: { income: Record<string, string>; expense: Record<string, string> }; expenseByCategory: Array<{ category: Category; currency: Currency; amount: string }>; recentTransactions: Transaction[]; }

export async function api<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(init.headers); headers.set('content-type', 'application/json'); if (token) headers.set('authorization', `Bearer ${token}`);
  const response = await fetch(`${API_URL}${path}`, { ...init, headers }); const body = await response.json() as T & { message?: string }; if (!response.ok) throw new Error(String(body.message ?? 'Request failed')); return body;
}

export async function authenticate() {
  const initData = window.Telegram?.WebApp.initData;
  if (!initData) throw new Error('Open this app from Telegram to authenticate.');
  const result = await api<{ accessToken: string; user: { firstName: string }; needsOnboarding: boolean }>('/auth/telegram', { method: 'POST', body: JSON.stringify({ initData }) });
  localStorage.setItem('hisobchi_token', result.accessToken); return result;
}
