export class CheckersLogic {
  constructor() {
    this.board = this.initializeBoard()
  }

  initializeBoard() {
    const board = Array(8).fill(null).map(() => Array(8).fill(null))

    // Расстановка белых фишек (сверху)
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 8; col++) {
        if ((row + col) % 2 === 1) {
          board[row][col] = { player: 'white', isKing: false }
        }
      }
    }

    // Расстановка чёрных фишек (снизу)
    for (let row = 5; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if ((row + col) % 2 === 1) {
          board[row][col] = { player: 'black', isKing: false }
        }
      }
    }

    return board
  }

  getBoard() {
    return this.board
  }

  isValidCell(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8 && (row + col) % 2 === 1
  }

  getCell(row, col) {
    if (!this.isValidCell(row, col)) return null
    return this.board[row][col]
  }

  setCell(row, col, value) {
    if (this.isValidCell(row, col)) {
      this.board[row][col] = value
    }
  }

  getPossibleMoves(row, col, player) {
    const cell = this.getCell(row, col)
    if (!cell || cell.player !== player) {
      return []
    }

    const moves = []
    const captures = []

    if (cell.isKing) {
      // Логика для дамки
      this.getKingMoves(row, col, player, moves, captures)
    } else {
      // Логика для простой фишки
      this.getRegularMoves(row, col, player, moves, captures)
    }

    // Если есть обязательные взятия, возвращаем только их
    if (captures.length > 0) {
      return captures
    }

    return moves
  }

  getRegularMoves(row, col, player, moves, captures) {
    const direction = player === 'white' ? 1 : -1
    const directions = [
      { dr: direction, dc: -1 }, // Влево-вперёд
      { dr: direction, dc: 1 }   // Вправо-вперёд
    ]

    for (const { dr, dc } of directions) {
      const newRow = row + dr
      const newCol = col + dc

      if (!this.isValidCell(newRow, newCol)) continue

      const targetCell = this.getCell(newRow, newCol)

      if (!targetCell) {
        // Обычный ход
        moves.push({ row: newRow, col: newCol, isCapture: false })
      } else if (targetCell.player !== player) {
        // Возможное взятие
        const jumpRow = newRow + dr
        const jumpCol = newCol + dc

        if (this.isValidCell(jumpRow, jumpCol) && !this.getCell(jumpRow, jumpCol)) {
          captures.push({
            row: jumpRow,
            col: jumpCol,
            isCapture: true,
            capturedRow: newRow,
            capturedCol: newCol
          })
        }
      }
    }
  }

  getKingMoves(row, col, player, moves, captures) {
    const directions = [
      { dr: -1, dc: -1 },
      { dr: -1, dc: 1 },
      { dr: 1, dc: -1 },
      { dr: 1, dc: 1 }
    ]

    for (const { dr, dc } of directions) {
      for (let distance = 1; distance < 8; distance++) {
        const newRow = row + dr * distance
        const newCol = col + dc * distance

        if (!this.isValidCell(newRow, newCol)) break

        const targetCell = this.getCell(newRow, newCol)

        if (!targetCell) {
          moves.push({ row: newRow, col: newCol, isCapture: false })
        } else if (targetCell.player !== player) {
          // Возможное взятие
          const jumpRow = newRow + dr
          const jumpCol = newCol + dc

          if (this.isValidCell(jumpRow, jumpCol) && !this.getCell(jumpRow, jumpCol)) {
            captures.push({
              row: jumpRow,
              col: jumpCol,
              isCapture: true,
              capturedRow: newRow,
              capturedCol: newCol
            })
          }
          break
        } else {
          break
        }
      }
    }
  }

  makeMove(fromRow, fromCol, toRow, toCol, player) {
    const fromCell = this.getCell(fromRow, fromCol)
    if (!fromCell || fromCell.player !== player) {
      return { success: false, error: 'Неверная фишка' }
    }

    // Проверяем обязательные взятия
    const allPossibleMoves = this.getPossibleMoves(fromRow, fromCol, player)
    const requiredCaptures = allPossibleMoves.filter(m => m.isCapture)

    if (requiredCaptures.length > 0) {
      const move = requiredCaptures.find(m => m.row === toRow && m.col === toCol)
      if (!move) {
        return { success: false, error: 'Обязательное взятие!' }
      }

      // Выполняем взятие
      this.setCell(move.capturedRow, move.capturedCol, null)
      this.setCell(fromRow, fromCol, null)
      
      const newCell = { ...fromCell }
      this.setCell(toRow, toCol, newCell)

      // Проверка на превращение в дамку
      let becameKing = false
      if ((player === 'white' && toRow === 7) || (player === 'black' && toRow === 0)) {
        if (!newCell.isKing) {
          newCell.isKing = true
          becameKing = true
        }
      }

      // Проверка на продолжение цепочки взятий
      const nextCaptures = this.getPossibleMoves(toRow, toCol, player)
        .filter(m => m.isCapture)

      if (nextCaptures.length > 0) {
        return {
          success: true,
          mustContinueCapture: true,
          gameOver: false,
          becameKing
        }
      }

      // Проверка на победу
      const opponent = player === 'white' ? 'black' : 'white'
      if (this.countPieces(opponent) === 0) {
        return { success: true, gameOver: true, becameKing }
      }

      return { success: true, mustContinueCapture: false, gameOver: false, becameKing }
    }

    // Обычный ход
    const move = allPossibleMoves.find(m => m.row === toRow && m.col === toCol && !m.isCapture)
    if (!move) {
      return { success: false, error: 'Неверный ход' }
    }

    this.setCell(fromRow, fromCol, null)
    const newCell = { ...fromCell }
    this.setCell(toRow, toCol, newCell)

    // Проверка на превращение в дамку
    let becameKing = false
    if ((player === 'white' && toRow === 7) || (player === 'black' && toRow === 0)) {
      if (!newCell.isKing) {
        newCell.isKing = true
        becameKing = true
      }
    }

    // Проверка на победу
    const opponent = player === 'white' ? 'black' : 'white'
    if (this.countPieces(opponent) === 0) {
      return { success: true, gameOver: true, becameKing }
    }

    return { success: true, mustContinueCapture: false, gameOver: false, becameKing }
  }

  countPieces(player) {
    let count = 0
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const cell = this.getCell(row, col)
        if (cell && cell.player === player) {
          count++
        }
      }
    }
    return count
  }
}

