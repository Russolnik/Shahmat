// Типы для игры в шашки (из glasscheckers)

export enum PieceColor {
  WHITE = 'WHITE',
  BLACK = 'BLACK'
}

export enum GameMode {
  PVP_LOCAL = 'PVP_LOCAL',
  PVP_ONLINE = 'PVP_ONLINE'
}

export interface Position {
  row: number;
  col: number;
}

export interface Piece {
  id: string;
  color: PieceColor;
  isKing: boolean;
  position: Position;
}

export interface Move {
  from: Position;
  to: Position;
  isCapture: boolean;
  capturedPieceId?: string;
  capturedPosition?: Position;
  path?: Position[];
}

export interface GameState {
  pieces: Piece[];
  currentPlayer: PieceColor;
  selectedPieceId: string | null;
  validMoves: Move[];
  winner: PieceColor | null;
  isGameOver: boolean;
  capturedWhite: number;
  capturedBlack: number;
  mustCaptureFrom: Position | null;
  moveHistory: Move[];
  startTime: number;
}

export interface PlayerProfile {
  name: string;
  id: string;
  color: PieceColor;
  isReady: boolean;
  isHost: boolean;
}

export interface RoomState {
  roomId: string;
  players: PlayerProfile[];
  gameConfig: {
    withFuki: boolean;
    randomColor: boolean;
  };
  status: 'WAITING' | 'PLAYING' | 'FINISHED';
}

export type ThemeMode = 'light' | 'dark';

