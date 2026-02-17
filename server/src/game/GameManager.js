const { Lobby } = require('./Lobby');
const { Game, GAME_PHASES, PHASE_DURATIONS } = require('./Game');
const { BotPlayer } = require('./BotPlayer');

class GameManager {
  constructor() {
    this.lobbies = new Map();
    this.games = new Map();
    this.playerSessions = new Map(); // socketId -> { playerId, lobbyId }
    this.bots = new Map(); // botId -> BotPlayer
  }

  // Session management
  createSession(socketId, playerName, isGuest = true, profilePicIndex = 0) {
    const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const session = {
      id: playerId,
      socketId,
      name: playerName,
      isGuest,
      profilePicIndex,
      lobbyId: null,
      avatar: this.getRandomAvatar()
    };
    this.playerSessions.set(socketId, session);
    return session;
  }

  getRandomAvatar() {
    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  getSession(socketId) {
    return this.playerSessions.get(socketId);
  }

  removeSession(socketId) {
    const session = this.playerSessions.get(socketId);
    if (session && session.lobbyId) {
      this.leaveLobby(socketId);
    }
    this.playerSessions.delete(socketId);
    return session;
  }

  // Lobby management
  createLobby(socketId, lobbyName, maxPlayers, password = null) {
    const session = this.getSession(socketId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    const lobby = new Lobby(lobbyName, session.id, session.name, maxPlayers, password);
    lobby.addPlayer(session);
    
    this.lobbies.set(lobby.id, lobby);
    session.lobbyId = lobby.id;

    return { success: true, lobby: lobby.getFullInfo() };
  }

  joinLobby(socketId, lobbyId, password = null) {
    const session = this.getSession(socketId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) {
      return { success: false, error: 'Lobby not found' };
    }

    if (!lobby.checkPassword(password)) {
      return { success: false, error: 'Incorrect password' };
    }

    if (lobby.gameId) {
      return { success: false, error: 'Game already in progress' };
    }

    const result = lobby.addPlayer(session);
    if (!result.success) {
      return result;
    }

    session.lobbyId = lobby.id;
    return { success: true, lobby: lobby.getFullInfo() };
  }

  joinLobbyByCode(socketId, code, password = null) {
    const lobby = Array.from(this.lobbies.values()).find(l => l.code === code);
    if (!lobby) {
      return { success: false, error: 'Lobby not found' };
    }
    return this.joinLobby(socketId, lobby.id, password);
  }

  leaveLobby(socketId) {
    const session = this.getSession(socketId);
    if (!session || !session.lobbyId) {
      return { success: false, error: 'Not in a lobby' };
    }

    const lobby = this.lobbies.get(session.lobbyId);
    if (!lobby) {
      session.lobbyId = null;
      return { success: false, error: 'Lobby not found' };
    }

    const result = lobby.removePlayer(session.id);
    const lobbyId = session.lobbyId;
    session.lobbyId = null;

    // Delete empty lobbies
    if (lobby.players.length === 0) {
      this.lobbies.delete(lobby.id);
      if (lobby.gameId) {
        this.games.delete(lobby.gameId);
      }
      return { success: true, lobbyDeleted: true, lobbyId };
    }

    return { success: true, lobbyDeleted: false, lobbyId, newHostId: result.newHostId, lobby: lobby.getFullInfo() };
  }

  getPublicLobbies() {
    return Array.from(this.lobbies.values())
      .filter(l => !l.isPrivate && !l.gameId)
      .map(l => l.getPublicInfo());
  }

  getLobbyInfo(lobbyId) {
    const lobby = this.lobbies.get(lobbyId);
    return lobby ? lobby.getFullInfo() : null;
  }

  // Game management
  startGame(socketId) {
    const session = this.getSession(socketId);
    if (!session || !session.lobbyId) {
      return { success: false, error: 'Not in a lobby' };
    }

    const lobby = this.lobbies.get(session.lobbyId);
    if (!lobby) {
      return { success: false, error: 'Lobby not found' };
    }

    if (lobby.hostId !== session.id) {
      return { success: false, error: 'Only the host can start the game' };
    }

    if (!lobby.canStart()) {
      const minPlayers = process.env.DEV_MODE === 'true' ? 1 : 3;
      return { success: false, error: `Need at least ${minPlayers} player${minPlayers > 1 ? 's' : ''} to start` };
    }

    const game = new Game(lobby.id, lobby.players);
    game.start();
    
    this.games.set(game.id, game);
    lobby.gameId = game.id;

    return { success: true, game: game.getState(), lobbyId: lobby.id };
  }

  getGame(lobbyId) {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby || !lobby.gameId) return null;
    return this.games.get(lobby.gameId);
  }

  advanceGamePhase(lobbyId) {
    const game = this.getGame(lobbyId);
    if (!game) return null;
    return game.advancePhase();
  }

  submitClue(socketId, clue) {
    const session = this.getSession(socketId);
    if (!session || !session.lobbyId) {
      return { success: false, error: 'Not in a game' };
    }

    const game = this.getGame(session.lobbyId);
    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    if (game.phase !== GAME_PHASES.CLUE_SUBMISSION) {
      return { success: false, error: 'Not in clue submission phase' };
    }

    const result = game.submitClue(session.id, clue);
    return { ...result, gameState: game.getState(), lobbyId: session.lobbyId };
  }

  submitVote(socketId, votedForId) {
    const session = this.getSession(socketId);
    if (!session || !session.lobbyId) {
      return { success: false, error: 'Not in a game' };
    }

    const game = this.getGame(session.lobbyId);
    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    if (game.phase !== GAME_PHASES.VOTING) {
      return { success: false, error: 'Not in voting phase' };
    }

    const result = game.submitVote(session.id, votedForId);
    return { ...result, gameState: game.getState(), lobbyId: session.lobbyId, allVoted: game.allVotesSubmitted() };
  }

  getVoteResults(lobbyId) {
    const game = this.getGame(lobbyId);
    if (!game) return null;
    return game.getVoteResults();
  }

  getPlayerGameState(socketId) {
    const session = this.getSession(socketId);
    if (!session || !session.lobbyId) return null;

    const game = this.getGame(session.lobbyId);
    if (!game) return null;

    return game.getPlayerState(session.id);
  }

  startNewRound(lobbyId) {
    const game = this.getGame(lobbyId);
    if (!game) return null;
    return game.startRound();
  }

  endGame(lobbyId) {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) return;

    if (lobby.gameId) {
      this.games.delete(lobby.gameId);
      lobby.gameId = null;
    }
  }

  // Bot management
  addBot(lobbyId) {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) {
      return { success: false, error: 'Lobby not found' };
    }

    if (lobby.players.length >= lobby.maxPlayers) {
      return { success: false, error: 'Lobby is full' };
    }

    const bot = new BotPlayer(this.bots.size, lobbyId);
    this.bots.set(bot.id, bot);
    
    const result = lobby.addPlayer(bot);
    if (!result.success) {
      this.bots.delete(bot.id);
      return result;
    }

    return { success: true, bot, lobby: lobby.getFullInfo() };
  }

  isBot(playerId) {
    return this.bots.has(playerId);
  }

  getBot(playerId) {
    return this.bots.get(playerId);
  }

  removeBot(botId) {
    this.bots.delete(botId);
  }
}

module.exports = { GameManager, GAME_PHASES, PHASE_DURATIONS };
