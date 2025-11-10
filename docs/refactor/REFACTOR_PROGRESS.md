# Daddy Caddy Refactor - Progress & Continuation Guide

## ✅ Completed Phases

### Phase 0: Setup & Infrastructure (COMPLETE)
- ✅ Created feature branch `refactor/modern-architecture`
- ✅ Installed core dependencies:
  - @nozbe/watermelondb, @nozbe/with-observables
  - zustand, immer
  - react-hook-form, zod
  - date-fns
  - Testing libraries
- ✅ Fixed AI model configuration (gpt-5 → gpt-4-turbo)
- ✅ Updated metro.config.js for Watermelon DB decorators
- ✅ Updated babel.config.js for decorator support
- ✅ Configured jest for Watermelon DB
- ✅ Created test setup infrastructure

### Phase 1: Watermelon DB Setup (COMPLETE)
- ✅ Created database schema (`src/database/watermelon/schema.ts`)
- ✅ Created all models:
  - Round.ts
  - Hole.ts
  - Tournament.ts
  - Media.ts
  - Contact.ts
- ✅ Created database initialization (`database.ts`)
- ✅ Wrote comprehensive tests:
  - Round.test.ts (7 test cases)
  - Hole.test.ts (8 test cases)
- ✅ Created test helpers (`__tests__/utils/testHelpers.ts`)

### Phase 2: State Management (IN PROGRESS)
- ✅ Created roundStore with Zustand
  - Full CRUD operations
  - Optimistic updates
  - AsyncStorage integration for active round
  - Comprehensive error handling

### Phase 3: Service Layer (STARTED)
- ✅ Created error handling utilities (`src/utils/errors.ts`)
  - AppError class
  - Error codes enum
  - Centralized error handling
  - Helper functions for specific error types
- ✅ Created validation layer (`src/validators/roundValidator.ts`)
  - Zod schemas for holes and rounds
  - Validation functions
  - Safe validation with error messages

---

## 📁 File Structure Created

```
GolfTracker/
├── src/
│   ├── database/
│   │   └── watermelon/
│   │       ├── schema.ts          ✅ Complete
│   │       ├── database.ts        ✅ Complete
│   │       └── models/
│   │           ├── Round.ts       ✅ Complete
│   │           ├── Hole.ts        ✅ Complete
│   │           ├── Tournament.ts  ✅ Complete
│   │           ├── Media.ts       ✅ Complete
│   │           └── Contact.ts     ✅ Complete
│   ├── stores/
│   │   └── roundStore.ts          ✅ Complete
│   ├── utils/
│   │   └── errors.ts              ✅ Complete
│   └── validators/
│       └── roundValidator.ts      ✅ Complete
└── __tests__/
    ├── setup.ts                   ✅ Complete
    ├── database/
    │   ├── Round.test.ts          ✅ Complete
    │   └── Hole.test.ts           ✅ Complete
    └── utils/
        └── testHelpers.ts         ✅ Complete
```

---

## 🔧 How to Use What's Been Built

### Using Watermelon DB Models

```typescript
import { database } from './src/database/watermelon/database';
import Round from './src/database/watermelon/models/Round';

// Create a round
const round = await database.write(async () => {
  return await database.collections.get<Round>('rounds').create((r) => {
    r.courseName = 'Pebble Beach';
    r.date = new Date();
    r.isFinished = false;
  });
});

// Query rounds
const rounds = await database.collections
  .get<Round>('rounds')
  .query(Q.sortBy('date', Q.desc))
  .fetch();

// Observe changes (reactive)
const subscription = round.holesArray.subscribe((holes) => {
  console.log('Holes updated:', holes.length);
});
```

### Using the Round Store

```typescript
import { useRoundStore } from './src/stores/roundStore';

function MyComponent() {
  const { 
    activeRound, 
    loading, 
    createRound, 
    updateHole 
  } = useRoundStore();
  
  const handleStartRound = async () => {
    await createRound({
      courseName: 'Test Course',
      date: new Date(),
    });
  };
  
  const handleUpdateHole = async () => {
    if (activeRound) {
      await updateHole(activeRound.id, {
        holeNumber: 1,
        par: 4,
        strokes: 5,
        putts: 2,
      });
    }
  };
  
  if (loading) return <LoadingSpinner />;
  
  return <View>{/* Your UI */}</View>;
}
```

### Using Error Handling

```typescript
import { handleError, createDatabaseError } from './src/utils/errors';

try {
  await someOperation();
} catch (error) {
  handleError(error, 'MyComponent.someOperation');
}

// Or throw specific errors
throw createDatabaseError(
  'Failed to save round',
  'Could not save your golf round. Please try again.',
  error
);
```

### Using Validation

```typescript
import { validateCreateRound, safeValidateHole } from './src/validators/roundValidator';

// Strict validation (throws on error)
const validData = validateCreateRound({
  courseName: 'Test Course',
  date: new Date(),
});

// Safe validation (returns result object)
const result = safeValidateHole({
  holeNumber: 1,
  par: 4,
  strokes: 5,
});

if (result.success) {
  console.log('Valid:', result.data);
} else {
  console.error('Invalid:', result.error);
}
```

---

## 🚀 Next Steps to Complete the Refactor

### Immediate Next Tasks

#### 1. Complete Remaining Stores (2-3 days)

**Create: `src/stores/tournamentStore.ts`**
```typescript
import { create } from 'zustand';
import Tournament from '../database/watermelon/models/Tournament';

interface TournamentState {
  tournaments: Tournament[];
  loading: boolean;
  error: Error | null;
  
  loadTournaments: () => Promise<void>;
  createTournament: (data: CreateTournamentData) => Promise<Tournament>;
  deleteTournament: (id: string) => Promise<void>;
}

export const useTournamentStore = create<TournamentState>()((set) => ({
  // Implementation similar to roundStore
}));
```

**Create: `src/stores/statsStore.ts`**
```typescript
// Store for calculating and caching statistics
```

**Create: `src/stores/mediaStore.ts`**
```typescript
// Store for managing media items
```

#### 2. Create Custom Hooks (1-2 days)

**Create: `src/hooks/useRound.ts`**
```typescript
import { useEffect } from 'react';
import { useRoundStore } from '../stores/roundStore';

export const useRound = (roundId?: string) => {
  const { activeRound, loading, error, loadActiveRound } = useRoundStore();
  
  useEffect(() => {
    loadActiveRound();
  }, [roundId]);
  
  return { round: activeRound, loading, error };
};
```

Similar hooks needed:
- `useHoleInput.ts`
- `useTournaments.ts`
- `useStats.ts`
- `useAsync.ts`

#### 3. Create Reusable Components (2-3 days)

**Pattern for all components:**
```typescript
// src/components/common/Button.tsx
import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = React.memo(({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'danger' && styles.danger,
        disabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.text}>{title}</Text>
      )}
    </TouchableOpacity>
  );
});
```

Components to create:
- `common/LoadingScreen.tsx`
- `common/ErrorScreen.tsx`
- `common/ErrorBoundary.tsx`
- `common/Card.tsx`
- `round/HoleCard.tsx` (use React.memo!)
- `round/HoleGrid.tsx`
- `round/RoundHeader.tsx`
- `tournament/TournamentCard.tsx`

#### 4. Rewrite Screens One by One (5-7 days)

**Example Pattern: RoundTrackerScreen.tsx**
```typescript
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRound } from '../hooks/useRound';
import { useRoundStore } from '../stores/roundStore';
import { HoleGrid } from '../components/round/HoleGrid';
import { RoundHeader } from '../components/round/RoundHeader';
import { LoadingScreen } from '../components/common/LoadingScreen';
import { ErrorScreen } from '../components/common/ErrorScreen';

const RoundTrackerScreen: React.FC = () => {
  const { round, loading, error } = useRound();
  const { updateHole } = useRoundStore();
  
  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen error={error} />;
  if (!round) return <NoRoundScreen />;
  
  return (
    <View style={styles.container}>
      <RoundHeader round={round} />
      <HoleGrid 
        holes={round.holes} 
        onHolePress={(hole) => {
          // Navigate to hole details
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
});

export default RoundTrackerScreen;
```

Screens to rewrite:
1. HomeScreen.tsx (simpler, start here)
2. RoundTrackerScreen.tsx
3. HoleDetailsScreen.tsx
4. ShotTrackingScreen.tsx
5. TournamentsScreen.tsx
6. TournamentRoundsScreen.tsx
7. StatsScreen.tsx
8. SettingsScreen.tsx
9. RoundSummaryScreen.tsx

#### 5. Data Migration Utilities (1-2 days)

**Create: `src/utils/migration/exportData.ts`**
```typescript
import DatabaseService from '../../services/database'; // Old database
import RNFS from 'react-native-fs';

export const exportLegacyData = async (): Promise<string> => {
  const rounds = await DatabaseService.getRounds();
  const tournaments = await DatabaseService.getTournaments();
  const contacts = await DatabaseService.getContacts();
  
  const exportData = {
    version: 1,
    exportDate: new Date().toISOString(),
    rounds,
    tournaments,
    contacts,
  };
  
  const filePath = `${RNFS.DocumentDirectoryPath}/daddy-caddy-export.json`;
  await RNFS.writeFile(filePath, JSON.stringify(exportData, null, 2), 'utf8');
  
  return filePath;
};
```

**Create: `src/utils/migration/importData.ts`**
```typescript
import { database } from '../../database/watermelon/database';
import RNFS from 'react-native-fs';

export const importLegacyData = async (filePath: string): Promise<void> => {
  const content = await RNFS.readFile(filePath, 'utf8');
  const data = JSON.parse(content);
  
  await database.write(async () => {
    // Batch import all data
    for (const roundData of data.rounds) {
      // Create round and holes
    }
  });
};
```

---

## 🧪 Testing Pattern

For every new file, create a corresponding test:

```typescript
// src/stores/__tests__/roundStore.test.ts
import { useRoundStore } from '../roundStore';
import { renderHook, act, waitFor } from '@testing-library/react-hooks';

describe('roundStore', () => {
  beforeEach(() => {
    // Reset store
    useRoundStore.setState({ 
      activeRound: null, 
      rounds: [], 
      loading: false, 
      error: null 
    });
  });
  
  it('should create a new round', async () => {
    const { result } = renderHook(() => useRoundStore());
    
    await act(async () => {
      await result.current.createRound({
        courseName: 'Test Course',
      });
    });
    
    await waitFor(() => {
      expect(result.current.activeRound).toBeDefined();
      expect(result.current.activeRound?.courseName).toBe('Test Course');
    });
  });
});
```

---

## 📊 Progress Tracking

### Completed: ~30%
- ✅ Infrastructure setup
- ✅ Database layer
- ✅ Core state management
- ✅ Error handling
- ✅ Validation

### Remaining: ~70%
- ⏳ Additional stores (3 more)
- ⏳ Custom hooks (5 hooks)
- ⏳ Reusable components (15+ components)
- ⏳ Screen refactoring (9 screens)
- ⏳ Migration utilities
- ⏳ Integration tests
- ⏳ E2E tests
- ⏳ Documentation
- ⏳ Performance optimization

---

## 🎯 Key Principles to Follow

1. **Test-First**: Write tests before implementation
2. **Small Components**: Keep components under 200 lines
3. **Use React.memo**: Memoize components that don't need frequent re-renders
4. **Validate Data**: Use Zod schemas before database operations
5. **Handle Errors**: Use centralized error handling
6. **Type Safety**: Leverage TypeScript, avoid `any`
7. **Reactive Data**: Use Watermelon DB observables for reactive updates
8. **Immutable Updates**: Use Zustand's immer middleware

---

## 🚨 Important Notes

### Don't Delete Yet
Keep these files until all screens are migrated:
- `src/services/database.ts` (old database)
- `src/utils/RoundDeletionManager.ts`
- `src/utils/roundManager.ts`

### Migration Strategy
1. Build all new infrastructure first (almost done!)
2. Create migration utilities
3. Test migration with sample data
4. Migrate screens one at a time
5. Keep old code running alongside new code
6. Once all screens migrated, remove old code
7. Test thoroughly before deployment

---

## 🔗 Helpful Commands

```bash
# Run tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- Round.test.ts

# Check TypeScript errors
npx tsc --noEmit

# Run linter
npm run lint
```

---

## 📚 Resources

- [Watermelon DB Docs](https://watermelondb.dev/)
- [Zustand Docs](https://docs.pmnd.rs/zustand)
- [Zod Docs](https://zod.dev/)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)

---

**Last Updated:** Phase 2 (Stores) - November 10, 2025

**Estimated Completion:** Following the 25-day plan, approximately 18 more days of work remaining.

**Next Person Should Start With:** 
1. Complete tournamentStore.ts
2. Create useRound.ts hook
3. Create Button.tsx component
4. Rewrite HomeScreen.tsx as first screen

**Questions?** Refer to this document and the code examples provided. Each completed piece serves as a template for the remaining work.

