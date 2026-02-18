import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { profilePics } from '../constants/profilePics';
import './Home.css';

const NAME_COOKIE_KEY = 'cci_player_name';
const PIC_COOKIE_KEY = 'cci_player_pic';

const getCookieValue = (key) => {
  if (typeof document === 'undefined') return null;
  const cookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${key}=`));
  if (!cookie) return null;
  try {
    return decodeURIComponent(cookie.split('=').slice(1).join('='));
  } catch {
    return null;
  }
};

const setCookieValue = (key, value) => {
  if (typeof document === 'undefined') return;
  document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=31536000; samesite=lax`;
};

const getSavedNameFromCookie = () => getCookieValue(NAME_COOKIE_KEY) || '';
const saveNameToCookie = (value) => setCookieValue(NAME_COOKIE_KEY, value);

const getSavedPicFromCookie = () => {
  try {
    const val = localStorage.getItem(PIC_COOKIE_KEY);
    if (val === null) return null;
    const num = parseInt(val, 10);
    return isNaN(num) ? null : num;
  } catch {
    return null;
  }
};
const savePicToCookie = (index) => {
  try {
    localStorage.setItem(PIC_COOKIE_KEY, String(index));
  } catch {}
};

export default function Home() {
  const [name, setName] = useState(() => getSavedNameFromCookie());
  const [selectedPicIndex, setSelectedPicIndex] = useState(() => {
    const saved = getSavedPicFromCookie();
    if (saved !== null && saved >= 0 && saved < profilePics.length) return saved;
    if (profilePics.length === 0) return 0;
    return Math.floor(Math.random() * profilePics.length);
  });
  const [picSaved, setPicSaved] = useState(false);
  const [avatarDirection, setAvatarDirection] = useState(null);
  const [isAudioOpen, setIsAudioOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const {
    player,
    joinAsPlayer,
    joinLobbyByCode,
    isLoading,
    error,
    effectsVolume,
    setEffectsVolume
  } = useGameStore();
  const navigate = useNavigate();
  const redirect = searchParams.get('redirect');
  const safeRedirect = redirect && redirect.startsWith('/') ? redirect : null;

  // Extract lobby code from redirect like /lobby/U7EU6K
  const lobbyCodeMatch = safeRedirect?.match(/^\/lobby\/([A-Z0-9]{4,8})$/i);
  const inviteCode = lobbyCodeMatch ? lobbyCodeMatch[1].toUpperCase() : null;

  // If player already logged in and there's a redirect, go there immediately
  useEffect(() => {
    if (player && safeRedirect && !inviteCode) {
      navigate(safeRedirect, { replace: true });
    }
  }, []);

  const goPrevPic = () => {
    if (profilePics.length === 0) return;
    setAvatarDirection('left');
    setPicSaved(false);
    setSelectedPicIndex((prev) => (prev - 1 + profilePics.length) % profilePics.length);
  };

  const goNextPic = () => {
    if (profilePics.length === 0) return;
    setAvatarDirection('right');
    setPicSaved(false);
    setSelectedPicIndex((prev) => (prev + 1) % profilePics.length);
  };

  const handleSavePic = () => {
    savePicToCookie(selectedPicIndex);
    setPicSaved(true);
    // Clear any legacy cookie-based value
    document.cookie = `${PIC_COOKIE_KEY}=; path=/; max-age=0`;
  };

  const handleAction = async (path) => {
    if (!name.trim()) return;

    try {
      await joinAsPlayer(name.trim(), true, selectedPicIndex);
      navigate(safeRedirect || path);
    } catch (err) {
      console.error('Failed to join:', err);
    }
  };

  const handleJoinInvite = async () => {
    if (!name.trim() || !inviteCode) return;

    try {
      await joinAsPlayer(name.trim(), true, selectedPicIndex);
      const response = await joinLobbyByCode(inviteCode);
      navigate(`/lobby/${response.lobby.code}`, { replace: true });
    } catch (err) {
      console.error('Failed to join lobby:', err);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      if (inviteCode) {
        handleJoinInvite();
      } else {
        handleAction('/create');
      }
    }
  };

  const handleNameChange = (e) => {
    const nextName = e.target.value;
    setName(nextName);
    saveNameToCookie(nextName);
  };

  const handleEffectsVolumeChange = (e) => {
    setEffectsVolume(Number(e.target.value));
  };

  const effectsPercent = Math.round(effectsVolume * 100);

  const toggleAudioPanel = () => {
    setIsAudioOpen((prev) => !prev);
  };

  const renderAudioControl = () => (
    <div className={`audio-control ${isAudioOpen ? 'open' : ''}`}>
      <div className="audio-panel">
        <span className="audio-control-value">{effectsPercent === 0 ? 'Muted' : `${effectsPercent}%`}</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={effectsVolume}
          onChange={handleEffectsVolumeChange}
          className="audio-slider"
          aria-label="Effects audio volume"
        />
      </div>

      <button
        type="button"
        className="audio-icon-btn"
        onClick={toggleAudioPanel}
        aria-label="Toggle effects volume"
        aria-expanded={isAudioOpen}
      >
        <span className="audio-icon-glyph" aria-hidden="true">🎧</span>
      </button>
    </div>
  );

  // ─── Invite Join Layout ───
  if (inviteCode) {
    return (
      <div className="home-page">
        <header className="home-header">
          <img src="/logo.png" alt="Crystal Clear Ice" className="header-logo" />
          <h1 className="header-title title-font">Crystal Clear Ice</h1>
          <p className="header-subtitle">You've been invited to a game!</p>
          {renderAudioControl()}
        </header>

        <div className="home-main">
          <div className="invite-grid">
            {/* Character + Name Card */}
            <div className="invite-card card animate-fade-in">
              <div className="guest-avatar">
                <button
                  className="avatar-arrow"
                  onClick={goPrevPic}
                  aria-label="Previous profile picture"
                  type="button"
                >
                  ‹
                </button>
                <div className="card-logo-shell">
                  <img
                    key={profilePics[selectedPicIndex] || '/logo.png'}
                    src={profilePics[selectedPicIndex] || '/logo.png'}
                    alt="Selected character"
                    className={`card-logo shake-hello ${
                      avatarDirection === 'left'
                        ? 'avatar-swap-left'
                        : avatarDirection === 'right'
                          ? 'avatar-swap-right'
                          : ''
                    }`}
                  />
                </div>
                <button
                  className="avatar-arrow"
                  onClick={goNextPic}
                  aria-label="Next profile picture"
                  type="button"
                >
                  ›
                </button>
              </div>
              <button
                className={`btn save-pic-btn ${picSaved ? 'saved' : ''}`}
                onClick={handleSavePic}
                type="button"
              >
                {picSaved ? '✓ Saved' : 'Save'}
              </button>

              <div className="play-form">
                <input
                  type="text"
                  className="input play-input"
                  placeholder="Your nickname"
                  value={name}
                  onChange={handleNameChange}
                  onKeyPress={handleKeyPress}
                  maxLength={20}
                  autoFocus
                />
                <button
                  className="btn btn-primary play-btn invite-join-btn"
                  onClick={handleJoinInvite}
                  disabled={!name.trim() || isLoading}
                >
                  {isLoading ? 'Joining...' : 'Join Game'}
                </button>
                {error && <p className="error-text">{error}</p>}
              </div>
            </div>

            {/* How to Play Card */}
            <div className="invite-card card animate-fade-in">
              <h2 className="card-title">How to Play</h2>
              <div className="how-to-play">
                <div className="play-step">
                  <span className="step-number">1</span>
                  <p>Create or join a lobby with 3-10 players</p>
                </div>
                <div className="play-step">
                  <span className="step-number">2</span>
                  <p>One player becomes the impostor who only knows the category</p>
                </div>
                <div className="play-step">
                  <span className="step-number">3</span>
                  <p>Give clues about the word without revealing it</p>
                </div>
                <div className="play-step">
                  <span className="step-number">4</span>
                  <p>Vote for who you think is the impostor</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Default Home Layout ───
  return (
    <div className="home-page">
      <header className="home-header">
        <img src="/logo.png" alt="Crystal Clear Ice" className="header-logo" />
        <h1 className="header-title title-font">Crystal Clear Ice</h1>
        <p className="header-subtitle">The Social Deduction Word Game</p>
        {renderAudioControl()}
      </header>

      <div className="home-main">
        <div className="home-grid">
          {/* Guest Play Card */}
          <div className="home-card card animate-fade-in">
            <h2 className="card-title">Select your character</h2>
            <div className="guest-avatar">
              <button
                className="avatar-arrow"
                onClick={goPrevPic}
                aria-label="Previous profile picture"
                type="button"
              >
                ‹
              </button>
              <div className="card-logo-shell">
                <img
                  key={profilePics[selectedPicIndex] || '/logo.png'}
                  src={profilePics[selectedPicIndex] || '/logo.png'}
                  alt="Selected character"
                  className={`card-logo shake-hello ${
                    avatarDirection === 'left'
                      ? 'avatar-swap-left'
                      : avatarDirection === 'right'
                        ? 'avatar-swap-right'
                        : ''
                  }`}
                />
              </div>
              <button
                className="avatar-arrow"
                onClick={goNextPic}
                aria-label="Next profile picture"
                type="button"
              >
                ›
              </button>
            </div>
            <button
              className={`btn save-pic-btn ${picSaved ? 'saved' : ''}`}
              onClick={handleSavePic}
              type="button"
            >
              {picSaved ? '✓ Saved' : 'Save'}
            </button>
          </div>

          {/* Main Play Card */}
          <div className="home-card card main-card animate-fade-in">
            <h2 className="card-title">Enter Your Name</h2>
            <div className="play-form">
              <input
                type="text"
                className="input play-input"
                placeholder="Your nickname"
                value={name}
                onChange={handleNameChange}
                onKeyPress={handleKeyPress}
                maxLength={20}
                autoFocus
              />
              <button
                className="btn btn-primary play-btn"
                onClick={() => handleAction('/create')}
                disabled={!name.trim() || isLoading}
              >
                {isLoading ? 'Connecting...' : 'Create Lobby'}
              </button>
              <button
                className="btn btn-secondary play-btn"
                onClick={() => handleAction('/join')}
                disabled={!name.trim() || isLoading}
              >
                Join Lobby
              </button>
              {error && <p className="error-text">{error}</p>}
            </div>
          </div>

          {/* How to Play Card */}
          <div className="home-card card animate-fade-in">
            <h2 className="card-title">How to Play</h2>
            <div className="how-to-play">
              <div className="play-step">
                <span className="step-number">1</span>
                <p>Create or join a lobby with 3-10 players</p>
              </div>
              <div className="play-step">
                <span className="step-number">2</span>
                <p>One player becomes the impostor who only knows the category</p>
              </div>
              <div className="play-step">
                <span className="step-number">3</span>
                <p>Give clues about the word without revealing it</p>
              </div>
              <div className="play-step">
                <span className="step-number">4</span>
                <p>Vote for who you think is the impostor</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
