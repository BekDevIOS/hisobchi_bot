import { BadRequestException, Injectable } from '@nestjs/common';
import { CategoryType } from '@prisma/client';
import { PrismaService } from '../prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}
  list(userId: string, type?: CategoryType) {
    if (type && !Object.values(CategoryType).includes(type)) throw new BadRequestException('Invalid category type');
    return this.prisma.category.findMany({ where: { OR: [{ isSystem: true, userId: null }, { userId }], ...(type ? { type } : {}) }, orderBy: [{ type: 'asc' }, { name: 'asc' }] });
  }
  async findForUser(userId: string, slug: string, type: CategoryType) { return this.prisma.category.findFirst({ where: { slug, type, OR: [{ isSystem: true, userId: null }, { userId }] } }); }
}
