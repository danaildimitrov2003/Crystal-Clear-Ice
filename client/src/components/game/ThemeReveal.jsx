import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import './GamePhases.css';

const FALLBACK_CATEGORIES = ['Animals', 'Food', 'Sports', 'Technology', 'Nature', 'Travel', 'Music', 'Art'];

export default function ThemeReveal({ category, allWords }) {
  const [spinning, setSpinning] = useState(false);
  const [landed, setLanded] = useState(false);
  const [displayWord, setDisplayWord] = useState('');
  const indexRef = useRef(0);
  const timeoutRef = useRef(null);

  // Use actual categories from game data, falling back to defaults
  const spinCategories = useMemo(() => {
    if (allWords && typeof allWords === 'object') {
      const cats = Object.keys(allWords).filter(c => c !== category);
      if (cats.length >= 3) return cats;
    }
    return FALLBACK_CATEGORIES;
  }, [allWords, category]);

  const doSpin = useCallback((step) => {
    const totalSteps = 16;
    if (step >= totalSteps) {
      setDisplayWord(category?.charAt(0).toUpperCase() + category?.slice(1));
      setSpinning(false);
      setLanded(true);
      return;
    }

    indexRef.current = (indexRef.current + 1) % spinCategories.length;
    setDisplayWord(spinCategories[indexRef.current]);

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
