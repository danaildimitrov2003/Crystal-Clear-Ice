const { v4: uuidv4 } = require('uuid');
const { getRandomCategoryAndWord } = require('../data/words');

const GAME_PHASES = {
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

const PHASE_DURATIONS = process.env.DEV_MODE === 'true' ? {
  ROLE_REVEAL: 2000,
  THEME_REVEAL: 6000,
  WORD_REVEAL: 6000,
  CLUE_SUBMISSION: 20000,
  DISCUSSION: 30000,
  ACTION_CHOICE: 10000,
  VOTING: 15000,
  VOTE_RESULTS: 3000
} : {
  ROLE_REVEAL: 3000,
  THEME_REVEAL: 6000,
  WORD_REVEAL: 6000,
  CLUE_SUBMISSION: 20000,
  DISCUSSION: 30000,
  ACTION_CHOICE: 15000,
  VOTING: 30000,
  VOTE_RESULTS: 5000
};

class Game {
  constructor(lobbyId, players, customWords = null) {
    this.id = uuidv4();
    this.lobbyId = lobbyId;
    this.customWords = customWords;
    this.players = players.map(p => ({
      ...p,
      role: null,
      clue: null,
      vote: null,
      votesReceived: 0,
      actionVote: null
    }));
    this.phase = GAME_PHASES.WAITING;
    this.round = 1;
    this.currentPlayerIndex = 0;
    this.category = null;
    this.word = null;
    this.impostorId = null;
    this.clues = [];
    this.allCluesHistory = [];
    this.votes = {};
    this.actionVotes = {};
    this.skipDiscussionVotes = {};
    this.phaseTimer = null;
    this.phaseEndTime = null;
  }

  getRandomCategoryAndWord() {
    // Use custom words if available, otherwise use default
    const wordSource = this.customWords || require('../data/words').getWordCategories();
    
    const categories = Object.keys(wordSource);
    if (categories.length === 0) {
      throw new Error('No word categories available');
    }

    const category = categories[Math.floor(Math.random() * categories.length)];
    const words = wordSource[category];
    
    if (!Array.isArray(words) || words.length === 0) {
      throw new Error(`Invalid words in category: ${category}`);
    }

    const word = words[Math.floor(Math.random() * words.length)];
    return { category, word };
  }

  start() {
    // Select random word and category
    const { category, word } = this.getRandomCategoryAndWord();
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
        this.phase = GAME_PHASES.ACTION_CHOICE;
        break;
      case GAME_PHASES.ACTION_CHOICE:
        // Determine which action won based on votes
        const actionResult = this.getActionVoteResult();
        if (actionResult.action === 'continue') {
          // Continue to next round - increment and reset state
          this.round++;
          this.phase = GAME_PHASES.CLUE_SUBMISSION;
          this.currentPlayerIndex = 0;
          this.clues = [];
          this.votes = {};
          this.skipDiscussionVotes = {};
          this.players.forEach(p => {
            p.clue = null;
            p.vote = null;
            p.votesReceived = 0;
            p.actionVote = null;
          });
          this.actionVotes = {};
          console.log(`[Game ${this.id}] Round incremented to ${this.round} (continue vote)`);
        } else {
          // Start voting
          this.phase = GAME_PHASES.VOTING;
        }
        break;
      case GAME_PHASES.VOTING:
        this.phase = GAME_PHASES.VOTE_RESULTS;
        this.calculateVotes();
        break;
      case GAME_PHASES.VOTE_RESULTS:
        this.phase = GAME_PHASES.GAME_OVER;
        break;
    }
    console.log(`[Game ${this.id}] Phase: ${this.phase}, Round: ${this.round}, allCluesHistory.length: ${this.allCluesHistory.length}`);
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
    const clueEntry = { playerId, playerName: player.name, clue };
    this.clues.push(clueEntry);
    
    // DEBUG: Show current state
    console.log(`[Game ${this.id}] submitClue called - Player: ${player.name} (ID: ${playerId}), Current Round: ${this.round}, Clue: "${clue}"`);
    console.log(`[Game ${this.id}] Current allCluesHistory before addition:`, JSON.stringify(this.allCluesHistory, null, 2));
    
    // Prevent duplicates: only add to history if this exact clue from this player in this round doesn't exist
    const isDuplicate = this.allCluesHistory.some(
      c => c.playerId === playerId && c.round === this.round && c.clue === clue
    );
    
    if (!isDuplicate) {
      this.allCluesHistory.push({ ...clueEntry, round: this.round });
      console.log(`[Game ${this.id}] ✓ Clue ADDED - Player: ${player.name}, Round: ${this.round}, Total history count: ${this.allCluesHistory.length}`);
      console.log(`[Game ${this.id}] allCluesHistory after addition:`, JSON.stringify(this.allCluesHistory, null, 2));
    } else {
      console.log(`[Game ${this.id}] ✗ DUPLICATE clue prevented - Player: ${player.name}, Round: ${this.round}`);
    }
    
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

  submitActionVote(playerId, action) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    if (action !== 'continue' && action !== 'start_vote') {
      return { success: false, error: 'Invalid action' };
    }

    player.actionVote = action;
    this.actionVotes[playerId] = action;
    
    return { success: true };
  }

  getActionVoteResult() {
    let continueVotes = 0;
    let startVoteVotes = 0;

    Object.values(this.actionVotes).forEach(action => {
      if (action === 'continue') {
        continueVotes++;
      } else if (action === 'start_vote') {
        startVoteVotes++;
      }
    });

    return {
      action: continueVotes > startVoteVotes ? 'continue' : 'start_vote',
      continueVotes,
      startVoteVotes,
      totalVotes: continueVotes + startVoteVotes
    };
  }

  getActionVoteStatus() {
    let continueVotes = 0;
    let startVoteVotes = 0;

    Object.values(this.actionVotes).forEach(action => {
      if (action === 'continue') {
        continueVotes++;
      } else if (action === 'start_vote') {
        startVoteVotes++;
      }
    });

    // Only expose and count human players — bots don't vote in action choice
    const humanPlayers = this.players.filter(p => !p.isBot);

    return {
      continueVotes,
      startVoteVotes,
      totalPlayers: humanPlayers.length,
      hasVoted: humanPlayers.map(p => ({
        id: p.id,
        name: p.name,
        hasVoted: p.actionVote !== null,
        vote: p.actionVote
      }))
    };
  }

  allActionVotesSubmitted() {
    // Bots don't participate in action choice — only check human players
    const humanPlayers = this.players.filter(p => !p.isBot);
    if (humanPlayers.length === 0) return true;
    return humanPlayers.every(p => p.actionVote !== null);
  }

  getVoteResults() {
    // Find player(s) with most votes
    let maxVotes = 0;
    this.players.forEach(player => {
      if (player.votesReceived > maxVotes) {
        maxVotes = player.votesReceived;
      }
    });

    // Collect all players tied at the max vote count
    const topPlayers = maxVotes > 0
      ? this.players.filter(p => p.votesReceived === maxVotes)
      : [];

    const tie = topPlayers.length > 1;

    // On a tie, randomly pick one of the tied players to eliminate
    const votedOut = topPlayers.length > 0
      ? topPlayers[Math.floor(Math.random() * topPlayers.length)]
      : null;

    const impostor = this.players.find(p => p.id === this.impostorId);
    const impostorCaught = votedOut && votedOut.id === this.impostorId;
    const detectivesWin = !!impostorCaught;

    return {
      votedOut: votedOut ? { id: votedOut.id, name: votedOut.name, profilePicIndex: votedOut.profilePicIndex, avatar: votedOut.avatar } : null,
      tie,
      tiedPlayers: tie ? topPlayers.map(p => ({ id: p.id, name: p.name, profilePicIndex: p.profilePicIndex, avatar: p.avatar })) : [],
      impostorCaught,
      detectivesWin,
      impostor: { id: impostor.id, name: impostor.name, profilePicIndex: impostor.profilePicIndex, avatar: impostor.avatar },
      votes: this.votes,
      voteDetails: this.players.map(p => ({
        id: p.id,
        name: p.name,
        profilePicIndex: p.profilePicIndex,
        avatar: p.avatar,
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

  voteSkipDiscussion(playerId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return { success: false, error: 'Player not found' };
    if (this.phase !== GAME_PHASES.DISCUSSION) return { success: false, error: 'Not in discussion phase' };

    this.skipDiscussionVotes[playerId] = true;
    const humanPlayers = this.players.filter(p => !p.isBot);
    const voteCount = Object.keys(this.skipDiscussionVotes).length;
    const needed = Math.ceil(humanPlayers.length / 2);
    const shouldSkip = voteCount >= needed;
    return { success: true, voteCount, needed, totalHumans: humanPlayers.length, shouldSkip };
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
        votesReceived: p.votesReceived,
        actionVote: p.actionVote
      })),
      clues: this.clues,
      allCluesHistory: this.allCluesHistory,
      phaseEndTime: this.phaseEndTime,
      actionVoteStatus: this.phase === GAME_PHASES.ACTION_CHOICE ? this.getActionVoteStatus() : null
    };
  }

  getPlayerState(playerId) {
    const state = this.getState();
    const player = this.players.find(p => p.id === playerId);
    
    // Hide sensitive info based on role and phase
    return {
      ...state,
      myRole: player?.role,
      word: (player?.role === 'impostor' && this.phase !== GAME_PHASES.GAME_OVER) ? null : this.word,
      // Hide other players' roles until game over
      players: state.players.map(p => ({
        ...p,
        role: this.phase === GAME_PHASES.GAME_OVER ? p.role : (p.id === playerId ? p.role : null)
      })),
      impostorId: this.phase === GAME_PHASES.GAME_OVER ? this.impostorId : null
    };
  }

  startRound() {
    console.log(`[Game ${this.id}] ============ STARTING ROUND ${this.round + 1} ============`);
    console.log(`[Game ${this.id}] allCluesHistory at startRound (before increment):`, JSON.stringify(this.allCluesHistory, null, 2));
    
    // Select new random word and category
    const { category, word } = this.getRandomCategoryAndWord();
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
    
    console.log(`[Game ${this.id}] Round ${this.round + 1} Impostor: ${this.players[impostorIndex].name}`);

    // Randomize turn order
    this.players = this.shuffleArray([...this.players]);
    
    this.round++;
    console.log(`[Game ${this.id}] ✓ Round incremented to ${this.round}`);
    console.log(`[Game ${this.id}] allCluesHistory after round increment:`, JSON.stringify(this.allCluesHistory, null, 2));
    
    this.currentPlayerIndex = 0;
    this.clues = [];
    this.votes = {};
    this.skipDiscussionVotes = {};

    this.phase = GAME_PHASES.ROLE_REVEAL;
    this.phaseEndTime = null;
    this.phaseTimer = null;
    
    return this.getState();
  }
}

module.exports = { Game, GAME_PHASES, PHASE_DURATIONS };
