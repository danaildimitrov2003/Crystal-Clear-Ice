import './GamePhases.css';

export default function WordReveal({ word, isImpostor }) {
  return (
    <div className="phase-container reveal-container">
      {isImpostor ? (
        <>
          <p className="reveal-label">You only know the theme!</p>
          <div className="reveal-value impostor-hint">
            ???
          </div>
          <p className="hint-text">Try to figure out the word from others' clues</p>
        </>
      ) : (
        <>
          <p className="reveal-label">The word is</p>
          <div className="reveal-value detective-word-value">
            "{word?.charAt(0).toUpperCase() + word?.slice(1)}"
          </div>
        </>
      )}
    </div>
  );
}
