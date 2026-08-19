import { createServer } from 'node:http';
import { Telegraf, Markup, Context } from 'telegraf';
import { ApiClient, TelegramUser } from './api-client';

const token = process.env.TELEGRAM_BOT_TOKEN;
const apiUrl = process.env.API_URL ?? 'http://api:3000';
const botSecret = process.env.TELEGRAM_WEBHOOK_SECRET ?? '';
const miniAppUrl = process.env.TELEGRAM_MINI_APP_URL ?? 'http://localhost:5173';
if (!token) throw new Error('TELEGRAM_BOT_TOKEN is required');
const bot = new Telegraf(token); const api = new ApiClient(apiUrl, botSecret);
const tgUser = (ctx: Context): TelegramUser => { if (!ctx.from) throw new Error('Telegram user is missing'); return { id: ctx.from.id, first_name: ctx.from.first_name, last_name: ctx.from.last_name, username: ctx.from.username }; };
const money = (amount: string, currency: string) => `${Number(amount).toLocaleString('en-US')} ${currency}`;

bot.start(async (ctx) => {
  try { const result = await api.onboard(tgUser(ctx)); if (result.needsCurrency) await ctx.reply('Assalomu alaykum! Default valyutangizni tanlang:', Markup.inlineKeyboard([[Markup.button.callback('🇺🇿 UZS', 'currency:UZS'), Markup.button.callback('🇰🇷 KRW', 'currency:KRW'), Markup.button.callback('🇺🇸 USD', 'currency:USD')]])); else await ctx.reply(`Xush kelibsiz, ${result.user.firstName}!\nHisobingiz tayyor.`, mainMenu()); } catch (error) { await ctx.reply(`Xatolik: ${(error as Error).message}`); }
});

bot.action(/^currency:(UZS|KRW|USD)$/, async (ctx) => { await ctx.answerCbQuery(); try { const currency = ctx.match[1]; if (!currency) throw new Error('Currency is missing'); const result = await api.onboard(tgUser(ctx), currency as 'UZS' | 'KRW' | 'USD'); await ctx.editMessageText(`✅ Valyuta saqlandi. ${result.user.firstName}, Hisobchi tayyor!`); await ctx.reply('Daromad yoki xarajatni oddiy matn bilan yuboring, masalan: -45000 tushlik', mainMenu()); } catch (error) { await ctx.reply(`Xatolik: ${(error as Error).message}`); } });

bot.command('balance', async (ctx) => { try { const { accessToken } = await api.onboard(tgUser(ctx)); const accounts = await api.accounts(accessToken); await ctx.reply(accounts.length ? accounts.map((a) => `${a.name}: ${money(a.balance, a.currency)}`).join('\n') : 'Hisob topilmadi.'); } catch (error) { await ctx.reply(`Xatolik: ${(error as Error).message}`); } });
bot.hears('💰 Balance', async (ctx) => { try { const { accessToken } = await api.onboard(tgUser(ctx)); const accounts = await api.accounts(accessToken); await ctx.reply(accounts.length ? accounts.map((a) => `${a.name}: ${money(a.balance, a.currency)}`).join('\n') : 'Hisob topilmadi.'); } catch (error) { await ctx.reply(`Xatolik: ${(error as Error).message}`); } });
bot.command('accounts', async (ctx) => { try { const { accessToken } = await api.onboard(tgUser(ctx)); const accounts = await api.accounts(accessToken); await ctx.reply(accounts.map((a) => `• ${a.name} — ${money(a.balance, a.currency)}`).join('\n') || 'Hisob topilmadi.'); } catch (error) { await ctx.reply(`Xatolik: ${(error as Error).message}`); } });
bot.command('history', async (ctx) => { try { const { accessToken } = await api.onboard(tgUser(ctx)); const result = await api.transactions(accessToken); await ctx.reply(result.data.map((t) => `${t.type === 'INCOME' ? '+' : '-'}${money(t.amount, t.currency)} — ${t.description}`).join('\n') || 'Tranzaksiyalar yo\'q.'); } catch (error) { await ctx.reply(`Xatolik: ${(error as Error).message}`); } });
bot.hears('📜 History', async (ctx) => { try { const { accessToken } = await api.onboard(tgUser(ctx)); const result = await api.transactions(accessToken); await ctx.reply(result.data.map((t) => `${t.type === 'INCOME' ? '+' : '-'}${money(t.amount, t.currency)} — ${t.description}`).join('\n') || 'Tranzaksiyalar yo\'q.'); } catch (error) { await ctx.reply(`Xatolik: ${(error as Error).message}`); } });
bot.command('help', async (ctx) => ctx.reply('/start — boshlash\n/balance — balans\n/history — tarix\n/accounts — hisoblar\n\nMisol: -45000 tushlik yoki +5000000 oylik'));
bot.hears(['💰 Income', '💸 Expense'], async (ctx) => ctx.reply(ctx.message.text.includes('Income') ? 'Daromadni yuboring: +5000000 oylik' : 'Xarajatni yuboring: -45000 tushlik'));

bot.on('text', async (ctx) => {
  if (ctx.message.text.startsWith('/')) return;
  try { const { accessToken } = await api.onboard(tgUser(ctx)); const result = await api.parse(ctx.message.text, accessToken); if (!result.created) { await ctx.reply('Aniqroq yozing yoki miqdor, valyuta va kategoriyani tasdiqlang.'); return; } await ctx.reply(`✅ ${result.created.type === 'INCOME' ? 'Daromad' : 'Xarajat'} qo\'shildi\n${result.created.description}\n${money(result.created.amount, result.created.currency)}`, Markup.inlineKeyboard([[Markup.button.callback('↩️ Bekor qilish', `undo:${result.created.id}`)]])); } catch (error) { await ctx.reply(`Xatolik: ${(error as Error).message}`); }
});
bot.action(/^undo:(.+)$/, async (ctx) => { await ctx.answerCbQuery(); try { const id = ctx.match[1]; if (!id) throw new Error('Transaction id is missing'); const { accessToken } = await api.onboard(tgUser(ctx)); await api.removeTransaction(id, accessToken); await ctx.editMessageText('↩️ Tranzaksiya bekor qilindi.'); } catch (error) { await ctx.reply(`Xatolik: ${(error as Error).message}`); } });

function mainMenu() { return Markup.keyboard([['💰 Income', '💸 Expense'], [Markup.button.webApp('📊 My Account', miniAppUrl)], ['💰 Balance', '📜 History']]).resize(); }
const mode = process.env.BOT_MODE ?? 'polling';
if (mode === 'webhook') { const port = Number(process.env.BOT_PORT ?? 3001); const callback = bot.webhookCallback('/telegram/webhook'); createServer((req, res) => callback(req, res)).listen(port, '0.0.0.0', () => void bot.telegram.setWebhook(`${process.env.PUBLIC_API_URL ?? process.env.API_URL}/telegram/webhook`, { secret_token: botSecret })); } else { void bot.launch(); }
process.once('SIGINT', () => bot.stop('SIGINT')); process.once('SIGTERM', () => bot.stop('SIGTERM'));
