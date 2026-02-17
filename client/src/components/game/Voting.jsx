import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { getProfilePic } from '../../constants/profilePics';
import './GamePhases.css';

export default function Voting({ players, currentPlayerId, timeLeft }) {
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  const { submitVote } = useGameStore();

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

  return (
    <div className="phase-container voting-container">
      {timeLeft !== null && (
        <div className={`game-timer ${timeLeft <= 10 ? 'warning' : ''}`}>
          {timeLeft} seconds
        </div>
      )}

      <h2 className="voting-title">Voting Time!</h2>
      <p className="voting-instruction">Vote for the impostor!</p>

      <div className="voting-grid">
        {players.map((player) => {
          const isSelf = player.id === currentPlayerId;
          const isSelected = selectedPlayer === player.id;
          
          return (
            <div
              key={player.id}
              className={`vote-player-card card ${isSelf ? 'self' : ''} ${isSelected ? 'selected' : ''} ${hasVoted && !isSelected ? 'disabled' : ''} ${player.hasVoted ? 'voted' : ''}`}
              onClick={() => handleVote(player.id)}
            >
              <span className="player-name-tag">{player.name}</span>
              {player.profilePicIndex !== undefined ? (
                <img 
                  src={getProfilePic(player.profilePicIndex)} 
                  alt={player.name}
                  className="avatar"
                />
              ) : (
                <div 
                  className="avatar"
                  style={{ backgroundColor: player.avatar || '#FFD700' }}
                >
                  {player.name?.charAt(0).toUpperCase()}
                </div>
              )}
              {player.hasVoted && <span className="voted-badge">Voted</span>}
              {isSelf && <span className="self-badge">(You)</span>}
            </div>
          );
        })}
      </div>

      {hasVoted && (
        <p className="waiting-text">Waiting for other players to vote...</p>
      )}
    </div>
  );
}
