import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import './GamePhases.css';

export default function ClueSubmission({ gameState, player, timeLeft }) {
  const [clue, setClue] = useState('');
  const { submitClue } = useGameStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === player?.id;
  const hasSubmitted = gameState.players.find(p => p.id === player?.id)?.clue !== null;

  const handleSubmit = async () => {
    if (!clue.trim() || !isMyTurn || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await submitClue(clue.trim());
      setClue('');
    } catch (err) {
      console.error('Failed to submit clue:', err);
    }
    setIsSubmitting(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="phase-container clue-submission">
      {timeLeft !== null && (
        <div className={`game-timer ${timeLeft <= 10 ? 'warning' : ''}`}>
          {timeLeft} seconds
        </div>
      )}

      <div className="current-player-info">
        <div 
          className="avatar avatar-large"
          style={{ backgroundColor: currentPlayer?.avatar || '#FFD700' }}
        >
          {currentPlayer?.name?.charAt(0).toUpperCase()}
        </div>
        <p className="turn-indicator">
          {isMyTurn ? "It's your turn!" : `${currentPlayer?.name}'s turn`}
        </p>
      </div>

      {isMyTurn && !hasSubmitted ? (
        <div className="clue-form">
          <input
            type="text"
            className="input"
            placeholder="Enter your clue..."
            value={clue}
            onChange={(e) => setClue(e.target.value)}
            onKeyPress={handleKeyPress}
            maxLength={50}
            autoFocus
          />
          <button 
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={!clue.trim() || isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Clue'}
          </button>
          <p className="clue-hint">
            {gameState.myRole === 'impostor' 
              ? "Give a clue that won't reveal you don't know the word!" 
              : "Give a clue about the word without revealing it directly!"
            }
          </p>
        </div>
      ) : hasSubmitted ? (
        <p className="waiting-text">Waiting for other players...</p>
      ) : (
        <p className="waiting-text">Wait for your turn...</p>
      )}

      {gameState.clues.length > 0 && (
        <div className="clues-list">
          <h3>Clues so far:</h3>
          {gameState.clues.map((c, index) => (
            <div key={index} className="clue-item card">
              <span className="player-name">{c.playerName}:</span>
              <span className="clue-text">"{c.clue}"</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
