# Wena AI - Personalized AI Learning Experience

Wena AI is an advanced, AI-powered educational platform designed to provide highly personalized learning experiences. Using state-of-the-art AI models, Wena 2.0 acts as a mentor, counselor, and tutor, tailoring its interactions to each user's unique persona and career goals.

## 🚀 Core Features

- **AI Persona Management**: Create and refine your unique learning persona. Wena remembers your background, experience level, and goals to provide relevant guidance.
- **Dynamic Learning Paths**: AI-generated curriculum and modules tailored to your interests, from "Mock Interviewer" to "Coding Buddy".
- **Interactive AI Chat**: Real-time conversation with specialized AI roles (Career Counselor, Exam Buddy, WeCare Therapist, etc.).
- **Voice Mode**: Immersive, hands-free learning using Gemini's live voice capabilities.
- **Progress Tracking**: Monitor your learning journey with certificates, trophies, and a dedicated wallet for managing credits.
- **Challenges & Flashcards**: Reinforce your knowledge through AI-driven challenges and interactive flashcards.

## 🛠️ Technology Stack

- **Frontend**: [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Backend/Database**: [Supabase](https://supabase.com/)
- **AI Integration**: [Google Gemini AI](https://deepmind.google/technologies/gemini/) (Pro & Live)
- **Mobile Foundation**: [Capacitor](https://capacitorjs.com/) (Cross-platform Android/iOS)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)

## 📦 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (Latest LTS version recommended)
- [npm](https://www.npmjs.com/)

### Installation

1. **Clone the repository**
   ```bash
   git clone <YOUR_GIT_URL>
   cd Wena-AI
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

## 📱 Mobile Development

Wena AI supports mobile deployment via Capacitor.

- **Syncing Assets**: `npm run cap:sync`
- **Open Android Studio**: `npm run cap:open:android`
- **Open Xcode**: `npm run cap:open:ios`

## 🌐 Deployment

The application is optimized for deployment on [Vercel](https://vercel.com/) or via the [Lovable](https://lovable.dev/) platform's native publishing tools.

---

*Made with ❤️ by Wena AI Team*

