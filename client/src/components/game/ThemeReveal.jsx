import { useState, useEffect, useRef, useCallback } from 'react';
import './GamePhases.css';

const SAMPLE_CATEGORIES = ['Animals', 'Food', 'Sports', 'Technology', 'Nature', 'Travel', 'Music', 'Art'];

export default function ThemeReveal({ category }) {
  const [spinning, setSpinning] = useState(false);
  const [landed, setLanded] = useState(false);
  const [displayWord, setDisplayWord] = useState('');
  const indexRef = useRef(0);
  const timeoutRef = useRef(null);

  const doSpin = useCallback((step) => {
    const totalSteps = 16;
    if (step >= totalSteps) {
      setDisplayWord(category?.charAt(0).toUpperCase() + category?.slice(1));
      setSpinning(false);
      setLanded(true);
      return;
    }

    indexRef.current = (indexRef.current + 1) % SAMPLE_CATEGORIES.length;
    setDisplayWord(SAMPLE_CATEGORIES[indexRef.current]);

    const progress = step / totalSteps;
    const nextDelay = 60 + (progress * progress) * 400;

    timeoutRef.current = setTimeout(() => doSpin(step + 1), nextDelay);
  }, [category]);

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      setSpinning(true);
      doSpin(0);
    }, 500);

    return () => clearTimeout(timeoutRef.current);
  }, [doSpin]);

  if (!spinning && !landed) return null;

  return (
    <div className="spinning-words">
      <div className="reveal-subtitle">Category</div>
      <div className={`mega-word ${spinning ? 'spinning' : ''} ${landed ? 'landed' : ''}`}>
        {displayWord}
      </div>
    </div>
  );
}
