# Fichiers à déployer dans bud.computer

## REMPLACER ces fichiers (ils existent déjà)
src/App.jsx
src/pages/Dashboard.jsx
src/pages/Login.jsx
src/pages/GetStarted.jsx

## CRÉER ces fichiers (nouveaux)
src/lib/supabase.js          → crée dossier "lib" dans src/
src/lib/stripe.js
src/contexts/AuthContext.jsx → crée dossier "contexts" dans src/
src/hooks/useData.js         → crée dossier "hooks" dans src/
src/pages/AcceptInvite.jsx
src/components/ProtectedRoute.jsx
src/components/Onboarding.jsx

## Terminal ensuite
npm install @supabase/supabase-js @stripe/stripe-js
