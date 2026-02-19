import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import { getProfilePic } from '../../constants/profilePics';
import './GamePhases.css';

/* ─── helpers ─── */
const SLOT_INTERVAL_START = 60;
const SLOT_INTERVAL_END = 320;
const SLOT_CYCLES = 18;

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/* ─── Particle burst component ─── */
function ParticleBurst({ color }) {
  const count = 60;
  const particles = useRef(
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      angle: Math.random() * 360,
      speed: 2 + Math.random() * 5,
      size: 4 + Math.random() * 8,
      delay: Math.random() * 0.6,
      duration: 1 + Math.random() * 1.2,
      shape: Math.random() > 0.5 ? 'circle' : 'square',
    }))
  ).current;

  return (
    <div className="go-particle-burst">
      {particles.map((p) => (
        <span
          key={p.id}
          className={`go-particle go-particle-${p.shape}`}
          style={{
            '--px': `${p.x}%`,
            '--angle': `${p.angle}deg`,
            '--speed': p.speed,
            '--size': `${p.size}px`,
            '--delay': `${p.delay}s`,
            '--dur': `${p.duration}s`,
            background: color,
          }}
        />
      ))}
    </div>
  );
}

/* ─── Confetti rain ─── */
function ConfettiRain({ color1, color2 }) {
  const pieces = useRef(
    Array.from({ length: 45 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2.5,
      duration: 1.8 + Math.random() * 2,
      drift: -30 + Math.random() * 60,
      size: 6 + Math.random() * 6,
      color: Math.random() > 0.5 ? color1 : color2,
      rotation: Math.random() * 360,
    }))
  ).current;

  return (
    <div className="go-confetti-rain">
      {pieces.map((c) => (
        <span
          key={c.id}
          className="go-confetti-piece"
          style={{
            '--cl': `${c.left}%`,
            '--cd': `${c.delay}s`,
            '--cdur': `${c.duration}s`,
            '--cdrift': `${c.drift}px`,
            '--csize': `${c.size}px`,
            '--crot': `${c.rotation}deg`,
            background: c.color,
          }}
        />
      ))}
    </div>
  );
}

/* ─── Main component ─── */
export default function GameOver({ voteResults, gameState, player }) {
  const navigate = useNavigate();
  const { returnToLobby, startNewRound, lobby } = useGameStore();

  /* Staged reveal state – each step shows after a delay */
  const [stage, setStage] = useState(0);
  // 0 = nothing
  // 1 = avatar(s) fly in
  // 2 = "The majority chose X" / tie text
  // 3 = slot-machine roulette (tie only) → then auto-advance
  // 4 = result: "They ARE / ARE NOT the impostor"
  // 5 = impostor reveal
  // 6 = "And the winner is..."  (suspense)
  // 7 = "IMPOSTOR" / "DETECTIVES" with particles
  // 8 = word + category + buttons

  const [slotName, setSlotName] = useState('');
  const [slotDone, setSlotDone] = useState(false);
  const slotTimer = useRef(null);

  const handleReturnToLobby = () => {
    returnToLobby();
    if (lobby?.id) {
      navigate(`/lobby/${lobby.code}`);
      return;
    }
    navigate('/');
  };

  /* ─── Slot-machine effect for tie-breaker ─── */
  const runSlotMachine = useCallback(() => {
    if (!voteResults?.tiedPlayers?.length) return;
    const names = voteResults.tiedPlayers.map((p) => p.name);
    const winner = voteResults.votedOut.name; // server already chose
    let tick = 0;

    const step = () => {
      const t = tick / SLOT_CYCLES;
      const interval = lerp(SLOT_INTERVAL_START, SLOT_INTERVAL_END, t * t);

      if (tick >= SLOT_CYCLES) {
        setSlotName(winner);
        setSlotDone(true);
        // auto-advance after short pause
        setTimeout(() => setStage(4), 2000);
        return;
      }
      // cycle through names randomly but always land on winner at end
      const pool = tick >= SLOT_CYCLES - 2 ? [winner] : names;
      setSlotName(pool[Math.floor(Math.random() * pool.length)]);
      tick++;
      slotTimer.current = setTimeout(step, interval);
    };
    step();
  }, [voteResults]);

  /* ─── Stage sequencer ─── */
  useEffect(() => {
    if (!voteResults) return;
    // Reset animation state before scheduling new stages so that if
    // voteResults is replaced (e.g. spurious duplicate event) the
    // reveal starts cleanly from the beginning instead of looping.
    setStage(0);
    setSlotName('');
    setSlotDone(false);
    const timers = [];
    const q = (fn, delay) => timers.push(setTimeout(fn, delay));

    q(() => setStage(1), 600);
    q(() => setStage(2), 2800);

    if (voteResults.tie && voteResults.tiedPlayers?.length > 1) {
      q(() => setStage(3), 5200); // start slot machine
    } else {
      q(() => setStage(4), 5800);
    }

    return () => {
      timers.forEach(clearTimeout);
      if (slotTimer.current) clearTimeout(slotTimer.current);
    };
  }, [voteResults]);

  /* When stage 3 starts, kick off the slot machine */
  useEffect(() => {
    if (stage === 3) runSlotMachine();
  }, [stage, runSlotMachine]);

  /* Continue the sequence after stage 4 */
  useEffect(() => {
    if (stage < 4) return;
    const timers = [];
    const q = (fn, delay) => timers.push(setTimeout(fn, delay));

    if (stage === 4) {
      // Skip stage 5 (impostor reveal) when detectives guessed right
      const skipImpostor = voteResults?.detectivesWin;
      q(() => setStage(skipImpostor ? 6 : 5), 3200);
    } else if (stage === 5) {
      q(() => setStage(6), 3600);
    } else if (stage === 6) {
      q(() => setStage(7), 3000);
    } else if (stage === 7) {
      q(() => setStage(8), 4000);
    }

    return () => timers.forEach(clearTimeout);
  }, [stage, voteResults]);

  if (!voteResults) return <div>Loading results...</div>;

  const { votedOut, detectivesWin, impostor, tie, tiedPlayers } = voteResults;

  /* Helper to render an avatar for a vote-results player object */
  const renderAvatar = (p, extraClass = '') => {
    if (p?.profilePicIndex !== undefined && p.profilePicIndex !== null) {
      return (
        <img
          src={getProfilePic(p.profilePicIndex)}
          alt={p.name}
          className={`avatar avatar-large ${extraClass}`}
        />
      );
    }
    return (
      <div
        className={`avatar avatar-large ${extraClass}`}
        style={{ backgroundColor: p?.avatar || '#FFD700' }}
      >
        {p?.name?.charAt(0).toUpperCase()}
      </div>
    );
  };

  return (
    <div className="phase-container game-over-container go-animated">
      {/* ── Stage 1 & 2: Show avatar(s) ── */}
      {stage >= 1 && (
        <div className={`go-avatars ${stage >= 1 ? 'go-reveal' : ''}`}>
          {tie && tiedPlayers?.length > 1 ? (
            <div className="go-tied-avatars">
              {tiedPlayers.map((tp, i) => (
                <div key={tp.id} className="go-tied-avatar" style={{ animationDelay: `${i * 0.2}s` }}>
                  {renderAvatar(tp, 'go-avatar-pop')}
                  <span className="go-avatar-name">{tp.name}</span>
                </div>
              ))}
            </div>
          ) : votedOut ? (
            <div className="go-single-avatar go-avatar-pop">
              {renderAvatar(votedOut)}
            </div>
          ) : null}
        </div>
      )}

      {/* ── Stage 2: Label ── */}
      {stage >= 2 && (
        <div className={`go-label go-slide-up ${stage >= 2 ? 'go-reveal' : ''}`}>
          {tie && tiedPlayers?.length > 1 ? (
            <p className="result-message go-text-glow">
              It's a <span className="result-highlight wrong">tie</span> between{' '}
              {tiedPlayers.map((tp, i) => (
                <span key={tp.id}>
                  <span className="result-highlight">{tp.name}</span>
                  {i < tiedPlayers.length - 1 ? ' and ' : ''}
                </span>
              ))}
            </p>
          ) : votedOut ? (
            <p className="result-message go-text-glow">
              The majority chose{' '}
              <span className="result-highlight">{votedOut.name}</span>
            </p>
          ) : (
            <p className="result-message go-text-glow">No one was voted out!</p>
          )}
        </div>
      )}

      {/* ── Stage 3: Slot machine (tie only) ── */}
      {stage >= 3 && tie && tiedPlayers?.length > 1 && stage < 4 && (
        <div className="go-slot-machine go-slide-up go-reveal">
          <p className="go-slot-label">The player voted out is...</p>
          <div className={`go-slot-name ${slotDone ? 'go-slot-landed' : 'go-slot-spinning'}`}>
            {slotName}
          </div>
        </div>
      )}

      {/* ── Stage 4: Impostor or not ── */}
      {stage >= 4 && votedOut && (
        <div className="go-result go-slide-up go-reveal">
          {/* In tie case, remind who was randomly eliminated */}
          {tie && (
            <p className="result-message go-text-glow" style={{ marginBottom: '8px' }}>
              <span className="result-highlight wrong">{votedOut.name}</span> was randomly eliminated!
            </p>
          )}
          <p className="result-message go-text-glow">
            {detectivesWin
              ? <>They <span className="result-highlight correct">ARE</span> the impostor!</>
              : <>They are <span className="result-highlight wrong">NOT</span> the impostor!</>
            }
          </p>
        </div>
      )}

      {/* ── Stage 5: Impostor reveal (only when detectives got it wrong) ── */}
      {stage >= 5 && !detectivesWin && (
        <div className="go-impostor-card go-slide-up go-reveal">
          <div className="go-impostor-card-inner">
            {renderAvatar(impostor, 'go-impostor-avatar')}
            <div className="go-impostor-card-text">
              <span className="go-impostor-card-label">The real impostor was</span>
              <span className="go-impostor-card-name">{impostor.name}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Stage 6: Suspense label ── */}
      {stage >= 6 && stage < 7 && (
        <div className="go-winner-suspense go-reveal">
          <p className="go-suspense-text">And the winner is&hellip;</p>
        </div>
      )}

      {/* ── Stage 7: Winner reveal with particles ── */}
      {stage >= 7 && (
        <div className="go-winner-reveal go-reveal">
          {detectivesWin ? (
            <>
              <ConfettiRain color1="#FFD700" color2="#FFA500" />
              <ParticleBurst color="#FFD700" />
              <div className="go-winner-sentence">
                <span className="go-winner-prefix">The winner is the</span>
                <span className="go-winner-text go-winner-detectives">DETECTIVES</span>
              </div>
            </>
          ) : (
            <>
              <ConfettiRain color1="#FF4444" color2="#FF6B6B" />
              <ParticleBurst color="#FF4444" />
              <div className="go-winner-sentence">
                <span className="go-winner-prefix">The winner is the</span>
                <span className="go-winner-text go-winner-impostor">IMPOSTOR</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Stage 8: Word + buttons ── */}
      {stage >= 8 && (
        <div className="go-footer go-slide-up go-reveal">
          <div className="word-reveal-final">
            <p>The word was: <strong>{gameState.word}</strong></p>
            <p>Category: <strong>{gameState.category}</strong></p>
          </div>

          <div className="game-over-buttons">
            <button className="btn btn-primary" onClick={startNewRound}>
              Play Again
            </button>
            <button className="btn btn-secondary" onClick={handleReturnToLobby}>
              Return to Lobby
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
