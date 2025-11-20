export interface AnimalResult {
  animal: string;
  description: string;
  emoji: string;
  roastLevel: string;
}

export enum AppState {
  HOME = 'HOME',
  CAMERA = 'CAMERA',
  LOADING = 'LOADING',
  RESULT = 'RESULT',
  ERROR = 'ERROR'
}
