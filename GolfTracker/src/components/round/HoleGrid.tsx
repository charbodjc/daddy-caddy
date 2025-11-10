import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { HoleCard } from './HoleCard';
import Hole from '../../database/watermelon/models/Hole';

interface HoleGridProps {
  holes: Hole[];
  onHolePress: (hole: Hole) => void;
  activeHoleNumber?: number;
}

export const HoleGrid: React.FC<HoleGridProps> = React.memo(({
  holes,
  onHolePress,
  activeHoleNumber,
}) => {
  const renderHole = ({ item }: { item: Hole }) => (
    <HoleCard
      holeNumber={item.holeNumber}
      par={item.par}
      strokes={item.strokes}
      onPress={() => onHolePress(item)}
      isActive={item.holeNumber === activeHoleNumber}
    />
  );
  
  return (
    <View style={styles.container}>
      <FlatList
        data={holes}
        renderItem={renderHole}
        keyExtractor={(item) => `hole-${item.holeNumber}`}
        numColumns={4}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
});

HoleGrid.displayName = 'HoleGrid';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 15,
  },
  row: {
    justifyContent: 'space-between',
  },
});

