# **Last update:** 15/12/2025

# 🎲 OP-CRIS - Ordem Paranormal: Resource System

**OP-CRIS** (Ordem Paranormal - Sistema de Recursos) is a full-stack web application developed to serve as a visual and functional support tool for Game Masters and Players of the **Ordem Paranormal** RPG.

## 📖 About the Project

OP-CRIS was created to make RPG session management easier, offering essential tools such as 3D dice rolling, inventory management, quick references, and much more. The system is based on the five elements of the Ordem Paranormal universe: **Knowledge**, **Death**, **Fear**, **Energy**, and **Blood**, each with its own unique visual theme.

## ✨ Main Features

### 🎯 3D Dice Rolling
- **Realistic 3D Dice**: Implemented with React Three Fiber for truly three-dimensional dice
- **Multiple Dice Types**: Support for d4, d6, d8, d10, d12, d20, and d100
- **Multiple Dice at Once**: Roll several dice at the same time (e.g. 3d20)
- **Realistic Animations**: Rotation and bounce animations when rolling
- **Visible Numbers**: Each die face shows its number (especially on the d6)
- **Special Effects**: Visual highlight for critical hits (20) and critical failures (1)
- **Dynamic Colors**: Dice change color according to the selected theme

### 🎨 Dynamic Theme System
- **5 Elemental Themes**: Each element has its own color scheme
  - **Knowledge** (Gold) 📜
  - **Death** (Grey/White) 💀
  - **Fear** (Blue) 👁️
  - **Energy** (Purple) ⚡
  - **Blood** (Red) 🩸
- **Thematic Backgrounds**: Custom background images for each element
- **Adaptive UI**: The entire interface changes color dynamically

### 📦 Inventory Management
- **Weapons and Items**: Complete CRUD system to manage inventory
- **Supabase Integration**: Data saved in the cloud and synced
- **Authentication**: Login system for multiple users
- **Notifications**: Visual feedback for all operations

### 📚 Quick References
- Quick access to system rules and tables
- Organized interface for consultation during sessions

### 📝 Notes and Campaigns
- Notes system for quick annotations
- Campaign management (in development)

## 🛠️ Technologies Used

### Frontend
- **React 18** - UI library
- **TypeScript** - Static typing
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **React Router** - Navigation
- **React Three Fiber** - 3D rendering
- **Three.js** - 3D engine
- **@react-three/drei** - Helpers for Three.js

### Backend & Database
- **Supabase** - Backend as a Service
  - Authentication
  - PostgreSQL database
  - Real-time subscriptions

### Deploy
- **Vercel** - Hosting and CI/CD
- **GitHub** - Version control

## 🎨 Project Structure

```
ordem-cris-hub/
├── api/                 # Vercel functions (CRIS, Discord)
├── public/
│   ├── backgrounds/     # Thematic backgrounds
│   └── symbols/         # Element icons
├── src/
│   ├── components/      # App UI (dice/, ui/, sections)
│   ├── contexts/        # Theme, Discord
│   ├── hooks/
│   ├── integrations/    # Supabase client
│   ├── lib/             # utils + guest/localStorage
│   ├── pages/           # Index, Auth
│   └── index.css
├── supabase/            # SQL scripts / setup
├── package.json
└── vite.config.ts
```

## 🤝 Contributing

This is a personal project, but suggestions and improvements are welcome!

## 📄 License

This project is for personal and educational use.

## 🔗 Links

- **Deploy**: ordem-cris-hub.vercel.app
- **Repository**: https://github.com/FranciscoSimas/ordem-cris-hub

---

**Developed with ❤️ for the Ordem Paranormal community**
