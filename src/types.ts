export enum UserRole {
  TECHNICIAN = 'TECHNICIAN',
  SUPERVISOR = 'SUPERVISOR',
  ADMIN = 'ADMIN'
}

export enum RiskLevel {
  LOW = 'LOW',
  MODERATE = 'MODERATE',
  HIGH = 'HIGH',
  INVALID = 'INVALID'
}

export enum CheckInType {
  START_SHIFT = 'START_SHIFT',
  BREAK = 'BREAK',
  END_SHIFT = 'END_SHIFT'
}

export enum BusinessUnit {
  SECURE_POWER = 'SECURE_POWER',
  POWER_SYSTEMS = 'POWER_SYSTEMS'
}

export enum Segment {
  UPS = 'UPS',
  COOLING = 'COOLING',
  ENERGY = 'ENERGY',
  ASSISTENCIA_TECNICA = 'ASSISTENCIA_TECNICA'
}

export type Language = 'en' | 'pt' | 'es';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  password?: string;
  businessUnit?: BusinessUnit;
  segment?: Segment;
}

export interface SurveyAnswers {
  sleepQuality: number; // 1-5 (Keeping for base metric)
  energyLevel: number; // 0-10
  focusLevel: number; // 0-10
  motivationLevel: number; // 0-10
  feelingSafe: number; // 0-10 (Psychological safety/Confidence)
}

export interface AIAnalysisResult {
  fatigueLevel: number; // 0-100
  riskLevel: RiskLevel;
  explanation: string;
  recommendation: string;
}

export interface CheckInRecord {
  id: string;
  userId: string;
  timestamp: string; // ISO date string
  type: CheckInType;
  imageUrl?: string;
  surveyAnswers?: SurveyAnswers;
  analysis?: AIAnalysisResult;
  location?: { lat: number; lng: number };
}

export interface DailyStats {
  date: string;
  hoursWorked: number;
  averageFatigue: number;
  incidentCount: number;
}