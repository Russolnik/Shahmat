import { getPieceAt, isValidPos } from './checkersLogic.js'

export class GlassCheckersLogic {
  constructor() {
    this.pieces = []
    this.fukiMode = false
  }

  setFukiMode(enabled) {
    this.fukiMode = enabled
  }

  // Получить фишку на позиции
  getPieceAt(pieces, row, col) {
    return pieces.find(p => p.position.row === row && p.position.col === col)
  }

  // Проверка валидности позиции
  isValidPos(r, c) {
    return r >= 0 && r < 8 && c >= 0 && c < 8
  }

  // Получить возможные ходы для фишки
  getMovesForPiece(piece, pieces, mustCaptureFrom = null) {
    // Multi-jump restriction
    if (mustCaptureFrom) {
      if (piece.position.row !== mustCaptureFrom.row || piece.position.col !== mustCaptureFrom.col) {
        return []
      }
    }

    const moves = []
    const { row, col } = piece.position
    const isWhite = piece.color === 'WHITE'
    
    // Russian Checkers Directions
    // Men: Forward diagonal (White -1, Black +1). Capture ANY diagonal.
    // Kings: Any diagonal, any distance (Flying King).

    const directions = [
      { dr: -1, dc: -1 }, { dr: -1, dc: 1 },
      { dr: 1, dc: -1 }, { dr: 1, dc: 1 }
    ]

    directions.forEach(dir => {
      let r = row + dir.dr
      let c = col + dir.dc
      
      // --- CAPTURE LOGIC ---
      if (piece.isKing) {
        let captured = null
        // Flying King Capture
        while (this.isValidPos(r, c)) {
          const p = this.getPieceAt(pieces, r, c)
          if (p) {
            if (p.color === piece.color) break // Blocked by self
            if (captured) break // Can't capture two in a row without landing
            captured = p
          } else {
            if (captured) {
              // Land after capture (can land on any empty square after the captured piece)
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
        // Man Capture
        // Check immediate diagonal
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

      // --- NON-CAPTURE LOGIC ---
      if (!mustCaptureFrom) {
         // Reset for move check
         r = row + dir.dr
         c = col + dir.dc

         if (piece.isKing) {
            // Flying move
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
            // Regular move (Forward only)
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

    // Strict rule: If in the middle of a multi-jump, you MUST capture.
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

  // Инициализировать доску
  initializeBoard() {
    const pieces = []
    let idCounter = 0

    // Black (Top, Rows 0-2)
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 !== 0) {
          pieces.push({ id: `b-${idCounter++}`, color: 'BLACK', isKing: false, position: { row: r, col: c } })
        }
      }
    }

    // White (Bottom, Rows 5-7)
    for (let r = 5; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 !== 0) {
          pieces.push({ id: `w-${idCounter++}`, color: 'WHITE', isKing: false, position: { row: r, col: c } })
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

    // Переменные для хранения информации о сгоревшей фишке
    let fukiBurnedPieceId = null
    let fukiBurnedPosition = null

    // Если есть обязательное взятие, проверяем, что ход - это взятие
    // Убрана логика обязательного взятия - можно не рубить по желанию
    if (hasCaptures && !move.isCapture && this.fukiMode) {
      // В режиме фуков: разрешаем не рубить, но фишка сгорит
      // Логика из Graphite-Checkers-main:
      // - Если фишка, которая делает ход, могла рубить - она сгорает
      // - Если другая фишка делает ход, а есть фишка которая могла рубить - та фишка сгорает
      
      // Проверяем, могла ли фишка, которая делает ход, рубить
      const movedPieceCouldCapture = availableCaptures.some(m => 
        m.from.row === move.from.row && 
        m.from.col === move.from.col
      )
      
      let pieceToHuffId = null
      
      if (movedPieceCouldCapture) {
        // Фишка, которая делает ход, могла рубить - она сгорает
        const pieceThatCouldCapture = pieces.find(p => 
          p.color === playerTurn &&
          p.position.row === move.from.row &&
          p.position.col === move.from.col
        )
        if (pieceThatCouldCapture) {
          pieceToHuffId = pieceThatCouldCapture.id
        }
      } else {
        // Другая фишка делает ход, находим первую фишку которая могла рубить
        const guiltyMove = availableCaptures[0]
        const guiltyPiece = pieces.find(p => 
          p.position.row === guiltyMove.from.row && 
          p.position.col === guiltyMove.from.col &&
          p.color === playerTurn
        )
        if (guiltyPiece) {
          pieceToHuffId = guiltyPiece.id
        }
      }
      
      // Если нашли фишку для сгорания, удаляем её
      if (pieceToHuffId) {
        const huffedPiece = pieces.find(p => p.id === pieceToHuffId)
        if (huffedPiece) {
          // Сохраняем информацию о сгоревшей фишке
          fukiBurnedPieceId = huffedPiece.id
          fukiBurnedPosition = huffedPiece.position
          
          // Удаляем сгоревшую фишку
          const newPieces = pieces.filter(p => p.id !== pieceToHuffId)
          
          // Выполняем ход (если фишка не сгорела)
          const pieceToMove = newPieces.find(p => 
            p.position.row === move.from.row &&
            p.position.col === move.from.col &&
            p.color === playerTurn
          )
          
          if (!pieceToMove) {
            // Фишка сгорела, ход не выполняется, переключаем ход
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
              burnedPieceId: fukiBurnedPieceId,
              burnedPosition: fukiBurnedPosition
            }
          }
          
          // Продолжаем выполнение хода с удаленной фишкой
          pieces = newPieces
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

    // Проверка на сгорание фишки в режиме фуков
    const fukiBurned = fukiBurnedPieceId !== null

    return {
      success: true,
      pieces: newPieces,
      nextPlayer,
      mustContinueCapture,
      nextMustCaptureFrom,
      winner,
      gameOver,
      becameKing,
      fukiBurned,
      burnedPieceId: fukiBurnedPieceId,
      burnedPosition: fukiBurnedPosition
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
