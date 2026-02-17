import { create } from 'zustand';
import { socket, connectSocket, emitWithCallback } from '../services/socket';

export const GAME_PHASES = {
  WAITING: 'waiting',
  ROLE_REVEAL: 'role_reveal',
  THEME_REVEAL: 'theme_reveal',
  WORD_REVEAL: 'word_reveal',
  CLUE_SUBMISSION: 'clue_submission',
  DISCUSSION: 'discussion',
  VOTING: 'voting',
  VOTE_RESULTS: 'vote_results',
  GAME_OVER: 'game_over'
};

export const useGameStore = create((set, get) => ({
  // Player state
  player: null,
  
  // Lobby state
  lobby: null,
  lobbies: [],
  
  // Game state
  gameState: null,
  voteResults: null,
  timer: null,
  timerEndTime: null,
  
  // UI state
  isLoading: false,
  error: null,

  // Actions
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
  
  // Join as player
  joinAsPlayer: async (name, isGuest = true, profilePicIndex = 0) => {
    set({ isLoading: true, error: null });
    try {
      connectSocket();
      const response = await emitWithCallback('player:join', { name, isGuest, profilePicIndex });
      set({ player: response.player, isLoading: false });
      get().setupSocketListeners();
      return response;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Create lobby
  createLobby: async (name, maxPlayers, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await emitWithCallback('lobby:create', { name, maxPlayers, password });
      set({ lobby: response.lobby, isLoading: false });
      return response;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Join lobby
  joinLobby: async (lobbyId, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await emitWithCallback('lobby:join', { lobbyId, password });
      set({ lobby: response.lobby, isLoading: false });
      return response;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Join lobby by code
  joinLobbyByCode: async (code, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await emitWithCallback('lobby:joinByCode', { code, password });
      set({ lobby: response.lobby, isLoading: false });
      return response;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Leave lobby
  leaveLobby: async () => {
    try {
      await emitWithCallback('lobby:leave', {});
      set({ lobby: null, gameState: null });
    } catch (error) {
      set({ error: error.message });
    }
  },

  // Get lobbies
  fetchLobbies: async () => {
    try {
      const response = await emitWithCallback('lobbies:list', {});
      set({ lobbies: response.lobbies });
    } catch (error) {
      set({ error: error.message });
    }
  },

  // Start game
  startGame: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await emitWithCallback('game:start', {});
      set({ isLoading: false });
      return response;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Add bot (dev mode only)
  addBot: async () => {
    try {
      const response = await emitWithCallback('lobby:addBot', {});
      return response;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // Submit clue
  submitClue: async (clue) => {
    try {
      const response = await emitWithCallback('game:submitClue', { clue });
      return response;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // Submit vote
  submitVote: async (votedForId) => {
    try {
      const response = await emitWithCallback('game:submitVote', { votedForId });
      return response;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // Skip discussion
  skipDiscussion: () => {
    socket.emit('game:skipDiscussion');
  },

  // Start new round
  startNewRound: () => {
    socket.emit('game:newRound');
  },

  // Return to lobby
  returnToLobby: () => {
    socket.emit('game:returnToLobby');
  },

  // Setup socket listeners
  setupSocketListeners: () => {
    // Lobby events
    socket.on('lobby:playerJoined', (lobby) => {
      set({ lobby });
    });

    socket.on('lobby:playerLeft', (lobby) => {
      set({ lobby });
    });

    // Game events
    socket.on('game:started', ({ phase }) => {
      set((state) => ({
        gameState: { ...state.gameState, phase }
      }));
    });

    socket.on('game:state', (gameState) => {
      set({ gameState });
    });

    socket.on('game:phaseChanged', ({ phase, voteResults }) => {
      set((state) => ({
        gameState: state.gameState ? { ...state.gameState, phase } : null,
        voteResults: voteResults || state.voteResults
      }));
    });

    socket.on('game:clueSubmitted', ({ clues, currentPlayerIndex, currentPlayerId }) => {
      set((state) => ({
        gameState: state.gameState ? {
          ...state.gameState,
          clues,
          currentPlayerIndex,
          currentPlayerId
        } : null
      }));
    });

    socket.on('game:voteSubmitted', ({ playersVoted }) => {
      set((state) => {
        if (!state.gameState) return state;
        return {
          gameState: {
            ...state.gameState,
            players: state.gameState.players.map(p => ({
              ...p,
              hasVoted: playersVoted.includes(p.id)
            }))
          }
        };
      });
    });

    socket.on('game:timerStarted', ({ phase, duration, endTime }) => {
      set({ timerEndTime: endTime });
    });

    socket.on('game:ended', ({ lobby }) => {
      set({ lobby, gameState: null, voteResults: null });
    });
  },

  // Reset state
  reset: () => {
    set({
      player: null,
      lobby: null,
      lobbies: [],
      gameState: null,
      voteResults: null,
      timer: null,
      timerEndTime: null,
      isLoading: false,
      error: null
    });
  }
}));
