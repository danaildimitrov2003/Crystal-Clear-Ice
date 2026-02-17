const { GAME_PHASES, PHASE_DURATIONS } = require('../game/GameManager');

const DEV_MODE = process.env.DEV_MODE === 'true';

function resolveCallback(data, callback) {
  if (typeof data === 'function') return data;
  if (typeof callback === 'function') return callback;
  return null;
}

function setupSocketHandlers(io, gameManager) {
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Player joins with name
    socket.on('player:join', ({ name, isGuest = true, profilePicIndex = 0 }, callback) => {
      const session = gameManager.createSession(socket.id, name, isGuest, profilePicIndex);
      console.log(`Player joined: ${name} (${session.id})`);
      if (typeof callback === 'function') {
        callback({ success: true, player: session });
      }
    });

    // Create a new lobby
    socket.on('lobby:create', ({ name, maxPlayers, password }, callback) => {
      const result = gameManager.createLobby(socket.id, name, maxPlayers, password);
      if (result.success) {
        socket.join(result.lobby.id);
        console.log(`Lobby created: ${name} by ${socket.id}`);
      }
      if (typeof callback === 'function') {
        callback(result);
      }
    });

    // Join a lobby by ID
    socket.on('lobby:join', ({ lobbyId, password }, callback) => {
      const result = gameManager.joinLobby(socket.id, lobbyId, password);
      if (result.success) {
        socket.join(result.lobby.id);
        socket.to(result.lobby.id).emit('lobby:playerJoined', result.lobby);
        console.log(`Player joined lobby: ${lobbyId}`);
      }
      if (typeof callback === 'function') {
        callback(result);
      }
    });

    // Join a lobby by code
    socket.on('lobby:joinByCode', ({ code, password }, callback) => {
      const result = gameManager.joinLobbyByCode(socket.id, code, password);
      if (result.success) {
        socket.join(result.lobby.id);
        socket.to(result.lobby.id).emit('lobby:playerJoined', result.lobby);
        console.log(`Player joined lobby by code: ${code}`);
      }
      if (typeof callback === 'function') {
        callback(result);
      }
    });

    // Leave lobby
    socket.on('lobby:leave', (data, callback) => {
      const cb = resolveCallback(data, callback);
      const result = gameManager.leaveLobby(socket.id);
      if (result.success) {
        socket.leave(result.lobbyId);
        if (!result.lobbyDeleted) {
          socket.to(result.lobbyId).emit('lobby:playerLeft', result.lobby);
        }
        console.log(`Player left lobby: ${result.lobbyId}`);
      }
      if (cb) cb(result);
    });

    // Get public lobbies
    socket.on('lobbies:list', (data, callback) => {
      const cb = resolveCallback(data, callback);
      const lobbies = gameManager.getPublicLobbies();
      if (cb) cb({ success: true, lobbies });
    });

    // Add bot to lobby (dev mode only)
    socket.on('lobby:addBot', (data, callback) => {
      const cb = resolveCallback(data, callback);
      if (!DEV_MODE) {
        if (cb) cb({ success: false, error: 'Bot creation only available in dev mode' });
        return;
      }

      const session = gameManager.getSession(socket.id);
      if (!session || !session.lobbyId) {
        if (cb) cb({ success: false, error: 'Not in a lobby' });
        return;
      }

      const result = gameManager.addBot(session.lobbyId);
      if (result.success) {
        io.to(session.lobbyId).emit('lobby:playerJoined', result.lobby);
      }
      if (cb) cb(result);
    });

    // Start game
    socket.on('game:start', (data, callback) => {
      const cb = resolveCallback(data, callback);
      const result = gameManager.startGame(socket.id);
      if (result.success) {
        io.to(result.lobbyId).emit('game:started', { phase: result.game.phase });
        
        // Send individual player states (with hidden info)
        const lobby = gameManager.lobbies.get(result.lobbyId);
        const game = gameManager.games.get(lobby.gameId);
        lobby.players.forEach(player => {
          const playerSocket = Array.from(gameManager.playerSessions.entries())
            .find(([_, s]) => s.id === player.id);
          if (playerSocket) {
            const playerState = game.getPlayerState(player.id);
            io.to(playerSocket[0]).emit('game:state', playerState);
          }
        });

        // Auto advance phases and handle bot actions
        startPhaseTimer(io, gameManager, result.lobbyId);
        handleBotActions(io, gameManager, result.lobbyId, game);
        console.log(`Game started in lobby: ${result.lobbyId}`);
      }
      if (cb) cb(result);
    });

    // Submit clue
    socket.on('game:submitClue', ({ clue }, callback) => {
      const result = gameManager.submitClue(socket.id, clue);
      if (result.success) {
        // Notify all players about the clue
        io.to(result.lobbyId).emit('game:clueSubmitted', {
          clues: result.gameState.clues,
          currentPlayerIndex: result.gameState.currentPlayerIndex,
          currentPlayerId: result.gameState.currentPlayerId
        });

        // Check if all clues are submitted
        if (result.gameState.currentPlayerIndex >= result.gameState.players.length - 1) {
          // All clues submitted, advance to discussion
          setTimeout(() => {
            const newState = gameManager.advanceGamePhase(result.lobbyId);
            if (newState) {
              io.to(result.lobbyId).emit('game:phaseChanged', { phase: newState.phase });
              startPhaseTimer(io, gameManager, result.lobbyId);
              const updatedGame = gameManager.getGame(result.lobbyId);
              handleBotActions(io, gameManager, result.lobbyId, updatedGame);
            }
          }, 1000);
        } else {
          // Move to next player
          gameManager.advanceGamePhase(result.lobbyId);
          emitPlayerStates(io, gameManager, result.lobbyId);
        }
      }
      if (typeof callback === 'function') {
        callback(result);
      }
    });

    // Submit vote
    socket.on('game:submitVote', ({ votedForId }, callback) => {
      const result = gameManager.submitVote(socket.id, votedForId);
      if (result.success) {
        io.to(result.lobbyId).emit('game:voteSubmitted', {
          playersVoted: result.gameState.players.filter(p => p.hasVoted).map(p => p.id)
        });

        // Check if all votes are in
        if (result.allVoted) {
          // Advance to vote results
          const newState = gameManager.advanceGamePhase(result.lobbyId);
          const voteResults = gameManager.getVoteResults(result.lobbyId);
          io.to(result.lobbyId).emit('game:phaseChanged', { 
            phase: newState.phase,
            voteResults
          });
          startPhaseTimer(io, gameManager, result.lobbyId);
        }
      }
      if (typeof callback === 'function') {
        callback(result);
      }
    });

    // Skip discussion
    socket.on('game:skipDiscussion', () => {
      const session = gameManager.getSession(socket.id);
      if (!session || !session.lobbyId) return;

      const game = gameManager.getGame(session.lobbyId);
      if (!game || game.phase !== GAME_PHASES.DISCUSSION) return;

      const newState = gameManager.advanceGamePhase(session.lobbyId);
      if (newState) {
        io.to(session.lobbyId).emit('game:phaseChanged', { phase: newState.phase });
        startPhaseTimer(io, gameManager, session.lobbyId);
      }
    });

    // Start new round
    socket.on('game:newRound', () => {
      const session = gameManager.getSession(socket.id);
      if (!session || !session.lobbyId) return;

      const newState = gameManager.startNewRound(session.lobbyId);
      if (newState) {
        const updatedGame = gameManager.getGame(session.lobbyId);
        io.to(session.lobbyId).emit('game:phaseChanged', { phase: newState.phase });
        emitPlayerStates(io, gameManager, session.lobbyId);
        startPhaseTimer(io, gameManager, session.lobbyId);
        handleBotActions(io, gameManager, session.lobbyId, updatedGame);
      }
    });

    // Return to lobby
    socket.on('game:returnToLobby', () => {
      const session = gameManager.getSession(socket.id);
      if (!session || !session.lobbyId) return;

      gameManager.endGame(session.lobbyId);
      const lobbyInfo = gameManager.getLobbyInfo(session.lobbyId);
      io.to(session.lobbyId).emit('game:ended', { lobby: lobbyInfo });
    });

    // Get current game state
    socket.on('game:getState', (data, callback) => {
      const cb = resolveCallback(data, callback);
      const state = gameManager.getPlayerGameState(socket.id);
      if (cb) cb({ success: !!state, state });
    });

    // Disconnect
    socket.on('disconnect', () => {
      const session = gameManager.getSession(socket.id);
      if (session && session.lobbyId) {
        const result = gameManager.leaveLobby(socket.id);
        if (result.success && !result.lobbyDeleted) {
          socket.to(result.lobbyId).emit('lobby:playerLeft', result.lobby);
        }
      }
      gameManager.removeSession(socket.id);
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
}

function startPhaseTimer(io, gameManager, lobbyId) {
  const game = gameManager.getGame(lobbyId);
  if (!game) return;

  const duration = PHASE_DURATIONS[game.phase.toUpperCase()] || PHASE_DURATIONS[game.phase];
  if (!duration) return;

  // Set the phase end time
  game.phaseEndTime = Date.now() + duration;
  io.to(lobbyId).emit('game:timerStarted', { 
    phase: game.phase,
    duration,
    endTime: game.phaseEndTime
  });

  // Clear any existing timer
  if (game.phaseTimer) {
    clearTimeout(game.phaseTimer);
  }

  game.phaseTimer = setTimeout(() => {
    const currentPhase = game.phase;
    const newState = gameManager.advanceGamePhase(lobbyId);
    
    if (newState && newState.phase !== currentPhase) {
      if (newState.phase === GAME_PHASES.VOTE_RESULTS) {
        const voteResults = gameManager.getVoteResults(lobbyId);
        io.to(lobbyId).emit('game:phaseChanged', { 
          phase: newState.phase,
          voteResults
        });
      } else if (newState.phase === GAME_PHASES.GAME_OVER) {
        const voteResults = gameManager.getVoteResults(lobbyId);
        emitPlayerStates(io, gameManager, lobbyId);
        io.to(lobbyId).emit('game:phaseChanged', { 
          phase: newState.phase,
          voteResults
        });
      } else {
        io.to(lobbyId).emit('game:phaseChanged', { phase: newState.phase });
        emitPlayerStates(io, gameManager, lobbyId);
      }

      const updatedGame = gameManager.getGame(lobbyId);
      handleBotActions(io, gameManager, lobbyId, updatedGame);
      startPhaseTimer(io, gameManager, lobbyId);
    } else if (newState && currentPhase === GAME_PHASES.CLUE_SUBMISSION) {
      // In clue phase, timer can advance turn without changing phase.
      // Keep players updated and continue timers for the next turn.
      emitPlayerStates(io, gameManager, lobbyId);
      const updatedGame = gameManager.getGame(lobbyId);
      handleBotActions(io, gameManager, lobbyId, updatedGame);
      startPhaseTimer(io, gameManager, lobbyId);
    }
  }, duration);
}

function emitPlayerStates(io, gameManager, lobbyId) {
  const lobby = gameManager.lobbies.get(lobbyId);
  const game = gameManager.getGame(lobbyId);
  if (!lobby || !game) return;

  lobby.players.forEach(player => {
    const playerSocket = Array.from(gameManager.playerSessions.entries())
      .find(([_, s]) => s.id === player.id);
    if (playerSocket) {
      const playerState = game.getPlayerState(player.id);
      io.to(playerSocket[0]).emit('game:state', playerState);
    }
  });
}

function handleBotActions(io, gameManager, lobbyId, game) {
  const lobby = gameManager.lobbies.get(lobbyId);
  if (!lobby || !game) return;

  // Handle clue submission phase
  if (game.phase === GAME_PHASES.CLUE_SUBMISSION) {
    const currentPlayer = game.players[game.currentPlayerIndex];
    if (currentPlayer && gameManager.isBot(currentPlayer.id)) {
      const bot = gameManager.getBot(currentPlayer.id);
      const isImpostor = currentPlayer.role === 'impostor';
      
      setTimeout(() => {
        const clue = bot.generateClue(game.word, game.category, isImpostor);
        const result = game.submitClue(currentPlayer.id, clue);
        
        if (result.success) {
          io.to(lobbyId).emit('game:clueSubmitted', {
            clues: game.clues,
            currentPlayerIndex: game.currentPlayerIndex,
            currentPlayerId: game.currentPlayerId
          });

          // Check if we need to advance or let next bot play
          if (game.currentPlayerIndex >= game.players.length - 1) {
            setTimeout(() => {
              const newState = gameManager.advanceGamePhase(lobbyId);
              if (newState) {
                io.to(lobbyId).emit('game:phaseChanged', { phase: newState.phase });
                startPhaseTimer(io, gameManager, lobbyId);
              }
            }, 1000);
          } else {
            gameManager.advanceGamePhase(lobbyId);
            emitPlayerStates(io, gameManager, lobbyId);
            handleBotActions(io, gameManager, lobbyId, game);
          }
        }
      }, 2000);
    }
  }

  // Handle voting phase
  if (game.phase === GAME_PHASES.VOTING) {
    lobby.players.forEach(player => {
      if (gameManager.isBot(player.id) && !player.vote) {
        const bot = gameManager.getBot(player.id);
        
        setTimeout(() => {
          const votedForId = bot.chooseVoteTarget(game.players, game.impostorId);
          if (votedForId) {
            const result = game.submitVote(player.id, votedForId);
            
            if (result.success) {
              io.to(lobbyId).emit('game:voteSubmitted', {
                playersVoted: game.players.filter(p => p.hasVoted).map(p => p.id)
              });

              if (game.allVotesSubmitted()) {
                const newState = gameManager.advanceGamePhase(lobbyId);
                const voteResults = gameManager.getVoteResults(lobbyId);
                io.to(lobbyId).emit('game:phaseChanged', { 
                  phase: newState.phase,
                  voteResults
                });
                startPhaseTimer(io, gameManager, lobbyId);
              }
            }
          }
        }, 2000);
      }
    });
  }
}

module.exports = { setupSocketHandlers };
