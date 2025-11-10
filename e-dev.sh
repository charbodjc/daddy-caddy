kill -9 $(lsof -ti :3000) 2>/dev/null || true
npm run dev
