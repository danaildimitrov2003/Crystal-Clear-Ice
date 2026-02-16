const { GAME_PHASES, PHASE_DURATIONS } = require('../game/GameManager');

function setupSocketHandlers(io, gameManager) {
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Player joins with name
    socket.on('player:join', ({ name, isGuest = true }, callback) => {
      const session = gameManager.createSession(socket.id, name, isGuest);
      console.log(`Player joined: ${name} (${session.id})`);
      callback({ success: true, player: session });
    });

    // Create a new lobby
    socket.on('lobby:create', ({ name, maxPlayers, password }, callback) => {
      const result = gameManager.createLobby(socket.id, name, maxPlayers, password);
      if (result.success) {
        socket.join(result.lobby.id);
        console.log(`Lobby created: ${name} by ${socket.id}`);
      }
      callback(result);
    });

    // Join a lobby by ID
    socket.on('lobby:join', ({ lobbyId, password }, callback) => {
      const result = gameManager.joinLobby(socket.id, lobbyId, password);
      if (result.success) {
        socket.join(result.lobby.id);
        socket.to(result.lobby.id).emit('lobby:playerJoined', result.lobby);
        console.log(`Player joined lobby: ${lobbyId}`);
      }
      callback(result);
    });

    // Join a lobby by code
    socket.on('lobby:joinByCode', ({ code, password }, callback) => {
      const result = gameManager.joinLobbyByCode(socket.id, code, password);
      if (result.success) {
        socket.join(result.lobby.id);
        socket.to(result.lobby.id).emit('lobby:playerJoined', result.lobby);
        console.log(`Player joined lobby by code: ${code}`);
      }
      callback(result);
    });

    // Leave lobby
    socket.on('lobby:leave', (callback) => {
      const result = gameManager.leaveLobby(socket.id);
      if (result.success) {
        socket.leave(result.lobbyId);
        if (!result.lobbyDeleted) {
          socket.to(result.lobbyId).emit('lobby:playerLeft', result.lobby);
        }
        console.log(`Player left lobby: ${result.lobbyId}`);
      }
      if (callback) callback(result);
    });

    // Get public lobbies
    socket.on('lobbies:list', (callback) => {
      const lobbies = gameManager.getPublicLobbies();
      callback({ success: true, lobbies });
    });

    // Start game
    socket.on('game:start', (callback) => {
      const result = gameManager.startGame(socket.id);
      if (result.success) {
        io.to(result.lobbyId).emit('game:started', { phase: result.game.phase });
        
        // Send individual player states (with hidden info)
        const lobby = gameManager.lobbies.get(result.lobbyId);
        lobby.players.forEach(player => {
          const playerSocket = Array.from(gameManager.playerSessions.entries())
            .find(([_, s]) => s.id === player.id);
          if (playerSocket) {
            const playerState = gameManager.games.get(lobby.gameId).getPlayerState(player.id);
            io.to(playerSocket[0]).emit('game:state', playerState);
          }
        });

        // Auto advance phases
        startPhaseTimer(io, gameManager, result.lobbyId);
        console.log(`Game started in lobby: ${result.lobbyId}`);
      }
      callback(result);
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
            }
          }, 1000);
        } else {
          // Move to next player
          gameManager.advanceGamePhase(result.lobbyId);
          emitPlayerStates(io, gameManager, result.lobbyId);
        }
      }
      callback(result);
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
      callback(result);
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
        io.to(session.lobbyId).emit('game:phaseChanged', { phase: newState.phase });
        emitPlayerStates(io, gameManager, session.lobbyId);
        startPhaseTimer(io, gameManager, session.lobbyId);
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
    socket.on('game:getState', (callback) => {
      const state = gameManager.getPlayerGameState(socket.id);
      callback({ success: !!state, state });
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

module.exports = { setupSocketHandlers };
