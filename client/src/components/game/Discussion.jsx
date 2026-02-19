import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import './GamePhases.css';

export default function Discussion({ clues, timeLeft, gameState, player }) {
  const { voteSkipDiscussion } = useGameStore();
  const [hasVotedSkip, setHasVotedSkip] = useState(false);

  const voteCount = gameState?.skipDiscussionVoteCount || 0;
  const needed = gameState?.skipDiscussionNeeded ?? null;
  const totalHumans = gameState?.skipDiscussionTotalHumans || 0;

  const handleVoteSkip = () => {
    if (hasVotedSkip) return;
    setHasVotedSkip(true);
    voteSkipDiscussion();
  };

  return (
    <div className="phase-container discussion-container">
      {timeLeft !== null && (
        <div className={`game-timer ${timeLeft <= 10 ? 'warning' : ''}`}>
          {timeLeft} seconds
        </div>
      )}

      <h2 className="discussion-title">Discussion Time!</h2>
      <p>Discuss who you think the impostor is</p>

      {clues.length > 0 && (
        <div className="clues-list">
          <h3>All Clues:</h3>
          {clues.map((c, index) => (
            <div key={index} className="clue-item card">
              <span className="player-name">{c.playerName}:</span>
              <span className="clue-text">"{c.clue}"</span>
            </div>
          ))}
        </div>
      )}

      {/* Vote to skip discussion */}
      <div className="skip-discussion-section">
        <button
          className={`skip-discussion-btn${hasVotedSkip ? ' voted' : ''}`}
          onClick={handleVoteSkip}
          disabled={hasVotedSkip}
        >
          {hasVotedSkip ? '✓ Voted to Skip' : 'Vote to Skip Discussion'}
        </button>
        {needed !== null && (
          <p className="skip-vote-progress">
            {voteCount} / {needed} votes needed to skip
          </p>
        )}
      </div>

      <p className="discussion-note">After discussion, you'll vote on whether to continue or start voting for the impostor.</p>
    </div>
  );
}
