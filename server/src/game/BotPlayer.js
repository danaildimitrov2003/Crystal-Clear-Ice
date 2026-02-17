// Bot names for testing
const BOT_NAMES = [
  'FrostyBot', 'IceBot', 'ChillBot', 'SnowBot', 'GlacierBot',
  'CrystalBot', 'WinterBot', 'ArcticBot', 'PolarBot', 'BlizzardBot'
];

const BOT_COLORS = [
  '#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F39C12', '#3498DB'
];

// Generate clue words that could fit various categories
const GENERIC_CLUES = [
  'big', 'small', 'fast', 'slow', 'cold', 'hot', 'round', 'long',
  'colorful', 'dark', 'bright', 'soft', 'hard', 'shiny', 'smooth',
  'rough', 'loud', 'quiet', 'sweet', 'sour', 'spicy', 'fresh'
];

class BotPlayer {
  constructor(id, lobbyId) {
    this.id = `bot_${id}_${Date.now()}`;
    this.name = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)] + Math.floor(Math.random() * 100);
    this.avatar = BOT_COLORS[Math.floor(Math.random() * BOT_COLORS.length)];
    this.profilePicIndex = Math.floor(Math.random() * 15); // Random profile pic from 0-14
    this.lobbyId = lobbyId;
    this.isBot = true;
  }

  generateClue(word, category, isImpostor) {
    return 'test';
  }

  chooseVoteTarget(players, impostorId) {
    // Filter out self
    const otherPlayers = players.filter(p => p.id !== this.id);
    if (otherPlayers.length === 0) return null;
    
    // Random vote with slight bias towards actual impostor
    if (Math.random() > 0.3) {
      // Random vote
      return otherPlayers[Math.floor(Math.random() * otherPlayers.length)].id;
    } else {
      // Try to vote for someone who gave a vague clue or the impostor
      return otherPlayers[Math.floor(Math.random() * otherPlayers.length)].id;
    }
  }
}

module.exports = { BotPlayer, BOT_NAMES };
