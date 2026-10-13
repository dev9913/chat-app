import { Injectable, ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { randomBytes, createHash, randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';
import { RegisterDto, SendOtpDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  // 1. Generate and Send OTP
  async sendRegistrationOtp(dto: SendOtpDto) {
    const normalizedEmail = dto.email.toLowerCase().trim();
    const normalizedUsername = dto.username.toLowerCase().trim();

    // Check if user already exists
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: normalizedEmail }, { usernameLowercase: normalizedUsername }],
      },
    });

    if (existing) {
      if (existing.email === normalizedEmail) {
        throw new ConflictException('An account with this email already exists');
      }
      throw new ConflictException('This username is already taken');
    }

    // Generate secure 6-digit numeric code
    const otp = randomInt(100000, 999999).toString();
    const otpHash = await argon2.hash(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Upsert OTP record
    await this.prisma.emailOtp.upsert({
      where: { email: normalizedEmail },
      create: {
        email: normalizedEmail,
        otpHash,
        expiresAt,
      },
      update: {
        otpHash,
        expiresAt,
      },
    });

    // Send email
    await this.emailService.sendOtpEmail(normalizedEmail, otp);
    return { success: true, message: 'Verification code sent' };
  }

  // 2. Verify OTP & Complete Registration
  async register(dto: RegisterDto) {
    const normalizedEmail = dto.email.toLowerCase().trim();
    const normalizedUsername = dto.username.toLowerCase().trim();

    // Verify OTP record
    const otpRecord = await this.prisma.emailOtp.findUnique({
      where: { email: normalizedEmail },
    });

    if (!otpRecord) {
      throw new BadRequestException('Please request a verification code first');
    }

    if (new Date() > otpRecord.expiresAt) {
      throw new BadRequestException('Verification code has expired. Please request a new one.');
    }

    const isOtpValid = await argon2.verify(otpRecord.otpHash, dto.otp);
    if (!isOtpValid) {
      throw new BadRequestException('Invalid verification code');
    }

    // Check duplicate once more before creating
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: normalizedEmail }, { usernameLowercase: normalizedUsername }],
      },
    });
    if (existing) throw new ConflictException('Email or username is already taken');

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.$transaction(async (tx) => {
      // Delete used OTP
      await tx.emailOtp.delete({ where: { email: normalizedEmail } });

      return tx.user.create({
        data: {
          email: normalizedEmail,
          username: dto.username.trim(),
          usernameLowercase: normalizedUsername,
          displayName: dto.displayName.trim(),
          passwordHash,
        },
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          photoUrl: true,
          createdAt: true,
        },
      });
    });

    const tokens = await this.generateTokens(user.id, user.username);
    return { user, ...tokens };
  }

  async login(dto: LoginDto) {
    const identifier = dto.identifier.toLowerCase().trim();
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { usernameLowercase: identifier }],
      },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isPasswordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.generateTokens(user.id, user.username);
    const safeUser = {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      photoUrl: user.photoUrl,
      isOnline: user.isOnline,
      lastSeen: user.lastSeen,
    };

    return { user: safeUser, ...tokens };
  }

  async refreshTokens(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!storedToken || storedToken.revokedAt || new Date() > storedToken.expiresAt) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    return this.generateTokens(storedToken.user.id, storedToken.user.username);
  }

  async logout(refreshToken: string) {
    if (!refreshToken) return;
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: this.hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async generateTokens(userId: string, username: string) {
    const payload = { sub: userId, username };
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: '15m',
    });

    const rawRefreshToken = randomBytes(40).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(rawRefreshToken),
        expiresAt,
      },
    });

    return { accessToken, refreshToken: rawRefreshToken };
  }
}
