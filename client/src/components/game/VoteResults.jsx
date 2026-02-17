import { getProfilePic } from '../../constants/profilePics';
import './GamePhases.css';

export default function VoteResults({ voteResults, players }) {
  if (!voteResults) return <div>Loading results...</div>;

  // Group votes by who was voted for
  const voteGroups = {};
  voteResults.voteDetails.forEach(player => {
    if (player.votedFor) {
      if (!voteGroups[player.votedFor]) {
        voteGroups[player.votedFor] = [];
      }
      voteGroups[player.votedFor].push(player);
    }
  });

  const getPlayerName = (id) => {
    return players.find(p => p.id === id)?.name || 'Unknown';
  };

  const getPlayerAvatar = (id) => {
    const player = players.find(p => p.id === id);
    return player?.profilePicIndex !== undefined ? getProfilePic(player.profilePicIndex) : (player?.avatar || '#FFD700');
  };

  return (
    <div className="phase-container vote-results-container">
      <h2 className="voting-title">Vote Results</h2>

      <div className="votes-visualization">
        {Object.entries(voteGroups).map(([votedForId, voters]) => (
          <div key={votedForId} className="votes-row card">
            <div className="voter-row">
              {voters.map(voter => {
                const voterId = voter.id;
                const voterPlayer = players.find(p => p.id === voterId);
                return (
                  <div key={voter.id} className="voter-card">
                    <span className="player-name-tag">{voter.name}</span>
                    {voterPlayer?.profilePicIndex !== undefined ? (
                      <img 
                        src={getProfilePic(voterPlayer.profilePicIndex)} 
                        alt={voter.name}
                        className="avatar avatar-small"
                      />
                    ) : (
                      <div 
                        className="avatar avatar-small"
                        style={{ backgroundColor: getPlayerAvatar(voter.id) }}
                      >
                        {voter.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="vote-arrow">↓</div>
            <div className="voted-for-row">
              <div className="voter-card">
                {(() => {
                  const votedForPlayer = players.find(p => p.id === votedForId);
                  return votedForPlayer?.profilePicIndex !== undefined ? (
                    <img 
                      src={getProfilePic(votedForPlayer.profilePicIndex)} 
                      alt={getPlayerName(votedForId)}
                      className="avatar"
                    />
                  ) : (
                    <div 
                      className="avatar"
                      style={{ backgroundColor: getPlayerAvatar(votedForId) }}
                    >
                      {getPlayerName(votedForId)?.charAt(0).toUpperCase()}
                    </div>
                  );
                })()}
                <span className="player-name-tag">{getPlayerName(votedForId)}</span>
                <span className="vote-count">{voters.length} vote{voters.length > 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
