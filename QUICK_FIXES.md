# Quick Fixes - Immediate Actions

These are simple fixes you can implement right now that will have immediate positive impact.

## 1. Fix AI Model Configuration (5 minutes)

**File:** `GolfTracker/src/services/ai.ts`

**Problem:** Line 56 and 184 use 'gpt-5' which doesn't exist

**Fix:**
```typescript
// BEFORE (lines 56 and 184)
model: (Config.OPENAI_MODEL || 'gpt-5') as any,

// AFTER
model: (Config.OPENAI_MODEL || 'gpt-4-turbo') as 'gpt-4-turbo' | 'gpt-4o' | 'gpt-3.5-turbo',
```

## 2. Create Environment Variables Template (10 minutes)

**File:** `GolfTracker/.env.example`

**Create this file:**
```bash
# OpenAI Configuration
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4-turbo

# App Configuration
APP_ENV=development
```

## 3. Add TypeScript Strict Mode (15 minutes)

**File:** `GolfTracker/tsconfig.json`

**Update:**
```json
{
  "extends": "@react-native/typescript-config/tsconfig.json",
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true
  }
}
```

## 4. Add ESLint Rules (30 minutes)

**File:** `GolfTracker/.eslintrc.js`

**Add these rules:**
```javascript
module.exports = {
  root: true,
  extends: '@react-native',
  rules: {
    // Prevent any types
    '@typescript-eslint/no-explicit-any': 'error',
    
    // Prevent unused variables
    '@typescript-eslint/no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_' 
    }],
    
    // Require return types on functions
    '@typescript-eslint/explicit-function-return-type': ['warn', {
      allowExpressions: true,
      allowTypedFunctionExpressions: true,
    }],
    
    // Prevent console.log
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    
    // Enforce consistent component structure
    'react/jsx-no-bind': 'warn',
    'react-hooks/exhaustive-deps': 'warn',
    
    // Code quality
    'max-lines': ['warn', { max: 300, skipBlankLines: true, skipComments: true }],
    'complexity': ['warn', 15],
  }
};
```

## 5. Add Pre-commit Hooks (30 minutes)

**Install dependencies:**
```bash
cd GolfTracker
npm install --save-dev husky lint-staged prettier
```

**File:** `GolfTracker/.prettierrc.js`
```javascript
module.exports = {
  semi: true,
  trailingComma: 'es5',
  singleQuote: true,
  printWidth: 100,
  tabWidth: 2,
};
```

**File:** `GolfTracker/.lintstagedrc.js`
```javascript
module.exports = {
  '*.{ts,tsx}': [
    'eslint --fix',
    'prettier --write',
  ],
  '*.{json,md}': [
    'prettier --write',
  ],
};
```

**Setup husky:**
```bash
cd GolfTracker
npx husky install
npx husky add .husky/pre-commit "cd GolfTracker && npx lint-staged"
```

## 6. Remove Debug Console.logs (30 minutes - automated)

**Create a script:** `GolfTracker/scripts/remove-console-logs.sh`

```bash
#!/bin/bash

# Remove console.log, console.debug statements but keep console.error and console.warn
find src -type f -name "*.ts" -o -name "*.tsx" | while read file; do
  # Comment out console.log and console.debug
  sed -i.bak 's/^\(\s*\)console\.log(/\1\/\/ console.log(/g' "$file"
  sed -i.bak 's/^\(\s*\)console\.debug(/\1\/\/ console.debug(/g' "$file"
  rm "$file.bak"
done

echo "Console logs removed. Review changes with 'git diff'"
```

**Run it:**
```bash
cd GolfTracker
chmod +x scripts/remove-console-logs.sh
./scripts/remove-console-logs.sh
```

**Or manually:** Replace console.log with a proper logger:

```typescript
// utils/logger.ts
export const logger = {
  debug: (__DEV__ ? console.log : () => {}),
  info: (__DEV__ ? console.info : () => {}),
  warn: console.warn,
  error: console.error,
};

// Then replace throughout codebase:
// BEFORE
console.log('Loading round:', roundId);

// AFTER
logger.debug('Loading round:', roundId);
```

## 7. Fix Navigation Type Safety (1 hour)

**File:** `GolfTracker/src/types/navigation.ts` (create new file)

```typescript
import { GolfRound, GolfHole, Tournament } from './index';

export type RootStackParamList = {
  Home: undefined;
  Scoring: undefined;
  Tournaments: undefined;
  Stats: undefined;
  Settings: undefined;
};

export type ScoringStackParamList = {
  RoundTracker: {
    roundId?: string;
    tournamentId?: string;
    tournamentName?: string;
    quickStart?: boolean;
  };
  HoleDetails: {
    hole: GolfHole;
    roundId: string;
  };
  ShotTracking: {
    hole: GolfHole;
    roundId: string;
    roundName?: string;
    tournamentName?: string;
    preselectedShotType?: string;
    onSave: (hole: GolfHole) => Promise<void>;
  };
  HoleSummary: {
    hole: GolfHole;
    roundId: string;
  };
  RoundSummary: {
    roundId: string;
  };
  Camera: {
    roundId: string;
    holeNumber?: number;
  };
};

export type TournamentStackParamList = {
  TournamentsList: undefined;
  TournamentRounds: {
    tournament: Tournament;
  };
  RoundSummary: {
    roundId: string;
  };
};

export type SettingsStackParamList = {
  SettingsList: undefined;
  DatabaseDiagnostic: undefined;
};
```

**Update components to use types:**

```typescript
// BEFORE
const navigation = useNavigation();
navigation.navigate('RoundSummary' as never, { roundId: round.id } as never);

// AFTER
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScoringStackParamList } from '../types/navigation';

type RoundTrackerNavigationProp = NativeStackNavigationProp<
  ScoringStackParamList,
  'RoundTracker'
>;

const navigation = useNavigation<RoundTrackerNavigationProp>();
navigation.navigate('RoundSummary', { roundId: round.id });
```

## 8. Add Error Boundary (1 hour)

**File:** `GolfTracker/src/components/ErrorBoundary.tsx`

```typescript
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Error caught by boundary:', error, errorInfo);
    // TODO: Send to error tracking service (Sentry, etc.)
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <Text style={styles.title}>Oops! Something went wrong</Text>
          <Text style={styles.message}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => this.setState({ hasError: false, error: undefined })}
          >
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

**Use in App.tsx:**
```typescript
import { ErrorBoundary } from './src/components/ErrorBoundary';

const App = () => {
  return (
    <ErrorBoundary>
      {/* Your app content */}
      <AppNavigator />
    </ErrorBoundary>
  );
};
```

## 9. Add Loading & Error States Hook (1 hour)

**File:** `GolfTracker/src/hooks/useAsync.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export const useAsync = <T,>(
  asyncFunction: () => Promise<T>,
  dependencies: any[] = []
) => {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const execute = useCallback(async () => {
    setState({ data: null, loading: true, error: null });
    
    try {
      const data = await asyncFunction();
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({ data: null, loading: false, error: error as Error });
    }
  }, dependencies);

  useEffect(() => {
    execute();
  }, [execute]);

  return { ...state, refetch: execute };
};

// Usage example:
const RoundsList = () => {
  const { data: rounds, loading, error, refetch } = useAsync(
    () => DatabaseService.getRounds(),
    []
  );

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} onRetry={refetch} />;
  
  return <RoundList rounds={rounds} />;
};
```

## 10. Checklist Summary

Run through this checklist to ensure all quick fixes are applied:

- [ ] Fixed AI model from 'gpt-5' to 'gpt-4-turbo'
- [ ] Created .env.example file
- [ ] Enabled TypeScript strict mode
- [ ] Added ESLint rules for code quality
- [ ] Setup Husky pre-commit hooks
- [ ] Replaced console.log with logger utility
- [ ] Added navigation type definitions
- [ ] Implemented ErrorBoundary component
- [ ] Created useAsync hook for consistent loading states
- [ ] Committed all changes and pushed to repository

## Estimated Total Time: 4-5 hours

These quick fixes will immediately improve:
- ✅ Code quality
- ✅ Type safety
- ✅ Error handling
- ✅ Development experience
- ✅ Maintainability

After completing these, you're ready to tackle the larger architectural improvements!

