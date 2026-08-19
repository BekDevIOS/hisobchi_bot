import { PrismaClient, CategoryType } from '@prisma/client';

const prisma = new PrismaClient();

const expenseCategories = [
  ['FOOD', 'Ovqat', '🍽️'], ['TRANSPORT', 'Transport', '🚕'], ['HOME', 'Uy', '🏠'],
  ['SHOPPING', 'Shopping', '🛍️'], ['HEALTH', "Sog'liq", '❤️'], ['ENTERTAINMENT', "Ko'ngilochar", '🎬'],
  ['EDUCATION', "Ta'lim", '📚'], ['COMMUNICATION', 'Aloqa', '📱'], ['CREDIT', 'Kredit', '💳'], ['OTHER', 'Boshqa', '📦'],
] as const;
const incomeCategories = [
  ['SALARY', 'Oylik', '💼'], ['FREELANCE', 'Freelance', '🧑‍💻'], ['BUSINESS', 'Biznes', '🏪'],
  ['GIFT', "Sovg'a", '🎁'], ['INVESTMENT', 'Investitsiya', '📈'], ['OTHER_INCOME', 'Boshqa daromad', '💰'],
] as const;

async function seedGroup(items: readonly (readonly [string, string, string])[], type: CategoryType) {
  for (const [slug, name, icon] of items) {
    const existing = await prisma.category.findFirst({ where: { userId: null, slug, type } });
    if (existing) await prisma.category.update({ where: { id: existing.id }, data: { name, icon, isSystem: true } });
    else await prisma.category.create({ data: { userId: null, slug, name, icon, type, isSystem: true } });
  }
}

async function main() {
  await seedGroup(expenseCategories, CategoryType.EXPENSE);
  await seedGroup(incomeCategories, CategoryType.INCOME);
}

main().finally(() => prisma.$disconnect());
