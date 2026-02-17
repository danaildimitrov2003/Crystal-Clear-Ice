import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { profilePics, getProfilePic } from '../constants/profilePics';
import './Lobby.css';
import './WordsEditor.css';

export default function Lobby() {
  const navigate = useNavigate();
  const { lobbyId } = useParams();
  const fileInputRef = useRef(null);
  const modalRef = useRef(null);
  const modalContentRef = useRef(null);
  const [uploadError, setUploadError] = useState(null);
  const [showWordsEditor, setShowWordsEditor] = useState(false);
  const [editableWords, setEditableWords] = useState({});
  const [inviteCopied, setInviteCopied] = useState(false);
  const { player, lobby, gameState, leaveLobby, startGame, addBot, isLoading, error, uploadCustomWords, serverConfig } = useGameStore();

  useEffect(() => {
    if (gameState) {
      navigate('/game');
    }
  }, [gameState, navigate]);

  // If not in a lobby, redirect home
  useEffect(() => {
    if (!lobby) {
      navigate('/', { replace: true });
    } else if (lobby.code !== lobbyId) {
      navigate(`/lobby/${lobby.code}`, { replace: true });
    }
  }, [lobby, lobbyId, navigate]);

  // Handle click outside modal
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && event.target === modalRef.current) {
        setShowWordsEditor(false);
      }
    };

    if (showWordsEditor) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showWordsEditor]);

  const handleLeave = async () => {
    await leaveLobby();
    navigate('/');
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

  const handleInviteFriends = async () => {
    if (!lobby?.id) return;
    const inviteLink = `${window.location.origin}/lobby/${lobby.code}`;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(inviteLink);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = inviteLink;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy invite link:', err);
    }
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    try {
      const content = await file.text();
      const data = JSON.parse(content);
      
      // Validate JSON structure
      if (!data || typeof data !== 'object') {
        throw new Error('JSON must be an object');
      }

      // Validate that it has word categories
      const hasValidCategories = Object.values(data).some(val => 
        Array.isArray(val) && val.length > 0
      );
      
      if (!hasValidCategories) {
        throw new Error('JSON must contain categories with word arrays. Example: { "animals": ["cat", "dog"], "food": ["pizza", "burger"] }');
      }
      await uploadCustomWords(data);
      setEditableWords(data);
      setUploadError(null);
    } catch (err) {
      setUploadError(err.message);
      console.error('Failed to upload custom words:', err);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openWordsEditor = () => {
    // Initialize editable words from lobby's custom words or lobby's current words
    const initialWords = lobby?.customWords || lobby?.currentWords || {};
    setEditableWords(JSON.parse(JSON.stringify(initialWords)));
    setShowWordsEditor(true);
  };

  const closeWordsEditor = () => {
    setShowWordsEditor(false);
  };

  const scrollToTop = () => {
    if (modalContentRef.current) {
      modalContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const saveWords = async () => {
    try {
      await uploadCustomWords(editableWords);
      setShowWordsEditor(false);
    } catch (err) {
      setUploadError(err.message);
      console.error('Failed to save words:', err);
    }
  };

  const exportWords = () => {
    const dataStr = JSON.stringify(editableWords, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `game-words-${new Date().getTime()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const addCategory = () => {
    const newCategoryName = `category${Object.keys(editableWords).length + 1}`;
    setEditableWords(prev => ({
      [newCategoryName]: [''],
      ...prev
    }));
  };

  const removeCategory = (categoryName) => {
    setEditableWords(prev => {
      const updated = { ...prev };
      delete updated[categoryName];
      return updated;
    });
  };

  const addWordToCategory = (categoryName) => {
    setEditableWords(prev => ({
      ...prev,
      [categoryName]: [...(prev[categoryName] || []), '']
    }));
  };

  const removeWordFromCategory = (categoryName, wordIndex) => {
    setEditableWords(prev => ({
      ...prev,
      [categoryName]: prev[categoryName].filter((_, i) => i !== wordIndex)
    }));
  };

  const updateWord = (categoryName, wordIndex, value) => {
    setEditableWords(prev => ({
      ...prev,
      [categoryName]: prev[categoryName].map((w, i) => i === wordIndex ? value : w)
    }));
  };

  const updateCategoryName = (oldName, newName) => {
    if (!newName.trim() || newName === oldName) return;
    setEditableWords(prev => {
      const updated = { ...prev };
      updated[newName] = updated[oldName];
      delete updated[oldName];
      return updated;
    });
  };

  const isHost = player?.id === lobby?.hostId;
  const minPlayers = serverConfig?.minPlayers ?? 3;
  const isDevModeEnabled = serverConfig?.devMode === true;
  const canStart = lobby?.players?.length >= minPlayers;

  if (!lobby) return null;

  return (
    <div className="lobby-page page-container">
      <div className="lobby-content animate-fade-in">
        <div className="lobby-header card">
          <div className="lobby-title-row">
            <h2 className="lobby-name">{lobby.name}</h2>
            <div className="lobby-actions">
              {isHost && (
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
              )}
              {isHost && (
                <button 
                  className="btn btn-secondary show-words-btn"
                  onClick={openWordsEditor}
                  disabled={isLoading}
                  title="View and edit game words"
                >
                  Show Words
                </button>
              )}
              <button
                className="btn btn-secondary invite-btn"
                onClick={handleInviteFriends}
                disabled={isLoading}
              >
                {inviteCopied ? 'Copied!' : 'Invite Friends'}
              </button>
              {isDevModeEnabled && isHost && lobby.players.length < lobby.maxPlayers && (
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
              {p.profilePicIndex !== undefined ? (
                <img 
                  src={getProfilePic(p.profilePicIndex)} 
                  alt={p.name}
                  className="avatar avatar-large"
                />
              ) : (
                <div 
                  className="avatar avatar-large"
                  style={{ backgroundColor: p.avatar || '#FFD700' }}
                >
                  {p.name?.charAt(0).toUpperCase()}
                </div>
              )}
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
        {uploadError && <p className="error-text">Upload error: {uploadError}</p>}

        {/* Words Editor Modal */}
        {showWordsEditor && (
          <div className="words-editor-modal" ref={modalRef}>
            <div className="words-editor-content" ref={modalContentRef}>
              <div className="words-editor-header">
                <h2>Edit Game Words</h2>
                <button className="close-btn" onClick={closeWordsEditor}>×</button>
              </div>

              <div className="words-editor-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload custom words/themes JSON"
                >
                  Upload JSON
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={exportWords}
                  title="Download current words as JSON"
                >
                  Export JSON
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={saveWords}
                >
                  Save Words
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={closeWordsEditor}
                >
                  Cancel
                </button>
              </div>



              <div className="words-table-container">
                <button
                  className="btn btn-secondary"
                  onClick={addCategory}
                >
                  + Add Category
                </button>
                {Object.entries(editableWords).length === 0 ? (
                  <p className="no-words">No words yet. Add a category to start.</p>
                ) : (
                  Object.entries(editableWords).map(([categoryName, words]) => (
                    <div key={categoryName} className="category-section">
                      <div className="category-header">
                        <input
                          type="text"
                          className="category-input"
                          value={categoryName}
                          onChange={(e) => updateCategoryName(categoryName, e.target.value)}
                          placeholder="Category name"
                        />
                        <button 
                          className="btn btn-small btn-danger btn-icon"
                          onClick={() => removeCategory(categoryName)}
                          title="Remove category"
                        >
                          ×
                        </button>
                      </div>

                      <div className="words-list">
                        {words.map((word, idx) => (
                          <div key={idx} className="word-item">
                            <input
                              type="text"
                              className="word-input"
                              value={word}
                              onChange={(e) => updateWord(categoryName, idx, e.target.value)}
                              placeholder={`Word ${idx + 1}`}
                            />
                            <button
                              className="btn btn-small btn-danger btn-icon"
                              onClick={() => removeWordFromCategory(categoryName, idx)}
                              title="Remove word"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>

                      <button
                        className="btn btn-small btn-secondary"
                        onClick={() => addWordToCategory(categoryName)}
                      >
                        + Add Word
                      </button>
                    </div>
                  ))
                )}
              </div>

              <button
                className="btn btn-secondary back-to-top-btn"
                onClick={scrollToTop}
                title="Scroll back to top"
              >
                ↑ Back to Top
              </button>
            </div>
          </div>
        )}

        <button className="btn btn-secondary leave-btn" onClick={handleLeave}>
          Leave Lobby
        </button>
      </div>
    </div>
  );
}
