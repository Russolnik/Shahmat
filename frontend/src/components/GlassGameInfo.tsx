
import React from 'react';
import { PieceColor } from '../types';
import { Clock, Eye, Copy } from 'lucide-react';

interface GameInfoProps {
    hostName: string;
    hostColor: PieceColor;
    hostScore: number;
    hostId: string; 
    guestName: string;
    guestColor: PieceColor;
    guestScore: number;
    guestId: string; 
    turn: PieceColor;
    timer: number;
    myId?: string; 
    isSpectator?: boolean;
    roomCode?: string;
    spectatorCount?: number;
    hostConnected?: boolean;
    guestConnected?: boolean;
    onPassTurn?: () => void;
    canPassTurn?: boolean;
}

const GameInfo: React.FC<GameInfoProps> = ({ 
    hostName, hostColor, hostScore, hostId,
    guestName, guestColor, guestScore, guestId,
    turn, timer, myId, isSpectator, roomCode,
    spectatorCount = 0, hostConnected = true, guestConnected = true,
    onPassTurn, canPassTurn
}) => {
  
  const formatTime = (s: number) => {
      const mins = Math.floor(s / 60);
      const secs = s % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const copyCode = () => {
      if (roomCode) navigator.clipboard.writeText(roomCode);
  };

  // Helper to render player row
  const PlayerRow = (name: string, color: PieceColor, score: number, playerId: string, isHost: boolean, isConnected: boolean) => {
      const isActive = turn === color;
      const isMe = myId === playerId;
      
      return (
          <div className={`w-full flex items-center justify-between p-2 rounded-xl transition-all duration-300 border ${isActive ? 'bg-white/10 border-white/30 shadow-lg scale-[1.02]' : 'border-transparent opacity-70'}`}>
              <div className="flex items-center gap-3">
                   {/* Online/Offline Lamp */}
                   <div className="relative">
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_5px_#22c55e]' : 'bg-red-500 animate-pulse shadow-[0_0_5px_#ef4444]'}`} />
                   </div>

                   {/* Color Indicator */}
                   <div className={`w-4 h-4 rounded-full shadow-sm border ${color === PieceColor.WHITE ? 'bg-gray-200 border-white' : 'bg-gray-800 border-gray-600'}`} />
                   
                   <div className="flex flex-col leading-none">
                       <div className="flex items-center gap-2">
                           <span className="font-bold text-sm md:text-base truncate max-w-[120px]">{name}</span>
                           {isMe && <span className="text-[9px] bg-blue-500/80 text-white px-1.5 py-0.5 rounded-full tracking-wider">ВЫ</span>}
                       </div>
                       <span className="text-[10px] opacity-50 uppercase tracking-wider font-bold">{isHost ? 'Создатель' : 'Гость'}</span>
                   </div>
              </div>

              {/* Score (Captured Pieces) */}
              <div className="flex items-center gap-1 bg-black/20 px-2 py-1 rounded-lg">
                  <div className={`w-2 h-2 rounded-full ${color === PieceColor.WHITE ? 'bg-gray-800' : 'bg-gray-200'} opacity-50`} />
                  <span className="font-mono font-bold text-sm">{score}</span>
              </div>
          </div>
      );
  };

  return (
    <div className="glass-panel rounded-2xl p-4 w-full md:w-72 flex flex-col gap-3 border border-white/10 shadow-xl backdrop-blur-xl relative overflow-hidden">
        
        {isSpectator && (
            <div className="absolute top-0 right-0 bg-blue-500/20 text-blue-200 text-[10px] px-2 py-1 rounded-bl-lg font-bold flex items-center gap-1">
                <Eye size={10} /> Наблюдатель
            </div>
        )}

        {/* 1. Creator (Host) */}
        {PlayerRow(hostName, hostColor, hostScore, hostId, true, hostConnected)}

        {/* 2. Timer (Center) */}
        <div className="flex justify-center py-1 relative flex-col items-center gap-2">
            <div className="flex items-center gap-3 px-6 py-2 bg-black/30 rounded-full border border-white/5 shadow-inner relative z-10">
                <Clock size={16} className={`text-blue-400 ${timer > 0 ? 'animate-pulse' : ''}`} />
                <span className="font-mono text-xl font-bold tracking-widest text-blue-100">
                    {formatTime(timer)}
                </span>
            </div>
            
            {canPassTurn && onPassTurn && (
                <button 
                    onClick={onPassTurn}
                    className="px-4 py-1 bg-amber-500/80 hover:bg-amber-500 text-white text-xs font-bold rounded-full shadow-lg animate-pulse transition-all"
                >
                    Отдать ход
                </button>
            )}
            
            {/* Spectator Counter */}
            {spectatorCount > 0 && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] opacity-50 bg-black/20 px-2 py-1 rounded-full">
                    <Eye size={10} /> {spectatorCount}
                </div>
            )}
        </div>

        {/* 3. Guest */}
        {PlayerRow(guestName, guestColor, guestScore, guestId, false, guestConnected)}

        {/* Room Code Footer */}
        {roomCode && (
            <div className="mt-1 pt-2 border-t border-white/5 flex items-center justify-center gap-2 opacity-40 hover:opacity-100 transition-opacity cursor-pointer" onClick={copyCode}>
                <span className="text-[10px] uppercase font-bold tracking-widest">Код:</span>
                <span className="font-mono text-xs font-bold">{roomCode}</span>
                <Copy size={10} />
            </div>
        )}
    </div>
  );
};

export default GameInfo;
