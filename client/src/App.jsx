import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useGameStore } from './store/gameStore';
import Home from './pages/Home';
import JoinLobby from './pages/JoinLobby';
import CreateLobby from './pages/CreateLobby';
import Lobby from './pages/Lobby';
import Game from './pages/Game';

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="ice-particles" aria-hidden="true">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="ice-shard" />
        ))}
      </div>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/join" element={<ProtectedRoute><JoinLobby /></ProtectedRoute>} />
        <Route path="/create" element={<ProtectedRoute><CreateLobby /></ProtectedRoute>} />
        <Route path="/lobby/:lobbyId" element={<ProtectedRoute><Lobby /></ProtectedRoute>} />
        <Route path="/game" element={<ProtectedRoute><Game /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function ProtectedRoute({ children }) {
  const player = useGameStore((state) => state.player);
  const redirectPath = `${window.location.pathname}${window.location.search}`;
  
  if (!player) {
    return <Navigate to={`/?redirect=${encodeURIComponent(redirectPath)}`} replace />;
  }
  
  return children;
}

export default App;
