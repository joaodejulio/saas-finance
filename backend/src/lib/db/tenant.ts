import { PrismaClient } from '@prisma/client';

/**
 * Singleton do Prisma Client seguro para hot reload do Next.js.
 * Em desenvolvimento, o Next.js pode recarregar módulos várias vezes;
 * guardar o client em globalThis evita múltiplas conexões ao banco.
 */
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * Valida que uma string é um UUID válido.
 */
function isUuid(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Executa uma função dentro de uma transação com o contexto de tenant definido.
 *
 * - Define `app.current_user_id` e `app.current_group_id` como configurações
 *   de sessão locais à transação (`set_config(..., true)`), então somem ao
 *   fazer COMMIT/ROLLBACK.
 * - Valida que ambos os IDs são UUIDs antes de usar (fail-safe).
 * - Usa parâmetros ($1, $2) — nunca concatenação de string — para evitar SQL injection.
 *
 * Fluxo de cadastro de novo grupo familiar:
 * O FamilyGroup é criado antes de existir contexto de tenant. A aplicação deve:
 *  1. Gerar o UUID do grupo na aplicação.
 *  2. Definir `app.current_group_id` com esse UUID (via withTenant).
 *  3. Inserir o FamilyGroup — o WITH CHECK da policy passa porque id = current_group_id.
 *  4. Criar a FamilyMember do proprietário (user_id = current_user_id passa na policy de family_members).
 *
 * Se as configurações de sessão estiverem ausentes, as policies RLS retornam
 * zero linhas (falha segura — nunca acesso aberto).
 */
export async function withTenant<T>(
  { userId, groupId }: { userId: string; groupId: string },
  fn: (tx: PrismaClient) => Promise<T>,
): Promise<T> {
  if (!isUuid(userId)) {
    throw new Error(`userId inválido: ${userId}`);
  }
  if (!isUuid(groupId)) {
    throw new Error(`groupId inválido: ${groupId}`);
  }

  return prisma.$transaction(async (tx) => {
    await tx.$queryRawUnsafe(
      "SELECT set_config('app.current_user_id', $1, true)",
      userId,
    );
    await tx.$queryRawUnsafe(
      "SELECT set_config('app.current_group_id', $1, true)",
      groupId,
    );
    return fn(tx);
  });
}

/**
 * Variante para operações apenas com usuário (ex.: login), sem grupo.
 * Define `app.current_group_id` como NULL — nenhuma linha de família é
 * retornada (fail-safe), mas policies baseadas apenas em `user_id`
 * (como family_members) ainda funcionam.
 */
export async function withUser<T>(
  { userId }: { userId: string },
  fn: (tx: PrismaClient) => Promise<T>,
): Promise<T> {
  if (!isUuid(userId)) {
    throw new Error(`userId inválido: ${userId}`);
  }

  return prisma.$transaction(async (tx) => {
    await tx.$queryRawUnsafe(
      "SELECT set_config('app.current_user_id', $1, true)",
      userId,
    );
    await tx.$queryRawUnsafe(
      "SELECT set_config('app.current_group_id', NULL, true)",
    );
    return fn(tx);
  });
}

export default { prisma, withTenant, withUser };