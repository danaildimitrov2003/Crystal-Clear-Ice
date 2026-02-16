import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useGameStore } from './store/gameStore';
import Home from './pages/Home';
import Menu from './pages/Menu';
import JoinLobby from './pages/JoinLobby';
import CreateLobby from './pages/CreateLobby';
import Lobby from './pages/Lobby';
import Game from './pages/Game';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/menu" element={<ProtectedRoute><Menu /></ProtectedRoute>} />
        <Route path="/join" element={<ProtectedRoute><JoinLobby /></ProtectedRoute>} />
        <Route path="/create" element={<ProtectedRoute><CreateLobby /></ProtectedRoute>} />
        <Route path="/lobby" element={<ProtectedRoute><Lobby /></ProtectedRoute>} />
        <Route path="/game" element={<ProtectedRoute><Game /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function ProtectedRoute({ children }) {
  const player = useGameStore((state) => state.player);
  
  if (!player) {
    return <Navigate to="/" replace />;
  }
  
  return children;
}

export default App;
