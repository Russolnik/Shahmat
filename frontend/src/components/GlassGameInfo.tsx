// Обновленная версия GameInfo из glasscheckers (1)
import React from 'react';
import { PieceColor } from '../types';
import { Clock } from 'lucide-react';

interface GameInfoProps {
    turn: PieceColor;
    whiteName: string;
    blackName: string;
    capturedWhite: number;
    capturedBlack: number;
    timer: number;
    myColor?: PieceColor;
}

const GameInfo: React.FC<GameInfoProps> = ({ turn, whiteName, blackName, capturedWhite, capturedBlack, timer, myColor }) => {
  
  const formatTime = (s: number) => {
      const mins = Math.floor(s / 60);
      const secs = s % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="glass-panel rounded-xl p-4 w-full md:w-64 flex md:flex-col justify-between items-center md:items-stretch gap-4 border border-white/10">
        <div className="flex items-center gap-2 text-xl font-mono font-bold justify-center bg-black/20 p-2 rounded-lg w-24 md:w-full">
            <Clock size={18} className="opacity-50" />
            {formatTime(timer)}
        </div>

        <div className="flex-1 flex md:flex-col gap-4 justify-center w-full">
            <div className={`flex-1 flex items-center justify-between p-2 rounded-lg transition-all ${turn === PieceColor.WHITE ? 'bg-white/20 shadow-lg ring-1 ring-white/30' : 'opacity-50'}`}>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-200 border border-white"></div>
                    <span className="text-sm font-bold truncate max-w-[80px]">{whiteName}</span>
                    {myColor === PieceColor.WHITE && <span className="text-[10px] bg-blue-500 px-1 rounded text-white">ВЫ</span>}
                </div>
                <div className="flex gap-0.5">
                   {Array.from({length: Math.min(capturedBlack, 6)}).map((_,i) => (
                       <div key={i} className="w-2 h-2 rounded-full bg-red-500/50 border border-red-400/30" />
                   ))}
                   {capturedBlack > 6 && <span className="text-xs font-mono">+{capturedBlack - 6}</span>}
                </div>
            </div>

            <div className={`flex-1 flex items-center justify-between p-2 rounded-lg transition-all ${turn === PieceColor.BLACK ? 'bg-white/20 shadow-lg ring-1 ring-white/30' : 'opacity-50'}`}>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-800 border border-gray-600"></div>
                    <span className="text-sm font-bold truncate max-w-[80px]">{blackName}</span>
                    {myColor === PieceColor.BLACK && <span className="text-[10px] bg-blue-500 px-1 rounded text-white">ВЫ</span>}
                </div>
                <div className="flex gap-0.5">
                   {Array.from({length: Math.min(capturedWhite, 6)}).map((_,i) => (
                       <div key={i} className="w-2 h-2 rounded-full bg-gray-200/50 border border-white/30" />
                   ))}
                   {capturedWhite > 6 && <span className="text-xs font-mono">+{capturedWhite - 6}</span>}
                </div>
            </div>
        </div>

        <div className="md:hidden text-xs opacity-50 w-full text-center mt-2">
            {turn === PieceColor.WHITE ? "Ход Белых" : "Ход Черных"}
        </div>
    </div>
  );
};

export default GameInfo;
