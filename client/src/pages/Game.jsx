import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore, GAME_PHASES } from '../store/gameStore';
import RoleReveal from '../components/game/RoleReveal';
import ThemeReveal from '../components/game/ThemeReveal';
import WordReveal from '../components/game/WordReveal';
import ClueSubmission from '../components/game/ClueSubmission';
import Discussion from '../components/game/Discussion';
import Voting from '../components/game/Voting';
import VoteResults from '../components/game/VoteResults';
import GameOver from '../components/game/GameOver';
import './Game.css';

export default function Game() {
  const navigate = useNavigate();
  const { gameState, lobby, player, timerEndTime, voteResults } = useGameStore();
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    if (!gameState && !lobby) {
      navigate('/menu');
    } else if (!gameState && lobby) {
      navigate('/lobby');
    }
  }, [gameState, lobby, navigate]);

  // Timer countdown
  useEffect(() => {
    if (!timerEndTime) {
      setTimeLeft(null);
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(0, Math.ceil((timerEndTime - Date.now()) / 1000));
      setTimeLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 100);
    return () => clearInterval(interval);
  }, [timerEndTime]);

  if (!gameState) return null;

  const renderPhase = () => {
    switch (gameState.phase) {
      case GAME_PHASES.ROLE_REVEAL:
        return <RoleReveal role={gameState.myRole} player={player} />;
      
      case GAME_PHASES.THEME_REVEAL:
        return <ThemeReveal category={gameState.category} />;
      
      case GAME_PHASES.WORD_REVEAL:
        return <WordReveal word={gameState.word} isImpostor={gameState.myRole === 'impostor'} />;
      
      case GAME_PHASES.CLUE_SUBMISSION:
        return (
          <ClueSubmission 
            gameState={gameState} 
            player={player}
            timeLeft={timeLeft}
          />
        );
      
      case GAME_PHASES.DISCUSSION:
        return (
          <Discussion 
            clues={gameState.clues}
            timeLeft={timeLeft}
          />
        );
      
      case GAME_PHASES.VOTING:
        return (
          <Voting 
            players={gameState.players}
            currentPlayerId={player?.id}
            timeLeft={timeLeft}
          />
        );
      
      case GAME_PHASES.VOTE_RESULTS:
        return <VoteResults voteResults={voteResults} players={gameState.players} />;
      
      case GAME_PHASES.GAME_OVER:
        return (
          <GameOver 
            voteResults={voteResults}
            gameState={gameState}
            player={player}
          />
        );
      
      default:
        return <div>Loading...</div>;
    }
  };

  return (
    <div className="game-page page-container">
      <div className="game-content animate-fade-in">
        {gameState.phase !== GAME_PHASES.ROLE_REVEAL && (
          <div className="game-info-bar card">
            <div className="game-info-item">
              <span className="game-info-label">Category</span>
              <span className="game-info-value">{gameState.category || 'Unknown'}</span>
            </div>
            <div className="game-info-item">
              <span className="game-info-label">Word</span>
              <span className="game-info-value">
                {gameState.myRole === 'impostor' ? '???' : (gameState.word || 'Unknown')}
              </span>
            </div>
            <div className="game-info-item">
              <span className="game-info-label">Round</span>
              <span className="game-info-value">{gameState.round}</span>
            </div>
          </div>
        )}
        {renderPhase()}
      </div>
    </div>
  );
}
