
import React, { useState } from 'react';
import { RoomState } from '../types';
import { Copy, CheckCircle, Link as LinkIcon, Eye, Loader } from 'lucide-react';

interface LobbyProps {
  room: RoomState;
  currentPlayerId: string;
  onReady: () => void;
  onLeave: () => void;
  connectionStatus?: string;
}

const Lobby: React.FC<LobbyProps> = ({ room, currentPlayerId, onReady, onLeave, connectionStatus }) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const copyLink = () => {
    const url = `${window.location.origin}?room=${room.roomId}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(room.roomId);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const me = room.players.find(p => p.id === currentPlayerId);
  const opponent = room.players.find(p => p.id !== currentPlayerId);
  const spectatorCount = room.spectators ? room.spectators.length : 0;

  const getTranslatedStatus = (status: string) => {
      if (status.includes("Waiting for Host")) return "Ожидание Хоста...";
      if (status.includes("Connected")) return "Подключено";
      if (status.includes("Locating")) return "Поиск комнаты...";
      return status;
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
       <div className="w-full max-w-md glass-panel rounded-2xl p-6 text-center border border-white/10 shadow-2xl relative">
          
          <div className="mb-6">
             <h2 className="text-xs uppercase tracking-widest opacity-50 mb-4">Код комнаты</h2>
             
             <div className="flex flex-col gap-3">
                 {/* Code Display */}
                 <div className="flex items-center justify-between bg-black/30 rounded-xl p-2 pl-6 border border-white/10">
                    <span className="text-3xl font-mono font-bold tracking-widest">{room.roomId}</span>
                    <button 
                        onClick={copyCode}
                        className="p-3 bg-white/10 hover:bg-white/20 rounded-lg transition flex items-center gap-2 text-sm font-bold"
                    >
                        {copiedCode ? <CheckCircle size={18} className="text-green-400"/> : <Copy size={18} />}
                        <span className="hidden sm:inline">Код</span>
                    </button>
                 </div>

                 {/* Copy Link Button */}
                 <button 
                    onClick={copyLink}
                    className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition flex items-center justify-center gap-2 text-sm font-bold"
                 >
                    {copiedLink ? <CheckCircle size={18} className="text-green-400"/> : <LinkIcon size={18} />}
                    Скопировать ссылку
                 </button>
             </div>
          </div>

          <div className="space-y-4 mb-8">
             {/* Player 1 (You) */}
             <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center font-bold text-white text-lg">
                        {me?.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-left">
                        <p className="font-bold text-sm">{me?.name} <span className="opacity-50">(Вы)</span></p>
                        <p className="text-xs opacity-50">{me?.isHost ? 'Создатель' : 'Гость'}</p>
                    </div>
                </div>
                {me?.isReady ? <span className="text-green-400 text-xs font-bold border border-green-400/30 px-2 py-1 rounded">ГОТОВ</span> : <span className="text-xs opacity-50">Не готов</span>}
             </div>

             {/* Player 2 */}
             <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                {opponent ? (
                    <>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center font-bold text-white text-lg">
                            {opponent.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="text-left">
                            <p className="font-bold text-sm">{opponent.name}</p>
                            <p className="text-xs opacity-50">{opponent.isHost ? 'Создатель' : 'Гость'}</p>
                        </div>
                    </div>
                    {opponent.isReady ? <span className="text-green-400 text-xs font-bold border border-green-400/30 px-2 py-1 rounded">ГОТОВ</span> : <span className="text-xs opacity-50">Не готов</span>}
                    </>
                ) : (
                    <div className="flex items-center gap-3 opacity-50 w-full justify-center py-2">
                        <Loader className="animate-spin" size={20} />
                        <span className="text-sm">Ожидание игрока...</span>
                    </div>
                )}
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
              <button onClick={onLeave} className="py-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 font-medium transition">
                  Покинуть
              </button>
              <button 
                onClick={onReady}
                disabled={me?.isReady || !opponent}
                className={`py-3 rounded-xl font-bold transition shadow-lg
                    ${me?.isReady ? 'bg-green-600/50 cursor-default' : 'bg-green-600 hover:bg-green-500'}
                    ${!opponent ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                  {me?.isReady ? 'Ожидание...' : 'Я Готов'}
              </button>
          </div>

          {/* Connection Debug Footer */}
          <div className="absolute bottom-2 left-0 w-full text-center flex flex-col items-center">
               {spectatorCount > 0 && (
                   <div className="flex items-center gap-1 text-xs opacity-50 mb-1">
                       <Eye size={12} /> <span>{spectatorCount} Наблюдателей</span>
                   </div>
               )}
               <span className="text-[10px] font-mono opacity-20 uppercase tracking-widest">{getTranslatedStatus(connectionStatus || "Idle")}</span>
          </div>

       </div>
    </div>
  );
};

export default Lobby;
