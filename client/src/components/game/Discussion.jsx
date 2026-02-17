import { useGameStore } from '../../store/gameStore';
import './GamePhases.css';

export default function Discussion({ clues, timeLeft }) {
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

      <p className="discussion-note">After discussion, you'll vote on whether to continue or start voting for the impostor.</p>
    </div>
  );
}
