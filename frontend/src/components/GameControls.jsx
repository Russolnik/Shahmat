import RulesModal from './RulesModal'
import './GameControls.css'

const GameControls = ({ gameId, onSurrender, onDraw, disabled = false }) => {
  return (
    <div className="game-controls">
      <button 
        onClick={onSurrender} 
        className="control-btn surrender"
        disabled={disabled}
      >
        Сдаться
      </button>
      <button 
        onClick={onDraw} 
        className="control-btn draw"
        disabled={disabled}
      >
        Ничья?
      </button>
      <RulesModal />
      <div className="game-id">
        ID: {gameId}
      </div>
    </div>
  )
}

export default GameControls

