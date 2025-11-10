clear
kill -9 $(lsof -ti :8081) 2>/dev/null
npx expo start --clear
