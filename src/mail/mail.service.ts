import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { encryptPayload } from './crypto.util';
import { TEMPLATES } from './mail.templates';
import { Prisma } from '@prisma/client';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  onModuleInit() {
    this.validateConfig();
    const host = process.env.MAIL_HOST || 'localhost';
    const port = parseInt(process.env.MAIL_PORT || '1025', 10);
    const secure = process.env.MAIL_SECURE === 'true';
    const user = process.env.MAIL_USER;
    const pass = process.env.MAIL_PASS;

    const options: any = {
      host,
      port,
      secure,
    };

    if (user) {
      (options as any).auth = { user, pass };
    }

    this.transporter = nodemailer.createTransport(options);

    this.transporter.verify().then(() => {
      this.logger.log(`Conexão SMTP validada com sucesso (${host}:${port}).`);
    }).catch(error => {
      this.logger.warn(`Falha ao conectar no SMTP. As mensagens ficarão pendentes na fila. Erro: ${error.message}`);
    });
  }

  private validateConfig() {
    const key = process.env.MAIL_ENCRYPTION_KEY;
    if (!key || key.length < 32) {
      this.logger.error('ATENÇÃO: MAIL_ENCRYPTION_KEY não está configurada corretamente (mínimo de 32 caracteres).');
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Configuração obrigatória MAIL_ENCRYPTION_KEY ausente ou muito curta.');
      }
    }
  }

  /**
   * Enfileira um email dentro de uma transação Prisma.
   */
  async queueEmail(
    tx: Prisma.TransactionClient,
    data: {
      recipient: string;
      templateName: keyof typeof TEMPLATES;
      payload: any;
      idempotencyKey?: string;
    }
  ) {
    const template = TEMPLATES[data.templateName];
    if (!template) throw new Error(`Template de email não encontrado: ${data.templateName}`);

    const key = process.env.MAIL_ENCRYPTION_KEY;
    const encrypted = encryptPayload(data.payload, key);
    
    const subject = template.subject;

    await tx.emailOutbox.create({
      data: {
        recipient: data.recipient,
        subject,
        templateName: data.templateName,
        payload: encrypted,
        idempotencyKey: data.idempotencyKey,
      }
    });
  }

  getTransporter() {
    return this.transporter;
  }
}
