import { User, CheckInRecord, UserRole, BusinessUnit, Segment, CheckInType, RiskLevel } from "../types";

const USERS_KEY = 'ecohealth_users';
const CHECKINS_KEY = 'ecohealth_checkins';
const SESSION_KEY = 'ecohealth_session';

// Helper to simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- User Management ---

export const getUsers = (): User[] => {
  const stored = localStorage.getItem(USERS_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const saveUser = (user: User): void => {
  const users = getUsers();
  users.push(user);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const getUserByEmail = (email: string): User | undefined => {
  const users = getUsers();
  return users.find(u => u.email.toLowerCase() === email.toLowerCase());
};

export const deleteUser = (userId: string): void => {
  let users = getUsers();
  users = users.filter(u => u.id !== userId);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));

  let records = getCheckIns();
  records = records.filter(r => r.userId !== userId);
  localStorage.setItem(CHECKINS_KEY, JSON.stringify(records));
};

// --- Check-in Management ---

export const getCheckIns = (): CheckInRecord[] => {
  const stored = localStorage.getItem(CHECKINS_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const saveCheckIn = (record: CheckInRecord): void => {
  const records = getCheckIns();
  records.unshift(record);
  localStorage.setItem(CHECKINS_KEY, JSON.stringify(records));
};

export const getCheckInsByUser = (userId: string): CheckInRecord[] => {
  return getCheckIns().filter(r => r.userId === userId);
};

// --- Session Management ---

export const loginUser = async (email: string, password: string): Promise<User> => {
  await delay(600);
  const user = getUserByEmail(email);
  
  if (!user || user.password !== password) {
    throw new Error("Invalid email or password");
  }
  
  const sessionUser = { ...user };
  delete sessionUser.password;
  localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
  return sessionUser;
};

export const registerUser = async (
  name: string, 
  email: string, 
  password: string, 
  role: UserRole, 
  avatarUrl?: string,
  businessUnit?: BusinessUnit,
  segment?: Segment
): Promise<User> => {
  await delay(800);
  
  if (getUserByEmail(email)) {
    throw new Error("Email already registered");
  }

  const newUser: User = {
    id: `user-${Date.now()}`,
    name,
    email,
    password, 
    role,
    avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
    businessUnit,
    segment
  };

  saveUser(newUser);
  
  const sessionUser = { ...newUser };
  delete sessionUser.password;
  localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
  
  return sessionUser;
};

export const logoutUser = () => {
  localStorage.removeItem(SESSION_KEY);
};

export const getCurrentSession = (): User | null => {
  const stored = localStorage.getItem(SESSION_KEY);
  return stored ? JSON.parse(stored) : null;
};

// --- Data Management (Reset/Clear) ---

export const clearAllData = () => {
  localStorage.removeItem(USERS_KEY);
  localStorage.removeItem(CHECKINS_KEY);
  localStorage.removeItem(SESSION_KEY);
};

export const resetToSeedData = () => {
  // 1. Force Clean
  clearAllData();
  
  const seededUsers: User[] = [];
  const history: CheckInRecord[] = [];

  // 2. Create the Gestor
  const gestor: User = {
    id: 'gestor-1',
    name: 'Gestor Geral',
    email: 'gestor@eco.com',
    password: '123',
    role: UserRole.SUPERVISOR,
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Gestor'
  };
  seededUsers.push(gestor);

  // 3. Create 10 Technicians (1@1 to 10@10)
  for (let i = 1; i <= 10; i++) {
    const isHighRisk = i > 7; // Techs 8, 9, 10 are high risk
    // Cycle segments
    const segment = i <= 3 ? Segment.UPS : i <= 5 ? Segment.COOLING : i <= 8 ? Segment.ENERGY : Segment.ASSISTENCIA_TECNICA;
    const bu = (segment === Segment.UPS || segment === Segment.COOLING) ? BusinessUnit.SECURE_POWER : BusinessUnit.POWER_SYSTEMS;

    const tech: User = {
        id: `tech-${i}`,
        name: `Tecnico ${i}`,
        email: `${i}@${i}`, // Simple email logic: 1@1, 2@2, etc.
        password: '123',
        role: UserRole.TECHNICIAN,
        businessUnit: bu,
        segment: segment,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=Tech${i}`
    };
    seededUsers.push(tech);

    // Generate History for Graphs
    const now = new Date();
    for (let d = 0; d < 5; d++) {
        const date = new Date(now);
        date.setDate(date.getDate() - d);
        
        // Demo Logic: High ID = High Fatigue
        const baseFatigue = isHighRisk ? 80 : 20;
        const fatigue = Math.min(100, Math.max(0, baseFatigue + (Math.random() * 20 - 10)));
        const risk = fatigue > 70 ? RiskLevel.HIGH : fatigue > 40 ? RiskLevel.MODERATE : RiskLevel.LOW;

        history.push({
            id: `chk-${tech.id}-${d}`,
            userId: tech.id,
            timestamp: date.toISOString(),
            type: CheckInType.START_SHIFT,
            imageUrl: `https://picsum.photos/200/200?random=${i}${d}`,
            surveyAnswers: {
                sleepQuality: isHighRisk ? 2 : 4,
                energyLevel: isHighRisk ? 3 : 8,
                focusLevel: isHighRisk ? 4 : 8,
                motivationLevel: isHighRisk ? 3 : 9,
                feelingSafe: isHighRisk ? 4 : 10
            },
            analysis: {
                fatigueLevel: fatigue,
                riskLevel: risk,
                explanation: risk === RiskLevel.HIGH ? "Fadiga Visual Detectada." : "Pronto.",
                recommendation: risk === RiskLevel.HIGH ? "Pausa." : "Ok."
            }
        });
    }
  }

  localStorage.setItem(USERS_KEY, JSON.stringify(seededUsers));
  localStorage.setItem(CHECKINS_KEY, JSON.stringify(history));
  console.log('Database reset to 10 numbered technicians + 1 Gestor');
};

const initDB = () => {
  // Optional: Auto-seed if truly empty (first run)
  if (getUsers().length === 0) {
      console.log('DB Empty. Waiting for Reset Demo Action.');
  }
};

initDB();