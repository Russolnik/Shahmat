// Главный компонент приложения из glasscheckers (адаптирован для Telegram Mini App)
import React, { useState, useEffect, useCallback, useRef } from 'react';
import GlassBoard from './components/GlassBoard';
import GlassGameInfo from './components/GlassGameInfo';
import GlassLobby from './components/GlassLobby';
import { GameMode, GameState, Move, PieceColor, Piece, Position, PlayerProfile, RoomState, ThemeMode } from './types';
import { getAllValidMoves, getAvailableCaptures, initializeBoard } from './utils/glassCheckersLogic';
import { useTelegramAuth } from './hooks/useTelegramAuth';
import { useGameSocket } from './hooks/useGameSocket';
import { useTheme } from './hooks/useTheme';
import { useNotifications } from './hooks/useNotifications';
import { boardToPieces, convertMoveToPiecesFormat, countCapturedPieces } from './utils/gameAdapter';
import { RotateCcw, LogOut } from 'lucide-react';

const STORAGE_KEY = 'checkers_session_v1';

const GlassApp: React.FC = () => {
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [gameState, setGameState] = useState<GameState>({
    pieces: [],
    currentPlayer: PieceColor.WHITE,
    selectedPieceId: null,
    validMoves: [],
    winner: null,
    isGameOver: false,
    capturedWhite: 0,
    capturedBlack: 0,
    mustCaptureFrom: null,
    moveHistory: [],
    startTime: Date.now()
  });
  const [menuOpen, setMenuOpen] = useState(true);
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const [withFuki, setWithFuki] = useState(true);
  const [huffedPosition, setHuffedPosition] = useState<Position | null>(null);
  const [showSeriesAlert, setShowSeriesAlert] = useState(false);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [myProfile, setMyProfile] = useState<PlayerProfile | null>(null);
  const [gameTimer, setGameTimer] = useState(0);
  const [gameId, setGameId] = useState<string | null>(null);
  
  const { user, isAuthenticated } = useTelegramAuth();
  const { socket, connected } = useGameSocket(gameId);
  const { theme: appTheme, toggleTheme } = useTheme();
  const { notifications, showSuccess, showError, showInfo, removeNotification } = useNotifications();

  // Инициализация темы
  useEffect(() => {
    document.body.className = `${theme} bg-grain transition-colors duration-500`;
  }, [theme]);

  // Таймер игры
  useEffect(() => {
    if (!menuOpen && !gameState.isGameOver && (!room?.status || room?.status === 'PLAYING')) {
      const interval = setInterval(() => setGameTimer(t => t + 1), 1000);
      return () => clearInterval(interval);
    }
  }, [menuOpen, gameState.isGameOver, room?.status]);

  // Уведомление о серии ходов
  useEffect(() => {
    if (gameState.mustCaptureFrom) {
      setShowSeriesAlert(true);
      const t = setTimeout(() => setShowSeriesAlert(false), 3000);
      return () => clearTimeout(t);
    } else {
      setShowSeriesAlert(false);
    }
  }, [gameState.mustCaptureFrom]);

  // Обработка состояния игры от WebSocket
  useEffect(() => {
    if (!socket) return;

    socket.on('gameState', (state: any) => {
      console.log('📥 Получено состояние игры:', state);
      
      // Конвертируем доску в фишки, если нужно
      let pieces: Piece[] = [];
      if (state.pieces && Array.isArray(state.pieces)) {
        pieces = state.pieces;
      } else if (state.board) {
        pieces = boardToPieces(state.board);
      }

      // Конвертируем currentPlayer
      const currentPlayerColor = state.currentPlayerColor || 
        (state.currentPlayer === 'white' ? PieceColor.WHITE : PieceColor.BLACK);
      
      const myPlayerColor = state.myPlayerColor ||
        (state.myPlayer === 'white' ? PieceColor.WHITE : 
         state.myPlayer === 'black' ? PieceColor.BLACK : null);

      // Подсчитываем захваченные фишки
      const capturedWhite = state.capturedWhite || countCapturedPieces(pieces, PieceColor.WHITE);
      const capturedBlack = state.capturedBlack || countCapturedPieces(pieces, PieceColor.BLACK);

      // Получаем возможные ходы
      const mustCaptureFrom = state.mustCaptureFrom ? 
        { row: state.mustCaptureFrom.row, col: state.mustCaptureFrom.col } : null;
      const validMoves = getAllValidMoves(pieces, currentPlayerColor, mustCaptureFrom);

      setGameState({
        pieces,
        currentPlayer: currentPlayerColor,
        selectedPieceId: null,
        validMoves,
        winner: state.winner ? (state.winner === 'white' ? PieceColor.WHITE : PieceColor.BLACK) : null,
        isGameOver: state.status === 'finished',
        capturedWhite,
        capturedBlack,
        mustCaptureFrom,
        moveHistory: gameState.moveHistory,
        startTime: gameState.startTime || Date.now()
      });

      if (state.status === 'active') {
        setMenuOpen(false);
      }
    });

    socket.on('gameStarted', () => {
      showSuccess('Игра началась!', 3000);
    });

    return () => {
      socket.off('gameState');
      socket.off('gameStarted');
    };
  }, [socket, gameState.moveHistory, gameState.startTime, showSuccess]);

  const executeMove = useCallback((move: Move, broadcast: boolean = true) => {
    setGameState(currentState => {
      const availableCaptures = getAvailableCaptures(currentState.pieces, currentState.currentPlayer);
      let pieceToHuffId: string | null = null;

      if (withFuki && availableCaptures.length > 0 && !move.isCapture) {
        const movedPieceCouldCapture = availableCaptures.some(m => 
          m.from.row === move.from.row && m.from.col === move.from.col
        );

        if (movedPieceCouldCapture) {
          pieceToHuffId = currentState.pieces.find(p => 
            p.position.row === move.from.row && p.position.col === move.from.col
          )?.id || null;
        } else {
          const guiltyMove = availableCaptures[0];
          pieceToHuffId = currentState.pieces.find(p => 
            p.position.row === guiltyMove.from.row && p.position.col === guiltyMove.from.col
          )?.id || null;
        }
      }

      let newPieces = currentState.pieces.map(p => {
        if (p.position.row === move.from.row && p.position.col === move.from.col) {
          let newRow = move.to.row;
          const isWhite = p.color === PieceColor.WHITE;
          let promoted = p.isKing;
          if (!promoted) {
            if (isWhite && newRow === 0) promoted = true;
            if (!isWhite && newRow === 7) promoted = true;
          }
          return { ...p, position: move.to, isKing: promoted };
        }
        return p;
      }).filter(p => p.id !== move.capturedPieceId);

      let capWhite = currentState.capturedWhite;
      let capBlack = currentState.capturedBlack;
      
      if (move.capturedPieceId) {
        if (currentState.currentPlayer === PieceColor.WHITE) capBlack++;
        else capWhite++;
      }

      if (pieceToHuffId) {
        const huffedPiece = newPieces.find(p => p.id === pieceToHuffId);
        if (huffedPiece) {
          setHuffedPosition(huffedPiece.position);
          newPieces = newPieces.filter(p => p.id !== pieceToHuffId);
          if (huffedPiece.color === PieceColor.WHITE) capWhite++; 
          else capBlack++; 
          setTimeout(() => setHuffedPosition(null), 1000);
        }
      }

      let nextMustCaptureFrom: Position | null = null;
      let nextPlayer = currentState.currentPlayer === PieceColor.WHITE ? PieceColor.BLACK : PieceColor.WHITE;

      if (move.isCapture) {
        const movedPiece = newPieces.find(p => 
          p.position.row === move.to.row && p.position.col === move.to.col
        );
        if (movedPiece) {
          const followUpMoves = getAllValidMoves(newPieces, currentState.currentPlayer, movedPiece.position);
          const canContinue = followUpMoves.some(m => m.isCapture);
          if (canContinue) {
            nextMustCaptureFrom = movedPiece.position;
            nextPlayer = currentState.currentPlayer;
          }
        }
      }

      const whiteExists = newPieces.some(p => p.color === PieceColor.WHITE);
      const blackExists = newPieces.some(p => p.color === PieceColor.BLACK);
      let winner = null;
      if (!whiteExists) winner = PieceColor.BLACK;
      else if (!blackExists) winner = PieceColor.WHITE;
      else {
        const nextMoves = getAllValidMoves(newPieces, nextPlayer, nextMustCaptureFrom);
        if (nextMoves.length === 0) winner = (nextPlayer === PieceColor.WHITE ? PieceColor.BLACK : PieceColor.WHITE);
      }

      const nextMoves = winner ? [] : getAllValidMoves(newPieces, nextPlayer, nextMustCaptureFrom);

      const isPromo = newPieces.find(p => 
        p.position.row === move.to.row && p.position.col === move.to.col
      )?.isKing && !currentState.pieces.find(p => 
        p.position.row === move.from.row && p.position.col === move.from.col
      )?.isKing;

      setLastMove({...move, isPromotion: isPromo});

      return {
        pieces: newPieces,
        currentPlayer: nextPlayer,
        selectedPieceId: nextMustCaptureFrom ? (newPieces.find(p => 
          p.position.row === move.to.row && p.position.col === move.to.col
        )?.id || null) : null,
        validMoves: nextMoves,
        winner,
        isGameOver: !!winner,
        capturedWhite: capWhite,
        capturedBlack: capBlack,
        mustCaptureFrom: nextMustCaptureFrom,
        moveHistory: [...currentState.moveHistory, move],
        startTime: currentState.startTime
      };
    });

    if (broadcast && gameMode === GameMode.PVP_ONLINE && socket) {
      const moveToSend = {
        from: move.from,
        to: move.to,
        isCapture: move.isCapture,
        capturedPieceId: move.capturedPieceId,
        capturedPosition: move.capturedPosition
      };
      socket.emit('makeMove', moveToSend);
    }
  }, [gameMode, socket, withFuki]);

  const onSelectPiece = (pieceId: string) => {
    if (gameState.isGameOver) return;
    if (gameMode === GameMode.PVP_ONLINE && myProfile && gameState.currentPlayer !== myProfile.color) return;

    const piece = gameState.pieces.find(p => p.id === pieceId);
    if (!piece || piece.color !== gameState.currentPlayer) return;

    if (gameState.mustCaptureFrom) {
      if (piece.position.row !== gameState.mustCaptureFrom.row || 
          piece.position.col !== gameState.mustCaptureFrom.col) return;
    }
    setGameState(prev => ({ ...prev, selectedPieceId: pieceId }));
  };

  const onMoveRequest = (move: Move) => {
    executeMove(move, true);
  };

  const shouldRotate = gameMode === GameMode.PVP_ONLINE && myProfile?.color === PieceColor.BLACK;

  let whiteName = "Белые";
  let blackName = "Черные";
  if (gameMode === GameMode.PVP_ONLINE && room) {
    const w = room.players.find(p => p.color === PieceColor.WHITE);
    const b = room.players.find(p => p.color === PieceColor.BLACK);
    if (w) whiteName = w.name;
    if (b) blackName = b.name;
  }

  return (
    <div className="relative w-full h-full flex flex-col md:flex-row items-center justify-center overflow-hidden">
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-purple-500/10 blur-[120px] rounded-full pointer-events-none"></div>

      {showSeriesAlert && (
        <div className="fixed top-24 md:top-10 left-1/2 -translate-x-1/2 z-[100] pointer-events-none animate-slide-down">
          <div className="glass-panel px-8 py-4 rounded-2xl border border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.3)] flex flex-col items-center bg-[#1a1a1a]/90 backdrop-blur-xl">
            <span className="text-red-500 font-black tracking-[0.2em] text-lg uppercase shadow-red-500/50 drop-shadow-sm">Обязательно Бить</span>
            <span className="text-gray-400 text-xs font-bold mt-1">(Серия ходов)</span>
          </div>
        </div>
      )}

      {!menuOpen && room?.status === 'WAITING' && myProfile && (
        <GlassLobby 
          room={room} 
          currentPlayerId={myProfile.id} 
          onReady={() => {
            if (socket) {
              socket.emit('setReady', gameId, user?.id);
            }
          }} 
          onLeave={() => {
            setMenuOpen(true);
            setRoom(null);
            setMyProfile(null);
          }} 
        />
      )}

      {(!menuOpen && (room?.status === 'PLAYING' || gameMode === GameMode.PVP_LOCAL)) && (
        <>
          <div className="md:hidden fixed top-0 left-0 w-full z-30 p-2 flex justify-between items-center bg-glass-panel backdrop-blur-md border-b border-white/10">
            <button onClick={() => setMenuOpen(true)} className="p-2 rounded-full hover:bg-white/10">
              <LogOut size={18}/>
            </button>
            <span className="font-bold text-sm">
              {gameState.winner ? 'Конец игры' : (gameState.currentPlayer === PieceColor.WHITE ? `Ход ${whiteName}` : `Ход ${blackName}`)}
            </span>
            <div className="w-8"></div>
          </div>

          <div className="flex flex-col md:flex-row gap-6 items-center justify-center w-full max-w-6xl px-4 pt-12 md:pt-0">
            <div className="relative w-full max-w-[500px] aspect-square z-10">
              <GlassBoard 
                pieces={gameState.pieces}
                validMoves={gameState.validMoves}
                selectedPieceId={gameState.selectedPieceId}
                lastMove={lastMove}
                onSelectPiece={onSelectPiece}
                onMovePiece={onMoveRequest}
                boardRotation={shouldRotate}
                canInteract={!gameState.winner && (gameMode !== GameMode.PVP_ONLINE || gameState.currentPlayer === myProfile?.color)}
                huffedPosition={huffedPosition}
              />
            </div>

            <GlassGameInfo 
              turn={gameState.currentPlayer}
              whiteName={whiteName}
              blackName={blackName}
              capturedWhite={gameState.capturedWhite}
              capturedBlack={gameState.capturedBlack}
              timer={gameTimer}
              myColor={myProfile?.color}
            />

            <div className="hidden md:flex absolute bottom-8 right-8 gap-4">
              <button onClick={() => setMenuOpen(true)} className="bg-glass-panel hover:bg-red-500/20 border border-white/10 text-white p-3 rounded-full transition-colors" title="Покинуть">
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </>
      )}

      {gameState.winner && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-[fadeIn_0.5s_ease-out]">
          <div className="glass-panel p-8 rounded-2xl border border-white/20 text-center shadow-2xl max-w-sm w-full mx-4 transform scale-110">
            <h2 className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-br from-yellow-200 to-yellow-500">
              {gameState.winner === PieceColor.WHITE ? whiteName : blackName} Победил!
            </h2>
            <p className="opacity-60 mb-6 text-sm">Время игры: {Math.floor(gameTimer / 60)}:{String(gameTimer % 60).padStart(2, '0')}</p>
            
            <div className="flex gap-3">
              <button onClick={() => setMenuOpen(true)} className="flex-1 py-3 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition">
                Меню
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlassApp;

