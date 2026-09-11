# 🎲 OP-CRIS - Ordem Paranormal: Sistema de Recursos

**OP-CRIS** (Ordem Paranormal - Sistema de Recursos) é uma aplicação web full-stack desenvolvida para servir como ferramenta de apoio visual e funcional para Mestres e Players do RPG **Ordem Paranormal**.

## 📖 Sobre o Projeto

O OP-CRIS foi criado para facilitar a gestão de sessões de RPG, oferecendo ferramentas essenciais como rolagem de dados 3D, gestão de inventário, referências rápidas e muito mais. O sistema é baseado nos cinco elementos do universo de Ordem Paranormal: **Conhecimento**, **Morte**, **Medo**, **Energia** e **Sangue**, cada um com seu próprio tema visual único.

## ✨ Funcionalidades Principais

### 🎯 Rolagem de Dados 3D
- **Dados 3D Realistas**: Implementação com React Three Fiber para dados verdadeiramente tridimensionais
- **Múltiplos Tipos de Dados**: Suporte para d4, d6, d8, d10, d12, d20 e d100
- **Múltiplos Dados Simultâneos**: Role vários dados ao mesmo tempo (ex: 3d20)
- **Animações Realistas**: Animações de rotação e bounce ao rolar
- **Números Visíveis**: Cada face do dado mostra seu número (especialmente no d6)
- **Efeitos Especiais**: Destaque visual para críticos (20) e falhas críticas (1)
- **Cores Dinâmicas**: Os dados mudam de cor conforme o tema selecionado

### 🎨 Sistema de Temas Dinâmicos
- **5 Temas Elementais**: Cada elemento tem seu próprio esquema de cores
  - **Conhecimento** (Dourado) 📜
  - **Morte** (Cinzento/Branco) 💀
  - **Medo** (Azul) 👁️
  - **Energia** (Roxo) ⚡
  - **Sangue** (Vermelho) 🩸
- **Fundos Temáticos**: Imagens de fundo personalizadas para cada elemento
- **UI Adaptativa**: Toda a interface muda de cor dinamicamente

### 📦 Gestão de Inventário
- **Armas e Itens**: Sistema completo de CRUD para gerenciar inventário
- **Integração Supabase**: Dados salvos na nuvem e sincronizados
- **Autenticação**: Sistema de login para múltiplos usuários
- **Notificações**: Feedback visual para todas as operações

### 📚 Referências Rápidas
- Acesso rápido a regras e tabelas do sistema
- Interface organizada para consulta durante as sessões

### 📝 Notas e Campanhas
- Sistema de notas para anotações rápidas
- Gestão de campanhas (em desenvolvimento)

## 🛠️ Tecnologias Utilizadas

### Frontend
- **React 18** - Biblioteca UI
- **TypeScript** - Tipagem estática
- **Vite** - Build tool e dev server
- **Tailwind CSS** - Estilização
- **shadcn/ui** - Componentes UI
- **React Router** - Navegação
- **React Three Fiber** - Renderização 3D
- **Three.js** - Engine 3D
- **@react-three/drei** - Helpers para Three.js

### Backend & Database
- **Supabase** - Backend as a Service
  - Autenticação
  - Base de dados PostgreSQL
  - Real-time subscriptions

### Deploy
- **Vercel** - Hospedagem e CI/CD
- **GitHub** - Controle de versão

## 🚀 Como Executar Localmente

### Pré-requisitos
- Node.js 18+ e npm
- Conta no Supabase (para backend)

### Instalação

1. **Clone o repositório**
```bash
git clone https://github.com/FranciscoSimas/ordem-cris-hub.git
cd ordem-cris-hub
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**
Crie um arquivo `.env` na raiz do projeto:
```env
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
```

4. **Inicie o servidor de desenvolvimento**
```bash
npm run dev
```

O projeto estará disponível em `http://localhost:5173`

## 📦 Scripts Disponíveis

- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run build` - Cria build de produção
- `npm run preview` - Preview do build de produção
- `npm run lint` - Executa o linter

## 🎨 Estrutura do Projeto

```
ordem-cris-hub/
├── public/
│   └── backgrounds/      # Imagens de fundo temáticas
├── src/
│   ├── components/       # Componentes React
│   │   ├── dice/        # Componentes de dados 3D
│   │   └── ...
│   ├── contexts/        # Context API (Theme, etc)
│   ├── integrations/    # Integrações (Supabase)
│   ├── lib/            # Utilitários
│   ├── pages/          # Páginas principais
│   └── index.css       # Estilos globais e temas
├── package.json
└── vite.config.ts
```

## 🔧 Configuração do Supabase

### Variáveis de Ambiente

**IMPORTANTE**: Configure as variáveis de ambiente no Vercel:

1. Acesse [Vercel Dashboard](https://vercel.com/dashboard) > Seu Projeto > Settings > Environment Variables
2. Adicione:
   - `VITE_SUPABASE_URL` = `https://YOUR_PROJECT_ID.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = Sua chave `anon public` do Supabase

⚠️ **A URL deve ser**: `https://xxxxx.supabase.co` (NÃO use a URL do dashboard!)

Veja `VERCEL_ENV_SETUP.md` para instruções detalhadas.

### Tabelas Necessárias

O projeto requer as seguintes tabelas no Supabase:

1. **weapons** - Armazenar armas dos jogadores
2. **items** - Armazenar itens dos jogadores
3. **characters** - Armazenar personagens/NPCs

Todas devem ter:
- `user_id` (UUID, referência ao auth.users)
- Campos específicos conforme o tipo de dado

## 🌐 Deploy

O projeto está configurado para deploy automático no **Vercel**:

1. Conecte seu repositório GitHub ao Vercel
2. Configure as variáveis de ambiente no painel do Vercel
3. O deploy acontece automaticamente a cada push para `main`

## 📝 Notas Importantes

- **Imagens de Fundo**: As imagens de fundo devem estar em `public/backgrounds/` com os nomes:
  - `fear-bg.png`
  - `knowledge-bg.png`
  - `death-bg.png`
  - `energy-bg.png`
  - `blood-bg.png`

- **Resolução Recomendada**: 1920x1080px para as imagens de fundo

- **Backup Automático**: Use o script `backup.bat` (Windows) para fazer commit e push automático

## 🎮 Como Usar

1. **Selecionar Tema**: Use o seletor de temas no canto superior direito
2. **Rolar Dados**: 
   - Escolha o tipo de dado (d4, d6, d8, d10, d12, d20, d100)
   - Defina a quantidade de dados
   - Adicione modificadores se necessário
   - Clique em "Rolar"
3. **Gerenciar Inventário**: 
   - Acesse a aba "Inventário"
   - Adicione, edite ou remova armas e itens
   - Os dados são salvos automaticamente

## 🤝 Contribuindo

Este é um projeto pessoal, mas sugestões e melhorias são bem-vindas!

## 📄 Licença

Este projeto é de uso pessoal e educacional.

## 🔗 Links

- **Deploy**: [Link do Vercel]
- **Repositório**: https://github.com/FranciscoSimas/ordem-cris-hub

---

**Desenvolvido com ❤️ para a comunidade de Ordem Paranormal**
