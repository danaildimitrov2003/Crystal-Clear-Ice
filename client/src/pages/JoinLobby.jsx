import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import './JoinLobby.css';

export default function JoinLobby() {
  const navigate = useNavigate();
  const { lobbies, fetchLobbies, joinLobby, joinLobbyByCode, isLoading, error, clearError } = useGameStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [lobbyCode, setLobbyCode] = useState('');
  const [selectedLobby, setSelectedLobby] = useState(null);
  const [password, setPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    fetchLobbies();
    const interval = setInterval(fetchLobbies, 5000);
    return () => clearInterval(interval);
  }, [fetchLobbies]);

  const filteredLobbies = lobbies.filter(lobby => 
    lobby.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleJoinByCode = async () => {
    if (!lobbyCode.trim()) return;
    try {
      const response = await joinLobbyByCode(lobbyCode.trim().toUpperCase(), password);
      navigate(`/lobby/${response.lobby.code}`);
    } catch (err) {
      console.error('Failed to join lobby:', err);
    }
  };

  const handleJoinLobby = async (lobby) => {
    if (lobby.isPrivate) {
      setSelectedLobby(lobby);
      setShowPasswordModal(true);
      return;
    }
    
    try {
      const response = await joinLobby(lobby.id);
      navigate(`/lobby/${response.lobby.code}`);
    } catch (err) {
      console.error('Failed to join lobby:', err);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!selectedLobby) return;
    try {
      const response = await joinLobby(selectedLobby.id, password);
      navigate(`/lobby/${response.lobby.code}`);
    } catch (err) {
      console.error('Failed to join lobby:', err);
    }
  };

  return (
    <div className="join-page page-container">
      <div className="join-content animate-fade-in">
        <button className="back-btn" onClick={() => navigate('/')}>
          Back
        </button>

        <h2 className="join-title">Join a Lobby</h2>

        {/* Join by code */}
        <div className="join-code-section card">
          <h3>Join by Code</h3>
          <div className="code-input-group">
            <input
              type="text"
              className="input code-input"
              placeholder="Enter lobby code"
              value={lobbyCode}
              onChange={(e) => setLobbyCode(e.target.value.toUpperCase())}
              maxLength={6}
            />
            <button 
              className="btn btn-primary"
              onClick={handleJoinByCode}
              disabled={!lobbyCode.trim() || isLoading}
            >
              Join
            </button>
          </div>
        </div>

        {/* Search lobbies */}
        <div className="lobby-search-section">
          <div className="search-bar">
            <input
              type="text"
              className="input"
              placeholder="Search lobbies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <span className="search-icon">🔍</span>
          </div>

          <div className="lobbies-list">
            {filteredLobbies.length === 0 ? (
              <div className="no-lobbies">
                <p>No public lobbies available</p>
                <p className="hint">Create one or join with a code!</p>
              </div>
            ) : (
              filteredLobbies.map(lobby => (
                <div 
                  key={lobby.id} 
                  className="lobby-item card"
                  onClick={() => handleJoinLobby(lobby)}
                >
                  <div className="lobby-info">
                    <span className="lobby-name">{lobby.name}</span>
                    <span className="lobby-players">
                      {lobby.playerCount}/{lobby.maxPlayers} players
                    </span>
                  </div>
                  {lobby.isPrivate && <span className="lock-icon">🔒</span>}
                </div>
              ))
            )}
          </div>
        </div>

        {error && <p className="error-text">{error}</p>}
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="modal-overlay" onClick={() => {
          setShowPasswordModal(false);
          setPassword('');
          clearError();
        }}>
          <div className="modal card" onClick={e => e.stopPropagation()}>
            <h3>Enter Password</h3>
            <input
              type="password"
              className="input"
              placeholder="Lobby password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            {error && <p className="error-text">{error}</p>}
            <div className="modal-buttons">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowPasswordModal(false);
                  setPassword('');
                  clearError();
                }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handlePasswordSubmit}
                disabled={isLoading}
              >
                Join
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
