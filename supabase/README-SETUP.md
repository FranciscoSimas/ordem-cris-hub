# 🗄️ Setup do Banco de Dados - OP-CRIS

Este guia explica como configurar o banco de dados Supabase para o projeto OP-CRIS.

## 📋 Pré-requisitos

- Conta no Supabase
- Projeto Supabase criado
- Acesso ao SQL Editor do Supabase

## 🚀 Passo a Passo

### 1. Executar o Script de Setup

1. Acesse o **SQL Editor** no painel do Supabase
2. Abra o arquivo `supabase/setup.sql`
3. Copie todo o conteúdo
4. Cole no SQL Editor
5. Clique em **Run** ou pressione `Ctrl+Enter`

Este script irá:
- ✅ Criar o enum `app_role` (admin, master, player)
- ✅ Criar as tabelas: `profiles`, `user_roles`, `weapons`, `items`
- ✅ Habilitar Row Level Security (RLS)
- ✅ Criar políticas de segurança
- ✅ Criar triggers para `updated_at`
- ✅ Criar função para criar perfis automaticamente

### 2. Criar os 3 Usuários

1. Vá em **Authentication** > **Users** no painel do Supabase
2. Clique em **Add User** > **Create new user**
3. Crie 3 usuários com os seguintes dados:

#### Usuário 1 - Admin
- **Email**: `admin@opcris.com` (ou o que preferir)
- **Password**: (defina uma senha segura)
- **Anote o UUID** deste usuário

#### Usuário 2 - Master
- **Email**: `master@opcris.com` (ou o que preferir)
- **Password**: (defina uma senha segura)
- **Anote o UUID** deste usuário

#### Usuário 3 - Player
- **Email**: `player@opcris.com` (ou o que preferir)
- **Password**: (defina uma senha segura)
- **Anote o UUID** deste usuário

### 3. Atribuir Roles aos Usuários

1. Volte ao **SQL Editor**
2. Abra o arquivo `supabase/create-users.sql`
3. Substitua os placeholders `USER_UUID_AQUI` pelos UUIDs reais dos usuários
4. Execute o script

**Exemplo:**
```sql
-- Admin
UPDATE public.user_roles 
SET role = 'admin' 
WHERE user_id = '123e4567-e89b-12d3-a456-426614174000';

-- Master
UPDATE public.user_roles 
SET role = 'master' 
WHERE user_id = '223e4567-e89b-12d3-a456-426614174001';

-- Player (já é padrão, mas pode ser explícito)
UPDATE public.user_roles 
SET role = 'player' 
WHERE user_id = '323e4567-e89b-12d3-a456-426614174002';
```

### 4. (Opcional) Atualizar Display Names

Para personalizar os nomes exibidos:

```sql
UPDATE public.profiles 
SET display_name = 'Administrador'
WHERE id = 'UUID_DO_ADMIN';

UPDATE public.profiles 
SET display_name = 'Mestre'
WHERE id = 'UUID_DO_MASTER';

UPDATE public.profiles 
SET display_name = 'Jogador'
WHERE id = 'UUID_DO_PLAYER';
```

## ✅ Verificação

Para verificar se tudo está funcionando:

```sql
-- Ver todos os usuários e seus roles
SELECT 
  u.id,
  u.email,
  p.display_name,
  ur.role
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
ORDER BY ur.role;
```

## 🔒 Segurança

O sistema está configurado com **Row Level Security (RLS)**:
- ✅ Usuários só podem ver/editar seus próprios dados
- ✅ Apenas admins podem gerenciar roles
- ✅ Perfis são criados automaticamente ao registrar

## 📊 Estrutura das Tabelas

### `profiles`
- `id` (UUID) - Referência ao auth.users
- `display_name` (TEXT) - Nome exibido
- `cris_sheet_url` (TEXT) - URL da ficha CRIS (opcional)
- `created_at`, `updated_at` - Timestamps

### `user_roles`
- `id` (UUID) - Primary key
- `user_id` (UUID) - Referência ao auth.users
- `role` (app_role) - admin, master ou player

### `weapons`
- `id` (UUID) - Primary key
- `user_id` (UUID) - Referência ao auth.users
- `name` (TEXT) - Nome da arma
- `type` (TEXT) - Tipo da arma
- `damage` (TEXT) - Dano
- `modifier` (TEXT) - Modificador (opcional)
- `description` (TEXT) - Descrição (opcional)
- `created_at`, `updated_at` - Timestamps

### `items`
- `id` (UUID) - Primary key
- `user_id` (UUID) - Referência ao auth.users
- `name` (TEXT) - Nome do item
- `category` (TEXT) - Categoria
- `location` (TEXT) - Localização (padrão: 'inventário')
- `description` (TEXT) - Descrição (opcional)
- `created_at`, `updated_at` - Timestamps

## 🐛 Troubleshooting

### Erro: "relation already exists"
- Algumas tabelas já existem. Isso é normal se você já executou o script antes.
- O script usa `CREATE TABLE IF NOT EXISTS`, então é seguro executar novamente.

### Usuários não aparecem
- Verifique se os usuários foram criados em **Authentication** > **Users**
- Verifique se os perfis foram criados automaticamente:
  ```sql
  SELECT * FROM public.profiles;
  ```

### Roles não funcionam
- Verifique se os roles foram atribuídos:
  ```sql
  SELECT * FROM public.user_roles;
  ```
- Certifique-se de que os UUIDs estão corretos

## 📝 Notas

- Os perfis são criados **automaticamente** quando um novo usuário se registra
- O role padrão é **'player'**
- Apenas **admins** podem gerenciar roles de outros usuários
- Todos os dados são **isolados por usuário** (RLS)

