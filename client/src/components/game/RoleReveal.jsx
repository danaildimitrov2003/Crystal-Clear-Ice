import { useEffect, useMemo } from 'react';
import { getProfilePic } from '../../constants/profilePics';
import './GamePhases.css';

const IMPOSTOR_EMOJI_POOL = ['😈', '🩸', '🗡️', '☠️', '👹', '🔥', '💀', '⚔️'];
const DETECTIVE_EMOJI_POOL = ['💰', '🪙', '⭐', '🌟', '✨', '🏅', '🎖️', '🛡️', '💎'];

export default function RoleReveal({ role, player }) {
  const isImpostor = role === 'impostor';
  const isDetective = role === 'detective';
  const impostorParticles = useMemo(
    () =>
      Array.from({ length: 46 }, (_, index) => ({
        id: index,
        left: Math.round(Math.random() * 100),
        delay: (Math.random() * 2.5).toFixed(2),
        duration: (3.2 + Math.random() * 2.2).toFixed(2),
        drift: Math.round((Math.random() - 0.5) * 120),
        emoji: IMPOSTOR_EMOJI_POOL[Math.floor(Math.random() * IMPOSTOR_EMOJI_POOL.length)]
      })),
    []
  );
  const detectiveParticles = useMemo(
    () =>
      Array.from({ length: 44 }, (_, index) => ({
        id: index,
        left: Math.round(Math.random() * 100),
        delay: (Math.random() * 2.3).toFixed(2),
        duration: (3.4 + Math.random() * 2.4).toFixed(2),
        drift: Math.round((Math.random() - 0.5) * 140),
        emoji: DETECTIVE_EMOJI_POOL[Math.floor(Math.random() * DETECTIVE_EMOJI_POOL.length)]
      })),
    []
  );

  useEffect(() => {
    if (!isImpostor && !isDetective) {
      return undefined;
    }

    const revealAudio = new Audio(
      isImpostor ? '/sounds/impostorSound.mp3' : '/sounds/detectiveSound.mp3'
    );
    revealAudio.volume = isImpostor ? 0.85 : 0.8;
    revealAudio.play().catch(() => {});

    return () => {
      revealAudio.pause();
      revealAudio.currentTime = 0;
    };
  }, [isImpostor, isDetective]);
  
  return (
    <div className="phase-container role-reveal">
      {isImpostor && (
        <div className="role-particles impostor-particles" aria-hidden="true">
          {impostorParticles.map((particle) => (
            <span
              key={particle.id}
              className="role-particle impostor-particle"
              style={{
                '--particle-left': `${particle.left}%`,
                '--fall-delay': `${particle.delay}s`,
                '--fall-duration': `${particle.duration}s`,
                '--drift': `${particle.drift}px`
              }}
            >
              {particle.emoji}
            </span>
          ))}
        </div>
      )}
      {isDetective && (
        <div className="role-particles detective-particles" aria-hidden="true">
          {detectiveParticles.map((particle) => (
            <span
              key={particle.id}
              className="role-particle detective-particle"
              style={{
                '--particle-left': `${particle.left}%`,
                '--fall-delay': `${particle.delay}s`,
                '--fall-duration': `${particle.duration}s`,
                '--drift': `${particle.drift}px`
              }}
            >
              {particle.emoji}
            </span>
          ))}
        </div>
      )}

      {player?.profilePicIndex !== undefined ? (
        <img 
          src={getProfilePic(player.profilePicIndex)}
          alt={player?.name}
          className="avatar avatar-large"
        />
      ) : (
        <div 
          className="avatar avatar-large"
          style={{ backgroundColor: player?.avatar || '#FFD700' }}
        >
          {player?.name?.charAt(0).toUpperCase()}
        </div>
      )}
      
      <div className="role-text">
        You are {isImpostor ? 'an' : 'a'}{' '}
        <span className={`role-name ${role}`}>
          {isImpostor ? 'Impostor' : 'Detective'}
        </span>
      </div>
      
      <p className="role-hint">
        {isImpostor 
          ? "You don't know the word, only the category. Blend in!" 
          : "Find the impostor among you!"
        }
      </p>
    </div>
  );
}
