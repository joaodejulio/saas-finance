-- Isolamento multi-tenant via Row-Level Security (RLS)
-- Tabelas protegidas: transactions, family_groups, family_members.
-- users e sessions NAO recebem RLS: sao consultadas no login, antes de existir contexto de tenant.
-- Decisao registrada: users/sessions ficam fora do escopo do RLS por dependerem do fluxo de autenticacao.

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions FORCE ROW LEVEL SECURITY;

ALTER TABLE public.family_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_groups FORCE ROW LEVEL SECURITY;

ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members FORCE ROW LEVEL SECURITY;

-- transactions: so enxerga/edita/exclui lancamentos do grupo da sessao
CREATE POLICY transactions_tenant_isolation
  ON public.transactions
  FOR ALL TO app_user
  USING (group_id = current_setting('app.current_group_id', true)::uuid)
  WITH CHECK (group_id = current_setting('app.current_group_id', true)::uuid);

-- family_members: grupo da sessao OU proprio usuario (necessario para o login listar grupos do usuario)
CREATE POLICY family_members_tenant_isolation
  ON public.family_members
  FOR ALL TO app_user
  USING (
    group_id = current_setting('app.current_group_id', true)::uuid
    OR user_id = current_setting('app.current_user_id', true)::uuid
  )
  WITH CHECK (
    group_id = current_setting('app.current_group_id', true)::uuid
    OR user_id = current_setting('app.current_user_id', true)::uuid
  );

-- family_groups: id eh o grupo da sessao OU o usuario eh membro do grupo
CREATE POLICY family_groups_tenant_isolation
  ON public.family_groups
  FOR ALL TO app_user
  USING (
    id = current_setting('app.current_group_id', true)::uuid
    OR id IN (
      SELECT group_id
      FROM public.family_members
      WHERE user_id = current_setting('app.current_user_id', true)::uuid
    )
  )
  WITH CHECK (id = current_setting('app.current_group_id', true)::uuid);

-- Privilégios mínimos para o role da aplicação
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO app_user;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;