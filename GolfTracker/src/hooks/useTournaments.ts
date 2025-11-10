import { useEffect } from 'react';
import { useTournamentStore } from '../stores/tournamentStore';

export const useTournaments = () => {
  const { tournaments, loading, error, loadTournaments } = useTournamentStore();
  
  useEffect(() => {
    loadTournaments();
  }, [loadTournaments]);
  
  return { 
    tournaments, 
    loading, 
    error,
    reload: loadTournaments,
  };
};

export const useTournament = (tournamentId: string) => {
  const { selectedTournament, selectTournament, getTournamentRounds } = useTournamentStore();
  
  useEffect(() => {
    if (tournamentId) {
      selectTournament(tournamentId);
    }
  }, [tournamentId, selectTournament]);
  
  return {
    tournament: selectedTournament,
    getRounds: () => getTournamentRounds(tournamentId),
  };
};

