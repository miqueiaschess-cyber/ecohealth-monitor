import { CheckInRecord, CheckInType, RiskLevel, User, UserRole } from "../types";

export const MOCK_USERS: User[] = [
  {
    id: 'tech-1',
    name: 'Alex Rivera',
    email: 'alex.r@ecohealth.com',
    role: UserRole.TECHNICIAN,
    avatarUrl: 'https://picsum.photos/100/100?random=1'
  },
  {
    id: 'tech-2',
    name: 'Sarah Chen',
    email: 'sarah.c@ecohealth.com',
    role: UserRole.TECHNICIAN,
    avatarUrl: 'https://picsum.photos/100/100?random=2'
  },
  {
    id: 'sup-1',
    name: 'Marcus Johnson',
    email: 'marcus.j@ecohealth.com',
    role: UserRole.SUPERVISOR,
    avatarUrl: 'https://picsum.photos/100/100?random=3'
  }
];

// Generate some history
const generateHistory = (): CheckInRecord[] => {
  const history: CheckInRecord[] = [];
  const now = new Date();
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    // Tech 1 history
    history.push({
      id: `chk-t1-${i}`,
      userId: 'tech-1',
      timestamp: date.toISOString(),
      type: CheckInType.START_SHIFT,
      analysis: {
        fatigueLevel: 20 + Math.random() * 40,
        riskLevel: Math.random() > 0.8 ? RiskLevel.MODERATE : RiskLevel.LOW,
        explanation: 'Routine check',
        recommendation: 'Proceed'
      }
    });

    // Tech 2 history (higher risk simulation)
    history.push({
      id: `chk-t2-${i}`,
      userId: 'tech-2',
      timestamp: date.toISOString(),
      type: CheckInType.START_SHIFT,
      analysis: {
        fatigueLevel: 40 + Math.random() * 50,
        riskLevel: Math.random() > 0.7 ? RiskLevel.HIGH : RiskLevel.MODERATE,
        explanation: 'Signs of fatigue detected',
        recommendation: 'Monitor closely'
      }
    });
  }
  return history;
};

export const MOCK_HISTORY = generateHistory();