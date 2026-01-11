import React, { useState, useEffect } from 'react';
import { Scissors, Users, Timer, Zap, Shield, AlertCircle, Copy, Check } from 'lucide-react';

// --- FIREBASE SETUP START ---
import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, set, child } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDAI46UYQMVMCnNqQD9MqR3yhiHUzghYuA",
  authDomain: "timebomb-game.firebaseapp.com",
  databaseURL: "https://timebomb-game-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "timebomb-game",
  storageBucket: "timebomb-game.firebasestorage.app",
  messagingSenderId: "752842528482",
  appId: "1:752842528482:web:f97dd6bead7bb6bca4f0bb"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Polyfill window.storage to use Firebase
window.storage = {
  get: async (key) => {
    try {
      const dbRef = ref(db);
      const snapshot = await get(child(dbRef, key));
      if (snapshot.exists()) {
        // The original code expects an object with a 'value' string property
        return { value: snapshot.val() };
      }
      return null;
    } catch (error) {
      console.error("Firebase Get Error", error);
      return null;
    }
  },
  set: async (key, value) => {
    try {
      // The original code passes a JSON string as 'value'
      await set(ref(db, key), value);
    } catch (error) {
      console.error("Firebase Set Error", error);
    }
  }
};
// --- FIREBASE SETUP END ---

// Game configuration based on player count
const GAME_CONFIG = {
  4: { sherlock: 3, moriarty: 2, wires: 15, defusing: 4, bomb: 1 },
  5: { sherlock: 3, moriarty: 2, wires: 19, defusing: 5, bomb: 1 },
  6: { sherlock: 4, moriarty: 2, wires: 23, defusing: 6, bomb: 1 },
  7: { sherlock: 5, moriarty: 3, wires: 27, defusing: 7, bomb: 1 },
  8: { sherlock: 5, moriarty: 3, wires: 31, defusing: 8, bomb: 1 }
};

// Generate random room code
const generateRoomCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export default function TimeBombGame() {
  const [screen, setScreen] = useState('home'); // 'home', 'lobby', 'game', 'end'
  const [roomCode, setRoomCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [playerId, setPlayerId] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [gameState, setGameState] = useState(null);
  const [myRole, setMyRole] = useState(null);
  const [selectedWire, setSelectedWire] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [gameLog, setGameLog] = useState([]);
  const [showLog, setShowLog] = useState(false);

  // Poll for game state updates
  useEffect(() => {
    if (!roomCode || screen === 'home') return;

    const pollGameState = async () => {
      try {
        const result = await window.storage.get(`room:${roomCode}`, true);
        if (result?.value) {
          const state = JSON.parse(result.value);
          setGameState(state);
          
          // Update game log
          if (state.log && JSON.stringify(state.log) !== JSON.stringify(gameLog)) {
            setGameLog(state.log || []);
          }
          
          // Update screen based on game state
          if (state.status === 'lobby' && screen !== 'lobby') {
            setScreen('lobby');
          } else if (state.status === 'playing' && screen !== 'game') {
            setScreen('game');
            // Set role if not already set
            if (!myRole && playerId !== null) {
              const player = state.players.find(p => p.id === playerId);
              if (player) setMyRole(player.role);
            }
          } else if (state.status === 'ended' && screen !== 'end') {
            setScreen('end');
          }
        }
      } catch (err) {
        console.log('Polling game state:', err);
      }
    };

    pollGameState();
    const interval = setInterval(pollGameState, 1000);
    return () => clearInterval(interval);
  }, [roomCode, screen, playerId, myRole, gameLog]);

  // Create room
  const createRoom = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    setLoading(true);
    setError('');
    
    const code = generateRoomCode();
    const newPlayerId = 0;
    
    const initialState = {
      code,
      status: 'lobby',
      hostId: newPlayerId,
      playerCount: 5,
      players: [{
        id: newPlayerId,
        name: playerName.trim(),
        ready: false
      }],
      createdAt: Date.now()
    };

    try {
      await window.storage.set(`room:${code}`, JSON.stringify(initialState), true);
      setRoomCode(code);
      setPlayerId(newPlayerId);
      setGameState(initialState);
      setScreen('lobby');
    } catch (err) {
      setError('Failed to create room. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Join room
  const joinRoom = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }
    
    if (!inputCode.trim()) {
      setError('Please enter a room code');
      return;
    }

    setLoading(true);
    setError('');
    
    const code = inputCode.trim().toUpperCase();

    try {
      const result = await window.storage.get(`room:${code}`, true);
      
      if (!result?.value) {
        setError('Room not found');
        setLoading(false);
        return;
      }

      const state = JSON.parse(result.value);
      
      if (state.status !== 'lobby') {
        setError('Game already started');
        setLoading(false);
        return;
      }

      if (state.players.length >= state.playerCount) {
        setError('Room is full');
        setLoading(false);
        return;
      }

      // Check if player name already exists or is rejoining
      const existingPlayer = state.players.find(p => p.name === playerName.trim());
      let myNewId;

      if (existingPlayer) {
          // Rejoin logic could go here, but for now we treat as new or error
          // Simpler for this demo: create new ID
          myNewId = Math.max(...state.players.map(p => p.id)) + 1;
      } else {
          myNewId = Math.max(...state.players.map(p => p.id)) + 1;
      }
      
      state.players.push({
        id: myNewId,
        name: playerName.trim(),
        ready: false
      });

      await window.storage.set(`room:${code}`, JSON.stringify(state), true);
      
      setRoomCode(code);
      setPlayerId(myNewId);
      setGameState(state);
      setScreen('lobby');
    } catch (err) {
      setError('Failed to join room. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Update player count (host only)
  const updatePlayerCount = async (count) => {
    if (playerId !== gameState.hostId) return;

    const newState = {
      ...gameState,
      playerCount: count
    };

    try {
      await window.storage.set(`room:${roomCode}`, JSON.stringify(newState), true);
      setGameState(newState);
    } catch (err) {
      console.error('Failed to update player count');
    }
  };

  // Toggle ready
  const toggleReady = async () => {
    const newState = { ...gameState };
    // We need to map over players to create a new array to avoid direct mutation issues
    newState.players = newState.players.map(p => {
        if (p.id === playerId) {
            return { ...p, ready: !p.ready };
        }
        return p;
    });

    try {
      await window.storage.set(`room:${roomCode}`, JSON.stringify(newState), true);
      setGameState(newState);
    } catch (err) {
      console.error('Failed to toggle ready');
    }
  };

  // Start game (host only)
  const startGame = async () => {
    if (playerId !== gameState.hostId) return;
    if (gameState.players.length < 4) {
      setError('Need at least 4 players to start');
      return;
    }
    if (gameState.players.length > gameState.playerCount) {
      setError('Too many players for selected player count');
      return;
    }
    if (gameState.players.length !== gameState.playerCount) {
      setError(`Waiting for ${gameState.playerCount} players`);
      return;
    }

    const config = GAME_CONFIG[gameState.playerCount];
    
    // Assign roles
    const roles = [
      ...Array(config.sherlock).fill('sherlock'),
      ...Array(config.moriarty).fill('moriarty')
    ].sort(() => Math.random() - 0.5);

    // Create wire deck
    const wireDeck = [
      ...Array(config.defusing).fill('defusing'),
      ...Array(config.bomb).fill('bomb'),
      ...Array(config.wires - config.defusing - config.bomb).fill('safe')
    ].sort(() => Math.random() - 0.5);

    // Assign wires to players
    const playersWithRoles = gameState.players.map((player, idx) => ({
      ...player,
      role: roles[idx],
      wires: wireDeck.slice(idx * 5, (idx + 1) * 5).map((type, wireIdx) => ({
        id: `${player.id}-0-${wireIdx}`,
        type,
        revealed: false
      }))
    }));

    const newState = {
      ...gameState,
      status: 'playing',
      players: playersWithRoles,
      currentPlayer: 0,
      round: 1,
      revealedInRound: 0,
      defusingFound: 0,
      config,
      log: [{ message: '🎮 Game started!', timestamp: Date.now() }]
    };

    try {
      await window.storage.set(`room:${roomCode}`, JSON.stringify(newState), true);
      setGameState(newState);
      
      // Set my role
      const me = playersWithRoles.find(p => p.id === playerId);
      if (me) setMyRole(me.role);
      
      setScreen('game');
    } catch (err) {
      setError('Failed to start game');
    }
  };

  // Cut a wire
  const cutWire = async (targetPlayerId, wireId) => {
    if (gameState.players[gameState.currentPlayer].id !== playerId) return;
    if (targetPlayerId === playerId) return;

    const newState = { ...gameState };
    // Deep clone to avoid mutation references
    newState.players = JSON.parse(JSON.stringify(newState.players));
    
    const targetPlayer = newState.players.find(p => p.id === targetPlayerId);
    const currentPlayer = newState.players.find(p => p.id === playerId);
    const wire = targetPlayer.wires.find(w => w.id === wireId);
    
    if (wire.revealed) return;
    
    wire.revealed = true;
    
    // Add to log
    const log = newState.log || [];
    let logMessage = `${currentPlayer.name} cut ${targetPlayer.name}'s wire: `;
    
    // Check wire type
    if (wire.type === 'bomb') {
      logMessage += '💣 BOMB!';
      newState.status = 'ended';
      newState.winner = 'moriarty';
      log.push({ message: logMessage, timestamp: Date.now() });
      log.push({ message: '💥 Big Ben destroyed! Moriarty wins!', timestamp: Date.now() });
    } else if (wire.type === 'defusing') {
      newState.defusingFound += 1;
      logMessage += `✂️ Defusing (${newState.defusingFound}/${newState.config.defusing})`;
      log.push({ message: logMessage, timestamp: Date.now() });
      
      if (newState.defusingFound === newState.config.defusing) {
        newState.status = 'ended';
        newState.winner = 'sherlock';
        log.push({ message: '🎉 All defusing wires found! Sherlock wins!', timestamp: Date.now() });
      }
    } else {
      logMessage += '✓ Safe wire';
      log.push({ message: logMessage, timestamp: Date.now() });
    }
    
    newState.log = log;
    
    if (newState.status !== 'ended') {
      newState.revealedInRound += 1;
      
      // Check if round ends
      if (newState.revealedInRound === newState.playerCount) {
        if (newState.round === 4) {
          newState.status = 'ended';
          newState.winner = 'moriarty';
          log.push({ message: '⏰ 4 rounds completed. Moriarty wins!', timestamp: Date.now() });
        } else {
          // Start new round
          const unrevealedWires = newState.players.flatMap(p => 
            p.wires.filter(w => !w.revealed).map(w => w.type)
          ).sort(() => Math.random() - 0.5);
          
          const wiresPerPlayer = Math.floor(unrevealedWires.length / newState.playerCount);
          
          newState.players = newState.players.map((player, idx) => ({
            ...player,
            wires: unrevealedWires.slice(idx * wiresPerPlayer, (idx + 1) * wiresPerPlayer)
              .map((type, wireIdx) => ({
                id: `${player.id}-${newState.round}-${wireIdx}`,
                type,
                revealed: false
              }))
          }));
          
          newState.round += 1;
          newState.revealedInRound = 0;
          log.push({ message: `🔄 Round ${newState.round} started!`, timestamp: Date.now() });
        }
      } else {
        // Find next player index
        const currentPlayerIndex = newState.players.findIndex(p => p.id === targetPlayerId);
        newState.currentPlayer = currentPlayerIndex;
      }
    }

    try {
      await window.storage.set(`room:${roomCode}`, JSON.stringify(newState), true);
      setGameState(newState);
      setSelectedWire(null);
    } catch (err) {
      console.error('Failed to cut wire');
    }
  };

  // Copy room code
  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Leave room
  const leaveRoom = () => {
    setScreen('home');
    setRoomCode('');
    setPlayerId(null);
    setGameState(null);
    setMyRole(null);
    setInputCode('');
    setError('');
    setGameLog([]);
  };

  // Play again (host only)
  const playAgain = async () => {
    if (playerId !== gameState.hostId) return;

    const newState = {
      ...gameState,
      status: 'lobby',
      players: gameState.players.map(p => ({ ...p, ready: false, role: undefined, wires: undefined })),
      currentPlayer: undefined,
      round: undefined,
      revealedInRound: undefined,
      defusingFound: undefined,
      config: undefined,
      winner: undefined,
      log: []
    };

    try {
      await window.storage.set(`room:${roomCode}`, JSON.stringify(newState), true);
      setGameState(newState);
      setMyRole(null);
      setScreen('lobby');
    } catch (err) {
      console.error('Failed to restart game');
    }
  };

  // Home Screen
  if (screen === 'home') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-2xl shadow-2xl p-8 max-w-md w-full border border-slate-700">
          <div className="text-center mb-8">
            <Timer className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
            <h1 className="text-4xl font-bold text-white mb-2">Time Bomb</h1>
            <p className="text-slate-400">London, 1890. Defuse or detonate?</p>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-white mb-2 font-semibold">Your Name</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name"
                maxLength={20}
                className="w-full bg-slate-700 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
              />
            </div>

            {error && (
              <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            <button
              onClick={createRoom}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white py-4 rounded-lg font-bold text-lg hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Room'}
            </button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-slate-800 text-slate-400">OR</span>
              </div>
            </div>
            
            <div>
              <label className="block text-white mb-2 font-semibold">Room Code</label>
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                placeholder="Enter 5-character code"
                maxLength={5}
                className="w-full bg-slate-700 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none uppercase"
              />
            </div>
            
            <button
              onClick={joinRoom}
              disabled={loading}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white py-4 rounded-lg font-bold text-lg transition-all disabled:opacity-50"
            >
              {loading ? 'Joining...' : 'Join Room'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Lobby Screen
  if (screen === 'lobby') {
    const isHost = playerId === gameState.hostId;
    const allReady = gameState.players.every(p => p.ready) && gameState.players.length === gameState.playerCount;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-2xl shadow-2xl p-8 max-w-2xl w-full border border-slate-700">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-white mb-4">Game Lobby</h2>
            
            <div className="bg-slate-900 rounded-lg p-4 mb-4">
              <div className="text-slate-400 text-sm mb-1">Room Code</div>
              <div className="flex items-center justify-center gap-2">
                <div className="text-4xl font-bold text-white tracking-wider">{roomCode}</div>
                <button
                  onClick={copyRoomCode}
                  className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-all"
                  title="Copy code"
                >
                  {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5 text-slate-400" />}
                </button>
              </div>
              <div className="text-slate-400 text-sm mt-2">Share this code with your friends!</div>
            </div>
          </div>

          {isHost && (
            <div className="mb-6">
              <label className="block text-white mb-3 font-semibold">
                <Users className="inline w-5 h-5 mr-2" />
                Number of Players
              </label>
              <div className="grid grid-cols-5 gap-2">
                {[4, 5, 6, 7, 8].map(num => (
                  <button
                    key={num}
                    onClick={() => updatePlayerCount(num)}
                    className={`py-3 rounded-lg font-bold transition-all ${
                      gameState.playerCount === num
                        ? 'bg-blue-500 text-white shadow-lg'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
              
              <div className="bg-slate-900 rounded-lg p-3 mt-3 text-sm text-slate-300">
                <div className="flex justify-between">
                  <span className="flex items-center">
                    <Shield className="w-4 h-4 mr-2 text-blue-400" />
                    Sherlock:
                  </span>
                  <span className="font-bold text-blue-400">{GAME_CONFIG[gameState.playerCount].sherlock}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="flex items-center">
                    <Zap className="w-4 h-4 mr-2 text-red-400" />
                    Moriarty:
                  </span>
                  <span className="font-bold text-red-400">{GAME_CONFIG[gameState.playerCount].moriarty}</span>
                </div>
              </div>
            </div>
          )}

          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-white font-bold">
                Players ({gameState.players.length}/{gameState.playerCount})
              </h3>
            </div>
            
            <div className="space-y-2">
              {gameState.players.map(player => (
                <div
                  key={player.id}
                  className="bg-slate-700 rounded-lg p-3 flex justify-between items-center"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${player.ready ? 'bg-green-400' : 'bg-slate-500'}`}></div>
                    <span className="text-white font-medium">{player.name}</span>
                    {player.id === gameState.hostId && (
                      <span className="text-xs bg-yellow-500 text-slate-900 px-2 py-1 rounded font-bold">HOST</span>
                    )}
                    {player.id === playerId && (
                      <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded font-bold">YOU</span>
                    )}
                  </div>
                  <div className="text-sm text-slate-400">
                    {player.ready ? '✓ Ready' : 'Not ready'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={toggleReady}
              className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                gameState.players.find(p => p.id === playerId)?.ready
                  ? 'bg-slate-600 hover:bg-slate-500 text-white'
                  : 'bg-green-600 hover:bg-green-500 text-white'
              }`}
            >
              {gameState.players.find(p => p.id === playerId)?.ready ? 'Not Ready' : 'Ready'}
            </button>
            
            {isHost && (
              <button
                onClick={startGame}
                disabled={!allReady}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 text-white py-3 rounded-lg font-bold hover:from-blue-700 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start Game
              </button>
            )}
            
            <button
              onClick={leaveRoom}
              className="px-6 bg-red-600 hover:bg-red-500 text-white py-3 rounded-lg font-bold transition-all"
            >
              Leave
            </button>
          </div>
        </div>
      </div>
    );
  }

  // End Screen
  if (screen === 'end') {
    const isWinner = (gameState.winner === 'sherlock' && myRole === 'sherlock') || 
                     (gameState.winner === 'moriarty' && myRole === 'moriarty');
    const isHost = playerId === gameState.hostId;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-2xl shadow-2xl p-8 max-w-md w-full border border-slate-700 text-center">
          <div className="mb-6">
            {gameState.winner === 'sherlock' ? (
              <Shield className="w-20 h-20 mx-auto text-blue-400 mb-4 animate-pulse" />
            ) : (
              <Zap className="w-20 h-20 mx-auto text-red-400 mb-4 animate-pulse" />
            )}
          </div>
          
          <h2 className="text-3xl font-bold text-white mb-4">
            {gameState.winner === 'sherlock' ? 'Bomb Defused!' : 'Big Ben Destroyed!'}
          </h2>
          
          <p className="text-xl mb-6 text-slate-300">
            {gameState.winner === 'sherlock' ? (
              <span className="text-blue-400 font-bold">Sherlock's Team Wins!</span>
            ) : (
              <span className="text-red-400 font-bold">Moriarty's Team Wins!</span>
            )}
          </p>
          
          <div className="bg-slate-900 rounded-lg p-4 mb-6">
            <p className={`text-lg font-bold ${isWinner ? 'text-green-400' : 'text-orange-400'}`}>
              {isWinner ? '🎉 You Won!' : '😔 You Lost'}
            </p>
            <p className="text-slate-400 mt-2">
              You were on {myRole === 'sherlock' ? "Sherlock's" : "Moriarty's"} team
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="bg-slate-900 rounded-lg p-4 text-left">
              <h3 className="font-bold text-white mb-2">Team Roles:</h3>
              {gameState.players.map(p => (
                <div key={p.id} className="flex justify-between text-sm py-1">
                  <span className="text-slate-300">{p.name}:</span>
                  <span className={p.role === 'sherlock' ? 'text-blue-400' : 'text-red-400'}>
                    {p.role === 'sherlock' ? 'Sherlock' : 'Moriarty'}
                  </span>
                </div>
              ))}
            </div>
            
            <div className="flex gap-2">
              {isHost && (
                <button
                  onClick={playAgain}
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-500 text-white py-4 rounded-lg font-bold hover:from-green-700 hover:to-green-600 transition-all"
                >
                  Play Again
                </button>
              )}
              <button
                onClick={leaveRoom}
                className={`${isHost ? 'flex-1' : 'w-full'} bg-gradient-to-r from-blue-600 to-blue-500 text-white py-4 rounded-lg font-bold hover:from-blue-700 hover:to-blue-600 transition-all`}
              >
                Leave Room
              </button>
            </div>
            
            {!isHost && (
              <p className="text-slate-400 text-sm">Waiting for host to start a new game...</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Game Screen
  if (!gameState || !gameState.players || !gameState.players[gameState.currentPlayer]) {
      return <div className="text-white text-center p-10">Loading game state...</div>;
  }
  
  const currentPlayerObj = gameState.players[gameState.currentPlayer];
  const isMyTurn = currentPlayerObj.id === playerId;
  const myPlayer = gameState.players.find(p => p.id === playerId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-slate-800 rounded-xl p-4 mb-4 border border-slate-700">
          <div className="flex flex-wrap gap-4 justify-between items-center">
            <div className="flex items-center gap-4">
              <div className={`px-4 py-2 rounded-lg font-bold ${
                myRole === 'sherlock' ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'
              }`}>
                {myRole === 'sherlock' ? (
                  <><Shield className="inline w-4 h-4 mr-2" />Sherlock</>
                ) : (
                  <><Zap className="inline w-4 h-4 mr-2" />Moriarty</>
                )}
              </div>
              
              <div className="text-white">
                <div className="text-sm text-slate-400">Round</div>
                <div className="text-2xl font-bold">{gameState.round}/4</div>
              </div>
              
              <div className="text-white">
                <div className="text-sm text-slate-400">Defusing Wires</div>
                <div className="text-2xl font-bold text-blue-400">
                  {gameState.defusingFound}/{gameState.config.defusing}
                </div>
              </div>
            </div>
            
            <div className="text-white text-right">
              <div className="text-sm text-slate-400">Current Turn</div>
              <div className="text-xl font-bold">{currentPlayerObj.name}</div>
              {isMyTurn && <div className="text-sm text-yellow-400">Your turn!</div>}
            </div>
          </div>
          
          <div className={`mt-4 p-3 rounded-lg ${
            myRole === 'sherlock' ? 'bg-blue-900/50' : 'bg-red-900/50'
          }`}>
            <p className="text-white text-sm">
              {myRole === 'sherlock' ? (
                <>🎯 Find all {gameState.config.defusing} Defusing wires to win. Avoid the Bomb!</>
              ) : (
                <>💣 Cut the Bomb or survive 4 rounds to win. Mislead others!</>
              )}
            </p>
          </div>
          
          {/* Game Log Toggle */}
          <button
            onClick={() => setShowLog(!showLog)}
            className="mt-4 w-full bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm transition-all"
          >
            {showLog ? '📜 Hide Game Log' : '📜 Show Game Log'}
          </button>
          
          {showLog && gameLog.length > 0 && (
            <div className="mt-4 bg-slate-900 rounded-lg p-3 max-h-40 overflow-y-auto">
              {gameLog.slice(-10).reverse().map((entry, idx) => (
                <div key={idx} className="text-slate-300 text-xs py-1 border-b border-slate-800 last:border-0">
                  {entry.message}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Players Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {gameState.players.map((player) => {
            const isCurrentPlayer = currentPlayerObj.id === player.id;
            const isMe = player.id === playerId;
            
            return (
              <div
                key={player.id}
                className={`bg-slate-800 rounded-xl p-4 border-2 transition-all ${
                  isCurrentPlayer
                    ? 'border-yellow-400 shadow-lg shadow-yellow-400/20'
                    : 'border-slate-700'
                } ${isMe ? 'ring-2 ring-blue-500' : ''}`}
              >
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-white font-bold text-lg">
                    {player.name}
                    {isMe && <span className="text-xs ml-2 text-blue-400">(You)</span>}
                    {isCurrentPlayer && (
                      <Scissors className="inline w-5 h-5 ml-2 text-yellow-400" />
                    )}
                  </h3>
                  <span className="text-slate-400 text-sm">
                    {player.wires.filter(w => !w.revealed).length} wires
                  </span>
                </div>

                {/* Wires */}
                <div className="grid grid-cols-5 gap-2">
                  {player.wires.map((wire) => {
                    const canCut = isMyTurn && !isMe && !wire.revealed;
                    const isSelected = selectedWire?.playerId === player.id && selectedWire?.wireId === wire.id;
                    
                    return (
                      <button
                        key={wire.id}
                        onClick={() => {
                          if (canCut) {
                            setSelectedWire({ playerId: player.id, wireId: wire.id });
                          }
                        }}
                        disabled={!canCut}
                        className={`aspect-square rounded-lg transition-all ${
                          wire.revealed
                            ? wire.type === 'bomb'
                              ? 'bg-red-500 text-white'
                              : wire.type === 'defusing'
                              ? 'bg-blue-500 text-white'
                              : 'bg-slate-600 text-slate-400'
                            : isSelected
                            ? 'bg-yellow-500 scale-110 shadow-lg cursor-pointer'
                            : canCut
                            ? 'bg-slate-700 hover:bg-slate-600 cursor-pointer hover:scale-105'
                            : 'bg-slate-700 cursor-not-allowed opacity-50'
                        }`}
                      >
                        {wire.revealed ? (
                          wire.type === 'bomb' ? '💣' :
                          wire.type === 'defusing' ? '✂️' : '✓'
                        ) : (
                          '?'
                        )}
                      </button>
                    );
                  })}
                </div>
                
                {isSelected && selectedWire?.playerId === player.id && (
                  <button
                    onClick={() => cutWire(player.id, selectedWire.wireId)}
                    className="mt-3 w-full bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold py-2 rounded-lg flex items-center justify-center gap-2 animate-pulse"
                  >
                    <Scissors className="w-4 h-4" />
                    CUT WIRE
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}