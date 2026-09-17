# **Último update:** 15/12/2025

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


## 🎨 Estrutura do Projeto

```
ordem-cris-hub/
├── api/                 # Vercel functions (CRIS, Discord)
├── public/
│   ├── backgrounds/     # Fundos temáticos
│   └── symbols/         # Ícones dos elementos
├── src/
│   ├── components/      # UI da app (dice/, ui/, secções)
│   ├── contexts/        # Theme, Discord
│   ├── hooks/
│   ├── integrations/    # Supabase client
│   ├── lib/             # utils + guest/localStorage
│   ├── pages/           # Index, Auth
│   └── index.css
├── supabase/            # Scripts SQL / setup
├── package.json
└── vite.config.ts
```


## 🤝 Contribuindo

Este é um projeto pessoal, mas sugestões e melhorias são bem-vindas!

## 📄 Licença

Este projeto é de uso pessoal e educacional.

## 🔗 Links

- **Deploy**: ordem-cris-hub.vercel.app
- **Repositório**: https://github.com/FranciscoSimas/ordem-cris-hub

---

**Desenvolvido com ❤️ para a comunidade de Ordem Paranormal**
