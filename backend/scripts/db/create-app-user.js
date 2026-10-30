/**
 * Script idempotente para criar/atualizar o role `app_user` no PostgreSQL.
 *
 * - Lê a senha de APP_USER_PASSWORD no .env (nunca hardcoded).
 * - Cria o role se não existir (sem SUPERUSER, sem BYPASSRLS, não dono de tabelas).
 * - Define a senha via ALTER ROLE ... WITH PASSWORD (valor do .env, escape de aspas simples).
 * - Concede privilégios mínimos: USAGE no schema e SELECT/INSERT/UPDATE/DELETE nas tabelas existentes.
 *
 * Executa com a conexão administrativa (DATABASE_URL_ADMIN / postgres).
 * Usa `docker exec psql` porque o driver `postgres.js` não suporta parâmetros
 * preparados em ALTER ROLE ... WITH PASSWORD (envia $1 literal).
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return {};
  const text = fs.readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function escapeSqlString(value) {
  return value.replace(/'/g, "''");
}

function psql(sql) {
  const cmd = `docker exec finance_saas psql -U postgres -d saas_financeiro -v ON_ERROR_STOP=1 -t -A -c ${JSON.stringify(sql)}`;
  return execSync(cmd, { encoding: 'utf8', maxBuffer: 1024 * 1024, env: { ...process.env, PGPASSWORD: 'postgres' } }).trim();
}

async function main() {
  const env = loadEnv();
  const password = env.APP_USER_PASSWORD;

  if (!password || password === 'APP_USER_PASSWORD') {
    console.error('ERRO: APP_USER_PASSWORD não configurada no .env');
    process.exit(1);
  }

  const sqlPassword = escapeSqlString(password);

  // Verifica se o role já existe
  const exists = psql(`SELECT 1 FROM pg_roles WHERE rolname = 'app_user' LIMIT 1`);

  if (!exists) {
    console.log('Criando role app_user...');
    psql(`CREATE ROLE app_user LOGIN`);
  } else {
    console.log('Role app_user já existe. Apenas atualizando senha e privilégios.');
  }

  // Define a senha (valor do .env, escape de aspas simples)
  psql(`ALTER ROLE app_user WITH PASSWORD '${sqlPassword}'`);

  // Garante que não é superuser nem bypassrls
  psql(`ALTER ROLE app_user NOSUPERUSER NOBYPASSRLS`);

  // Privilégios mínimos
  psql(`REVOKE ALL ON SCHEMA public FROM PUBLIC`);
  psql(`GRANT USAGE ON SCHEMA public TO app_user`);

  psql(`REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC`);
  psql(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user`);

  // Tabelas futuras criadas por migrations também ficarão acessíveis ao app_user
  psql(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user`);

  console.log('Role app_user configurado com privilégios mínimos.');
}

main().catch((err) => {
  console.error('ERRO:', err.message);
  process.exit(1);
});