import { BadRequestException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
import { Prisma } from "@prisma/client";
import { PrismaService } from "./prisma.service";

const scrypt = promisify(scryptCallback);
const sessionDays = 30;

export type RegisterInput = {
  email: string;
  password: string;
  name: string;
  phone?: string;
  guestSessionId?: string;
};

export type LoginInput = {
  email: string;
  password: string;
  guestSessionId?: string;
};

@Injectable()
export class AuthService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async register(input: RegisterInput) {
    const email = this.normalizeEmail(input.email);
    this.validatePassword(input.password);

    if (!input.name?.trim()) {
      throw new BadRequestException("name is required");
    }

    try {
      const user = await this.prisma.user.create({
        data: {
          email,
          name: input.name.trim(),
          phone: input.phone?.trim(),
          passwordHash: await this.hashPassword(input.password)
        }
      });

      const session = await this.createSession(user.id);

      return {
        token: session.token,
        user: this.serializeUser(user)
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new BadRequestException("email is already registered");
      }

      throw error;
    }
  }

  async login(input: LoginInput) {
    const email = this.normalizeEmail(input.email);
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !(await this.verifyPassword(input.password, user.passwordHash))) {
      throw new UnauthorizedException("invalid email or password");
    }

    const session = await this.createSession(user.id);

    return {
      token: session.token,
      user: this.serializeUser(user)
    };
  }

  async getUserFromAuthorization(authorization?: string) {
    const token = this.readBearerToken(authorization);
    if (!token) {
      return null;
    }

    const session = await this.prisma.userSession.findUnique({
      where: { tokenHash: this.hashToken(token) },
      include: { user: true }
    });

    if (!session || session.expiresAt <= new Date()) {
      return null;
    }

    await this.prisma.userSession.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date() }
    });

    return session.user;
  }

  async requireUser(authorization?: string) {
    const user = await this.getUserFromAuthorization(authorization);
    if (!user) {
      throw new UnauthorizedException("login is required");
    }

    return user;
  }

  async me(authorization?: string) {
    const user = await this.requireUser(authorization);
    return this.serializeUser(user);
  }

  private async createSession(userId: string) {
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + sessionDays * 24 * 60 * 60 * 1000);

    await this.prisma.userSession.create({
      data: {
        userId,
        tokenHash: this.hashToken(token),
        expiresAt
      }
    });

    return { token, expiresAt };
  }

  private normalizeEmail(email?: string) {
    const normalized = email?.trim().toLowerCase();
    if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      throw new BadRequestException("valid email is required");
    }

    return normalized;
  }

  private validatePassword(password?: string) {
    if (!password || password.length < 6) {
      throw new BadRequestException("password must be at least 6 characters");
    }
  }

  private async hashPassword(password: string) {
    const salt = randomBytes(16).toString("hex");
    const key = (await scrypt(password, salt, 64)) as Buffer;
    return `${salt}:${key.toString("hex")}`;
  }

  private async verifyPassword(password: string, passwordHash: string) {
    const [salt, storedHash] = passwordHash.split(":");
    if (!salt || !storedHash) {
      return false;
    }

    const key = (await scrypt(password, salt, 64)) as Buffer;
    const stored = Buffer.from(storedHash, "hex");
    return stored.length === key.length && timingSafeEqual(stored, key);
  }

  private hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  private readBearerToken(authorization?: string) {
    const [scheme, token] = authorization?.split(" ") ?? [];
    return scheme?.toLowerCase() === "bearer" && token ? token : null;
  }

  private serializeUser(user: { id: string; email: string; name: string; phone: string | null; createdAt: Date }) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      createdAt: user.createdAt.toISOString()
    };
  }
}
