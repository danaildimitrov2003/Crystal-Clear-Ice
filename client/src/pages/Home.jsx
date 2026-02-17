import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { profilePics } from '../constants/profilePics';
import './Home.css';

export default function Home() {
  const [name, setName] = useState('');
  const [selectedPicIndex, setSelectedPicIndex] = useState(0);
  const { joinAsPlayer, isLoading, error } = useGameStore();
  const navigate = useNavigate();

  const goPrevPic = () => {
    if (profilePics.length === 0) return;
    setSelectedPicIndex((prev) => (prev - 1 + profilePics.length) % profilePics.length);
  };

  const goNextPic = () => {
    if (profilePics.length === 0) return;
    setSelectedPicIndex((prev) => (prev + 1) % profilePics.length);
  };

  const handlePlay = async (isGuest = true) => {
    if (!name.trim()) return;
    
    try {
      await joinAsPlayer(name.trim(), isGuest, selectedPicIndex);
      navigate('/menu');
    } catch (err) {
      console.error('Failed to join:', err);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handlePlay(true);
    }
  };

  return (
    <div className="home-page">
      <header className="home-header">
        <img src="/logo.png" alt="Crystal Clear Ice" className="header-logo" />
        <h1 className="header-title title-font">Crystal Clear Ice</h1>
        <p className="header-subtitle">The Social Deduction Word Game</p>
      </header>

      <div className="home-main">
        <div className="home-grid">
          {/* Guest Play Card */}
          <div className="home-card card animate-fade-in">
            <h2 className="card-title">Quick Play</h2>
            <div className="guest-avatar">
              <button
                className="avatar-arrow"
                onClick={goPrevPic}
                aria-label="Previous profile picture"
                type="button"
              >
                ‹
              </button>
              <img
                key={profilePics[selectedPicIndex] || '/logo.png'}
                src={profilePics[selectedPicIndex] || '/logo.png'}
                alt="Selected character"
                className="card-logo shake-hello"
              />
              <button
                className="avatar-arrow"
                onClick={goNextPic}
                aria-label="Next profile picture"
                type="button"
              >
                ›
              </button>
            </div>
            <p className="card-description">Select your character</p>
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
                onChange={(e) => setName(e.target.value)}
                onKeyPress={handleKeyPress}
                maxLength={20}
                autoFocus
              />
              <button 
                className="btn btn-primary play-btn"
                onClick={() => handlePlay(true)}
                disabled={!name.trim() || isLoading}
              >
                {isLoading ? 'Starting...' : 'Start Playing'}
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
