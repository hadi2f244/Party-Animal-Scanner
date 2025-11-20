export interface AnimalResult {
  animal: string;
  description: string;
  emoji: string;
  roastLevel: string;
}

export interface PersonDetected {
  id: string;
  label: string; // e.g. "مرد با پیراهن قرمز"
}

export enum AppState {
  HOME = 'HOME',
  CAMERA = 'CAMERA',
  LOADING = 'LOADING',
  SELECTION = 'SELECTION',
  RESULT = 'RESULT',
  ERROR = 'ERROR'
}