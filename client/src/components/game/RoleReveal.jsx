import { getProfilePic } from '../../constants/profilePics';
import './GamePhases.css';

export default function RoleReveal({ role, player }) {
  const isImpostor = role === 'impostor';
  
  return (
    <div className="phase-container role-reveal">
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
