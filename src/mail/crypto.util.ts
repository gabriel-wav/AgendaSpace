import * as crypto from 'crypto';

export function encryptPayload(payload: any, keyString: string | undefined): string {
  if (!keyString || keyString.length < 32) {
    throw new Error('MAIL_ENCRYPTION_KEY inválida. É necessário definir no mínimo 32 caracteres.');
  }
  const key = Buffer.from(keyString.slice(0, 32), 'utf-8');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  const jsonPayload = JSON.stringify(payload);
  
  let encrypted = cipher.update(jsonPayload, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag().toString('base64');
  
  return JSON.stringify({
    iv: iv.toString('base64'),
    data: encrypted,
    tag: authTag,
  });
}

export function decryptPayload(encryptedRaw: string, keyString: string | undefined): any {
  if (!keyString || keyString.length < 32) {
    throw new Error('MAIL_ENCRYPTION_KEY inválida. É necessário definir no mínimo 32 caracteres.');
  }
  const key = Buffer.from(keyString.slice(0, 32), 'utf-8');
  const parsed = JSON.parse(encryptedRaw);
  
  const iv = Buffer.from(parsed.iv, 'base64');
  const tag = Buffer.from(parsed.tag, 'base64');
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  
  let decrypted = decipher.update(parsed.data, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  
  return JSON.parse(decrypted);
}
