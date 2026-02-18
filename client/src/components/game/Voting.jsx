import { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { getProfilePic } from '../../constants/profilePics';
import './GamePhases.css';

export default function Voting({ players, currentPlayerId, timeLeft, allCluesHistory, currentRound }) {
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [showingPlayerCluesId, setShowingPlayerCluesId] = useState(null);
  const { submitVote } = useGameStore();

  // Ensure allCluesHistory is always an array
  const cluesHistory = allCluesHistory || [];

  if (typeof allCluesHistory === 'undefined') {
    console.warn('⚠️ [Voting] WARNING: allCluesHistory is UNDEFINED! Button cannot show.');
  } else if (!Array.isArray(allCluesHistory)) {
    console.error('❌ [Voting] ERROR: allCluesHistory is not an array!', typeof allCluesHistory, allCluesHistory);
  } else if (allCluesHistory.length === 0) {
    console.warn('[Voting] allCluesHistory is an empty array');
  } else {
    console.log(`✓ [Voting] allCluesHistory received with ${allCluesHistory.length} entries`);
  }

  // Debug logging
  useEffect(() => {
    console.log('\n========== [VOTING COMPONENT] ==========');
    console.log('[Voting] allCluesHistory prop received:', allCluesHistory);
    console.log('[Voting] cluesHistory (after default):', cluesHistory);
    console.log('[Voting] Total clues in history:', cluesHistory.length);
    console.log('[Voting] Players:', players.map(p => ({ id: p.id, name: p.name })));
    
    // Log which players have previous clues
    console.log('\n[Voting] Player clue analysis:');
    players.forEach(player => {
      const playerClues = cluesHistory.filter(c => c.playerId === player.id);
      const uniqueRounds = new Set(playerClues.map(c => c.round));
      const hasPrev = uniqueRounds.size > 1;
      console.log(`  ${player.name}: ${playerClues.length} clues from rounds [${Array.from(uniqueRounds).sort()}], hasPreviousClues=${hasPrev}`);
    });
    console.log('========== [END VOTING] ==========\n');
  }, [cluesHistory, players, allCluesHistory]);

  const handleVote = async (playerId) => {
    if (playerId === currentPlayerId || hasVoted) return;
    
    setSelectedPlayer(playerId);
    try {
      await submitVote(playerId);
      setHasVoted(true);
    } catch (err) {
      console.error('Failed to submit vote:', err);
      setSelectedPlayer(null);
    }
  };

  const getLatestClue = (playerId) => {
    // Only show clues from the current round
    const playerCluesThisRound = cluesHistory.filter(c => c.playerId === playerId && c.round === currentRound);
    if (playerCluesThisRound.length === 0) return '';
    return playerCluesThisRound[playerCluesThisRound.length - 1].clue;
  };

  const getCluesByRound = (playerId) => {
    const playerClues = cluesHistory.filter(c => c.playerId === playerId);
    const cluesByRound = {};
    playerClues.forEach(c => {
      // Always take the latest clue for each round (last one wins)
      cluesByRound[c.round] = c.clue;
    });
    return cluesByRound;
  };

  const getShowingPlayer = () => {
    return players.find(p => p.id === showingPlayerCluesId);
  };

  const playerHasPreviousClues = (playerId) => {
    const playerClues = cluesHistory.filter(c => c.playerId === playerId);
    const uniqueRounds = new Set(playerClues.map(c => c.round));
    return uniqueRounds.size > 1;
  };

  return (
    <div className="phase-container voting-container">
      {timeLeft !== null && (
        <div className={`game-timer ${timeLeft <= 10 ? 'warning' : ''}`}>
          {timeLeft} seconds
        </div>
      )}

      <h2 className="voting-title">Who is the Impostor?</h2>
      <p className="voting-instruction">Click to vote</p>

      {showingPlayerCluesId && (
        <div className="previous-clues-modal" onClick={() => setShowingPlayerCluesId(null)}>
          <div className="previous-clues-content" onClick={(e) => e.stopPropagation()}>
            <button 
              className="modal-close-btn"
              onClick={() => setShowingPlayerCluesId(null)}
            >
              ✕
            </button>
            
            {getShowingPlayer() && (
              <div className="modal-player-clues">
                <h3 className="modal-player-name">{getShowingPlayer().name}</h3>
                {(() => {
                  const cluesByRound = getCluesByRound(showingPlayerCluesId);
                  const rounds = Object.keys(cluesByRound).sort((a, b) => parseInt(a) - parseInt(b));
                  
                  return (
                    <div className="modal-rounds-list">
                      {rounds.map((round) => (
                        <div key={round} className="modal-round-item">
                          <span className="modal-round-label">Round {round}</span>
                          <span className="modal-round-clue">"{cluesByRound[round]}"</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="voting-list">
        {players.map((player) => {
          const isSelf = player.id === currentPlayerId;
          const isSelected = selectedPlayer === player.id;
          const latestClue = getLatestClue(player.id);
          const hasPreviousClues = playerHasPreviousClues(player.id);
          
          return (
            <div
              key={player.id}
              className={`vote-player-item ${isSelf ? 'self' : ''} ${isSelected ? 'selected' : ''} ${hasVoted && !isSelected ? 'disabled' : ''} ${player.hasVoted ? 'voted' : ''}`}
              onClick={() => handleVote(player.id)}
            >
              <div className="vote-player-name-section">
                <div className="vote-player-name">{player.name}</div>
                {isSelf && <span className="self-badge">You</span>}
              </div>

              <div className="vote-player-avatar">
                {player.profilePicIndex !== undefined ? (
                  <img 
                    src={getProfilePic(player.profilePicIndex)} 
                    alt={player.name}
                  />
                ) : (
                  <div 
                    style={{ backgroundColor: player.avatar || '#FFD700' }}
                  >
                    {player.name?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {latestClue && <div className="vote-player-clue">"{latestClue}"</div>}

              {hasPreviousClues && (
                <button
                  className="player-previous-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowingPlayerCluesId(player.id);
                  }}
                  title="View previous clues from other rounds"
                >
                  Previous
                </button>
              )}

              {player.hasVoted && <span className="voted-badge">✓</span>}
            </div>
          );
        })}
      </div>

      {hasVoted && (
        <p className="voting-waiting">Waiting for other players...</p>
      )}
    </div>
  );
}
