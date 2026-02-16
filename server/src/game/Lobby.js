const { v4: uuidv4 } = require('uuid');

class Lobby {
  constructor(name, hostId, hostName, maxPlayers = 10, password = null) {
    this.id = uuidv4();
    this.code = this.generateCode();
    this.name = name;
    this.hostId = hostId;
    this.password = password;
    this.isPrivate = !!password;
    this.maxPlayers = Math.min(Math.max(maxPlayers, 2), 10);
    this.players = [];
    this.gameId = null;
    this.createdAt = new Date();
  }

  generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  addPlayer(player) {
    if (this.players.length >= this.maxPlayers) {
      return { success: false, error: 'Lobby is full' };
    }
    
    if (this.players.find(p => p.id === player.id)) {
      return { success: false, error: 'Already in lobby' };
    }

    this.players.push({
      id: player.id,
      name: player.name,
      avatar: player.avatar || null,
      isHost: player.id === this.hostId,
      isReady: false
    });

    return { success: true };
  }

  removePlayer(playerId) {
    const index = this.players.findIndex(p => p.id === playerId);
    if (index === -1) {
      return { success: false, error: 'Player not in lobby' };
    }

    this.players.splice(index, 1);

    // If host left, assign new host
    if (playerId === this.hostId && this.players.length > 0) {
      this.hostId = this.players[0].id;
      this.players[0].isHost = true;
    }

    return { success: true, newHostId: this.hostId };
  }

  checkPassword(password) {
    if (!this.isPrivate) return true;
    return this.password === password;
  }

  canStart() {
    const minPlayers = process.env.DEV_MODE === 'true' ? 1 : 3;
    return this.players.length >= minPlayers;
  }

  getPublicInfo() {
    return {
      id: this.id,
      code: this.code,
      name: this.name,
      isPrivate: this.isPrivate,
      playerCount: this.players.length,
      maxPlayers: this.maxPlayers,
      hasGame: !!this.gameId
    };
  }

  getFullInfo() {
    return {
      ...this.getPublicInfo(),
      hostId: this.hostId,
      players: this.players,
      gameId: this.gameId
    };
  }
}

module.exports = { Lobby };
