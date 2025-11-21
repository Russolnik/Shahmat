
import { Piece, PieceColor, Position, Move } from '../types';

export const getPieceAt = (pieces: Piece[], row: number, col: number): Piece | undefined => {
  return pieces.find(p => p.position.row === row && p.position.col === col);
};

const isValidPos = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;

// Check if a move is strictly valid for Russian Checkers
export const getMovesForPiece = (
  piece: Piece, 
  pieces: Piece[], 
  mustCaptureFrom: any = null
): Move[] => {
  // Multi-jump restriction
  if (mustCaptureFrom) {
    if (piece.position.row !== mustCaptureFrom.row || piece.position.col !== mustCaptureFrom.col) {
      return [];
    }
  }

  const moves: Move[] = [];
  const { row, col } = piece.position;
  const isWhite = piece.color === PieceColor.WHITE;
  
  // Russian Checkers Directions
  // Men: Forward diagonal (White -1, Black +1). Capture ANY diagonal.
  // Kings: Any diagonal, any distance (Flying King).

  const directions = [
    { dr: -1, dc: -1 }, { dr: -1, dc: 1 },
    { dr: 1, dc: -1 }, { dr: 1, dc: 1 }
  ];

  directions.forEach(dir => {
    // Check restricted direction for Kings in multi-jump
    if (mustCaptureFrom && mustCaptureFrom.restrictedDir && piece.isKing) {
      if (dir.dr === mustCaptureFrom.restrictedDir.dr && dir.dc === mustCaptureFrom.restrictedDir.dc) {
        return; // Skip this direction
      }
    }

    let r = row + dir.dr;
    let c = col + dir.dc;
    
    // --- CAPTURE LOGIC ---
    if (piece.isKing) {
      let captured: Piece | null = null;
      // Flying King Capture
      while (isValidPos(r, c)) {
        const p = getPieceAt(pieces, r, c);
        if (p) {
          if (p.color === piece.color) break; // Blocked by self
          if (captured) break; // Can't capture two in a row without landing
          captured = p;
        } else {
          if (captured) {
            // Land after capture (can land on any empty square after the captured piece)
            moves.push({
              from: piece.position,
              to: { row: r, col: c },
              isCapture: true,
              capturedPieceId: captured.id,
              capturedPosition: captured.position
            });
          }
        }
        r += dir.dr;
        c += dir.dc;
      }
    } else {
      // Man Capture
      // Check immediate diagonal
      const p = getPieceAt(pieces, r, c);
      if (isValidPos(r, c) && p && p.color !== piece.color) {
        const landR = r + dir.dr;
        const landC = c + dir.dc;
        if (isValidPos(landR, landC) && !getPieceAt(pieces, landR, landC)) {
          moves.push({
            from: piece.position,
            to: { row: landR, col: landC },
            isCapture: true,
            capturedPieceId: p.id,
            capturedPosition: p.position
          });
        }
      }
    }

    // --- NON-CAPTURE LOGIC ---
    if (!mustCaptureFrom) {
       // Reset for move check
       r = row + dir.dr;
       c = col + dir.dc;

       if (piece.isKing) {
          // Flying move
          while (isValidPos(r, c)) {
            if (getPieceAt(pieces, r, c)) break;
            moves.push({
              from: piece.position,
              to: { row: r, col: c },
              isCapture: false
            });
            r += dir.dr;
            c += dir.dc;
          }
       } else {
          // Regular move (Forward only)
          const isForward = isWhite ? dir.dr < 0 : dir.dr > 0;
          if (isForward && isValidPos(r, c) && !getPieceAt(pieces, r, c)) {
             moves.push({
               from: piece.position,
               to: { row: r, col: c },
               isCapture: false
             });
          }
       }
    }
  });

  return moves;
};

/**
 * Calculates all valid moves.
 * If mustCaptureFrom is set (during a multi-jump chain), returns ONLY capture moves for that piece.
 * Otherwise, returns ALL moves (captures and non-captures).
 * 
 * NOTE: We do NOT filter out non-captures here based on 'Fuki'. 
 * The UI allows non-captures, and the Game Logic in App.tsx handles the "Huffing" penalty 
 * if a capture was available but skipped.
 */
export const getAllValidMoves = (
  pieces: Piece[], 
  playerTurn: PieceColor,
  mustCaptureFrom: any
): Move[] => {
  let allMoves: Move[] = [];
  const playerPieces = pieces.filter(p => p.color === playerTurn);

  playerPieces.forEach(p => {
    allMoves.push(...getMovesForPiece(p, pieces, mustCaptureFrom));
  });

  // Strict rule: If in the middle of a multi-jump, you MUST capture.
  if (mustCaptureFrom) {
     return allMoves.filter(m => m.isCapture);
  }

  return allMoves;
};

/**
 * Helper to check if ANY capture is available for the current player.
 * Used to trigger the "Fuki" (Huff) penalty if the player ignores these captures.
 */
export const getAvailableCaptures = (pieces: Piece[], playerTurn: PieceColor): Move[] => {
  const moves = getAllValidMoves(pieces, playerTurn, null);
  return moves.filter(m => m.isCapture === true);
}

export const initializeBoard = (): Piece[] => {
  const pieces: Piece[] = [];
  let idCounter = 0;

  // Black (Top, Rows 0-2)
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 !== 0) {
        pieces.push({ id: `b-${idCounter++}`, color: PieceColor.BLACK, isKing: false, position: { row: r, col: c } });
      }
    }
  }

  // White (Bottom, Rows 5-7)
  for (let r = 5; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 !== 0) {
        pieces.push({ id: `w-${idCounter++}`, color: PieceColor.WHITE, isKing: false, position: { row: r, col: c } });
      }
    }
  }
  return pieces;
};
