import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { getProfilePic } from '../../constants/profilePics';
import './GamePhases.css';

function TypewriterText({ text, duration = 300 }) {
  const [displayed, setDisplayed] = useState('');
  const prevTextRef = useRef('');

  useEffect(() => {
    if (text === prevTextRef.current) return;
    prevTextRef.current = text;
    setDisplayed('');
    if (!text) return;

    const charDelay = Math.max(15, duration / text.length);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, charDelay);
    return () => clearInterval(id);
  }, [text, duration]);

  return <span>{displayed}</span>;
}

export default function ClueSubmission({ gameState, player, timeLeft }) {
  const [clue, setClue] = useState('');
  const { submitClue } = useGameStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [revealedClueIds, setRevealedClueIds] = useState(new Set());

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === player?.id;
  const hasSubmitted = gameState.players.find(p => p.id === player?.id)?.clue !== null;
  const players = gameState.players;
  const clues = gameState.clues || [];

  // Track newly appearing clues for typewriter
  useEffect(() => {
    const newIds = new Set(revealedClueIds);
    clues.forEach((_, idx) => newIds.add(idx));
    setRevealedClueIds(newIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clues.length]);

  const handleSubmit = async () => {
    if (!clue.trim() || !isMyTurn || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await submitClue(clue.trim());
      setClue('');
    } catch (err) {
      console.error('Failed to submit clue:', err);
    }
    setIsSubmitting(false);
  };

  // Build a lookup: playerId → clue text
  const clueByPlayerId = {};
  clues.forEach(c => { clueByPlayerId[c.playerId] = c.clue; });

  // Determine each player's state
  const getPlayerStatus = (p, index) => {
    if (clueByPlayerId[p.id]) return 'submitted';
    if (index === gameState.currentPlayerIndex) return 'speaking';
    if (index < gameState.currentPlayerIndex) return 'submitted'; // should have clue
    return 'waiting';
  };

  return (
    <div className="phase-container clue-table-phase">
      {timeLeft !== null && (
        <div className={`game-timer ${timeLeft <= 10 ? 'warning' : ''}`}>
          {timeLeft}s
        </div>
      )}

      {/* Turn indicator */}
      <p className="table-turn-label">
        {isMyTurn ? "Your turn — give a clue" : `${currentPlayer?.name}'s turn`}
      </p>

      {/* ─── Player Table Ring ─── */}
      <div className="table-ring">
        {players.map((p, index) => {
          const status = getPlayerStatus(p, index);
          const isSpeaking = status === 'speaking';
          const hasClue = !!clueByPlayerId[p.id];
          const isNewest = hasClue && clues[clues.length - 1]?.playerId === p.id;

          return (
            <div
              key={p.id}
              className={`table-seat ${isSpeaking ? 'seat-active' : ''} ${hasClue ? 'seat-done' : ''}`}
            >
              {/* Avatar */}
              <div className={`seat-avatar-wrap ${isSpeaking ? 'avatar-glow-ring' : ''}`}>
                {p.profilePicIndex !== undefined ? (
                  <img
                    src={getProfilePic(p.profilePicIndex)}
                    alt={p.name}
                    className="seat-avatar"
                  />
                ) : (
                  <div
                    className="seat-avatar seat-avatar-fallback"
                    style={{ backgroundColor: p.avatar || '#FFD700' }}
                  >
                    {p.name?.charAt(0).toUpperCase()}
                  </div>
                )}
                {isSpeaking && <span className="mic-badge">🎤</span>}
                {p.id === player?.id && <span className="you-badge">You</span>}
              </div>

              <span className="seat-name">{p.name}</span>

              {/* ─── Speech Bubble ─── */}
              {hasClue ? (
                <div className={`speech-bubble ${isNewest ? 'bubble-newest' : 'bubble-faded'}`}>
                  <div className="bubble-tail" />
                  <span className="bubble-text">
                    {isNewest && !revealedClueIds.has(clues.length - 1)
                      ? <TypewriterText text={`"${clueByPlayerId[p.id]}"`} />
                      : `"${clueByPlayerId[p.id]}"`
                    }
                  </span>
                </div>
              ) : isSpeaking ? (
                <div className="speech-bubble bubble-typing">
                  <div className="bubble-tail" />
                  <span className="typing-dots">
                    <span className="dot" />
                    <span className="dot" />
                    <span className="dot" />
                  </span>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* ─── Input Form (only visible on your turn) ─── */}
      {isMyTurn && !hasSubmitted ? (
        <form
          className="table-input-form"
          onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
        >
          <input
            type="text"
            className="input table-clue-input"
            placeholder="Enter your clue..."
            value={clue}
            onChange={(e) => setClue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); } }}
            maxLength={50}
            autoFocus
          />
          <button
            type="submit"
            className="btn btn-primary table-submit-btn"
            disabled={!clue.trim() || isSubmitting}
          >
            {isSubmitting ? 'Sending...' : 'Send'}
          </button>
          <p className="clue-hint">
            {gameState.myRole === 'impostor'
              ? "Blend in — don't reveal you don't know the word!"
              : "Hint at the word without giving it away!"}
          </p>
        </form>
      ) : hasSubmitted ? (
        <p className="waiting-text table-waiting">Listening to the table…</p>
      ) : (
        <p className="waiting-text table-waiting">Wait for your turn…</p>
      )}
    </div>
  );
}
