import { Controller, Post, Get, Body, HttpCode, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto, VerifyCodeDto, ResendCodeDto } from './dto/login.dto';
import { VerifyEmailDto, ResendVerificationDto, ChangeEmailDto, ConfirmChangeEmailAuthDto } from './dto/verify-email.dto';
import { Enable2FADto, Disable2FADto, RegenerateRecoveryDto } from './dto/2fa.dto';
import { ChangePasswordInitDto, ChangePasswordConfirmDto, ForgotPasswordDto, ResetPasswordDto } from './dto/password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Req() req: any) {
    return req.user;
  }

  @Post('verify-email')
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  @Post('resend-verification')
  async resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto);
  }

  @Post('login/verify-code')
  async verifyLoginCode(@Body() dto: VerifyCodeDto) {
    return this.authService.verifyLoginCode(dto);
  }

  @Post('login/resend-code')
  async resendLoginCode(@Body() dto: ResendCodeDto) {
    return this.authService.resendLoginCode(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-email')
  async changeEmailInit(@Req() req: any, @Body() dto: ChangeEmailDto) {
    return this.authService.changeEmailInit(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-email/confirm')
  async changeEmailConfirm(@Req() req: any, @Body() dto: ConfirmChangeEmailAuthDto) {
    return this.authService.changeEmailConfirmAuth(req.user.id, dto);
  }

  // --- 2FA Endpoints ---

  @UseGuards(JwtAuthGuard)
  @Get('security')
  async getSecurityStatus(@Req() req: any) {
    return this.authService.getSecurityStatus(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/enable/init')
  async enable2FAInit(@Req() req: any, @Body() dto: Enable2FADto) {
    return this.authService.enable2FAInit(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/enable/confirm')
  async enable2FAConfirm(@Req() req: any, @Body() dto: VerifyCodeDto) {
    return this.authService.enable2FAConfirm(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/disable/init')
  async disable2FAInit(@Req() req: any, @Body() dto: Enable2FADto) {
    return this.authService.disable2FAInit(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/disable/confirm')
  async disable2FAConfirm(@Req() req: any, @Body() dto: VerifyCodeDto) {
    return this.authService.disable2FAConfirm(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/recovery/regenerate/init')
  async regenerateRecoveryInit(@Req() req: any, @Body() dto: RegenerateRecoveryDto) {
    return this.authService.regenerateRecoveryInit(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/recovery/regenerate/confirm')
  async regenerateRecoveryConfirm(@Req() req: any, @Body() dto: VerifyCodeDto) {
    return this.authService.regenerateRecoveryConfirm(req.user.id, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('password/forgot')
  async forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: any) {
    const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
    return this.authService.forgotPassword(dto, clientIp);
  }

  @HttpCode(HttpStatus.OK)
  @Post('password/reset')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('password/change/init')
  async changePasswordInit(@Req() req: any, @Body() dto: ChangePasswordInitDto) {
    return this.authService.changePasswordInit(req.user.id, dto.currentPassword, dto.newPassword);
  }

  @UseGuards(JwtAuthGuard)
  @Post('password/change/confirm')
  async changePasswordConfirm(@Req() req: any, @Body() dto: ChangePasswordConfirmDto) {
    return this.authService.changePasswordConfirm(req.user.id, dto.challengeId, dto.code, dto.recoveryCode);
  }
}
