import { Injectable, ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto, VerifyCodeDto, ResendCodeDto } from './dto/login.dto';
import { VerifyEmailDto, ResendVerificationDto, ChangeEmailDto, ConfirmChangeEmailAuthDto } from './dto/verify-email.dto';
import { Enable2FADto, Disable2FADto, RegenerateRecoveryDto } from './dto/2fa.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  private generateSixDigitCode(): string {
    return crypto.randomInt(0, 1000000).toString().padStart(6, '0');
  }

  private generateRecoveryCode(): string {
    return crypto.randomBytes(5).toString('hex').toUpperCase(); // 10 chars
  }

  private hashSecret(challengeId: string, purpose: string, secret: string): string {
    const hmacKey = process.env.OTP_SECRET || 'default_dev_secret';
    return crypto.createHmac('sha256', hmacKey).update(`${challengeId}:${purpose}:${secret}`).digest('hex');
  }

  async register(dto: RegisterDto) {
    const emailNorm = dto.email.trim().toLowerCase();

    const existingUser = await this.prisma.user.findUnique({
      where: { email: emailNorm },
    });

    if (existingUser) {
      throw new ConflictException('E-mail já está em uso.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenDigest = crypto.createHash('sha256').update(rawToken).digest('hex');

    await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: emailNorm,
          passwordHash,
          fullName: dto.fullName,
          role: 'USER',
        },
      });

      await tx.authChallenge.create({
        data: {
          userId: newUser.id,
          purpose: 'EMAIL_CONFIRMATION',
          tokenDigest,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        }
      });

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
      const tokenLink = `${frontendUrl}/verify-email?token=${rawToken}&email=${encodeURIComponent(newUser.email)}`;

      await this.mailService.queueEmail(tx, {
        recipient: newUser.email,
        templateName: 'EMAIL_CONFIRMATION',
        payload: {
          fullName: newUser.fullName,
          tokenLink,
        },
        idempotencyKey: `register-confirm-${newUser.id}`,
      });
    });

    return { status: 'PENDING_VERIFICATION' };
  }

  async login(dto: LoginDto) {
    const emailNorm = dto.email.trim().toLowerCase();
    
    const user = await this.prisma.user.findUnique({
      where: { email: emailNorm },
    });

    if (!user || user.isDeleted) {
      throw new UnauthorizedException('Credenciais inválidas ou conta desativada.');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const isVerified = user.emailVerifiedAt !== null;
    
    if (user.isTwoFactorEnabled) {
      const challengeId = crypto.randomUUID();
      const code = this.generateSixDigitCode();
      const tokenDigest = this.hashSecret(challengeId, 'LOGIN', code);

      await this.prisma.$transaction(async (tx) => {
        // Revoke pending login challenges
        await tx.authChallenge.updateMany({
          where: { userId: user.id, purpose: 'LOGIN', consumedAt: null, revokedAt: null },
          data: { revokedAt: new Date() }
        });

        await tx.authChallenge.create({
          data: {
            id: challengeId,
            userId: user.id,
            purpose: 'LOGIN',
            targetEmail: user.email,
            tokenDigest,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min
          }
        });

        await this.mailService.queueEmail(tx, {
          recipient: user.email,
          templateName: '2FA_CODE',
          payload: { code, purpose: 'Login' },
        });
      });

      return {
        status: 'MFA_REQUIRED',
        challengeId,
        maskedEmail: user.email.replace(/(.{2})(.*)(?=@)/, '$1***'),
      };
    }

    const payload = { sub: user.id, email: user.email, role: user.role, authVersion: user.authVersion };
    const access_token = this.jwtService.sign(payload);

    return {
      status: isVerified ? 'AUTHENTICATED' : 'UNVERIFIED',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        phone: user.phone,
        emailVerifiedAt: user.emailVerifiedAt,
        role: user.role,
        createdAt: user.createdAt,
        isVerified,
      },
      access_token,
      accessToken: access_token,
    };
  }

  async verifyLoginCode(dto: VerifyCodeDto) {
    let challengeId = dto.challengeId;
    let code = dto.code;
    let recoveryCode = dto.recoveryCode;

    if (!code && !recoveryCode) {
      throw new BadRequestException('Código obrigatório.');
    }

    if (recoveryCode) {
      // Recovery mode
      if (!dto.userId) throw new BadRequestException('UserId é obrigatório na recuperação.');
      
      const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
      if (!user || user.isDeleted) throw new UnauthorizedException('Usuário inválido.');
      
      const isPasswordValid = await bcrypt.compare(dto.password || '', user.passwordHash);
      if (!isPasswordValid) throw new UnauthorizedException('Senha incorreta.');

      // Check recovery codes
      const codes = await this.prisma.recoveryCode.findMany({
        where: { userId: user.id, usedAt: null }
      });

      let matchedCodeId = null;
      for (const rc of codes) {
        const isMatch = await bcrypt.compare(recoveryCode, rc.codeDigest);
        if (isMatch) {
          matchedCodeId = rc.id;
          break;
        }
      }

      if (!matchedCodeId) {
        throw new UnauthorizedException('Código de recuperação inválido ou já utilizado.');
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.recoveryCode.update({
          where: { id: matchedCodeId },
          data: { usedAt: new Date() }
        });
        
        // Revoke all pending login challenges
        await tx.authChallenge.updateMany({
          where: { userId: user.id, purpose: 'LOGIN', consumedAt: null, revokedAt: null },
          data: { revokedAt: new Date() }
        });
      });

      const payload = { sub: user.id, email: user.email, role: user.role, authVersion: user.authVersion };
      return {
        status: 'AUTHENTICATED',
        user: { ...user, isVerified: user.emailVerifiedAt !== null },
        accessToken: this.jwtService.sign(payload),
      };
    }

    // Normal 2FA mode
    return this.prisma.$transaction(async (tx) => {
      const challenge = await tx.authChallenge.findUnique({
        where: { id: challengeId },
        include: { user: true },
      });

      if (!challenge || challenge.purpose !== 'LOGIN') {
        throw new BadRequestException('Desafio inválido.');
      }

      if (challenge.consumedAt || challenge.revokedAt || challenge.expiresAt < new Date()) {
        throw new BadRequestException('Código expirado ou revogado. Solicite um novo.');
      }

      if (challenge.attempts >= 5) {
        await tx.authChallenge.update({ where: { id: challenge.id }, data: { revokedAt: new Date() } });
        throw new BadRequestException('Muitas tentativas falhas. Desafio revogado.');
      }

      const expectedDigest = this.hashSecret(challenge.id, 'LOGIN', code);
      if (expectedDigest !== challenge.tokenDigest) {
        await tx.authChallenge.update({ where: { id: challenge.id }, data: { attempts: challenge.attempts + 1 } });
        throw new UnauthorizedException('Código incorreto.');
      }

      if (challenge.user.isDeleted) {
        throw new UnauthorizedException('Conta desativada.');
      }

      await tx.authChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } });

      const payload = { sub: challenge.user.id, email: challenge.user.email, role: challenge.user.role, authVersion: challenge.user.authVersion };
      const access_token = this.jwtService.sign(payload);
      
      const { passwordHash, ...safeUser } = challenge.user;

      return {
        status: 'AUTHENTICATED',
        user: { ...safeUser, isVerified: challenge.user.emailVerifiedAt !== null },
        accessToken: access_token,
      };
    });
  }

  async resendLoginCode(dto: ResendCodeDto) {
    return this.prisma.$transaction(async (tx) => {
      const challenge = await tx.authChallenge.findUnique({
        where: { id: dto.challengeId },
        include: { user: true },
      });

      if (!challenge || challenge.purpose !== 'LOGIN' || challenge.consumedAt || challenge.revokedAt) {
        throw new BadRequestException('Desafio inválido ou já concluído.');
      }

      // Check cooldown (e.g. 60s)
      const secondsSinceUpdate = (new Date().getTime() - challenge.updatedAt.getTime()) / 1000;
      if (secondsSinceUpdate < 60 && challenge.deliveryVersion > 1) {
        throw new BadRequestException('Aguarde antes de solicitar outro código.');
      }

      const code = this.generateSixDigitCode();
      const tokenDigest = this.hashSecret(challenge.id, 'LOGIN', code);

      await tx.authChallenge.update({
        where: { id: challenge.id },
        data: {
          tokenDigest,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000), // reset expiration
          deliveryVersion: challenge.deliveryVersion + 1,
        }
      });

      await this.mailService.queueEmail(tx, {
        recipient: challenge.user.email,
        templateName: '2FA_CODE',
        payload: { code, purpose: 'Login' },
      });

      return { success: true, message: 'Código reenviado.' };
    });
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const emailNorm = dto.email.trim().toLowerCase();
    const tokenDigest = crypto.createHash('sha256').update(dto.token).digest('hex');

    return this.prisma.$transaction(async (tx) => {
      const challenge = await tx.authChallenge.findFirst({
        where: {
          user: { email: emailNorm, isDeleted: false },
          tokenDigest,
        },
        include: { user: true },
      });

      if (!challenge) {
        throw new BadRequestException('Token inválido ou não encontrado.');
      }

      if (challenge.consumedAt || challenge.revokedAt || challenge.expiresAt < new Date()) {
        throw new BadRequestException('Token expirado, já utilizado ou revogado.');
      }

      await tx.authChallenge.update({
        where: { id: challenge.id },
        data: { consumedAt: new Date() },
      });

      if (challenge.purpose === 'EMAIL_CONFIRMATION') {
        if (challenge.user.emailVerifiedAt) {
          throw new BadRequestException('Este email já foi verificado.');
        }

        await tx.user.update({
          where: { id: challenge.user.id },
          data: { emailVerifiedAt: new Date() },
        });

        await tx.authChallenge.updateMany({
          where: {
            userId: challenge.user.id,
            purpose: 'EMAIL_CONFIRMATION',
            consumedAt: null,
            revokedAt: null,
            id: { not: challenge.id },
          },
          data: { revokedAt: new Date() },
        });

      } else if (challenge.purpose === 'EMAIL_CHANGE') {
        if (!challenge.targetEmail) {
          throw new BadRequestException('Alvo do novo email não especificado.');
        }

        const conflict = await tx.user.findUnique({
          where: { email: challenge.targetEmail },
        });

        if (conflict && conflict.id !== challenge.user.id) {
          throw new ConflictException('O novo email já está em uso por outra conta.');
        }

        await tx.user.update({
          where: { id: challenge.user.id },
          data: { 
            email: challenge.targetEmail,
            emailVerifiedAt: new Date(),
          },
        });

        // Revoke challenges to the old email
        await tx.authChallenge.updateMany({
          where: {
            userId: challenge.user.id,
            consumedAt: null,
            revokedAt: null,
            id: { not: challenge.id },
          },
          data: { revokedAt: new Date() },
        });
      }

      return { success: true, purpose: challenge.purpose };
    });
  }

  async resendVerification(dto: ResendVerificationDto) {
    const emailNorm = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email: emailNorm },
    });

    if (!user || user.isDeleted || user.emailVerifiedAt) {
      return { success: true };
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenDigest = crypto.createHash('sha256').update(rawToken).digest('hex');

    await this.prisma.$transaction(async (tx) => {
      await tx.authChallenge.updateMany({
        where: {
          userId: user.id,
          purpose: 'EMAIL_CONFIRMATION',
          consumedAt: null,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });

      await tx.authChallenge.create({
        data: {
          userId: user.id,
          purpose: 'EMAIL_CONFIRMATION',
          tokenDigest,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        }
      });

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
      const tokenLink = `${frontendUrl}/verify-email?token=${rawToken}&email=${encodeURIComponent(user.email)}`;

      await this.mailService.queueEmail(tx, {
        recipient: user.email,
        templateName: 'EMAIL_CONFIRMATION',
        payload: {
          fullName: user.fullName,
          tokenLink,
        },
      });
    });

    return { success: true };
  }

  async changeEmailInit(userId: string, dto: ChangeEmailDto) {
    const newEmailNorm = dto.newEmail.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user || user.isDeleted) throw new UnauthorizedException('Usuário inválido.');

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) throw new UnauthorizedException('Senha incorreta.');

    if (user.email === newEmailNorm) throw new BadRequestException('O novo email é igual ao atual.');

    const conflict = await this.prisma.user.findUnique({ where: { email: newEmailNorm } });
    if (conflict) throw new ConflictException('Este email já está em uso.');

    if (user.isTwoFactorEnabled) {
      const challengeId = crypto.randomUUID();
      const code = this.generateSixDigitCode();
      const tokenDigest = this.hashSecret(challengeId, 'CHANGE_EMAIL_AUTH', code);

      await this.prisma.$transaction(async (tx) => {
        await tx.authChallenge.updateMany({
          where: { userId: user.id, purpose: 'CHANGE_EMAIL_AUTH', consumedAt: null, revokedAt: null },
          data: { revokedAt: new Date() }
        });

        await tx.authChallenge.create({
          data: {
            id: challengeId,
            userId: user.id,
            purpose: 'CHANGE_EMAIL_AUTH',
            targetEmail: newEmailNorm,
            tokenDigest,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          }
        });

        await this.mailService.queueEmail(tx, {
          recipient: user.email, // Send to CURRENT email
          templateName: '2FA_CODE',
          payload: { code, purpose: 'Autorizar troca de email' },
        });
      });

      return { status: 'MFA_REQUIRED', challengeId };
    }

    // No 2FA, directly issue the EMAIL_CHANGE link to the NEW email
    await this.issueEmailChangeLink(user.id, user.email, user.fullName, newEmailNorm);
    return { status: 'SUCCESS', message: 'Verifique a nova caixa de entrada para confirmar a alteração.' };
  }

  async changeEmailConfirmAuth(userId: string, dto: ConfirmChangeEmailAuthDto) {
    return this.prisma.$transaction(async (tx) => {
      const challenge = await tx.authChallenge.findUnique({
        where: { id: dto.challengeId },
        include: { user: true },
      });

      if (!challenge || challenge.userId !== userId || challenge.purpose !== 'CHANGE_EMAIL_AUTH') {
        throw new BadRequestException('Desafio inválido.');
      }

      if (challenge.consumedAt || challenge.revokedAt || challenge.expiresAt < new Date()) {
        throw new BadRequestException('Código expirado ou revogado.');
      }

      if (challenge.attempts >= 5) {
        await tx.authChallenge.update({ where: { id: challenge.id }, data: { revokedAt: new Date() } });
        throw new BadRequestException('Muitas tentativas falhas. Desafio revogado.');
      }

      const expectedDigest = this.hashSecret(challenge.id, 'CHANGE_EMAIL_AUTH', dto.code);
      if (expectedDigest !== challenge.tokenDigest) {
        await tx.authChallenge.update({ where: { id: challenge.id }, data: { attempts: challenge.attempts + 1 } });
        throw new UnauthorizedException('Código incorreto.');
      }

      await tx.authChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } });

      await this.issueEmailChangeLink(userId, challenge.user.email, challenge.user.fullName, challenge.targetEmail, tx);
      return { success: true, message: 'Código verificado. Verifique a nova caixa de entrada para confirmar a alteração.' };
    });
  }

  private async issueEmailChangeLink(userId: string, currentEmail: string, fullName: string, newEmailNorm: string, extTx?: any) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenDigest = crypto.createHash('sha256').update(rawToken).digest('hex');

    const logic = async (tx) => {
      await tx.authChallenge.updateMany({
        where: { userId, purpose: 'EMAIL_CHANGE', consumedAt: null, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      await tx.authChallenge.create({
        data: {
          userId,
          purpose: 'EMAIL_CHANGE',
          targetEmail: newEmailNorm,
          tokenDigest,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        }
      });

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
      const tokenLink = `${frontendUrl}/verify-email?token=${rawToken}&email=${encodeURIComponent(currentEmail)}`;

      await this.mailService.queueEmail(tx, {
        recipient: newEmailNorm,
        templateName: 'EMAIL_CHANGE',
        payload: { fullName, tokenLink },
      });
    };

    if (extTx) await logic(extTx);
    else await this.prisma.$transaction(logic);
  }

  // --- 2FA ENABLE / DISABLE / RECOVERY ---

  async enable2FAInit(userId: string, dto: Enable2FADto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.isDeleted) throw new UnauthorizedException('Usuário inválido.');
    
    if (user.isTwoFactorEnabled) throw new BadRequestException('2FA já está ativo.');
    if (!user.emailVerifiedAt) throw new BadRequestException('Confirme seu email primeiro.');

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) throw new UnauthorizedException('Senha incorreta.');

    const challengeId = crypto.randomUUID();
    const code = this.generateSixDigitCode();
    const tokenDigest = this.hashSecret(challengeId, 'ENABLE_2FA', code);

    await this.prisma.$transaction(async (tx) => {
      await tx.authChallenge.updateMany({
        where: { userId: user.id, purpose: 'ENABLE_2FA', consumedAt: null, revokedAt: null },
        data: { revokedAt: new Date() }
      });

      await tx.authChallenge.create({
        data: {
          id: challengeId,
          userId: user.id,
          purpose: 'ENABLE_2FA',
          tokenDigest,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        }
      });

      await this.mailService.queueEmail(tx, {
        recipient: user.email,
        templateName: '2FA_CODE',
        payload: { code, purpose: 'Ativar 2FA' },
      });
    });

    return { challengeId };
  }

  async enable2FAConfirm(userId: string, dto: VerifyCodeDto) {
    return this.prisma.$transaction(async (tx) => {
      const challenge = await tx.authChallenge.findUnique({
        where: { id: dto.challengeId },
        include: { user: true },
      });

      if (!challenge || challenge.userId !== userId || challenge.purpose !== 'ENABLE_2FA') {
        throw new BadRequestException('Desafio inválido.');
      }

      if (challenge.consumedAt || challenge.revokedAt || challenge.expiresAt < new Date()) {
        throw new BadRequestException('Código expirado ou revogado.');
      }

      if (challenge.attempts >= 5) {
        await tx.authChallenge.update({ where: { id: challenge.id }, data: { revokedAt: new Date() } });
        throw new BadRequestException('Muitas tentativas falhas. Desafio revogado.');
      }

      const expectedDigest = this.hashSecret(challenge.id, 'ENABLE_2FA', dto.code);
      if (expectedDigest !== challenge.tokenDigest) {
        await tx.authChallenge.update({ where: { id: challenge.id }, data: { attempts: challenge.attempts + 1 } });
        throw new UnauthorizedException('Código incorreto.');
      }

      await tx.authChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } });

      const newAuthVersion = challenge.user.authVersion + 1;
      await tx.user.update({
        where: { id: userId },
        data: { isTwoFactorEnabled: true, twoFactorEnabledAt: new Date(), authVersion: newAuthVersion }
      });

      // Generate 10 recovery codes
      await tx.recoveryCode.deleteMany({ where: { userId } });
      const recoveryCodes = Array.from({ length: 10 }).map(() => this.generateRecoveryCode());
      
      for (const code of recoveryCodes) {
        const hash = await bcrypt.hash(code, 10);
        await tx.recoveryCode.create({ data: { userId, codeDigest: hash } });
      }

      // Issue new JWT with bumped authVersion
      const payload = { sub: challenge.user.id, email: challenge.user.email, role: challenge.user.role, authVersion: newAuthVersion };
      return { success: true, recoveryCodes, accessToken: this.jwtService.sign(payload) };
    });
  }

  async disable2FA(userId: string, dto: Disable2FADto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.isDeleted) throw new UnauthorizedException('Usuário inválido.');
    if (!user.isTwoFactorEnabled) throw new BadRequestException('2FA não está ativo.');

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) throw new UnauthorizedException('Senha incorreta.');

    // Wait, the prompt says "Desativar ou regenerar recuperação exige senha e código novo da finalidade correspondente, ou recuperação válida"
    // So to disable 2FA, they must provide a code sent via email, OR a recovery code.
    // That means we need `disable2FAInit` and `disable2FAConfirm`.
    throw new BadRequestException('Uso do fluxo em duas etapas necessário.');
  }

  async disable2FAInit(userId: string, dto: Enable2FADto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.isDeleted) throw new UnauthorizedException('Usuário inválido.');
    if (!user.isTwoFactorEnabled) throw new BadRequestException('2FA não está ativo.');

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) throw new UnauthorizedException('Senha incorreta.');

    const challengeId = crypto.randomUUID();
    const code = this.generateSixDigitCode();
    const tokenDigest = this.hashSecret(challengeId, 'DISABLE_2FA', code);

    await this.prisma.$transaction(async (tx) => {
      await tx.authChallenge.updateMany({
        where: { userId: user.id, purpose: 'DISABLE_2FA', consumedAt: null, revokedAt: null },
        data: { revokedAt: new Date() }
      });
      await tx.authChallenge.create({
        data: {
          id: challengeId,
          userId: user.id,
          purpose: 'DISABLE_2FA',
          tokenDigest,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        }
      });
      await this.mailService.queueEmail(tx, {
        recipient: user.email,
        templateName: '2FA_CODE',
        payload: { code, purpose: 'Desativar 2FA' },
      });
    });

    return { challengeId };
  }

  async disable2FAConfirm(userId: string, dto: VerifyCodeDto) {
    return this.prisma.$transaction(async (tx) => {
      // Allow recovery code to disable 2FA
      if (dto.recoveryCode) {
        const user = await tx.user.findUnique({ where: { id: userId } });
        const codes = await tx.recoveryCode.findMany({ where: { userId, usedAt: null } });
        let matchedCodeId = null;
        for (const rc of codes) {
          if (await bcrypt.compare(dto.recoveryCode, rc.codeDigest)) {
            matchedCodeId = rc.id;
            break;
          }
        }
        if (!matchedCodeId) throw new UnauthorizedException('Código de recuperação inválido.');
        await tx.recoveryCode.update({ where: { id: matchedCodeId }, data: { usedAt: new Date() } });
      } else {
        const challenge = await tx.authChallenge.findUnique({ where: { id: dto.challengeId } });
        if (!challenge || challenge.userId !== userId || challenge.purpose !== 'DISABLE_2FA') throw new BadRequestException('Desafio inválido.');
        if (challenge.consumedAt || challenge.revokedAt || challenge.expiresAt < new Date()) throw new BadRequestException('Código expirado.');
        const expectedDigest = this.hashSecret(challenge.id, 'DISABLE_2FA', dto.code);
        if (expectedDigest !== challenge.tokenDigest) throw new UnauthorizedException('Código incorreto.');
        await tx.authChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } });
      }

      const user = await tx.user.findUnique({ where: { id: userId } });
      const newAuthVersion = user.authVersion + 1;
      
      await tx.user.update({
        where: { id: userId },
        data: { isTwoFactorEnabled: false, authVersion: newAuthVersion }
      });
      
      await tx.recoveryCode.deleteMany({ where: { userId } });

      const payload = { sub: user.id, email: user.email, role: user.role, authVersion: newAuthVersion };
      return { success: true, message: '2FA desativado.', accessToken: this.jwtService.sign(payload) };
    });
  }

  async regenerateRecoveryInit(userId: string, dto: RegenerateRecoveryDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.isDeleted) throw new UnauthorizedException('Usuário inválido.');
    if (!user.isTwoFactorEnabled) throw new BadRequestException('2FA não está ativo.');

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) throw new UnauthorizedException('Senha incorreta.');

    const challengeId = crypto.randomUUID();
    const code = this.generateSixDigitCode();
    const tokenDigest = this.hashSecret(challengeId, 'REGENERATE_RECOVERY', code);

    await this.prisma.$transaction(async (tx) => {
      await tx.authChallenge.updateMany({
        where: { userId: user.id, purpose: 'REGENERATE_RECOVERY', consumedAt: null, revokedAt: null },
        data: { revokedAt: new Date() }
      });
      await tx.authChallenge.create({
        data: {
          id: challengeId,
          userId: user.id,
          purpose: 'REGENERATE_RECOVERY',
          tokenDigest,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        }
      });
      await this.mailService.queueEmail(tx, {
        recipient: user.email,
        templateName: '2FA_CODE',
        payload: { code, purpose: 'Regerar códigos de recuperação' },
      });
    });

    return { challengeId };
  }

  async regenerateRecoveryConfirm(userId: string, dto: VerifyCodeDto) {
    return this.prisma.$transaction(async (tx) => {
      if (dto.recoveryCode) {
        const user = await tx.user.findUnique({ where: { id: userId } });
        const codes = await tx.recoveryCode.findMany({ where: { userId, usedAt: null } });
        let matchedCodeId = null;
        for (const rc of codes) {
          if (await bcrypt.compare(dto.recoveryCode, rc.codeDigest)) {
            matchedCodeId = rc.id;
            break;
          }
        }
        if (!matchedCodeId) throw new UnauthorizedException('Código de recuperação inválido.');
        await tx.recoveryCode.update({ where: { id: matchedCodeId }, data: { usedAt: new Date() } });
      } else {
        const challenge = await tx.authChallenge.findUnique({ where: { id: dto.challengeId } });
        if (!challenge || challenge.userId !== userId || challenge.purpose !== 'REGENERATE_RECOVERY') throw new BadRequestException('Desafio inválido.');
        if (challenge.consumedAt || challenge.revokedAt || challenge.expiresAt < new Date()) throw new BadRequestException('Código expirado.');
        const expectedDigest = this.hashSecret(challenge.id, 'REGENERATE_RECOVERY', dto.code);
        if (expectedDigest !== challenge.tokenDigest) throw new UnauthorizedException('Código incorreto.');
        await tx.authChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } });
      }

      await tx.recoveryCode.deleteMany({ where: { userId } });
      const recoveryCodes = Array.from({ length: 10 }).map(() => this.generateRecoveryCode());
      for (const code of recoveryCodes) {
        const hash = await bcrypt.hash(code, 10);
        await tx.recoveryCode.create({ data: { userId, codeDigest: hash } });
      }

      return { success: true, recoveryCodes };
    });
  }

  // --- PASSWORD RECOVERY (PUBLIC FORGOT/RESET) ---
  async forgotPassword(dto: ForgotPasswordDto, clientIp?: string) {
    const emailNorm = dto.email.trim().toLowerCase();
    const GENERIC_RESPONSE = {
      message: 'Se houver uma conta disponível para esse email, enviaremos as instruções de recuperação.',
    };

    // 1. Limite de taxa (Rate Limit) por email recente para evitar spam
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const recentChallenge = await this.prisma.authChallenge.findFirst({
      where: {
        targetEmail: emailNorm,
        purpose: 'PASSWORD_RECOVERY',
        createdAt: { gt: oneMinuteAgo },
      },
    });

    if (recentChallenge) {
      return GENERIC_RESPONSE;
    }

    // 2. Busca do usuário (retorno idêntico genérico se não existir ou se estiver deletado)
    const user = await this.prisma.user.findUnique({
      where: { email: emailNorm },
    });

    if (!user || user.isDeleted) {
      return GENERIC_RESPONSE;
    }

    // 3. Geração de token criptograficamente seguro (30 minutos de validade)
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenDigest = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    // 4. Revoga desafios anteriores de PASSWORD_RECOVERY e enfileira email na mesma transação
    await this.prisma.$transaction(async (tx) => {
      await tx.authChallenge.updateMany({
        where: {
          userId: user.id,
          purpose: 'PASSWORD_RECOVERY',
          consumedAt: null,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      await tx.authChallenge.create({
        data: {
          userId: user.id,
          purpose: 'PASSWORD_RECOVERY',
          targetEmail: user.email,
          tokenDigest,
          expiresAt,
        },
      });

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
      const tokenLink = `${frontendUrl}/reset-password?token=${rawToken}`;

      await this.mailService.queueEmail(tx, {
        recipient: user.email,
        templateName: 'PASSWORD_RECOVERY',
        payload: {
          fullName: user.fullName,
          tokenLink,
          expiresMinutes: 30,
        },
        idempotencyKey: `pwd-recovery-${user.id}-${Date.now()}`,
      });
    });

    return GENERIC_RESPONSE;
  }

  async resetPassword(dto: ResetPasswordDto) {
    const rawToken = dto.token.trim();
    if (!rawToken) {
      throw new BadRequestException('Token de recuperação inválido.');
    }

    const tokenDigest = crypto.createHash('sha256').update(rawToken).digest('hex');

    return this.prisma.$transaction(async (tx) => {
      const now = new Date();

      // 1. Busca o desafio de recuperação
      const challenge = await tx.authChallenge.findFirst({
        where: {
          tokenDigest,
          purpose: 'PASSWORD_RECOVERY',
        },
        include: {
          user: true,
        },
      });

      if (!challenge) {
        throw new BadRequestException('Token de recuperação inválido ou inexistente.');
      }

      if (challenge.consumedAt || challenge.revokedAt || challenge.expiresAt < now) {
        throw new BadRequestException('Token de recuperação expirado, revogado ou já utilizado.');
      }

      const user = challenge.user;
      if (!user || user.isDeleted) {
        throw new BadRequestException('Conta de usuário inativa, banida ou inexistente.');
      }

      // Valida endereço atual associado à solicitação
      if (challenge.targetEmail && challenge.targetEmail.toLowerCase() !== user.email.toLowerCase()) {
        throw new BadRequestException('O endereço de email associado à solicitação foi alterado.');
      }

      // 2. Consumo atômico condicional para prevenir que 2 requisições simultâneas utilizem o mesmo token
      const updateResult = await tx.authChallenge.updateMany({
        where: {
          id: challenge.id,
          purpose: 'PASSWORD_RECOVERY',
          consumedAt: null,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: {
          consumedAt: now,
        },
      });

      if (updateResult.count === 0) {
        throw new BadRequestException('Token de recuperação já utilizado ou expirado.');
      }

      // 3. Hash da nova senha com bcrypt
      const newPasswordHash = await bcrypt.hash(dto.newPassword, 10);

      // 4. Grava novo passwordHash e incrementa authVersion (invalida sessões anteriores)
      // Preserva emailVerifiedAt, role, isDeleted, isTwoFactorEnabled intactos
      await tx.user.update({
        where: { id: user.id },
        data: {
          passwordHash: newPasswordHash,
          authVersion: { increment: 1 },
        },
      });

      // 5. Revoga todos os demais desafios pendentes do usuário
      await tx.authChallenge.updateMany({
        where: {
          userId: user.id,
          id: { not: challenge.id },
          consumedAt: null,
          revokedAt: null,
        },
        data: {
          revokedAt: now,
        },
      });

      // 6. Enfileira aviso de senha alterada (sem a senha)
      await this.mailService.queueEmail(tx, {
        recipient: user.email,
        templateName: 'PASSWORD_CHANGED',
        payload: {
          fullName: user.fullName,
          date: new Intl.DateTimeFormat('pt-BR', {
            dateStyle: 'short',
            timeStyle: 'medium',
            timeZone: 'America/Sao_Paulo',
          }).format(now),
        },
        idempotencyKey: `pwd-changed-${user.id}-${now.getTime()}`,
      });

      return {
        success: true,
        message: 'Senha redefinida com sucesso. Faça login com sua nova senha.',
      };
    });
  }

  // --- PASSWORD CHANGE (AUTHENTICATED) ---
  async changePasswordInit(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.isDeleted) throw new UnauthorizedException('Usuário inválido.');

    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) throw new UnauthorizedException('Senha incorreta.');

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    if (user.isTwoFactorEnabled) {
      const challengeId = crypto.randomUUID();
      const code = this.generateSixDigitCode();
      const tokenDigest = this.hashSecret(challengeId, 'PASSWORD_RESET', code);

      await this.prisma.$transaction(async (tx) => {
        await tx.authChallenge.updateMany({
          where: { userId: user.id, purpose: 'PASSWORD_RESET', consumedAt: null, revokedAt: null },
          data: { revokedAt: new Date() }
        });
        await tx.authChallenge.create({
          data: {
            id: challengeId,
            userId: user.id,
            purpose: 'PASSWORD_RESET',
            targetEmail: newPasswordHash, // Store the new password hash temporarily here to verify it later
            tokenDigest,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          }
        });
        await this.mailService.queueEmail(tx, {
          recipient: user.email,
          templateName: '2FA_CODE',
          payload: { code, purpose: 'Alterar senha' },
        });
      });

      return { status: 'MFA_REQUIRED', challengeId };
    }

    // No 2FA -> change directly and revoke any pending challenges (including recoveries)
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash, authVersion: user.authVersion + 1 }
      });
      await tx.authChallenge.updateMany({
        where: { userId, consumedAt: null, revokedAt: null },
        data: { revokedAt: new Date() }
      });
    });

    return { status: 'SUCCESS', message: 'Senha alterada com sucesso.' };
  }

  async changePasswordConfirm(userId: string, challengeId: string, code?: string, recoveryCode?: string) {
    return this.prisma.$transaction(async (tx) => {
      const challenge = await tx.authChallenge.findUnique({ where: { id: challengeId } });
      if (!challenge || challenge.userId !== userId || challenge.purpose !== 'PASSWORD_RESET') throw new BadRequestException('Desafio inválido.');
      
      if (recoveryCode) {
        const codes = await tx.recoveryCode.findMany({ where: { userId, usedAt: null } });
        let matchedCodeId = null;
        for (const rc of codes) {
          if (await bcrypt.compare(recoveryCode, rc.codeDigest)) {
            matchedCodeId = rc.id;
            break;
          }
        }
        if (!matchedCodeId) throw new UnauthorizedException('Código de recuperação inválido.');
        await tx.recoveryCode.update({ where: { id: matchedCodeId }, data: { usedAt: new Date() } });
      } else {
        if (challenge.consumedAt || challenge.revokedAt || challenge.expiresAt < new Date()) throw new BadRequestException('Código expirado.');
        const expectedDigest = this.hashSecret(challenge.id, 'PASSWORD_RESET', code);
        if (expectedDigest !== challenge.tokenDigest) throw new UnauthorizedException('Código incorreto.');
      }

      await tx.authChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } });
      
      const user = await tx.user.findUnique({ where: { id: userId } });
      
      await tx.user.update({
        where: { id: userId },
        data: { passwordHash: challenge.targetEmail, authVersion: (user?.authVersion || 0) + 1 }
      });

      // Revoke any remaining active challenges for user
      await tx.authChallenge.updateMany({
        where: { userId, consumedAt: null, revokedAt: null },
        data: { revokedAt: new Date() }
      });

      return { success: true, message: 'Senha alterada com sucesso.' };
    });
  }

  async getSecurityStatus(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    
    const recoveryCount = await this.prisma.recoveryCode.count({
      where: { userId, usedAt: null }
    });

    return {
      isTwoFactorEnabled: user.isTwoFactorEnabled,
      recoveryCodesRemaining: user.isTwoFactorEnabled ? recoveryCount : 0,
    };
  }
}
