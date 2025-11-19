// Адаптер для конвертации между форматом доски и форматом фишек
// Используем строковые значения для совместимости
const PieceColor = {
  WHITE: 'WHITE',
  BLACK: 'BLACK'
}

/**
 * Конвертирует доску (массив массивов) в массив фишек
 */
export function boardToPieces(board) {
  if (!board || !Array.isArray(board)) return []
  
  const pieces = []
  let idCounter = 0

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const cell = board[row]?.[col]
      if (cell && cell.player) {
        pieces.push({
          id: `${cell.player}-${idCounter++}`,
          color: cell.player === 'white' ? 'WHITE' : 'BLACK',
          isKing: cell.isKing || false,
          position: { row, col }
        })
      }
    }
  }

  return pieces
}

/**
 * Конвертирует массив фишек в доску (массив массивов)
 */
export function piecesToBoard(pieces) {
  if (!pieces || !Array.isArray(pieces)) {
    return Array(8).fill(null).map(() => Array(8).fill(null))
  }

  const board = Array(8).fill(null).map(() => Array(8).fill(null))
  
  pieces.forEach(piece => {
    const row = piece.position.row
    const col = piece.position.col
    if (row >= 0 && row < 8 && col >= 0 && col < 8) {
      board[row][col] = {
        player: piece.color === 'WHITE' ? 'white' : 'black',
        isKing: piece.isKing || false
      }
    }
  })

  return board
}

/**
 * Конвертирует ход из формата доски в формат фишек
 */
export function convertMoveToPiecesFormat(move) {
  if (!move) return null

  return {
    from: move.from || { row: move.row || 0, col: move.col || 0 },
    to: move.to || { row: move.row || 0, col: move.col || 0 },
    isCapture: move.isCapture || false,
    capturedPieceId: move.capturedPieceId,
    capturedPosition: move.capturedPosition || (move.capturedRow !== undefined ? { row: move.capturedRow, col: move.capturedCol } : null)
  }
}

/**
 * Подсчитывает захваченные фишки
 */
export function countCapturedPieces(pieces, color) {
  const totalPieces = 12
  const currentPieces = pieces.filter(p => p.color === color).length
  return Math.max(0, totalPieces - currentPieces)
}

