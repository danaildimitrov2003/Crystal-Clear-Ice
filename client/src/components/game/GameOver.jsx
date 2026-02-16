import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import './GamePhases.css';

export default function GameOver({ voteResults, gameState, player }) {
  const navigate = useNavigate();
  const { returnToLobby, startNewRound } = useGameStore();

  const handleReturnToLobby = () => {
    returnToLobby();
    navigate('/lobby');
  };

  if (!voteResults) return <div>Loading results...</div>;

  const { votedOut, detectivesWin, impostor, tie } = voteResults;

  return (
    <div className="phase-container game-over-container">
      <div 
        className="avatar avatar-large"
        style={{ backgroundColor: player?.avatar || '#FFD700' }}
      >
        {player?.name?.charAt(0).toUpperCase()}
      </div>

      {tie ? (
        <>
          <p className="result-message">
            It's a <span className="result-highlight wrong">tie!</span>
          </p>
          <p className="result-message">
            The <span className="result-highlight wrong">impostor wins!</span>
          </p>
        </>
      ) : votedOut ? (
        <>
          <p className="result-message">
            The majority chose{' '}
            <span className={`result-highlight ${detectivesWin ? 'correct' : 'wrong'}`}>
              {votedOut.name}
            </span>
          </p>
          <p className="result-message">
            {detectivesWin 
              ? "They ARE the impostor!" 
              : "They are NOT the impostor!"
            }
          </p>
          <p className="result-message">
            {detectivesWin 
              ? <span className="result-highlight correct">Detectives win!</span>
              : <span className="result-highlight wrong">Impostor wins!</span>
            }
          </p>
        </>
      ) : (
        <p className="result-message">No one was voted out!</p>
      )}

      <div className="impostor-reveal">
        <p>
          The real impostor was{' '}
          <span className="result-highlight wrong">{impostor.name}</span>
        </p>
      </div>

      <div className="word-reveal-final">
        <p>The word was: <strong>{gameState.word}</strong></p>
        <p>Category: <strong>{gameState.category}</strong></p>
      </div>

      <div className="game-over-buttons">
        <button className="btn btn-primary" onClick={startNewRound}>
          Play Again
        </button>
        <button className="btn btn-secondary" onClick={handleReturnToLobby}>
          Return to Lobby
        </button>
      </div>
    </div>
  );
}
