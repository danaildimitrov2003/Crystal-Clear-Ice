import './GamePhases.css';

export default function ThemeReveal({ category }) {
  return (
    <div className="phase-container reveal-container">
      <div 
        className="avatar avatar-large theme-icon"
        style={{ backgroundColor: '#4ECDC4' }}
      >
        T
      </div>
      
      <p className="reveal-label">The theme is</p>
      <div className="reveal-value">
        {category?.charAt(0).toUpperCase() + category?.slice(1)}
      </div>
    </div>
  );
}
