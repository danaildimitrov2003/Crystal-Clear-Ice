import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import './GamePhases.css';

const FALLBACK_WORDS = ['Mystery', 'Secret', 'Hidden', 'Unknown', 'Enigma', 'Puzzle', 'Riddle', 'Cipher'];

export default function WordReveal({ word, isImpostor, category, allWords }) {
  const [spinning, setSpinning] = useState(false);
  const [landed, setLanded] = useState(false);
  const [displayWord, setDisplayWord] = useState('');
  const indexRef = useRef(0);
  const timeoutRef = useRef(null);

  // Use actual words from game data, falling back to defaults
  const spinWords = useMemo(() => {
    if (allWords && typeof allWords === 'object') {
      // Gather words from all categories, excluding the actual word
      const words = Object.values(allWords)
        .flat()
        .filter(w => w !== word);
      if (words.length >= 3) return words;
    }
    return FALLBACK_WORDS;
  }, [allWords, word]);

  const finalWord = isImpostor ? '???' : (word?.charAt(0).toUpperCase() + word?.slice(1));

  const doSpin = useCallback((step) => {
    const totalSteps = 16;
    if (step >= totalSteps) {
      setDisplayWord(finalWord);
      setSpinning(false);
      setLanded(true);
      return;
    }

    indexRef.current = (indexRef.current + 1) % spinWords.length;
    setDisplayWord(spinWords[indexRef.current]);

    const progress = step / totalSteps;
    const nextDelay = 60 + (progress * progress) * 400;

    timeoutRef.current = setTimeout(() => doSpin(step + 1), nextDelay);
  }, [finalWord]);

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      setSpinning(true);
      doSpin(0);
    }, 500);

    return () => clearTimeout(timeoutRef.current);
  }, [doSpin]);

  if (!spinning && !landed) return null;

  const categoryLabel = category?.charAt(0).toUpperCase() + category?.slice(1);

  return (
    <div className="spinning-words">
      <div className="reveal-subtitle">{categoryLabel}</div>
      <div className={`mega-word ${spinning ? 'spinning' : ''} ${landed ? 'landed' : ''} ${isImpostor && landed ? 'impostor-landed' : ''}`}>
        {displayWord}
      </div>
      {isImpostor && landed && (
        <div className="reveal-impostor-hint">You're the impostor — figure it out!</div>
      )}
    </div>
  );
}
