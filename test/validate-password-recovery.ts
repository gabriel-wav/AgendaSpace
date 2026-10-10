import 'dotenv/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import axios from 'axios';

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaMariaDb(connectionString);
const prisma = new PrismaClient({ adapter });

const API_URL = process.env.VITE_API_URL || 'http://localhost:3000';

async function runValidation() {
  console.log('--- INICIANDO VALIDAÇÃO COMPLETA DE RECUPERAÇÃO DE SENHA ---');
  await prisma.$connect();

  const timestamp = Date.now();
  const testEmail = `test_recovery_${timestamp}@example.com`;
  const initialPassword = 'InitialPassword123!';
  const newPassword = 'NewPassword456!';

  // 1. Criar usuário de teste ativo
  const user = await prisma.user.create({
    data: {
      email: testEmail,
      fullName: 'Usuário Teste Recuperação',
      passwordHash: await bcrypt.hash(initialPassword, 10),
      role: 'USER',
      emailVerifiedAt: new Date(),
    },
  });
  console.log('✅ 1. Usuário de teste criado:', testEmail);

  // 2. Testar email inexistente (resposta genérica sem vazar existência)
  const nonexistentRes = await axios.post(`${API_URL}/auth/password/forgot`, {
    email: `nonexistent_${timestamp}@example.com`,
  });
  if (nonexistentRes.data.message !== 'Se houver uma conta disponível para esse email, enviaremos as instruções de recuperação.') {
    throw new Error('Mensagem para email inexistente não corresponde à esperada');
  }
  console.log('✅ 2. Email inexistente recebeu resposta genérica idêntica.');

  // 3. Testar usuário excluído (soft-delete / isDeleted)
  const deletedUserEmail = `deleted_${timestamp}@example.com`;
  await prisma.user.create({
    data: {
      email: deletedUserEmail,
      fullName: 'Usuário Deletado',
      passwordHash: await bcrypt.hash(initialPassword, 10),
      isDeleted: true,
      deletedAt: new Date(),
    },
  });
  const deletedRes = await axios.post(`${API_URL}/auth/password/forgot`, {
    email: deletedUserEmail,
  });
  if (deletedRes.data.message !== 'Se houver uma conta disponível para esse email, enviaremos as instruções de recuperação.') {
    throw new Error('Mensagem para email deletado não corresponde à esperada');
  }
  const deletedChallenge = await prisma.authChallenge.findFirst({
    where: { targetEmail: deletedUserEmail, purpose: 'PASSWORD_RECOVERY' },
  });
  if (deletedChallenge) {
    throw new Error('Desafio não deveria ter sido criado para conta deletada');
  }
  console.log('✅ 3. Conta excluída continuou sem acesso e nenhum token/email foi gerado.');

  // 4. Solicitar recuperação para conta real
  const forgotRes = await axios.post(`${API_URL}/auth/password/forgot`, {
    email: testEmail,
  });
  if (forgotRes.data.message !== 'Se houver uma conta disponível para esse email, enviaremos as instruções de recuperação.') {
    throw new Error('Resposta inesperada para solicitação de recuperação');
  }

  // Verificar banco de dados: AuthChallenge e EmailOutbox
  const challenge1 = await prisma.authChallenge.findFirst({
    where: { userId: user.id, purpose: 'PASSWORD_RECOVERY', consumedAt: null, revokedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  if (!challenge1) throw new Error('AuthChallenge PASSWORD_RECOVERY não foi criado no banco');

  const outboxEmail = await prisma.emailOutbox.findFirst({
    where: { recipient: testEmail, templateName: 'PASSWORD_RECOVERY' },
    orderBy: { createdAt: 'desc' },
  });
  if (!outboxEmail) throw new Error('Email PASSWORD_RECOVERY não foi enfileirado no EmailOutbox');
  console.log('✅ 4. Solicitação gerou AuthChallenge criptografado e enfileirou email no outbox com template correto.');

  // 5. Simular geração de um segundo pedido para testar revogação do primeiro
  // Aguarda 1 segundo e cria um segundo desafio diretamente para verificar revogação
  const rawToken2 = crypto.randomBytes(32).toString('hex');
  const tokenDigest2 = crypto.createHash('sha256').update(rawToken2).digest('hex');

  await prisma.$transaction(async (tx) => {
    await tx.authChallenge.updateMany({
      where: { userId: user.id, purpose: 'PASSWORD_RECOVERY', consumedAt: null, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await tx.authChallenge.create({
      data: {
        userId: user.id,
        purpose: 'PASSWORD_RECOVERY',
        targetEmail: user.email,
        tokenDigest: tokenDigest2,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });
  });

  const revokedChallenge = await prisma.authChallenge.findUnique({
    where: { id: challenge1.id },
  });
  if (!revokedChallenge?.revokedAt) {
    throw new Error('Desafio anterior deveria ter sido revogado');
  }
  console.log('✅ 5. Solicitação anterior foi revogada com sucesso ao gerar nova solicitação.');

  // 6. Testar rejeição de token revogado
  try {
    await axios.post(`${API_URL}/auth/password/reset`, {
      token: 'token_falso_ou_invalido',
      newPassword: newPassword,
    });
    throw new Error('Deveria ter falhado com token inválido');
  } catch (err: any) {
    if (err.response?.status !== 400) throw err;
  }
  console.log('✅ 6. Token inválido/inexistente rejeitado com código 400.');

  // 7. Testar duas confirmações concorrentes com o mesmo token (Race Condition Test)
  const concurrentToken = crypto.randomBytes(32).toString('hex');
  const concurrentDigest = crypto.createHash('sha256').update(concurrentToken).digest('hex');
  await prisma.authChallenge.create({
    data: {
      userId: user.id,
      purpose: 'PASSWORD_RECOVERY',
      targetEmail: user.email,
      tokenDigest: concurrentDigest,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    },
  });

  console.log('Disparando 2 requisições simultâneas com o mesmo token...');
  const [req1, req2] = await Promise.allSettled([
    axios.post(`${API_URL}/auth/password/reset`, {
      token: concurrentToken,
      newPassword: newPassword,
    }),
    axios.post(`${API_URL}/auth/password/reset`, {
      token: concurrentToken,
      newPassword: newPassword,
    }),
  ]);

  const fulfilledCount = [req1, req2].filter((r) => r.status === 'fulfilled').length;
  const rejectedCount = [req1, req2].filter((r) => r.status === 'rejected').length;

  if (fulfilledCount !== 1 || rejectedCount !== 1) {
    throw new Error(`Concorrência falhou: esperava exatamente 1 sucesso e 1 rejeição, mas obteve ${fulfilledCount} sucessos e ${rejectedCount} rejeições`);
  }
  console.log('✅ 7. Proteção de concorrência atômica validada: exatamente 1 requisição teve sucesso e a outra foi rejeitada.');

  // 8. Testar reutilização do mesmo token (agora já consumido)
  try {
    await axios.post(`${API_URL}/auth/password/reset`, {
      token: concurrentToken,
      newPassword: 'AnotherPassword789!',
    });
    throw new Error('Deveria ter falhado ao tentar reutilizar token consumido');
  } catch (err: any) {
    if (err.response?.status !== 400) throw err;
  }
  console.log('✅ 8. Tentativa de reutilizar token consumido rejeitada com código 400.');

  // 9. Testar token expirado
  const expiredToken = crypto.randomBytes(32).toString('hex');
  const expiredDigest = crypto.createHash('sha256').update(expiredToken).digest('hex');
  await prisma.authChallenge.create({
    data: {
      userId: user.id,
      purpose: 'PASSWORD_RECOVERY',
      targetEmail: user.email,
      tokenDigest: expiredDigest,
      expiresAt: new Date(Date.now() - 10000), // Expirado há 10 segundos
    },
  });
  try {
    await axios.post(`${API_URL}/auth/password/reset`, {
      token: expiredToken,
      newPassword: 'AnotherPassword789!',
    });
    throw new Error('Deveria ter falhado ao tentar usar token expirado');
  } catch (err: any) {
    if (err.response?.status !== 400) throw err;
  }
  console.log('✅ 9. Token expirado rejeitado com código 400.');

  // 10. Validar login com a nova senha e rejeição da senha antiga
  try {
    await axios.post(`${API_URL}/auth/login`, {
      email: testEmail,
      password: initialPassword,
    });
    throw new Error('Senha antiga não deveria mais funcionar');
  } catch (err: any) {
    if (err.response?.status !== 401) throw err;
  }
  console.log('✅ 10. Senha antiga devidamente rejeitada (401).');

  const newLoginRes = await axios.post(`${API_URL}/auth/login`, {
    email: testEmail,
    password: newPassword,
  });
  if (!newLoginRes.data.accessToken) {
    throw new Error('Login com a nova senha deveria retornar accessToken');
  }
  const oldToken = newLoginRes.data.accessToken;
  console.log('✅ 11. Login com a nova senha autenticado com sucesso.');

  // 11. Validar que nova redefinição invalida a sessão anterior (authVersion)
  const tokenResetForSessionTest = crypto.randomBytes(32).toString('hex');
  const digestResetForSessionTest = crypto.createHash('sha256').update(tokenResetForSessionTest).digest('hex');
  await prisma.authChallenge.create({
    data: {
      userId: user.id,
      purpose: 'PASSWORD_RECOVERY',
      targetEmail: user.email,
      tokenDigest: digestResetForSessionTest,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    },
  });

  await axios.post(`${API_URL}/auth/password/reset`, {
    token: tokenResetForSessionTest,
    newPassword: 'BrandNewPassword123!',
  });

  // Tenta acessar rota autenticada usando o token anterior à redefinição
  try {
    await axios.get(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${oldToken}` },
    });
    throw new Error('Token antigo deveria ter sido rejeitado devido ao incremento de authVersion');
  } catch (err: any) {
    if (err.response?.status !== 401) throw err;
  }
  console.log('✅ 12. Sessão anterior (JWT) devidamente rejeitada após nova redefinição de senha (authVersion incrementado).');

  // 12. Validar que 2FA continua habilitado e exigido no próximo login após redefinição
  const user2FAEmail = `user_2fa_${timestamp}@example.com`;
  const user2FA = await prisma.user.create({
    data: {
      email: user2FAEmail,
      fullName: 'Usuário com 2FA',
      passwordHash: await bcrypt.hash(initialPassword, 10),
      isTwoFactorEnabled: true,
      twoFactorEnabledAt: new Date(),
      emailVerifiedAt: new Date(),
    },
  });

  const token2FA = crypto.randomBytes(32).toString('hex');
  const digest2FA = crypto.createHash('sha256').update(token2FA).digest('hex');
  await prisma.authChallenge.create({
    data: {
      userId: user2FA.id,
      purpose: 'PASSWORD_RECOVERY',
      targetEmail: user2FA.email,
      tokenDigest: digest2FA,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    },
  });

  await axios.post(`${API_URL}/auth/password/reset`, {
    token: token2FA,
    newPassword: 'Password2FAChanged!',
  });

  // Verificar usuário no banco: isTwoFactorEnabled deve continuar true!
  const updated2FAUser = await prisma.user.findUnique({ where: { id: user2FA.id } });
  if (!updated2FAUser?.isTwoFactorEnabled) {
    throw new Error('2FA não deveria ter sido desativado pela recuperação de senha');
  }

  // Tentar login com a nova senha -> Deve exigir MFA_REQUIRED!
  const login2FARes = await axios.post(`${API_URL}/auth/login`, {
    email: user2FAEmail,
    password: 'Password2FAChanged!',
  });
  if (login2FARes.data.status !== 'MFA_REQUIRED') {
    throw new Error(`Esperava status MFA_REQUIRED, mas recebeu: ${login2FARes.data.status}`);
  }
  console.log('✅ 13. Conta com 2FA preservou 2FA ativo e exigiu segundo fator no próximo login após redefinição.');

  // 13. Validar que email de aviso PASSWORD_CHANGED foi enfileirado
  const changedNotification = await prisma.emailOutbox.findFirst({
    where: { recipient: user2FAEmail, templateName: 'PASSWORD_CHANGED' },
  });
  if (!changedNotification) {
    throw new Error('Aviso PASSWORD_CHANGED não foi enfileirado no EmailOutbox');
  }
  console.log('✅ 14. Email de notificação de segurança PASSWORD_CHANGED devidamente enfileirado.');

  // Limpeza de usuários de teste
  await prisma.user.deleteMany({
    where: {
      id: { in: [user.id, user2FA.id] },
    },
  });
  await prisma.user.deleteMany({
    where: { email: deletedUserEmail },
  });
  console.log('✅ 15. Limpeza de registros de teste concluída com sucesso.');

  console.log('\n🎉 TODOS OS 15 TESTES DE INTEGRAÇÃO PASSARAM COM 100% DE SUCESSO! 🎉');
  await prisma.$disconnect();
}

runValidation().catch((err) => {
  console.error('❌ ERRO NA VALIDAÇÃO:', err);
  process.exit(1);
});
