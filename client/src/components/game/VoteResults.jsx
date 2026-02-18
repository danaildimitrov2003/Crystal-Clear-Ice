import { getProfilePic } from '../../constants/profilePics';
import './GamePhases.css';

export default function VoteResults({ voteResults, players }) {
  if (!voteResults) return <div>Loading results...</div>;

  // Build a flat list of individual votes (one entry per voter)
  const votes = voteResults.voteDetails
    .filter(v => v.votedFor)
    .map(v => ({ voterId: v.id, voterName: v.name, votedForId: v.votedFor }));

  const getPlayer = (id) => players.find(p => p.id === id);
  const getPlayerName = (id) => getPlayer(id)?.name || 'Unknown';

  const renderAvatar = (id, size) => {
    const player = getPlayer(id);
    const cls = `avatar ${size === 'small' ? 'vr-avatar-small' : 'vr-avatar-large'}`;
    if (player?.profilePicIndex !== undefined) {
      return <img src={getProfilePic(player.profilePicIndex)} alt={player.name} className={cls} />;
    }
    return (
      <div className={cls} style={{ backgroundColor: player?.avatar || '#FFD700' }}>
        {getPlayerName(id)?.charAt(0).toUpperCase()}
      </div>
    );
  };

  return (
    <div className="phase-container vote-results-container">
      <h2 className="voting-title">Vote Results</h2>

      <div className="vr-strip">
        {votes.map((vote, i) => (
          <div
            key={`${vote.voterId}-${i}`}
            className="vr-pair"
            style={{ animationDelay: `${i * 0.45}s` }}
          >
            {/* Voter (top) */}
            <span className="vr-name">{vote.voterName}</span>
            {renderAvatar(vote.voterId, 'small')}

            {/* Arrow */}
            <div className="vr-arrow">
              <svg width="30" height="48" viewBox="0 0 30 48">
                <line x1="15" y1="0" x2="15" y2="38" stroke="var(--impostor-red)" strokeWidth="3.5" strokeLinecap="round" />
                <polygon points="5,34 15,46 25,34" fill="var(--impostor-red)" />
              </svg>
            </div>

            {/* Voted-for (bottom) */}
            {renderAvatar(vote.votedForId, 'large')}
            <span className="vr-name">{getPlayerName(vote.votedForId)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
