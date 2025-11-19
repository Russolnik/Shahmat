// Логика игры в шашки из glasscheckers (адаптирована для Node.js)
// Основана на русских шашках с поддержкой режима фуков

export class GlassCheckersLogic {
  constructor() {
    this.fukiMode = false
    this.pieces = this.initializeBoard()
  }

  setFukiMode(enabled) {
    this.fukiMode = enabled
  }

  getPieceAt(pieces, row, col) {
    return pieces.find(p => p.position.row === row && p.position.col === col)
  }

  isValidPos(r, c) {
    return r >= 0 && r < 8 && c >= 0 && c < 8
  }

  // Получить возможные ходы для фишки
  getMovesForPiece(piece, pieces, mustCaptureFrom = null) {
    // Ограничение на многоходовое взятие
    if (mustCaptureFrom) {
      if (piece.position.row !== mustCaptureFrom.row || piece.position.col !== mustCaptureFrom.col) {
        return []
      }
    }

    const moves = []
    const { row, col } = piece.position
    const isWhite = piece.color === 'WHITE'
    
    // Направления для русских шашек
    const directions = [
      { dr: -1, dc: -1 }, { dr: -1, dc: 1 },
      { dr: 1, dc: -1 }, { dr: 1, dc: 1 }
    ]

    directions.forEach(dir => {
      let r = row + dir.dr
      let c = col + dir.dc
      
      // --- ЛОГИКА ВЗЯТИЯ ---
      if (piece.isKing) {
        let captured = null
        // Летающая дамка - взятие
        while (this.isValidPos(r, c)) {
          const p = this.getPieceAt(pieces, r, c)
          if (p) {
            if (p.color === piece.color) break // Заблокировано своей фишкой
            if (captured) break // Нельзя взять две подряд без приземления
            captured = p
          } else {
            if (captured) {
              // Приземление после взятия
              moves.push({
                from: piece.position,
                to: { row: r, col: c },
                isCapture: true,
                capturedPieceId: captured.id,
                capturedPosition: captured.position
              })
            }
          }
          r += dir.dr
          c += dir.dc
        }
      } else {
        // Взятие простой фишкой
        const p = this.getPieceAt(pieces, r, c)
        if (this.isValidPos(r, c) && p && p.color !== piece.color) {
          const landR = r + dir.dr
          const landC = c + dir.dc
          if (this.isValidPos(landR, landC) && !this.getPieceAt(pieces, landR, landC)) {
            moves.push({
              from: piece.position,
              to: { row: landR, col: landC },
              isCapture: true,
              capturedPieceId: p.id,
              capturedPosition: p.position
            })
          }
        }
      }

      // --- ЛОГИКА ОБЫЧНОГО ХОДА ---
      if (!mustCaptureFrom) {
        // Сброс для проверки хода
        r = row + dir.dr
        c = col + dir.dc

        if (piece.isKing) {
          // Летающий ход
          while (this.isValidPos(r, c)) {
            if (this.getPieceAt(pieces, r, c)) break
            moves.push({
              from: piece.position,
              to: { row: r, col: c },
              isCapture: false
            })
            r += dir.dr
            c += dir.dc
          }
        } else {
          // Обычный ход (только вперед)
          const isForward = isWhite ? dir.dr < 0 : dir.dr > 0
          if (isForward && this.isValidPos(r, c) && !this.getPieceAt(pieces, r, c)) {
            moves.push({
              from: piece.position,
              to: { row: r, col: c },
              isCapture: false
            })
          }
        }
      }
    })

    return moves
  }

  // Получить все возможные ходы
  getAllValidMoves(pieces, playerTurn, mustCaptureFrom = null) {
    let allMoves = []
    const playerPieces = pieces.filter(p => p.color === playerTurn)

    playerPieces.forEach(p => {
      allMoves.push(...this.getMovesForPiece(p, pieces, mustCaptureFrom))
    })

    // Строгое правило: если в середине многоходового взятия, ОБЯЗАТЕЛЬНО брать
    if (mustCaptureFrom) {
      return allMoves.filter(m => m.isCapture)
    }

    return allMoves
  }

  // Получить доступные взятия
  getAvailableCaptures(pieces, playerTurn) {
    const moves = this.getAllValidMoves(pieces, playerTurn, null)
    return moves.filter(m => m.isCapture === true)
  }

  // Инициализация доски
  initializeBoard() {
    const pieces = []
    let idCounter = 0

    // Черные (верх, строки 0-2)
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 !== 0) {
          pieces.push({ 
            id: `b-${idCounter++}`, 
            color: 'BLACK', 
            isKing: false, 
            position: { row: r, col: c } 
          })
        }
      }
    }

    // Белые (низ, строки 5-7)
    for (let r = 5; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 !== 0) {
          pieces.push({ 
            id: `w-${idCounter++}`, 
            color: 'WHITE', 
            isKing: false, 
            position: { row: r, col: c } 
          })
        }
      }
    }
    return pieces
  }

  // Выполнить ход
  makeMove(pieces, move, playerTurn, mustCaptureFrom = null) {
    // Проверяем обязательные взятия
    const availableCaptures = this.getAvailableCaptures(pieces, playerTurn)
    const hasCaptures = availableCaptures.length > 0

    // Если есть обязательное взятие, проверяем, что ход - это взятие
    if (hasCaptures && !move.isCapture) {
      // В режиме фуков разрешаем не брать, но фишка сгорит
      if (!this.fukiMode) {
        return { 
          success: false, 
          error: 'Обязательное взятие!',
          mustCapture: true
        }
      }
      // В режиме фуков: фишка, которая могла взять, но не взяла, сгорает
      // Находим фишку, которая могла взять (та, что делает ход)
      const pieceThatCouldCapture = pieces.find(p => 
        p.color === playerTurn &&
        p.position.row === move.from.row &&
        p.position.col === move.from.col
      )
      
      if (pieceThatCouldCapture) {
        // Удаляем эту фишку (она сгорает) и выполняем ход другой фишкой, если возможно
        // Но на самом деле, если фишка сгорела, ход не выполняется
        const newPieces = pieces.filter(p => p.id !== pieceThatCouldCapture.id)
        
        // Переключаем ход
        const nextPlayer = playerTurn === 'WHITE' ? 'BLACK' : 'WHITE'
        
        return {
          success: true,
          pieces: newPieces,
          nextPlayer,
          mustContinueCapture: false,
          nextMustCaptureFrom: null,
          winner: null,
          gameOver: false,
          becameKing: false,
          fukiBurned: true,
          burnedPieceId: pieceThatCouldCapture.id,
          burnedPosition: pieceThatCouldCapture.position
        }
      }
    }

    // Находим фишку
    const piece = pieces.find(p => 
      p.position.row === move.from.row && 
      p.position.col === move.from.col &&
      p.color === playerTurn
    )

    if (!piece) {
      return { success: false, error: 'Фишка не найдена' }
    }

    // Проверяем, что ход валиден
    const validMoves = this.getMovesForPiece(piece, pieces, mustCaptureFrom)
    const isValidMove = validMoves.some(m => 
      m.to.row === move.to.row && 
      m.to.col === move.to.col &&
      m.isCapture === move.isCapture
    )

    if (!isValidMove) {
      return { success: false, error: 'Неверный ход' }
    }

    // Выполняем ход
    const newPieces = pieces.map(p => {
      if (p.id === piece.id) {
        let newRow = move.to.row
        const isWhite = p.color === 'WHITE'
        let promoted = p.isKing
        
        // Проверка на превращение в дамку
        if (!promoted) {
          if (isWhite && newRow === 0) promoted = true
          if (!isWhite && newRow === 7) promoted = true
        }
        
        return { 
          ...p, 
          position: move.to, 
          isKing: promoted 
        }
      }
      return p
    }).filter(p => p.id !== move.capturedPieceId)

    // Проверяем на продолжение цепочки взятий
    let nextMustCaptureFrom = null
    let nextPlayer = playerTurn === 'WHITE' ? 'BLACK' : 'WHITE'
    let mustContinueCapture = false

    if (move.isCapture) {
      const movedPiece = newPieces.find(p => 
        p.position.row === move.to.row && 
        p.position.col === move.to.col
      )
      if (movedPiece) {
        const followUpMoves = this.getAllValidMoves(newPieces, playerTurn, null)
        const canContinue = followUpMoves.some(m => 
          m.isCapture && 
          m.from.row === move.to.row && 
          m.from.col === move.to.col
        )
        if (canContinue) {
          nextMustCaptureFrom = movedPiece.position
          nextPlayer = playerTurn // Остается тот же игрок
          mustContinueCapture = true
        }
      }
    }

    // Проверка на победу
    const whiteExists = newPieces.some(p => p.color === 'WHITE')
    const blackExists = newPieces.some(p => p.color === 'BLACK')
    let winner = null
    let gameOver = false

    if (!whiteExists) {
      winner = 'BLACK'
      gameOver = true
    } else if (!blackExists) {
      winner = 'WHITE'
      gameOver = true
    } else {
      // Проверяем, есть ли ходы у следующего игрока
      const nextMoves = this.getAllValidMoves(newPieces, nextPlayer, nextMustCaptureFrom)
      if (nextMoves.length === 0) {
        winner = playerTurn // Текущий игрок выиграл
        gameOver = true
      }
    }

    // Проверка на превращение
    const becameKing = newPieces.find(p => 
      p.position.row === move.to.row && 
      p.position.col === move.to.col
    )?.isKing && !piece.isKing

    return {
      success: true,
      pieces: newPieces,
      nextPlayer,
      mustContinueCapture,
      nextMustCaptureFrom,
      winner,
      gameOver,
      becameKing,
      mustCapture: hasCaptures && !move.isCapture && this.fukiMode
    }
  }

  // Получить доску в формате массива фишек
  getBoard() {
    return this.pieces
  }

  // Установить доску
  setBoard(pieces) {
    this.pieces = pieces
  }
}

