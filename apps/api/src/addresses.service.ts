import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

export type AddressInput = {
  label: string;
  recipientName: string;
  phone: string;
  country?: string;
  province: string;
  city: string;
  district?: string | null;
  line1: string;
  postalCode?: string | null;
  isDefault?: boolean;
};

@Injectable()
export class AddressesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.userAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }]
    });
  }

  async create(userId: string, input: AddressInput) {
    this.validate(input);

    return this.prisma.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.userAddress.updateMany({
          where: { userId },
          data: { isDefault: false }
        });
      }

      return tx.userAddress.create({
        data: {
          userId,
          label: input.label.trim(),
          recipientName: input.recipientName.trim(),
          phone: input.phone.trim(),
          country: input.country?.trim() || "CN",
          province: input.province.trim(),
          city: input.city.trim(),
          district: input.district?.trim(),
          line1: input.line1.trim(),
          postalCode: input.postalCode?.trim(),
          isDefault: input.isDefault ?? false
        }
      });
    });
  }

  async update(userId: string, addressId: string, input: Partial<AddressInput>) {
    const existing = await this.prisma.userAddress.findFirst({
      where: { id: addressId, userId }
    });

    if (!existing) {
      throw new NotFoundException("address not found");
    }

    const next = { ...existing, ...input };
    this.validate(next);

    return this.prisma.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.userAddress.updateMany({
          where: { userId, id: { not: addressId } },
          data: { isDefault: false }
        });
      }

      return tx.userAddress.update({
        where: { id: addressId },
        data: {
          label: input.label?.trim(),
          recipientName: input.recipientName?.trim(),
          phone: input.phone?.trim(),
          country: input.country?.trim(),
          province: input.province?.trim(),
          city: input.city?.trim(),
          district: input.district?.trim(),
          line1: input.line1?.trim(),
          postalCode: input.postalCode?.trim(),
          isDefault: input.isDefault
        }
      });
    });
  }

  async remove(userId: string, addressId: string) {
    const existing = await this.prisma.userAddress.findFirst({
      where: { id: addressId, userId }
    });

    if (!existing) {
      throw new NotFoundException("address not found");
    }

    await this.prisma.userAddress.delete({ where: { id: addressId } });
    return { ok: true };
  }

  private validate(input: AddressInput) {
    const required = [input.label, input.recipientName, input.phone, input.province, input.city, input.line1];
    if (required.some((value) => !value?.trim())) {
      throw new BadRequestException("label, recipientName, phone, province, city and line1 are required");
    }
  }
}
