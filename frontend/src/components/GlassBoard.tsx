
import React, { useEffect, useState } from 'react';
import { Move, Piece, PieceColor, Position } from '../types';
import { Crown } from 'lucide-react';

interface BoardProps {
  pieces: Piece[];
  validMoves: Move[];
  selectedPieceId: string | null;
  lastMove: Move | null;
  onSelectPiece: (pieceId: string) => void;
  onMovePiece: (move: Move) => void;
  boardRotation: boolean; // true = 180deg (Black bottom)
  canInteract: boolean;
  huffedPosition?: Position | null; // Prop to trigger huff effect
}

interface Effect {
    id: number;
    type: 'CAPTURE' | 'MOVE' | 'PROMOTION' | 'FUK';
    position: Position;
}

const Board: React.FC<BoardProps> = ({
  pieces,
  validMoves,
  selectedPieceId,
  lastMove,
  onSelectPiece,
  onMovePiece,
  boardRotation,
  canInteract,
  huffedPosition
}) => {
  const [activeEffects, setActiveEffects] = useState<Effect[]>([]);

  // Get selected piece object for validation
  const selectedPiece = pieces.find(p => p.id === selectedPieceId);

  // Effect Trigger Logic
  useEffect(() => {
      if (lastMove) {
          // Trigger Move Effect (Ripple)
          addEffect('MOVE', lastMove.to);

          // Trigger Capture Effect (Explosion)
          if (lastMove.isCapture && lastMove.capturedPosition) {
             addEffect('CAPTURE', lastMove.capturedPosition);
          }

          // Trigger Promotion Effect
          if (lastMove.isPromotion) {
              addEffect('PROMOTION', lastMove.to);
          }
      }
  }, [lastMove]);

  // Watch for external Huff triggers
  useEffect(() => {
    if (huffedPosition) {
        addEffect('FUK', huffedPosition);
    }
  }, [huffedPosition]);

  const addEffect = (type: Effect['type'], pos: Position) => {
      const id = Date.now() + Math.random();
      setActiveEffects(prev => [...prev, { id, type, position: pos }]);
      setTimeout(() => {
          setActiveEffects(prev => prev.filter(e => e.id !== id));
      }, 1000);
  };

  // --- Render Helpers ---
  
  // 1. Background Grid
  const gridSquares = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const isDark = (r + c) % 2 !== 0;
      
      // STRICT VALIDATION:
      const relevantMove = selectedPieceId && selectedPiece
        ? validMoves.find(m => 
            m.to.row === r && 
            m.to.col === c && 
            m.from.row === selectedPiece.position.row && 
            m.from.col === selectedPiece.position.col
          )
        : undefined;
      
      const isLastFrom = lastMove?.from.row === r && lastMove?.from.col === c;
      const isLastTo = lastMove?.to.row === r && lastMove?.to.col === c;

      gridSquares.push(
        <div
          key={`sq-${r}-${c}`}
          onClick={() => {
             if (canInteract && relevantMove) onMovePiece(relevantMove);
          }}
          className={`
            relative w-full h-full flex items-center justify-center
            ${isDark 
              ? 'bg-white/10 dark:bg-white/5 shadow-inner' 
              : 'bg-white/30 dark:bg-white/10'
            }
            ${relevantMove ? 'cursor-pointer' : ''}
            ${isLastFrom || isLastTo ? 'bg-yellow-400/10 dark:bg-yellow-500/10' : ''}
          `}
        >
           {/* Coords - Counter Rotated to stay upright */}
           {c === 0 && isDark && (
             <span 
                className="absolute left-0.5 bottom-0.5 text-[8px] md:text-[10px] text-current opacity-30 font-mono font-bold"
                style={{ transform: boardRotation ? 'rotate(180deg)' : 'none' }}
             >
                {8 - r}
             </span>
           )}
           {r === 7 && isDark && (
             <span 
                className="absolute right-0.5 bottom-0.5 text-[8px] md:text-[10px] text-current opacity-30 font-mono font-bold"
                style={{ transform: boardRotation ? 'rotate(180deg)' : 'none' }}
             >
                {['A','B','C','D','E','F','G','H'][c]}
             </span>
           )}
           
           {/* Valid Move Highlight (Target) */}
           {relevantMove && (
             <div className="w-4 h-4 bg-green-500/40 rounded-full animate-pulse shadow-[0_0_10px_rgba(74,222,128,0.5)]" />
           )}
        </div>
      );
    }
  }

  // 2. Absolute Pieces (Optimized with Transform)
  const pieceElements = pieces.map(piece => {
      const isSelected = piece.id === selectedPieceId;
      const isWhite = piece.color === PieceColor.WHITE;
      
      const translateX = piece.position.col * 100;
      const translateY = piece.position.row * 100;

      return (
        <div
          key={piece.id}
          onClick={(e) => {
              e.stopPropagation();
              if (canInteract) onSelectPiece(piece.id);
          }}
          className={`
            absolute w-[12.5%] h-[12.5%] p-[1.5%] top-0 left-0 will-change-transform
            transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
            ${canInteract && piece.color === (isWhite ? PieceColor.WHITE : PieceColor.BLACK) ? 'cursor-pointer' : 'cursor-default'}
            z-20
          `}
          style={{
              transform: `translate(${translateX}%, ${translateY}%)`
          }}
        >
            <div 
                className={`
                    w-full h-full rounded-full shadow-[0_4px_8px_rgba(0,0,0,0.5)]
                    flex items-center justify-center backdrop-blur-sm
                    transition-transform duration-200
                    ${isSelected ? 'scale-110 ring-2 ring-white shadow-xl z-30' : 'hover:scale-105'}
                    ${isWhite 
                        ? 'bg-[#e8e8e8] text-gray-600 border border-white/80 bg-gradient-to-br from-white to-gray-300' 
                        : 'bg-[#2a2a2a] text-gray-300 border border-white/20 bg-gradient-to-br from-gray-700 to-black'
                    }
                `}
                style={{
                    transform: boardRotation ? (isSelected ? 'scale(1.1) rotate(180deg)' : 'rotate(180deg)') : (isSelected ? 'scale(1.1)' : '')
                }}
            >
                {/* Inner Detail */}
                <div className={`w-[75%] h-[75%] rounded-full border ${isWhite ? 'border-gray-400/20' : 'border-white/10'} flex items-center justify-center`}>
                    {piece.isKing && <Crown size="60%" strokeWidth={2.5} className="animate-[bounce_1s_infinite]" />}
                </div>
            </div>
        </div>
      );
  });

  // 3. Effects Layer
  const effectElements = activeEffects.map(eff => {
      const top = eff.position.row * 12.5;
      const left = eff.position.col * 12.5;

      return (
          <div
            key={eff.id}
            className="absolute w-[12.5%] h-[12.5%] pointer-events-none z-50 flex items-center justify-center"
            style={{ top: `${top}%`, left: `${left}%` }}
          >
             {eff.type === 'CAPTURE' && (
                 <div className="w-full h-full rounded-full border-4 border-red-500/50 animate-shockwave-once" />
             )}
             {eff.type === 'MOVE' && (
                 <div className="w-full h-full rounded-full border-2 border-white/40 animate-ripple-once" />
             )}
             {eff.type === 'PROMOTION' && (
                 <div className="absolute inset-[-50%] flex items-center justify-center overflow-hidden">
                      <div className="w-full h-full bg-gradient-to-tr from-transparent via-yellow-400/50 to-transparent animate-shine-once" />
                      <Crown className="absolute text-yellow-300 w-12 h-12 animate-[bounce_0.5s_ease-in-out]" />
                 </div>
             )}
             {eff.type === 'FUK' && (
                 // Clean Radial Gradient Circle for Fuki using Inline Styles for perfect roundness
                 <div className="absolute inset-[-50%] flex items-center justify-center pointer-events-none">
                      <div 
                        className="w-[90%] h-[90%] rounded-full animate-shockwave-once" 
                        style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.9) 0%, rgba(220,38,38,0) 70%)' }}
                      />
                 </div>
             )}
          </div>
      );
  });


  return (
    <div className="relative p-2 bg-glass-panel rounded-lg shadow-2xl backdrop-blur-md border border-white/10">
       {/* Board Container */}
      <div 
        className="relative w-full aspect-square border-2 border-white/10 overflow-hidden rounded shadow-inner"
        style={{
            transform: boardRotation ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        {/* Layer 1: Grid Background */}
        <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
            {gridSquares}
        </div>

        {/* Layer 2: Pieces (Absolute) */}
        {pieceElements}

        {/* Layer 3: Effects */}
        {effectElements}
      </div>
    </div>
  );
};

export default Board;
