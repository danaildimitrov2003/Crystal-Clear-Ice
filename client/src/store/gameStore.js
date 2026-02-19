import { create } from 'zustand';
import { socket, connectSocket, emitWithCallback } from '../services/socket';

const DEFAULT_EFFECTS_VOLUME = 0.8;

const readStoredEffectsVolume = () => {
  try {
    const raw = localStorage.getItem('effectsVolume');
    if (raw === null) return DEFAULT_EFFECTS_VOLUME;
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) return DEFAULT_EFFECTS_VOLUME;
    return Math.min(1, Math.max(0, parsed));
  } catch {
    return DEFAULT_EFFECTS_VOLUME;
  }
};

export const GAME_PHASES = {
  WAITING: 'waiting',
  ROLE_REVEAL: 'role_reveal',
  THEME_REVEAL: 'theme_reveal',
  WORD_REVEAL: 'word_reveal',
  CLUE_SUBMISSION: 'clue_submission',
  DISCUSSION: 'discussion',
  ACTION_CHOICE: 'action_choice',
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
  serverConfig: {
    devMode: false,
    minPlayers: 3
  },
  effectsVolume: readStoredEffectsVolume(),

  // Actions
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
  setEffectsVolume: (volume) => {
    const clamped = Math.min(1, Math.max(0, Number(volume)));
    try {
      localStorage.setItem('effectsVolume', String(clamped));
    } catch {
      // ignore persistence errors
    }
    set({ effectsVolume: clamped });
  },

  ensureSession: async () => {
    const currentPlayer = get().player;
    if (!currentPlayer?.name) {
      throw new Error('Please enter your nickname first');
    }

    connectSocket();
    const response = await emitWithCallback('player:join', {
      name: currentPlayer.name,
      isGuest: currentPlayer.isGuest ?? true,
      profilePicIndex: currentPlayer.profilePicIndex ?? 0
    });

    set({
      player: response.player,
      serverConfig: response.serverConfig || { devMode: false, minPlayers: 3 }
    });

    get().setupSocketListeners();
    return response;
  },
  
  // Join as player
  joinAsPlayer: async (name, isGuest = true, profilePicIndex = 0) => {
    set({ isLoading: true, error: null });
    try {
      connectSocket();
      const response = await emitWithCallback('player:join', { name, isGuest, profilePicIndex });
      set({
        player: response.player,
        serverConfig: response.serverConfig || { devMode: false, minPlayers: 3 },
        isLoading: false
      });
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
      connectSocket();
      const response = await emitWithCallback('lobby:create', { name, maxPlayers, password });
      set({ lobby: response.lobby, isLoading: false });
      return response;
    } catch (error) {
      if (error.message === 'Session not found' && get().player) {
        try {
          await get().ensureSession();
          const retryResponse = await emitWithCallback('lobby:create', { name, maxPlayers, password });
          set({ lobby: retryResponse.lobby, isLoading: false });
          return retryResponse;
        } catch (retryError) {
          set({ error: retryError.message, isLoading: false });
          throw retryError;
        }
      }
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Join lobby
  joinLobby: async (lobbyId, password) => {
    set({ isLoading: true, error: null });
    try {
      connectSocket();
      const response = await emitWithCallback('lobby:join', { lobbyId, password });
      set({ lobby: response.lobby, isLoading: false });
      return response;
    } catch (error) {
      if (error.message === 'Session not found' && get().player) {
        try {
          await get().ensureSession();
          const retryResponse = await emitWithCallback('lobby:join', { lobbyId, password });
          set({ lobby: retryResponse.lobby, isLoading: false });
          return retryResponse;
        } catch (retryError) {
          set({ error: retryError.message, isLoading: false });
          throw retryError;
        }
      }
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Join lobby by code
  joinLobbyByCode: async (code, password) => {
    set({ isLoading: true, error: null });
    try {
      connectSocket();
      const response = await emitWithCallback('lobby:joinByCode', { code, password });
      set({ lobby: response.lobby, isLoading: false });
      return response;
    } catch (error) {
      if (error.message === 'Session not found' && get().player) {
        try {
          await get().ensureSession();
          const retryResponse = await emitWithCallback('lobby:joinByCode', { code, password });
          set({ lobby: retryResponse.lobby, isLoading: false });
          return retryResponse;
        } catch (retryError) {
          set({ error: retryError.message, isLoading: false });
          throw retryError;
        }
      }
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
      connectSocket();
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
      connectSocket();
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

  // Upload custom words
  uploadCustomWords: async (wordData) => {
    try {
      const response = await emitWithCallback('lobby:uploadWords', { wordData });
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

  // Submit action vote (continue vs start vote)
  submitActionVote: async (action) => {
    try {
      const response = await emitWithCallback('game:submitActionVote', { action });
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

  // Vote to skip discussion (democratic — 50% required)
  voteSkipDiscussion: () => {
    socket.emit('game:voteSkipDiscussion');
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
    socket.off('lobby:playerJoined');
    socket.off('lobby:playerLeft');
    socket.off('lobby:updated');
    socket.off('game:started');
    socket.off('game:state');
    socket.off('game:phaseChanged');
    socket.off('game:clueSubmitted');
    socket.off('game:voteSubmitted');
    socket.off('game:actionVoteSubmitted');
    socket.off('game:timerStarted');
    socket.off('game:ended');
    socket.off('game:skipDiscussionVoteUpdate');
    socket.off('connect');

    // On reconnect, re-register our session so the server maps the new
    // socket.id to our player and lobby.  Without this, every server-side
    // lookup by socketId fails with "Not in a game".
    socket.on('connect', () => {
      const { player: currentPlayer, lobby: currentLobby, gameState: currentGameState } = get();
      if (currentPlayer?.id && currentPlayer?.name) {
        // Use player:reconnect to preserve the original playerId so the
        // server can re-associate us with our lobby & game seat.
        emitWithCallback('player:reconnect', {
          playerId: currentPlayer.id,
          name: currentPlayer.name,
          isGuest: currentPlayer.isGuest ?? true,
          profilePicIndex: currentPlayer.profilePicIndex ?? 0
        }).then((response) => {
          set({
            player: response.player,
            serverConfig: response.serverConfig || { devMode: false, minPlayers: 3 }
          });
          // Rejoin the lobby room so broadcast events reach us
          if (currentLobby?.id) {
            emitWithCallback('lobby:rejoin', { lobbyId: currentLobby.id })
              .then((res) => {
                if (res.lobby) set({ lobby: res.lobby });
                // Re-fetch game state if a game was in progress
                if (currentGameState) {
                  emitWithCallback('game:getState', {}).then((stateRes) => {
                    if (stateRes.success && stateRes.state) {
                      set({ gameState: stateRes.state });
                    }
                  }).catch(() => {});
                }
              })
              .catch(() => {});
          }
        }).catch(() => {
          // Reconnect with old ID failed; fall back to a fresh join
          emitWithCallback('player:join', {
            name: currentPlayer.name,
            isGuest: currentPlayer.isGuest ?? true,
            profilePicIndex: currentPlayer.profilePicIndex ?? 0
          }).then((response) => {
            set({
              player: response.player,
              serverConfig: response.serverConfig || { devMode: false, minPlayers: 3 }
            });
          }).catch(() => {});
        });
      }
    });

    // Lobby events
    socket.on('lobby:playerJoined', (lobby) => {
      set({ lobby });
    });

    socket.on('lobby:playerLeft', (lobby) => {
      set({ lobby });
    });

    socket.on('lobby:updated', (lobby) => {
      set({ lobby });
    });

    // Game events
    socket.on('game:started', ({ phase }) => {
      set((state) => {
        // If we already have game state, just update the phase.
        // Otherwise wait for the full game:state event.
        if (state.gameState) {
          return { gameState: { ...state.gameState, phase } };
        }
        return {};
      });
    });

    socket.on('game:state', (gameState) => {
      set({ gameState });
    });

    socket.on('game:phaseChanged', ({ phase, voteResults, actionVoteStatus }) => {
      set((state) => ({
        gameState: state.gameState ? { 
          ...state.gameState, 
          phase,
          actionVoteStatus: actionVoteStatus || state.gameState.actionVoteStatus,
          // Reset skip-discussion vote count when phase changes
          skipDiscussionVoteCount: 0,
          skipDiscussionNeeded: null
        } : null,
        // Clear stale voteResults when a new round starts so the GameOver
        // animation can't be re-triggered by leftover data.
        voteResults: phase === 'role_reveal' ? null : (voteResults || state.voteResults),
        // Clear the displayed timer immediately so no stale seconds bleed
        // into the next phase before the new game:timerStarted event arrives.
        timerEndTime: null
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

    socket.on('game:actionVoteSubmitted', ({ actionVoteStatus }) => {
      set((state) => {
        if (!state.gameState) return state;
        return {
          gameState: {
            ...state.gameState,
            actionVoteStatus
          }
        };
      });
    });

    socket.on('game:timerStarted', ({ phase, duration, endTime }) => {
      // Use duration to compute a local end time, avoiding clock-skew between
      // different clients and the server.
      const localEndTime = Date.now() + duration;
      set({ timerEndTime: localEndTime });
    });

    socket.on('game:ended', ({ lobby }) => {
      set({ lobby, gameState: null, voteResults: null });
    });

    socket.on('game:skipDiscussionVoteUpdate', ({ voteCount, needed, totalHumans }) => {
      set((state) => ({
        gameState: state.gameState ? {
          ...state.gameState,
          skipDiscussionVoteCount: voteCount,
          skipDiscussionNeeded: needed,
          skipDiscussionTotalHumans: totalHumans
        } : null
      }));
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
      error: null,
      serverConfig: {
        devMode: false,
        minPlayers: 3
      }
    });
  }
}));
