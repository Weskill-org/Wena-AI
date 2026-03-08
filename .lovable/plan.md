

## App Improvement Recommendations

After reviewing the full codebase, here are the highest-impact improvements organized by category:

---

### 1. Onboarding Experience
**Problem**: New users land on a login screen with no context about what the app does or why they should sign up.
**Solution**: Add a 3-screen onboarding carousel (shown once before login) highlighting key features: AI Voice Tutor, Personalized Flashcards, Career Roles. Store a `hasSeenOnboarding` flag in localStorage.
- **File**: New `src/pages/Onboarding.tsx`, update `src/App.tsx` routing

### 2. Streaks & Gamification on Dashboard
**Problem**: The dashboard shows "Today's Progress" but lacks motivating gamification elements like streak tracking, XP display, and daily goals.
**Solution**: Add a streak flame counter, XP progress bar toward next level, and a daily goal checklist (e.g., "Complete 1 flashcard session", "Chat with AI buddy") directly on the Dashboard.
- **File**: Update `src/pages/Dashboard.tsx`, new `src/components/dashboard/DailyGoals.tsx`

### 3. Offline Support & Loading States
**Problem**: No offline handling. If the network drops, the app shows raw errors. Loading states are minimal (just a spinner).
**Solution**: Add skeleton loaders on Dashboard, Modules, and Profile pages. Show a toast/banner when offline. Cache critical data with react-query's `staleTime` and `gcTime` settings.
- **Files**: Update react-query config in `src/App.tsx`, add skeleton components per page

### 4. Push Notification Support (PWA)
**Problem**: No way to re-engage users with reminders for daily flashcards or streak maintenance.
**Solution**: Register a service worker, add a `manifest.json`, and implement web push notifications for daily reminders. This also enables "Add to Home Screen".
- **Files**: New `public/manifest.json`, `public/sw.js`, update `index.html`

### 5. Dark/Light Theme Toggle
**Problem**: The app is dark-only. Some users prefer light mode, especially in bright environments.
**Solution**: Leverage the already-installed `next-themes` package to add a theme toggle in Settings. Define light theme CSS variables alongside the existing dark ones.
- **Files**: Update `src/index.css` (add light theme variables), update `src/pages/Settings.tsx`, wrap app with `ThemeProvider`

### 6. Performance: Remove Unused 3D Dependencies
**Problem**: `@react-three/fiber`, `@react-three/drei`, and `@types/three` are still installed but no longer used (avatar was converted to 2D image). This adds ~500KB+ to the bundle.
**Solution**: Remove these packages from `package.json`.

### 7. Voice Mode UX Improvements
**Problem**: The role selection chips are small and hard to tap on mobile. No description of what each role does. Credit deduction happens silently.
**Solution**: Replace chips with a card-based role picker (icon + title + short description). Show a confirmation dialog before starting a session that explains credit cost. Add a session timer showing elapsed time and credits spent.
- **Files**: Update `src/components/ui/VoiceMode.tsx`, new `src/components/ui/RolePicker.tsx`

### 8. Search & Discovery on Dashboard
**Problem**: The dashboard has no global search. Users must navigate to Modules to find content.
**Solution**: Add a search bar at the top of the Dashboard that searches across modules, flashcards, and AI roles with quick-access results.
- **File**: Update `src/pages/Dashboard.tsx`, new `src/components/dashboard/GlobalSearch.tsx`

---

### Recommended Priority Order
1. Remove unused 3D packages (quick win, smaller bundle)
2. Onboarding carousel (first impression matters most)
3. Streaks & gamification on Dashboard (retention)
4. Voice Mode UX improvements (core feature polish)
5. Skeleton loaders & offline handling (perceived performance)
6. PWA support (re-engagement)
7. Light/dark theme toggle (accessibility)
8. Global search (discoverability)

