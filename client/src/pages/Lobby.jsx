import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import './Lobby.css';

export default function Lobby() {
  const navigate = useNavigate();
  const { player, lobby, gameState, leaveLobby, startGame, addBot, isLoading, error } = useGameStore();
  const isDev = import.meta.env.DEV;

  useEffect(() => {
    if (!lobby) {
      navigate('/menu');
      return;
    }
    
    if (gameState) {
      navigate('/game');
    }
  }, [lobby, gameState, navigate]);

  const handleLeave = async () => {
    await leaveLobby();
    navigate('/menu');
  };

  const handleStart = async () => {
    try {
      await startGame();
      navigate('/game');
    } catch (err) {
      console.error('Failed to start game:', err);
    }
  };

  const handleAddBot = async () => {
    try {
      await addBot();
    } catch (err) {
      console.error('Failed to add bot:', err);
    }
  };

  const isHost = player?.id === lobby?.hostId;
  const minPlayers = import.meta.env.DEV ? 1 : 3;
  const canStart = lobby?.players?.length >= minPlayers;

  if (!lobby) return null;

  return (
    <div className="lobby-page page-container">
      <div className="lobby-content animate-fade-in">
        <div className="lobby-header card">
          <div className="lobby-title-row">
            <h2 className="lobby-name">{lobby.name}</h2>
            <div className="lobby-actions">
              {isDev && isHost && lobby.players.length < lobby.maxPlayers && (
                <button 
                  className="btn btn-secondary add-bot-btn"
                  onClick={handleAddBot}
                  disabled={isLoading}
                >
                  Add Bot
                </button>
              )}
              {isHost && (
                <button 
                  className="btn btn-primary start-btn"
                  onClick={handleStart}
                  disabled={!canStart || isLoading}
                >
                  {isLoading ? 'Starting...' : 'Start Game'}
                </button>
              )}
            </div>
          </div>
          <div className="lobby-code">
            Code: <span className="code-value">{lobby.code}</span>
          </div>
          {!canStart && (
            <p className="min-players-hint">Need at least {minPlayers} player{minPlayers > 1 ? 's' : ''} to start</p>
          )}
        </div>

        <div className="players-grid">
          {lobby.players.map((p) => (
            <div key={p.id} className="player-card card">
              <div className="player-name-tag">{p.name}</div>
              <div 
                className="avatar avatar-large"
                style={{ backgroundColor: p.avatar || '#FFD700' }}
              >
                {p.name?.charAt(0).toUpperCase()}
              </div>
              {p.isHost && <span className="host-badge">Host</span>}
            </div>
          ))}
          
          {/* Empty slots */}
          {Array.from({ length: lobby.maxPlayers - lobby.players.length }).map((_, i) => (
            <div key={`empty-${i}`} className="player-card card empty">
              <div className="empty-slot">
                <div className="avatar avatar-large empty-avatar">?</div>
                <span>Waiting...</span>
              </div>
            </div>
          ))}
        </div>

        {error && <p className="error-text">{error}</p>}

        <button className="btn btn-secondary leave-btn" onClick={handleLeave}>
          Leave Lobby
        </button>
      </div>
    </div>
  );
}
