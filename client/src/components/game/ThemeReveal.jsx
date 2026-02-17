import './GamePhases.css';

export default function ThemeReveal({ category }) {
  return (
    <div className="phase-container reveal-container">
      <p className="reveal-label">The theme is</p>
      <div className="reveal-value">
        {category?.charAt(0).toUpperCase() + category?.slice(1)}
      </div>
    </div>
  );
}
