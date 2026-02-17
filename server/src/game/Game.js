const { v4: uuidv4 } = require('uuid');
const { getRandomCategoryAndWord } = require('../data/words');

const GAME_PHASES = {
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

const PHASE_DURATIONS = process.env.DEV_MODE === 'true' ? {
  ROLE_REVEAL: 2000,
  THEME_REVEAL: 2000,
  WORD_REVEAL: 2000,
  CLUE_SUBMISSION: 15000,
  DISCUSSION: 15000,
  VOTING: 15000,
  VOTE_RESULTS: 3000
} : {
  ROLE_REVEAL: 3000,
  THEME_REVEAL: 3000,
  WORD_REVEAL: 5000,
  CLUE_SUBMISSION: 30000,
  DISCUSSION: 30000,
  VOTING: 30000,
  VOTE_RESULTS: 5000
};

class Game {
  constructor(lobbyId, players) {
    this.id = uuidv4();
    this.lobbyId = lobbyId;
    this.players = players.map(p => ({
      ...p,
      role: null,
      clue: null,
      vote: null,
      votesReceived: 0
    }));
    this.phase = GAME_PHASES.WAITING;
    this.round = 1;
    this.currentPlayerIndex = 0;
    this.category = null;
    this.word = null;
    this.impostorId = null;
    this.clues = [];
    this.votes = {};
    this.phaseTimer = null;
    this.phaseEndTime = null;
  }

  start() {
    // Select random word and category
    const { category, word } = getRandomCategoryAndWord();
    this.category = category;
    this.word = word;

    // Assign roles - one random impostor
    const impostorIndex = Math.floor(Math.random() * this.players.length);
    this.players.forEach((player, index) => {
      player.role = index === impostorIndex ? 'impostor' : 'detective';
      player.clue = null;
      player.vote = null;
      player.votesReceived = 0;
    });
    this.impostorId = this.players[impostorIndex].id;

    // Randomize turn order
    this.players = this.shuffleArray([...this.players]);
    this.currentPlayerIndex = 0;

    this.phase = GAME_PHASES.ROLE_REVEAL;
    return this.getState();
  }

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  advancePhase() {
    switch (this.phase) {
      case GAME_PHASES.ROLE_REVEAL:
        this.phase = GAME_PHASES.THEME_REVEAL;
        break;
      case GAME_PHASES.THEME_REVEAL:
        this.phase = GAME_PHASES.WORD_REVEAL;
        break;
      case GAME_PHASES.WORD_REVEAL:
        this.phase = GAME_PHASES.CLUE_SUBMISSION;
        this.currentPlayerIndex = 0;
        break;
      case GAME_PHASES.CLUE_SUBMISSION:
        // Check if all players have submitted clues
        if (this.currentPlayerIndex >= this.players.length - 1) {
          this.phase = GAME_PHASES.DISCUSSION;
        } else {
          this.currentPlayerIndex++;
        }
        break;
      case GAME_PHASES.DISCUSSION:
        this.phase = GAME_PHASES.VOTING;
        break;
      case GAME_PHASES.VOTING:
        this.phase = GAME_PHASES.VOTE_RESULTS;
        this.calculateVotes();
        break;
      case GAME_PHASES.VOTE_RESULTS:
        this.phase = GAME_PHASES.GAME_OVER;
        break;
    }
    return this.getState();
  }

  submitClue(playerId, clue) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return { success: false, error: 'Player not found' };
    
    const currentPlayer = this.players[this.currentPlayerIndex];
    if (currentPlayer.id !== playerId) {
      return { success: false, error: 'Not your turn' };
    }

    player.clue = clue;
    this.clues.push({ playerId, playerName: player.name, clue });
    
    return { success: true };
  }

  submitVote(voterId, votedForId) {
    const voter = this.players.find(p => p.id === voterId);
    const votedFor = this.players.find(p => p.id === votedForId);
    
    if (!voter || !votedFor) {
      return { success: false, error: 'Player not found' };
    }

    if (voter.id === votedFor.id) {
      return { success: false, error: 'Cannot vote for yourself' };
    }

    voter.vote = votedForId;
    this.votes[voterId] = votedForId;
    
    return { success: true };
  }

  calculateVotes() {
    // Reset vote counts
    this.players.forEach(p => p.votesReceived = 0);
    
    // Count votes
    Object.values(this.votes).forEach(votedForId => {
      const player = this.players.find(p => p.id === votedForId);
      if (player) {
        player.votesReceived++;
      }
    });
  }

  getVoteResults() {
    // Find player with most votes
    let maxVotes = 0;
    let votedOut = null;
    let tie = false;

    this.players.forEach(player => {
      if (player.votesReceived > maxVotes) {
        maxVotes = player.votesReceived;
        votedOut = player;
        tie = false;
      } else if (player.votesReceived === maxVotes && maxVotes > 0) {
        tie = true;
      }
    });

    const impostor = this.players.find(p => p.id === this.impostorId);
    const impostorCaught = votedOut && votedOut.id === this.impostorId;
    const detectivesWin = impostorCaught && !tie;

    return {
      votedOut: votedOut ? { id: votedOut.id, name: votedOut.name } : null,
      tie,
      impostorCaught,
      detectivesWin,
      impostor: { id: impostor.id, name: impostor.name },
      votes: this.votes,
      voteDetails: this.players.map(p => ({
        id: p.id,
        name: p.name,
        votedFor: p.vote,
        votesReceived: p.votesReceived
      }))
    };
  }

  allCluesSubmitted() {
    return this.players.every(p => p.clue !== null);
  }

  allVotesSubmitted() {
    return this.players.every(p => p.vote !== null);
  }

  getState() {
    return {
      id: this.id,
      phase: this.phase,
      round: this.round,
      category: this.category,
      word: this.word,
      impostorId: this.impostorId,
      currentPlayerIndex: this.currentPlayerIndex,
      currentPlayerId: this.players[this.currentPlayerIndex]?.id,
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        profilePicIndex: p.profilePicIndex,
        role: p.role,
        clue: p.clue,
        hasVoted: p.vote !== null,
        votesReceived: p.votesReceived
      })),
      clues: this.clues,
      phaseEndTime: this.phaseEndTime
    };
  }

  getPlayerState(playerId) {
    const state = this.getState();
    const player = this.players.find(p => p.id === playerId);
    
    // Hide sensitive info based on role and phase
    return {
      ...state,
      myRole: player?.role,
      word: player?.role === 'impostor' ? null : this.word,
      // Hide other players' roles until game over
      players: state.players.map(p => ({
        ...p,
        role: this.phase === GAME_PHASES.GAME_OVER ? p.role : (p.id === playerId ? p.role : null)
      })),
      impostorId: this.phase === GAME_PHASES.GAME_OVER ? this.impostorId : null
    };
  }

  startRound() {
    // Select new random word and category
    const { category, word } = getRandomCategoryAndWord();
    this.category = category;
    this.word = word;

    // Reset all player state
    this.players.forEach(player => {
      player.clue = null;
      player.vote = null;
      player.votesReceived = 0;
      player.role = null;
    });

    // Assign new roles - one random impostor
    const impostorIndex = Math.floor(Math.random() * this.players.length);
    this.players[impostorIndex].role = 'impostor';
    
    this.players.forEach((player, index) => {
      if (index !== impostorIndex) {
        player.role = 'detective';
      }
    });
    
    this.impostorId = this.players[impostorIndex].id;

    // Randomize turn order
    this.players = this.shuffleArray([...this.players]);
    
    this.round++;
    this.currentPlayerIndex = 0;
    this.clues = [];
    this.votes = {};

    this.phase = GAME_PHASES.ROLE_REVEAL;
    this.phaseEndTime = null;
    this.phaseTimer = null;
    
    return this.getState();
  }
}

module.exports = { Game, GAME_PHASES, PHASE_DURATIONS };
