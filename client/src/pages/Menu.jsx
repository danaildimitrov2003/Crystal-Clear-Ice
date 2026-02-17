import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { getProfilePic } from '../constants/profilePics';
import './Menu.css';

export default function Menu() {
  const navigate = useNavigate();
  const { player } = useGameStore();

  return (
    <div className="menu-page page-container">
      <div className="menu-content animate-fade-in">
        <div className="menu-header">
          <div className="player-info">
            {player?.profilePicIndex !== undefined ? (
              <img 
                src={getProfilePic(player.profilePicIndex)}
                alt={player?.name}
                className="avatar"
              />
            ) : (
              <div 
                className="avatar"
                style={{ backgroundColor: player?.avatar || '#FFD700' }}
              >
                {player?.name?.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="player-name">{player?.name}</span>
          </div>
        </div>

        <div className="menu-buttons">
          <button 
            className="btn btn-primary menu-btn"
            onClick={() => navigate('/create')}
          >
            Create lobby
          </button>
          <button 
            className="btn btn-secondary menu-btn"
            onClick={() => navigate('/join')}
          >
            Join lobby
          </button>
        </div>
      </div>
    </div>
  );
}
