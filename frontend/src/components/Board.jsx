import { useMemo } from 'react'
import './Board.css'

const Board = ({ board, selectedCell, possibleMoves, onCellClick, myPlayer }) => {
  // Переворачиваем доску так, чтобы свои фишки всегда были снизу
  // На сервере: белые в строках 0-2 (сверху), чёрные в строках 5-7 (снизу)
  // Если играем белыми - белые должны быть снизу (переворачиваем)
  // Если играем чёрными - чёрные уже снизу (не переворачиваем)
  const isFlipped = myPlayer === 'white'
  
  // Преобразуем координаты отображения в оригинальные (для сервера)
  const reverseTransformRow = (displayRow) => {
    return isFlipped ? 7 - displayRow : displayRow
  }
  
  const reverseTransformCol = (displayCol) => {
    return isFlipped ? 7 - displayCol : displayCol
  }

  const isDarkCell = (row, col) => {
    return (row + col) % 2 === 1
  }

  const getCellKey = (row, col) => {
    // Сохраняем оригинальные координаты для сервера
    return `${row}-${col}`
  }

  const isSelected = (displayRow, displayCol) => {
    // Преобразуем координаты отображения в оригинальные
    const origRow = reverseTransformRow(displayRow)
    const origCol = reverseTransformCol(displayCol)
    return selectedCell === getCellKey(origRow, origCol)
  }

  const isPossibleMove = (displayRow, displayCol) => {
    // Преобразуем координаты отображения в оригинальные
    const origRow = reverseTransformRow(displayRow)
    const origCol = reverseTransformCol(displayCol)
    return possibleMoves.some(m => m.row === origRow && m.col === origCol)
  }

  const renderPiece = (cell) => {
    if (!cell) return null
    
    const pieceClass = cell.isKing ? 'piece king' : 'piece'
    const playerClass = cell.player === 'white' ? 'white' : 'black'
    const emoji = cell.isKing 
      ? (cell.player === 'white' ? '♔' : '♚')
      : (cell.player === 'white' ? '⚪' : '⚫')

    return (
      <div className={`${pieceClass} ${playerClass}`}>
        <span className="piece-emoji">{emoji}</span>
      </div>
    )
  }

  // Создаём перевёрнутую доску для отображения
  const displayBoard = useMemo(() => {
    if (!isFlipped) return board
    
    // Переворачиваем доску
    const flipped = []
    for (let i = board.length - 1; i >= 0; i--) {
      const flippedRow = []
      for (let j = board[i].length - 1; j >= 0; j--) {
        flippedRow.push(board[i][j])
      }
      flipped.push(flippedRow)
    }
    return flipped
  }, [board, isFlipped])

  return (
    <div className="board-container">
      <div className={`board ${isFlipped ? 'flipped' : ''}`}>
        {displayBoard.map((row, displayRowIndex) => (
          <div key={displayRowIndex} className="board-row">
            {row.map((cell, displayColIndex) => {
              const dark = isDarkCell(displayRowIndex, displayColIndex)
              const selected = isSelected(displayRowIndex, displayColIndex)
              const possible = isPossibleMove(displayRowIndex, displayColIndex)
              
              // Преобразуем координаты отображения в оригинальные для сервера
              const origRow = reverseTransformRow(displayRowIndex)
              const origCol = reverseTransformCol(displayColIndex)
              
              if (!dark) {
                return <div key={displayColIndex} className="cell light" />
              }

              return (
                <div
                  key={displayColIndex}
                  className={`cell dark ${selected ? 'selected' : ''} ${possible ? 'highlight-cell' : ''}`}
                  onClick={() => onCellClick(origRow, origCol)}
                >
                  {renderPiece(cell)}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

export default Board

