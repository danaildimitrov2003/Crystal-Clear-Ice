import { useState, useEffect, useRef, useCallback } from 'react';
import './GamePhases.css';

const SAMPLE_WORDS = ['Mystery', 'Secret', 'Hidden', 'Unknown', 'Enigma', 'Puzzle', 'Riddle', 'Cipher'];

export default function WordReveal({ word, isImpostor, category }) {
  const [spinning, setSpinning] = useState(false);
  const [landed, setLanded] = useState(false);
  const [displayWord, setDisplayWord] = useState('');
  const indexRef = useRef(0);
  const timeoutRef = useRef(null);

  const doSpin = useCallback((step) => {
    const totalSteps = 16;
    if (step >= totalSteps) {
      setDisplayWord(word?.charAt(0).toUpperCase() + word?.slice(1));
      setSpinning(false);
      setLanded(true);
      return;
    }

    indexRef.current = (indexRef.current + 1) % SAMPLE_WORDS.length;
    setDisplayWord(SAMPLE_WORDS[indexRef.current]);

    const progress = step / totalSteps;
    const nextDelay = 60 + (progress * progress) * 400;

    timeoutRef.current = setTimeout(() => doSpin(step + 1), nextDelay);
  }, [word]);

  useEffect(() => {
    if (isImpostor) return;

    timeoutRef.current = setTimeout(() => {
      setSpinning(true);
      doSpin(0);
    }, 500);

    return () => clearTimeout(timeoutRef.current);
  }, [isImpostor, doSpin]);

  // Impostor view (no animation)
  if (isImpostor) {
    return (
      <div className="phase-container reveal-container">
        <p className="reveal-label">You only know the theme!</p>
        <div className="reveal-value impostor-hint">
          ???
        </div>
        <p className="hint-text">Try to figure out the word from others' clues</p>
      </div>
    );
  }

  if (!spinning && !landed) return null;

  const categoryLabel = category?.charAt(0).toUpperCase() + category?.slice(1);

  return (
    <div className="spinning-words">
      <div className="reveal-subtitle">{categoryLabel}</div>
      <div className={`mega-word ${spinning ? 'spinning' : ''} ${landed ? 'landed' : ''}`}>
        {displayWord}
      </div>
    </div>
  );
}
