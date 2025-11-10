# Implementation Example: State Management with Zustand

This example shows how to refactor the current architecture to use Zustand for state management.

## Before vs After Comparison

### BEFORE: Component-level State (Current)

```typescript
// RoundTrackerScreen.tsx - Current approach
const RoundTrackerScreen = () => {
  const [courseName, setCourseName] = useState('');
  const [currentHole, setCurrentHole] = useState(1);
  const [holes, setHoles] = useState<GolfHole[]>([]);
  const [isStarted, setIsStarted] = useState(false);
  const [roundId, setRoundId] = useState<string>('');
  const [activeRound, setActiveRound] = useState<GolfRound | null>(null);
  
  // Manually load data
  useEffect(() => {
    loadActiveRound();
  }, []);
  
  const loadActiveRound = async () => {
    const id = await DatabaseService.getPreference('active_round_id');
    if (id) {
      const round = await DatabaseService.getRound(id);
      setActiveRound(round);
      setHoles(round.holes);
      // ... more state updates
    }
  };
  
  // Update hole and save
  const updateHole = async (holeNumber: number, updates: Partial<GolfHole>) => {
    const newHoles = holes.map(hole =>
      hole.holeNumber === holeNumber ? { ...hole, ...updates } : hole
    );
    setHoles(newHoles);
    
    // Manual database save
    if (roundId) {
      await DatabaseService.saveHole(roundId, newHoles[holeNumber - 1]);
    }
  };
  
  // ... 800+ more lines
};
```

### AFTER: Zustand Store (Recommended)

#### Step 1: Install Zustand

```bash
cd GolfTracker
npm install zustand
```

#### Step 2: Create Round Store

**File:** `GolfTracker/src/stores/roundStore.ts`

```typescript
import create from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import DatabaseService from '../services/database';
import { GolfRound, GolfHole } from '../types';

interface RoundState {
  // State
  activeRound: GolfRound | null;
  rounds: GolfRound[];
  loading: boolean;
  error: string | null;
  
  // Actions
  loadActiveRound: () => Promise<void>;
  startNewRound: (courseName: string, tournamentId?: string) => Promise<string>;
  updateHole: (roundId: string, hole: GolfHole) => Promise<void>;
  finishRound: (roundId: string) => Promise<void>;
  deleteRound: (roundId: string) => Promise<void>;
  clearActiveRound: () => Promise<void>;
  loadAllRounds: () => Promise<void>;
}

export const useRoundStore = create<RoundState>()(
  devtools(
    (set, get) => ({
      // Initial state
      activeRound: null,
      rounds: [],
      loading: false,
      error: null,
      
      // Load active round from database
      loadActiveRound: async () => {
        set({ loading: true, error: null });
        
        try {
          const activeId = await DatabaseService.getPreference('active_round_id');
          if (!activeId) {
            set({ activeRound: null, loading: false });
            return;
          }
          
          const round = await DatabaseService.getRound(activeId);
          set({ activeRound: round, loading: false });
        } catch (error) {
          set({ 
            error: (error as Error).message, 
            loading: false,
            activeRound: null 
          });
        }
      },
      
      // Start a new round
      startNewRound: async (courseName: string, tournamentId?: string) => {
        set({ loading: true, error: null });
        
        try {
          const roundId = `round_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
          
          // Initialize holes
          const holes: GolfHole[] = Array.from({ length: 18 }, (_, i) => ({
            holeNumber: i + 1,
            par: [3, 4, 5][Math.floor(i / 6) % 3], // Simple par assignment
            strokes: 0,
          }));
          
          const newRound: GolfRound = {
            id: roundId,
            courseName,
            tournamentId,
            date: new Date(),
            holes,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          
          await DatabaseService.saveRound(newRound);
          await DatabaseService.setPreference('active_round_id', roundId);
          
          set({ activeRound: newRound, loading: false });
          
          return roundId;
        } catch (error) {
          set({ error: (error as Error).message, loading: false });
          throw error;
        }
      },
      
      // Update a hole (optimistic update + database save)
      updateHole: async (roundId: string, updatedHole: GolfHole) => {
        const { activeRound } = get();
        
        // Optimistic update
        if (activeRound?.id === roundId) {
          const updatedHoles = activeRound.holes.map(hole =>
            hole.holeNumber === updatedHole.holeNumber ? updatedHole : hole
          );
          
          set({
            activeRound: {
              ...activeRound,
              holes: updatedHoles,
              updatedAt: new Date(),
            },
          });
        }
        
        // Save to database
        try {
          await DatabaseService.saveHole(roundId, updatedHole);
        } catch (error) {
          // Rollback optimistic update on error
          set({ error: (error as Error).message });
          await get().loadActiveRound(); // Reload from database
        }
      },
      
      // Finish a round
      finishRound: async (roundId: string) => {
        set({ loading: true });
        
        try {
          const round = await DatabaseService.getRound(roundId);
          if (!round) throw new Error('Round not found');
          
          const finishedRound: GolfRound = {
            ...round,
            isFinished: true,
            updatedAt: new Date(),
          };
          
          await DatabaseService.saveRound(finishedRound);
          await DatabaseService.setPreference('active_round_id', '');
          
          set({ activeRound: null, loading: false });
        } catch (error) {
          set({ error: (error as Error).message, loading: false });
          throw error;
        }
      },
      
      // Delete a round
      deleteRound: async (roundId: string) => {
        set({ loading: true });
        
        try {
          await DatabaseService.deleteRound(roundId);
          
          const { activeRound, rounds } = get();
          
          // Update state
          set({
            activeRound: activeRound?.id === roundId ? null : activeRound,
            rounds: rounds.filter(r => r.id !== roundId),
            loading: false,
          });
          
          // Clear active round if it was deleted
          if (activeRound?.id === roundId) {
            await DatabaseService.setPreference('active_round_id', '');
          }
        } catch (error) {
          set({ error: (error as Error).message, loading: false });
          throw error;
        }
      },
      
      // Clear active round
      clearActiveRound: async () => {
        await DatabaseService.setPreference('active_round_id', '');
        set({ activeRound: null });
      },
      
      // Load all rounds
      loadAllRounds: async () => {
        set({ loading: true, error: null });
        
        try {
          const rounds = await DatabaseService.getRounds();
          set({ rounds, loading: false });
        } catch (error) {
          set({ error: (error as Error).message, loading: false });
        }
      },
    }),
    { name: 'RoundStore' }
  )
);
```

#### Step 3: Refactored Component

**File:** `GolfTracker/src/screens/RoundTrackerScreen.tsx` (simplified)

```typescript
import React, { useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useRoundStore } from '../stores/roundStore';
import { HoleGrid } from '../components/round/HoleGrid';
import { RoundHeader } from '../components/round/RoundHeader';
import { LoadingScreen } from '../components/common/LoadingScreen';
import { NoRoundScreen } from '../components/round/NoRoundScreen';

const RoundTrackerScreen = () => {
  const { 
    activeRound, 
    loading, 
    loadActiveRound, 
    updateHole,
    finishRound 
  } = useRoundStore();
  
  useEffect(() => {
    loadActiveRound();
  }, [loadActiveRound]);
  
  if (loading) return <LoadingScreen />;
  if (!activeRound) return <NoRoundScreen />;
  
  const handleHoleUpdate = (holeNumber: number, strokes: number) => {
    const hole = activeRound.holes.find(h => h.holeNumber === holeNumber);
    if (!hole) return;
    
    updateHole(activeRound.id, { ...hole, strokes });
  };
  
  const handleFinish = () => {
    finishRound(activeRound.id);
  };
  
  return (
    <View style={styles.container}>
      <RoundHeader round={activeRound} />
      
      <ScrollView>
        <HoleGrid 
          holes={activeRound.holes} 
          onHolePress={(hole) => {
            // Navigate to hole details
          }}
        />
      </ScrollView>
      
      <TouchableOpacity style={styles.finishButton} onPress={handleFinish}>
        <Text style={styles.finishButtonText}>Finish Round</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  finishButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    alignItems: 'center',
  },
  finishButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});

export default RoundTrackerScreen;
```

#### Step 4: Extract Components

**File:** `GolfTracker/src/components/round/HoleGrid.tsx`

```typescript
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { GolfHole } from '../../types';
import { HoleCard } from './HoleCard';

interface HoleGridProps {
  holes: GolfHole[];
  onHolePress: (hole: GolfHole) => void;
}

export const HoleGrid: React.FC<HoleGridProps> = ({ holes, onHolePress }) => {
  return (
    <View style={styles.grid}>
      {holes.map(hole => (
        <HoleCard 
          key={hole.holeNumber} 
          hole={hole} 
          onPress={() => onHolePress(hole)} 
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    gap: 10,
  },
});
```

**File:** `GolfTracker/src/components/round/HoleCard.tsx`

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { GolfHole } from '../../types';

interface HoleCardProps {
  hole: GolfHole;
  onPress: () => void;
}

export const HoleCard: React.FC<HoleCardProps> = React.memo(({ hole, onPress }) => {
  const score = hole.strokes - hole.par;
  const getScoreColor = () => {
    if (hole.strokes === 0) return '#ccc';
    if (score <= -2) return '#FFD700'; // Eagle
    if (score === -1) return '#FF0000'; // Birdie
    if (score === 0) return '#333';     // Par
    return '#000';                       // Bogey+
  };
  
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Text style={styles.holeNumber}>{hole.holeNumber}</Text>
      <View style={[styles.scoreCircle, { borderColor: getScoreColor() }]}>
        <Text style={styles.score}>
          {hole.strokes || '-'}
        </Text>
      </View>
      <Text style={styles.par}>Par {hole.par}</Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    width: '22%',
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  holeNumber: { fontSize: 12, color: '#666', marginBottom: 5 },
  scoreCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  score: { fontSize: 16, fontWeight: 'bold' },
  par: { fontSize: 11, color: '#999' },
});
```

## Benefits of This Approach

### 1. Separation of Concerns
- ✅ **Store:** Business logic and data management
- ✅ **Components:** Pure UI presentation
- ✅ **Hooks:** Reusable logic

### 2. Performance
- ✅ **Optimistic Updates:** UI responds immediately
- ✅ **Memoization:** React.memo prevents unnecessary re-renders
- ✅ **Selective Re-renders:** Only components using changed state re-render

### 3. Maintainability
- ✅ **Single Source of Truth:** State lives in one place
- ✅ **Testable:** Easy to test store actions independently
- ✅ **Debuggable:** Zustand DevTools show all state changes

### 4. Developer Experience
- ✅ **Type Safety:** Full TypeScript support
- ✅ **Less Boilerplate:** No need for context providers
- ✅ **Simple API:** Just import and use the hook

## Testing Example

```typescript
// __tests__/stores/roundStore.test.ts
import { act, renderHook } from '@testing-library/react-hooks';
import { useRoundStore } from '../../stores/roundStore';
import DatabaseService from '../../services/database';

jest.mock('../../services/database');

describe('roundStore', () => {
  beforeEach(() => {
    // Reset store state
    useRoundStore.setState({ activeRound: null, rounds: [], loading: false });
  });
  
  it('should start a new round', async () => {
    const { result } = renderHook(() => useRoundStore());
    
    await act(async () => {
      await result.current.startNewRound('Test Course');
    });
    
    expect(result.current.activeRound).toBeDefined();
    expect(result.current.activeRound?.courseName).toBe('Test Course');
    expect(result.current.activeRound?.holes).toHaveLength(18);
  });
  
  it('should update hole optimistically', async () => {
    const { result } = renderHook(() => useRoundStore());
    
    // Setup: Start a round
    await act(async () => {
      await result.current.startNewRound('Test Course');
    });
    
    const roundId = result.current.activeRound!.id;
    const updatedHole = { ...result.current.activeRound!.holes[0], strokes: 4 };
    
    // Act: Update hole
    await act(async () => {
      await result.current.updateHole(roundId, updatedHole);
    });
    
    // Assert: Hole was updated
    expect(result.current.activeRound?.holes[0].strokes).toBe(4);
    expect(DatabaseService.saveHole).toHaveBeenCalledWith(roundId, updatedHole);
  });
});
```

## Migration Strategy

### Phase 1: Add Store (Week 1)
1. Install Zustand
2. Create roundStore.ts
3. Don't change components yet

### Phase 2: Migrate One Screen (Week 1)
1. Refactor RoundTrackerScreen to use store
2. Test thoroughly
3. Deploy and monitor

### Phase 3: Migrate Remaining Screens (Week 2-3)
1. HomeScreen
2. TournamentsScreen
3. StatsScreen
4. Remove old state management code

### Phase 4: Add Advanced Features (Week 4)
1. Add persistence (round state survives app restart)
2. Add undo/redo capability
3. Add optimistic UI updates for all operations

## Next Steps

1. Review this example
2. Test Zustand in a small isolated component first
3. Gradually migrate more complex components
4. Add tests as you go

This pattern will significantly improve the maintainability and performance of your app!

