import './LoadingSpinner.css'

const LoadingSpinner = ({ message = 'Загрузка...' }) => {
  return (
    <div className="loading-overlay">
      <div className="loading-content">
        <div className="spinner"></div>
        {message && <p className="loading-message">{message}</p>}
      </div>
    </div>
  )
}

export default LoadingSpinner

