import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import './CreateLobby.css';

export default function CreateLobby() {
  const navigate = useNavigate();
  const { createLobby, isLoading, error } = useGameStore();
  const [lobbyName, setLobbyName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [password, setPassword] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  const handleCreate = async () => {
    if (!lobbyName.trim()) return;
    
    try {
      await createLobby(
        lobbyName.trim(),
        maxPlayers,
        isPrivate ? password : null
      );
      navigate('/lobby');
    } catch (err) {
      console.error('Failed to create lobby:', err);
    }
  };

  return (
    <div className="create-page page-container">
      <div className="create-content animate-fade-in">
        <button className="back-btn" onClick={() => navigate('/menu')}>
          Back
        </button>

        <h2 className="create-title">Create a Lobby</h2>

        <div className="create-form card">
          <div className="form-group">
            <label>Lobby Name</label>
            <input
              type="text"
              className="input"
              placeholder="Enter lobby name"
              value={lobbyName}
              onChange={(e) => setLobbyName(e.target.value)}
              maxLength={30}
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="password-row">
              <input
                type="password"
                className="input"
                placeholder={isPrivate ? "Enter password" : "No password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={!isPrivate}
              />
              <button 
                className={`lock-toggle ${isPrivate ? 'active' : ''}`}
                onClick={() => setIsPrivate(!isPrivate)}
                title={isPrivate ? 'Private lobby' : 'Public lobby'}
              >
                {isPrivate ? 'L' : 'U'}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Player Count: {maxPlayers}</label>
            <div className="slider-container">
              <span className="slider-label">3</span>
              <input
                type="range"
                className="slider"
                min="3"
                max="10"
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
              />
              <span className="slider-label">10</span>
            </div>
          </div>

          {error && <p className="error-text">{error}</p>}

          <button 
            className="btn btn-primary create-btn"
            onClick={handleCreate}
            disabled={!lobbyName.trim() || isLoading || (isPrivate && !password)}
          >
            {isLoading ? 'Creating...' : 'Create Lobby'}
          </button>
        </div>
      </div>
    </div>
  );
}
