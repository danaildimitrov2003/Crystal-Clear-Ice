import { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { getProfilePic } from '../../constants/profilePics';
import './GamePhases.css';

export default function ActionChoice({ gameState, player, timeLeft }) {
  const { submitActionVote } = useGameStore();
  const [selectedAction, setSelectedAction] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const actionVoteStatus = gameState?.actionVoteStatus || {
    continueVotes: 0,
    startVoteVotes: 0,
    totalPlayers: 0,
    hasVoted: []
  };

  const totalVotes = actionVoteStatus.continueVotes + actionVoteStatus.startVoteVotes;
  const continuePercentage = totalVotes > 0 ? Math.round((actionVoteStatus.continueVotes / totalVotes) * 100) : 0;
  const votePercentage = totalVotes > 0 ? Math.round((actionVoteStatus.startVoteVotes / totalVotes) * 100) : 0;

  const handleVote = async (action) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSelectedAction(action);

    try {
      await submitActionVote(action);
    } catch (error) {
      console.error('Error submitting action vote:', error);
      setSelectedAction(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const playerHasVoted = actionVoteStatus.hasVoted?.find(v => v.id === player?.id)?.hasVoted || false;
  const playerVote = actionVoteStatus.hasVoted?.find(v => v.id === player?.id)?.vote || null;

  return (
    <div className="phase-container action-choice-container">
      {timeLeft !== null && (
        <div className={`game-timer ${timeLeft <= 10 ? 'warning' : ''}`}>
          {timeLeft} seconds
        </div>
      )}

      <h2 className="action-choice-title">What should we do?</h2>
      <p className="action-choice-subtitle">Decide as a group: Continue or Start Voting?</p>

      {/* Vote Counts Display */}
      <div className="action-vote-counts">
        <div className="vote-count-item">
          <div className="vote-count-label">Continue</div>
          <div className="vote-bar-container">
            <div 
              className="vote-bar continue-bar" 
              style={{ width: `${continuePercentage || 0}%` }}
            >
              {continuePercentage > 5 && <span>{continuePercentage}%</span>}
            </div>
          </div>
          <div className="vote-count-number">{actionVoteStatus.continueVotes} votes</div>
        </div>

        <div className="vote-count-divider">vs</div>

        <div className="vote-count-item">
          <div className="vote-count-label">Start Vote</div>
          <div className="vote-bar-container">
            <div 
              className="vote-bar start-vote-bar" 
              style={{ width: `${votePercentage || 0}%` }}
            >
              {votePercentage > 5 && <span>{votePercentage}%</span>}
            </div>
          </div>
          <div className="vote-count-number">{actionVoteStatus.startVoteVotes} votes</div>
        </div>
      </div>

      {/* Players Who Have Voted */}
      {actionVoteStatus.hasVoted?.length > 0 && (
        <div className="voted-players">
          <h3>Players:</h3>
          <div className="voted-players-list">
            {actionVoteStatus.hasVoted.map(playerVote => (
              <div 
                key={playerVote.id} 
                className={`voted-player-item ${playerVote.vote ? 'voted' : 'not-voted'}`}
              >
                <span className="player-name">{playerVote.name}</span>
                {playerVote.hasVoted && (
                  <span className={`vote-badge ${playerVote.vote}`}>
                    {playerVote.vote === 'continue' ? 'Continue' : 'Start Vote'}
                  </span>
                )}
                {!playerVote.hasVoted && (
                  <span className="vote-badge pending">Waiting...</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="action-choice-buttons">
        <button 
          className={`action-choice-btn continue-action-btn ${playerVote === 'continue' ? 'selected' : ''}`}
          onClick={() => handleVote('continue')}
          disabled={isSubmitting}
        >
          {playerVote === 'continue' ? '✓ Continue' : 'Continue'}
        </button>
        <button 
          className={`action-choice-btn vote-action-btn ${playerVote === 'start_vote' ? 'selected' : ''}`}
          onClick={() => handleVote('start_vote')}
          disabled={isSubmitting}
        >
          {playerVote === 'start_vote' ? '✓ Start Vote' : 'Start Vote'}
        </button>
      </div>

      {playerHasVoted && (
        <p className="vote-confirmation">Your vote has been recorded!</p>
      )}
    </div>
  );
}
