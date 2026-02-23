# 🚀 Wena AI — Feature Suggestions

> **Project Overview:**  
> Wena AI is an AI-powered e-learning mobile web app built with React + Vite + Supabase. It currently features: AI Chat Buddy, Learning Modules with lesson progress, Flashcards (daily limit), Daily Challenges (with leagues, streaks & leaderboard), Wallet (credits, Razorpay top-up, coupon/discount codes, referral system), Certificates, AI Persona, Profile & Settings.

---

## 🌟 20 Essential, Best & Great Feature Suggestions

---

### 1. 🧠 AI-Powered Personalized Learning Path
- Automatically generate a custom learning roadmap for each user based on their goals, existing skill level (via onboarding quiz), and AI Persona settings.
- The AI recommends which modules to do next, in what order, with estimated completion times.

---

### 2. 📊 Detailed Analytics & Learning Dashboard
- A dedicated "Progress" page showing weekly/monthly learning trends: time spent, XP earned, flashcards reviewed, challenges won, modules completed.
- Visual charts and heatmaps (like GitHub's contribution graph) to gamify consistency.

---

### 3. 🏆 Achievement Badges & Trophy Room
- Award badges for milestones: "First Module Completed", "7-Day Streak", "100 Flashcards Reviewed", "Top 3 on Leaderboard", etc.
- A dedicated Trophy Room page on the profile to showcase earned badges publicly.

---

### 4. 🤝 Study Groups & Social Learning
- Allow users to create or join study groups around specific modules or topics.
- Group leaderboards, shared flashcard decks, and a group chat powered by the AI Buddy for collaborative Q&A.

---

### 5. 🎙️ Voice-Based AI Interaction
- Upgrade the AI Chat Buddy with voice input (Speech-to-Text) and voice responses (Text-to-Speech).
- Especially powerful for language learning modules, pronunciation practice, and hands-free studying.

---

### 6. 🌙 Offline Mode & PWA Support
- Make the app a full Progressive Web App (PWA) with installability, offline access to downloaded modules and flashcards, and background sync when connectivity is restored.

---

### 7. 📅 Smart Study Scheduler & Reminders
- Allow users to set learning goals (e.g., "30 mins/day") and pick preferred study times.
- Send push notifications and in-app reminders for daily challenges, flashcard reviews, and scheduled lessons.

---

### 8. 🔁 Spaced Repetition System (SRS) for Flashcards
- Upgrade the current flashcard system with a Spaced Repetition algorithm (like Anki/SM-2) that intelligently re-schedules cards based on how well the user rated their knowledge.
- Move beyond the fixed 10-card daily limit to a dynamic, science-backed review queue.

---

### 9. 📝 Notes & Highlights Inside Lessons
- Let users highlight key text in lessons and save personal notes that are tied to that specific lesson.
- A dedicated "My Notes" page to review all saved highlights and notes across modules.

---

### 10. 📹 Video & Rich Media Lessons
- Extend the module/lesson system to support embedded YouTube/Vimeo videos, images, and code snippets with syntax highlighting.
- Richer content formats dramatically increase engagement and learning effectiveness.

---

### 11. 🛒 Module / Course Marketplace
- Build a marketplace where creators (or the team) can publish paid modules that users purchase using their wallet credits.
- Includes ratings, reviews, and a preview of the first lesson to drive purchase decisions.

---

### 12. 🗓️ Weekly Learning Challenges & Tournaments
- In addition to daily challenges, host weekly themed tournaments with a special leaderboard.
- Top finishers earn bonus credits, exclusive badges, or a "Tournament Champion" certificate.

---

### 13. 👨‍💼 Mentor Connect
- Allow experienced learners (high XP, verified certificates) to register as mentors.
- Other users can book 1-on-1 AI-assisted or live sessions with mentors (paid with credits), bridging AI learning with human guidance.

---

### 14. 📜 Verifiable Certificates with Blockchain/QR
- Upgrade the Certificates page to generate PDF certificates with a unique QR code and verification URL.
- Employers or third parties can scan the QR code to instantly verify the certificate's authenticity on a public page.

---

### 15. 🌍 Multi-Language Support (i18n)
- Add internationalization (i18n) support to serve users in Hindi, Marathi, Tamil, and other regional Indian languages, as well as major global languages.
- Given the Indian user base (Razorpay integration), regional language support is a massive growth lever.

---

### 16. 🔔 Smart In-App Notification Center
- A centralized notification inbox (bell icon) for events like: new challenge available, streak at risk, referral bonus received, badge earned, group activity.
- Backed by a `notifications` table in Supabase with real-time Supabase Realtime updates.

---

### 17. 🎯 Topic-Wise Weak Spot Identification
- After challenges and quizzes, the AI analyzes which topics a user consistently gets wrong.
- Shows a "Focus Areas" card on the dashboard and auto-suggests relevant flashcards and lessons to fill knowledge gaps.

---

### 18. 💬 Community Q&A Forum
- A module-linked community forum where learners ask questions and get answers from peers or the AI.
- Top contributors earn XP and special "Helper" badges, fostering a vibrant learning community.

---

### 19. 🔗 LinkedIn / Resume Integration
- One-click sharing of earned certificates and skill badges to LinkedIn profiles.
- Generate a shareable "Skill Resume" card (image/PDF) showcasing the user's completed skills—great for hiring visibility.

---

### 20. 📱 Native Android/iOS App (via Capacitor/Expo)
- Package the existing React web app as a native Android/iOS app using Capacitor (since it's already a Vite/React app).
- Enables native push notifications, better offline support, app store distribution, and a more polished mobile experience beyond WebView.

---

> **Priority Recommendation:**  
> Start with features that enhance retention and engagement: **#7 (Smart Reminders)**, **#8 (Spaced Repetition)**, **#3 (Achievement Badges)**, and **#16 (Notification Center)** before expanding the platform scope.
