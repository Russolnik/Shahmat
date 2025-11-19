// Обновленная логика из glasscheckers (1)
import { Piece, PieceColor, Position, Move } from '../types';

export const getPieceAt = (pieces: Piece[], row: number, col: number): Piece | undefined => {
  return pieces.find(p => p.position.row === row && p.position.col === col);
};

const isValidPos = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;

export const getMovesForPiece = (
  piece: Piece, 
  pieces: Piece[], 
  mustCaptureFrom: Position | null = null
): Move[] => {
  if (mustCaptureFrom) {
    if (piece.position.row !== mustCaptureFrom.row || piece.position.col !== mustCaptureFrom.col) {
      return [];
    }
  }

  const moves: Move[] = [];
  const { row, col } = piece.position;
  const isWhite = piece.color === PieceColor.WHITE;
  
  const directions = [
    { dr: -1, dc: -1 }, { dr: -1, dc: 1 },
    { dr: 1, dc: -1 }, { dr: 1, dc: 1 }
  ];

  directions.forEach(dir => {
    let r = row + dir.dr;
    let c = col + dir.dc;
    
    if (piece.isKing) {
      let captured: Piece | null = null;
      while (isValidPos(r, c)) {
        const p = getPieceAt(pieces, r, c);
        if (p) {
          if (p.color === piece.color) break;
          if (captured) break;
          captured = p;
        } else {
          if (captured) {
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

    if (!mustCaptureFrom) {
      r = row + dir.dr;
      c = col + dir.dc;

      if (piece.isKing) {
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

export const getAllValidMoves = (
  pieces: Piece[], 
  playerTurn: PieceColor,
  mustCaptureFrom: Position | null
): Move[] => {
  let allMoves: Move[] = [];
  const playerPieces = pieces.filter(p => p.color === playerTurn);

  playerPieces.forEach(p => {
    allMoves.push(...getMovesForPiece(p, pieces, mustCaptureFrom));
  });

  if (mustCaptureFrom) {
    return allMoves.filter(m => m.isCapture);
  }

  return allMoves;
};

export const getAvailableCaptures = (pieces: Piece[], playerTurn: PieceColor): Move[] => {
  const moves = getAllValidMoves(pieces, playerTurn, null);
  return moves.filter(m => m.isCapture === true);
};

export const initializeBoard = (): Piece[] => {
  const pieces: Piece[] = [];
  let idCounter = 0;

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 !== 0) {
        pieces.push({ id: `b-${idCounter++}`, color: PieceColor.BLACK, isKing: false, position: { row: r, col: c } });
      }
    }
  }

  for (let r = 5; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 !== 0) {
        pieces.push({ id: `w-${idCounter++}`, color: PieceColor.WHITE, isKing: false, position: { row: r, col: c } });
      }
    }
  }
  return pieces;
};
