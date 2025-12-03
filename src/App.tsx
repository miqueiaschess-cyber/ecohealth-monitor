import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, 
  LayoutDashboard, 
  LogOut, 
  UserCircle, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Menu,
  X,
  XCircle,
  Coffee,
  LogIn as LogInIcon,
  Activity,
  Calendar,
  ChevronRight,
  RefreshCw,
  ScanFace,
  BarChart as BarChartIcon,
  TrendingUp,
  TrendingDown,
  Building2,
  CalendarDays,
  Users,
  Trash2
} from 'lucide-react';
import { 
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { analyzeFatigue, validateFace } from './services/geminiService';
import { CameraCapture } from './components/CameraCapture';
import { HealthSurvey } from './components/HealthSurvey';
import { FatigueChart } from './components/FatigueChart';
import { Auth } from './components/Auth';
import { TechRadarChart } from './components/TechRadarChart';
import { CalendarWidget } from './components/CalendarWidget';
import { translations } from './utils/translations';
import { 
  getCheckIns, 
  getCheckInsByUser, 
  saveCheckIn, 
  getCurrentSession, 
  logoutUser, 
  getUsers,
  deleteUser
} from './services/storage';
import { 
  User, 
  UserRole, 
  CheckInType, 
  SurveyAnswers, 
  AIAnalysisResult, 
  CheckInRecord,
  RiskLevel,
  Language,
  Segment
} from './types';

// App Views
enum View {
  DASHBOARD,
  CHECK_IN_CAMERA,
  CHECK_IN_VALIDATING, 
  CHECK_IN_SURVEY,
  CHECK_IN_RESULT,
  TEAM_OVERVIEW,
  ADMIN_PANEL
}

const App: React.FC = () => {
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [lang, setLang] = useState<Language>('pt'); 
  
  // App State
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [checkIns, setCheckIns] = useState<CheckInRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedTech, setSelectedTech] = useState<User | null>(null); 
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  
  // Supervisor State
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM

  // Flow Data State
  const [selectedCheckInType, setSelectedCheckInType] = useState<CheckInType>(CheckInType.START_SHIFT);
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<AIAnalysisResult | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const t = translations[lang];

  // Initialize Data
  useEffect(() => {
    const session = getCurrentSession();
    if (session) {
      setCurrentUser(session);
      refreshData(session);
      if (session.role === UserRole.SUPERVISOR) {
        setCurrentView(View.TEAM_OVERVIEW);
      }
    }
    setAuthChecked(true);
  }, []);

  const refreshData = (user: User) => {
    if (user.role === UserRole.SUPERVISOR || user.role === UserRole.ADMIN) {
      setCheckIns(getCheckIns());
    } else {
      setCheckIns(getCheckInsByUser(user.id));
    }
  };

  // Computed Data
  const myHistory = useMemo(() => 
    checkIns.filter(c => c.userId === currentUser?.id), 
    [checkIns, currentUser]
  );

  // --- Handlers ---

  const handleLoginSuccess = () => {
    const session = getCurrentSession();
    if (session) {
      setCurrentUser(session);
      refreshData(session);
      setCurrentView(session.role === UserRole.SUPERVISOR ? View.TEAM_OVERVIEW : View.DASHBOARD);
    }
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    setCheckIns([]);
    setCurrentView(View.DASHBOARD);
  };

  const handleDeleteUser = (userId: string) => {
    if (window.confirm(t.confirmDelete)) {
        deleteUser(userId);
        refreshData(currentUser!); // Refresh lists
        setCheckIns([...getCheckIns()]); 
    }
  };

  const startCheckIn = (type: CheckInType) => {
    setSelectedCheckInType(type);
    setTempImage(null);
    setLastResult(null);
    setValidationError(null);
    setCurrentView(View.CHECK_IN_CAMERA);
  };

  const handlePhotoCaptured = async (imageBase64: string) => {
    setTempImage(imageBase64);
    setCurrentView(View.CHECK_IN_VALIDATING);
    setValidationError(null);

    try {
      const check = await validateFace(imageBase64);
      if (check.isValid) {
        setCurrentView(View.CHECK_IN_SURVEY);
      } else {
        setValidationError(check.message || t.noFaceMsg);
        setCurrentView(View.CHECK_IN_CAMERA); 
      }
    } catch (e) {
      setValidationError("Validation error");
      setCurrentView(View.CHECK_IN_CAMERA);
    }
  };

  const handleSurveySubmit = async (answers: SurveyAnswers) => {
    if (!tempImage || !currentUser) return;
    setIsLoading(true);

    try {
      const analysis = await analyzeFatigue(tempImage, answers, lang);
      
      // CRITICAL LOGIC: If Invalid, show error screen, do NOT save record
      if (analysis.riskLevel === RiskLevel.INVALID) {
         setLastResult(analysis);
         setCurrentView(View.CHECK_IN_RESULT); 
         return; 
      }

      setLastResult(analysis);
      
      const newRecord: CheckInRecord = {
        id: `chk-${Date.now()}`,
        userId: currentUser.id,
        timestamp: new Date().toISOString(),
        type: selectedCheckInType,
        imageUrl: tempImage, 
        surveyAnswers: answers,
        analysis: analysis,
        location: { lat: 0, lng: 0 } 
      };

      saveCheckIn(newRecord);
      refreshData(currentUser); 
      setCurrentView(View.CHECK_IN_RESULT);
    } catch (err) {
      console.error(err);
      alert("Error processing check-in. Please try again.");
      setCurrentView(View.DASHBOARD);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Render Helpers ---

  const getRiskColor = (risk?: RiskLevel) => {
    switch (risk) {
      case RiskLevel.HIGH: return 'bg-red-100 text-red-700 border-red-200';
      case RiskLevel.MODERATE: return 'bg-amber-100 text-amber-700 border-amber-200';
      case RiskLevel.LOW: return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case RiskLevel.INVALID: return 'bg-slate-300 text-slate-700 border-slate-400';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const renderActionButtons = () => {
    const today = new Date().toLocaleDateString();
    const todayRecords = myHistory.filter(r => new Date(r.timestamp).toLocaleDateString() === today);
    
    const startRecord = todayRecords.find(r => r.type === CheckInType.START_SHIFT);
    const breakRecord = todayRecords.find(r => r.type === CheckInType.BREAK);
    const endRecord = todayRecords.find(r => r.type === CheckInType.END_SHIFT);

    const renderButton = (type: CheckInType, record: CheckInRecord | undefined, label: string, Icon: React.ElementType, hint: string, colorClass: string) => {
      const isDone = !!record;
      const timeStr = record ? new Date(record.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';

      return (
        <button
          onClick={() => !isDone && startCheckIn(type)}
          disabled={isDone}
          className={`relative p-6 rounded-xl border transition-all text-left flex flex-col justify-between h-full group ${
             isDone 
               ? 'bg-slate-50 border-slate-200 cursor-default opacity-80' 
               : `bg-white ${colorClass} shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-95 cursor-pointer`
          }`}
        >
          <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-full transition-colors ${isDone ? 'bg-slate-200 text-slate-500' : 'bg-slate-100 group-hover:bg-white'}`}>
              <Icon size={24} className={isDone ? 'text-slate-500' : ''} />
            </div>
            {isDone && <CheckCircle className="text-[#3DCD58]" size={24} />}
          </div>
          <div>
             <h3 className={`text-lg font-bold ${isDone ? 'text-slate-500' : 'text-slate-800'}`}>{label}</h3>
             <p className="text-xs text-slate-400 mt-1">{isDone ? `${t.registeredAt} ${timeStr}` : hint}</p>
          </div>
        </button>
      );
    };

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
         {renderButton(CheckInType.START_SHIFT, startRecord, t.typeStart, LogInIcon, t.hintStart, 'border-emerald-100 hover:border-[#3DCD58]')}
         {renderButton(CheckInType.BREAK, breakRecord, t.typeBreak, Coffee, t.hintBreak, 'border-amber-100 hover:border-amber-400')}
         {renderButton(CheckInType.END_SHIFT, endRecord, t.typeEnd, LogOut, t.hintEnd, 'border-blue-100 hover:border-blue-400')}
      </div>
    );
  };

  const renderDashboard = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-end mb-2">
         <div>
            <h2 className="text-2xl font-bold text-slate-800">{t.todaysActions}</h2>
            <p className="text-slate-500 text-sm">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
         </div>
      </div>

      {renderActionButtons()}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
           <CalendarWidget checkIns={myHistory} lang={lang} />
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 md:col-span-2">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Activity className="text-blue-500" size={20} /> {t.myFatigue}
          </h3>
          {myHistory.length > 0 ? (
             <FatigueChart data={myHistory} />
          ) : (
            <div className="h-40 flex items-center justify-center text-slate-400 text-sm">
              No data yet.
            </div>
          )}
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 col-span-1 md:col-span-3">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Clock className="text-purple-500" size={20} /> {t.recentActivity}
          </h3>
          <div className="space-y-4">
            {myHistory.slice(0, 3).map(record => (
              <div key={record.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getRiskColor(record.analysis?.riskLevel)}`}>
                    {record.analysis?.fatigueLevel ? Math.round(record.analysis.fatigueLevel) : '-'}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">
                        {record.type === CheckInType.START_SHIFT && t.typeStart}
                        {record.type === CheckInType.BREAK && t.typeBreak}
                        {record.type === CheckInType.END_SHIFT && t.typeEnd}
                    </p>
                    <p className="text-sm text-slate-500">{new Date(record.timestamp).toLocaleString()}</p>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${getRiskColor(record.analysis?.riskLevel)}`}>
                  {record.analysis?.riskLevel || 'N/A'}
                </div>
              </div>
            ))}
            {myHistory.length === 0 && <p className="text-slate-500 italic text-center py-8">No recent check-ins.</p>}
          </div>
        </div>
      </div>
    </div>
  );

  const renderAdminPanel = () => {
    const allUsers = getUsers();
    
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center mb-4">
           <div>
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Users className="text-[#3DCD58]" /> {t.manageUsers}
              </h2>
              <p className="text-slate-500 text-sm">Total users: {allUsers.length}</p>
           </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
           <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                   <th className="p-4 font-bold border-b border-slate-200">User</th>
                   <th className="p-4 font-bold border-b border-slate-200">{t.role}</th>
                   <th className="p-4 font-bold border-b border-slate-200">{t.businessUnit}</th>
                   <th className="p-4 font-bold border-b border-slate-200">{t.segment}</th>
                   <th className="p-4 font-bold border-b border-slate-200 text-right">{t.action}</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 text-sm">
                 {allUsers.map(user => (
                   <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                     <td className="p-4">
                       <div className="flex items-center gap-3">
                         <img src={user.avatarUrl} className="w-10 h-10 rounded-full bg-slate-200 object-cover" alt="" />
                         <div>
                           <p className="font-bold text-slate-800">{user.name}</p>
                           <p className="text-xs text-slate-500">{user.email}</p>
                         </div>
                       </div>
                     </td>
                     <td className="p-4">
                       <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                         user.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700' :
                         user.role === UserRole.SUPERVISOR ? 'bg-blue-100 text-blue-700' :
                         'bg-emerald-100 text-emerald-700'
                       }`}>
                         {user.role === UserRole.SUPERVISOR ? t.supervisor : user.role === UserRole.TECHNICIAN ? t.technician : user.role}
                       </span>
                     </td>
                     <td className="p-4 text-slate-600">{user.businessUnit || '-'}</td>
                     <td className="p-4 text-slate-600">{user.segment || '-'}</td>
                     <td className="p-4 text-right">
                        {user.id !== currentUser?.id ? (
                          <button 
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title={t.deleteUser}
                          >
                            <Trash2 size={18} />
                          </button>
                        ) : (
                          <span className="text-xs text-slate-300 italic">{t.cannotDeleteSelf}</span>
                        )}
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </div>
      </div>
    );
  };

  const renderSupervisorView = () => {
    const users = getUsers().filter(u => u.role === UserRole.TECHNICIAN);
    const techRecords = (techId: string) => checkIns.filter(c => c.userId === techId);

    // --- Filter Data by Selected Month ---
    const getRecordsForMonth = (records: CheckInRecord[]) => {
      const [year, month] = selectedMonth.split('-').map(Number);
      return records.filter(r => {
        const d = new Date(r.timestamp);
        return d.getFullYear() === year && d.getMonth() === month - 1;
      });
    };

    // --- Segment Analytics ---
    const segmentStats = Object.values(Segment).map(seg => {
        const segUsers = users.filter(u => u.segment === seg);
        const segRecords = segUsers.flatMap(u => getRecordsForMonth(techRecords(u.id)));
        
        // Avg Energy
        const totalEnergy = segRecords.reduce((acc, r) => acc + (r.surveyAnswers?.energyLevel || 0), 0);
        const avgEnergy = segRecords.length > 0 ? (totalEnergy / segRecords.length) : 0;
        
        // High Risk Count
        const highRiskCount = segRecords.filter(r => r.analysis?.riskLevel === RiskLevel.HIGH).length;

        const segLabel = seg === Segment.UPS ? t.segUps : 
                         seg === Segment.COOLING ? t.segCooling :
                         seg === Segment.ENERGY ? t.segEnergy : t.segAssistencia;

        return {
            name: segLabel,
            energy: parseFloat(avgEnergy.toFixed(1)),
            risk: highRiskCount
        };
    });

    // --- Top Performers (Month Specific) ---
    const monthRankedUsers = [...users].map(user => {
        const monthRecords = getRecordsForMonth(techRecords(user.id));
        if (monthRecords.length === 0) return { user, avgScore: 0, count: 0 };
        
        const totalScore = monthRecords.reduce((acc, r) => acc + (r.surveyAnswers?.energyLevel || 0) + (r.surveyAnswers?.motivationLevel || 0), 0);
        const avgScore = totalScore / (monthRecords.length * 2); // Normalize 0-10
        return { user, avgScore, count: monthRecords.length };
    }).sort((a, b) => b.avgScore - a.avgScore);

    const topPerformers = monthRankedUsers.filter(u => u.count > 0).slice(0, 3);
    const lowPerformers = monthRankedUsers.filter(u => u.count > 0).slice(-3).reverse();
    
    // --- CRITICAL ALERTS: HIGH RISK ONLY ---
    const alerts = users.filter(u => {
        const recs = techRecords(u.id);
        const last = recs[0];
        // Only return true if last record is HIGH risk. Moderate is ignored for critical alerts.
        return last?.analysis?.riskLevel === RiskLevel.HIGH;
    });

    // Helper for modal date filtering
    const getRecordsForDate = (records: CheckInRecord[], date: Date | null) => {
        if (!date) return [];
        return records.filter(r => {
            const rDate = new Date(r.timestamp);
            return rDate.getDate() === date.getDate() && 
                   rDate.getMonth() === date.getMonth() && 
                   rDate.getFullYear() === date.getFullYear();
        }).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    };

    return (
    <div className="space-y-6 animate-fade-in relative pb-10">
      
      {/* Month Selector Bar - IMPROVED CONTRAST */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between shadow-sm sticky top-0 z-10 gap-4">
         <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg text-[#3DCD58]">
                <CalendarDays size={20} />
            </div>
            <div>
                <h2 className="text-lg font-bold text-slate-800">{t.selectMonth}</h2>
                <p className="text-xs text-slate-400">Filter analytics and reports</p>
            </div>
         </div>
         <input 
            type="month" 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border-2 border-slate-300 bg-white text-slate-900 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#3DCD58] focus:border-[#3DCD58] outline-none font-bold text-sm shadow-sm cursor-pointer hover:border-slate-400"
         />
      </div>

      {/* Modal for Tech Details */}
      {selectedTech && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl animate-scale-in my-8 max-h-[90vh] overflow-y-auto flex flex-col">
            
            <div className="bg-slate-900 p-6 flex justify-between items-center text-white rounded-t-2xl sticky top-0 z-10">
               <div className="flex items-center gap-4">
                  <img src={selectedTech.avatarUrl} className="w-12 h-12 rounded-full border-2 border-slate-500" alt="" />
                  <div>
                    <h3 className="text-xl font-bold">{selectedTech.name}</h3>
                    <p className="text-slate-400 text-sm flex items-center gap-2">
                        {selectedTech.businessUnit} • {selectedTech.segment}
                    </p>
                  </div>
               </div>
               <button onClick={() => {setSelectedTech(null); setSelectedDate(new Date())}} className="hover:bg-slate-700 p-2 rounded-full transition-colors"><XCircle size={24} /></button>
            </div>
            
            <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Visual Data */}
              <div className="lg:col-span-7 space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <h4 className="font-bold text-slate-700 mb-2 text-center text-sm">{t.statsRadar}</h4>
                        <div className="h-48">
                            <TechRadarChart checkIns={techRecords(selectedTech.id)} lang={lang} compact={false} />
                        </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <h4 className="font-bold text-slate-700 mb-2 text-center text-sm">{t.myFatigue}</h4>
                        <div className="h-48">
                             <FatigueChart data={techRecords(selectedTech.id)} />
                        </div>
                    </div>
                 </div>

                 <div className="bg-white border rounded-2xl p-4">
                    <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Clock size={18} className="text-[#3DCD58]" /> 
                        {t.dailyHistory} 
                        {selectedDate && <span className="text-slate-400 font-normal ml-2">({selectedDate.toLocaleDateString()})</span>}
                    </h4>
                    
                    <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
                        {getRecordsForDate(techRecords(selectedTech.id), selectedDate).length > 0 ? (
                             getRecordsForDate(techRecords(selectedTech.id), selectedDate).map(r => (
                                <div key={r.id} className="flex gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100 items-start">
                                    <img src={r.imageUrl} className="w-16 h-16 rounded-lg object-cover bg-slate-200" alt="Checkin" />
                                    <div className="flex-1">
                                        <div className="flex justify-between">
                                            <span className="font-bold text-slate-800">
                                                {r.type === CheckInType.START_SHIFT ? t.typeStart : r.type === CheckInType.BREAK ? t.typeBreak : t.typeEnd}
                                            </span>
                                            <span className={`text-xs px-2 py-1 rounded font-bold ${getRiskColor(r.analysis?.riskLevel)}`}>
                                                {r.analysis?.riskLevel}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 mb-1">{new Date(r.timestamp).toLocaleTimeString()}</p>
                                        <p className="text-sm text-slate-600 italic">"{r.analysis?.explanation}"</p>
                                    </div>
                                </div>
                             ))
                        ) : (
                            <div className="text-center py-8 text-slate-400">
                                <Calendar size={32} className="mx-auto mb-2 opacity-50" />
                                <p>{t.noRecordsDay}</p>
                            </div>
                        )}
                    </div>
                 </div>
              </div>

              <div className="lg:col-span-5">
                  <div className="bg-slate-50 p-4 rounded-2xl h-full border border-slate-100">
                      <p className="text-center text-sm text-slate-500 mb-2">{t.selectDay}</p>
                      <CalendarWidget 
                        checkIns={techRecords(selectedTech.id)} 
                        lang={lang} 
                        selectedDate={selectedDate}
                        onDateSelect={setSelectedDate}
                      />
                  </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* --- DASHBOARD CONTENT --- */}
      <div className="grid grid-cols-1 gap-6">
        
        {/* Alerts Strip */}
        {alerts.length > 0 && (
             <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="min-w-fit">
                    <h3 className="font-bold text-red-700 flex items-center gap-2 mb-1">
                        <AlertTriangle size={20} /> {t.criticalAlerts}
                    </h3>
                    <p className="text-xs text-red-500">Action Required</p>
                </div>
                <div className="flex flex-wrap gap-4 flex-1">
                    {alerts.map(user => {
                        const last = techRecords(user.id)[0];
                        return (
                        <div key={user.id} onClick={() => { setSelectedTech(user); setSelectedDate(new Date()); }} className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-red-100 shadow-sm cursor-pointer hover:bg-red-50 transition-colors">
                            <img src={user.avatarUrl} className="w-8 h-8 rounded-full" alt="" />
                            <div>
                                <p className="text-sm font-bold text-slate-800">{user.name}</p>
                                <p className="text-xs text-red-500 font-semibold">{last?.analysis?.riskLevel}</p>
                            </div>
                        </div>
                    )})}
                </div>
             </div>
        )}

        {/* Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Bar Chart: Segment Performance */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-1">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <BarChartIcon className="text-blue-500" size={18} /> {t.segmentPerformance}
                </h3>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={segmentStats} margin={{ top: 20, right: 0, bottom: 0, left: 0 }}>
                             <CartesianGrid strokeDasharray="3 3" vertical={false} />
                             <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} interval={0} />
                             <YAxis fontSize={12} tickLine={false} axisLine={false} />
                             <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px'}} />
                             <Legend wrapperStyle={{fontSize: '12px'}} />
                             <Bar dataKey="energy" name={t.avgEnergy} fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                             <Bar dataKey="risk" name="High Risk Events" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Top Performers (Month) */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <TrendingUp className="text-[#3DCD58]" size={18} /> {t.topPerformers}
                </h3>
                <div className="space-y-3">
                    {topPerformers.map((item, i) => (
                         <div key={item.user.id} onClick={() => { setSelectedTech(item.user); setSelectedDate(new Date()); }} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-slate-100">
                            <span className="font-bold text-slate-300 text-lg w-4">#{i+1}</span>
                            <img src={item.user.avatarUrl} className="w-8 h-8 rounded-full" alt="" />
                            <div className="flex-1">
                                <p className="text-sm font-bold text-slate-800 line-clamp-1">{item.user.name}</p>
                                <p className="text-xs text-slate-400 line-clamp-1">{item.user.segment || 'N/A'}</p>
                            </div>
                            <div className="text-right">
                                <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                                    {item.avgScore.toFixed(1)}
                                </span>
                            </div>
                         </div>
                    ))}
                    {topPerformers.length === 0 && <p className="text-slate-400 text-sm italic">No data for selected month</p>}
                </div>
            </div>

            {/* Needs Attention (Month) */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <TrendingDown className="text-amber-500" size={18} /> {t.needsAttention}
                </h3>
                <div className="space-y-3">
                    {lowPerformers.map((item, i) => (
                         <div key={item.user.id} onClick={() => { setSelectedTech(item.user); setSelectedDate(new Date()); }} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-slate-100">
                             <AlertTriangle size={16} className="text-amber-500" />
                             <img src={item.user.avatarUrl} className="w-8 h-8 rounded-full" alt="" />
                             <div className="flex-1">
                                 <p className="text-sm font-bold text-slate-800 line-clamp-1">{item.user.name}</p>
                                 <p className="text-xs text-slate-400 line-clamp-1">{item.user.segment}</p>
                             </div>
                             <div className="text-right">
                                <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                                    {item.avgScore.toFixed(1)}
                                </span>
                            </div>
                         </div>
                    ))}
                    {lowPerformers.length === 0 && <p className="text-slate-400 text-sm italic">No alerts for selected month</p>}
                </div>
            </div>
        </div>

        {/* Cards Grid: All Technicians (Filtered by Month Logic applied to data) */}
        <div>
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                <Users size={18} /> {t.fullRoster}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {users.map(user => {
                    const last = techRecords(user.id)[0];
                    const isHighRisk = last?.analysis?.riskLevel === RiskLevel.HIGH;
                    
                    return (
                    <div 
                        key={user.id}
                        onClick={() => { setSelectedTech(user); setSelectedDate(new Date()); }}
                        className={`group bg-white rounded-2xl p-4 shadow-sm border hover:shadow-lg transition-all cursor-pointer relative overflow-hidden ${isHighRisk ? 'border-red-200 ring-1 ring-red-100' : 'border-slate-200 hover:border-[#3DCD58]'}`}
                    >
                        {/* Status Line Top */}
                        <div className={`absolute top-0 left-0 w-full h-1.5 ${isHighRisk ? 'bg-red-500' : 'bg-[#3DCD58]'}`}></div>

                        <div className="flex flex-col items-center mt-2">
                             <div className="relative">
                                <img src={user.avatarUrl} className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md mb-3" alt="" />
                                {isHighRisk && (
                                    <div className="absolute -right-1 -bottom-1 bg-red-500 text-white p-1 rounded-full border-2 border-white">
                                        <AlertTriangle size={12} />
                                    </div>
                                )}
                             </div>
                             
                             <h4 className="font-bold text-slate-800 text-lg text-center leading-tight mb-1">{user.name}</h4>
                             <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-4">{user.segment}</p>
                             
                             <div className="w-full bg-slate-50 rounded-xl p-2 border border-slate-100 mb-3">
                                <div className="h-24 w-full">
                                    <TechRadarChart checkIns={techRecords(user.id)} lang={lang} compact={true} />
                                </div>
                             </div>

                             <div className="flex justify-between w-full text-xs px-2">
                                <span className="text-slate-400">Last: {last ? new Date(last.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '-'}</span>
                                <span className={`font-bold ${isHighRisk ? 'text-red-600' : 'text-emerald-600'}`}>
                                    {last?.analysis?.riskLevel || 'N/A'}
                                </span>
                             </div>
                        </div>
                    </div>
                )})}
            </div>
        </div>
      </div>
    </div>
    );
  };

  const renderResult = () => {
    if (!lastResult) return null;
    const isInvalid = lastResult.riskLevel === RiskLevel.INVALID;
    const isHigh = lastResult.riskLevel === RiskLevel.HIGH;

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 animate-scale-in max-w-lg mx-auto">
         <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-xl ${
            isInvalid ? 'bg-slate-800 text-white' : 
            isHigh ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
         }`}>
            {isInvalid ? <X size={48} /> : isHigh ? <AlertTriangle size={48} /> : <CheckCircle size={48} />}
         </div>

         <h2 className="text-3xl font-extrabold text-slate-800 mb-2">
            {isInvalid ? t.invalidPhoto : isHigh ? t.caution : t.readyDuty}
         </h2>
         
         <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm w-full mb-8 text-left">
            <p className="text-sm font-bold text-slate-500 uppercase mb-1">{t.riskLevel}</p>
            <p className={`text-lg font-bold mb-4 ${
                isInvalid ? 'text-slate-800' : isHigh ? 'text-red-600' : 'text-emerald-600'
            }`}>
                {lastResult.riskLevel} {lastResult.fatigueLevel > 0 && `(${Math.round(lastResult.fatigueLevel)}%)`}
            </p>

            <p className="text-sm font-bold text-slate-500 uppercase mb-1">Analysis</p>
            <p className="text-slate-700 mb-4 leading-relaxed">{lastResult.explanation}</p>

            <p className="text-sm font-bold text-slate-500 uppercase mb-1">{t.recommendation}</p>
            <p className="text-slate-700 font-medium">{lastResult.recommendation}</p>
         </div>

         <button 
           onClick={() => {
             if (isInvalid) {
                 // Return to camera if invalid
                 setCurrentView(View.CHECK_IN_CAMERA);
             } else {
                 // Return to dashboard if success/warning
                 setCurrentView(View.DASHBOARD);
             }
           }}
           className={`px-8 py-4 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 ${
               isInvalid ? 'bg-slate-800 hover:bg-slate-900' : 'bg-[#3DCD58] hover:bg-[#32b54d]'
           }`}
         >
            {isInvalid ? t.retake : t.returnDash}
         </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans pb-20 md:pb-0">
      
      {/* --- Mobile Header --- */}
      <div className="md:hidden bg-[#3DCD58] text-white p-4 flex justify-between items-center sticky top-0 z-20 shadow-md">
         <div className="flex items-center gap-2">
            <ShieldCheck />
            <span className="font-bold text-lg">SE EcoHealth</span>
         </div>
         <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X /> : <Menu />}
         </button>
      </div>

      {/* --- Mobile Menu Overlay --- */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-10 bg-slate-900/90 backdrop-blur-sm md:hidden pt-20 px-6 animate-fade-in">
           <nav className="flex flex-col gap-4 text-white text-lg font-bold">
              <button onClick={() => { setCurrentView(View.DASHBOARD); setIsMobileMenuOpen(false); }} className="flex items-center gap-3 p-4 bg-white/10 rounded-xl">
                 <LayoutDashboard /> Dashboard
              </button>
              {(currentUser?.role === UserRole.SUPERVISOR || currentUser?.role === UserRole.ADMIN) && (
                  <>
                  <button onClick={() => { setCurrentView(View.TEAM_OVERVIEW); setIsMobileMenuOpen(false); }} className="flex items-center gap-3 p-4 bg-white/10 rounded-xl">
                     <Users /> Team Overview
                  </button>
                  <button onClick={() => { setCurrentView(View.ADMIN_PANEL); setIsMobileMenuOpen(false); }} className="flex items-center gap-3 p-4 bg-white/10 rounded-xl">
                     <Building2 /> Admin Panel
                  </button>
                  </>
              )}
              <button onClick={handleLogout} className="flex items-center gap-3 p-4 text-red-400 mt-8 border border-red-500/30 rounded-xl">
                 <LogOut /> Logout
              </button>
           </nav>
        </div>
      )}

      {/* --- Desktop Sidebar --- */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white fixed h-full z-10">
         <div className="p-6 bg-[#3DCD58]">
            <div className="flex items-center gap-3 font-extrabold text-xl tracking-tight">
               <ShieldCheck size={28} />
               SE EcoHealth
            </div>
         </div>

         <div className="p-6">
            {currentUser && (
                <div className="flex items-center gap-3 mb-8 pb-8 border-b border-slate-700">
                    <img src={currentUser.avatarUrl} className="w-12 h-12 rounded-full border-2 border-[#3DCD58]" alt="Profile" />
                    <div>
                        <p className="font-bold text-sm leading-tight">{currentUser.name}</p>
                        <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mt-1">
                            {currentUser.role === UserRole.SUPERVISOR ? t.supervisor : t.technician}
                        </p>
                    </div>
                </div>
            )}

            <nav className="space-y-2">
               <button 
                 onClick={() => setCurrentView(View.DASHBOARD)}
                 className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${currentView === View.DASHBOARD ? 'bg-[#3DCD58] text-white shadow-lg shadow-emerald-900/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
               >
                 <LayoutDashboard size={20} /> Dashboard
               </button>

               {(currentUser?.role === UserRole.SUPERVISOR || currentUser?.role === UserRole.ADMIN) && (
                 <>
                 <button 
                    onClick={() => setCurrentView(View.TEAM_OVERVIEW)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${currentView === View.TEAM_OVERVIEW ? 'bg-[#3DCD58] text-white shadow-lg shadow-emerald-900/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                 >
                    <Users size={20} /> {t.teamOverview}
                 </button>
                 <button 
                    onClick={() => setCurrentView(View.ADMIN_PANEL)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${currentView === View.ADMIN_PANEL ? 'bg-[#3DCD58] text-white shadow-lg shadow-emerald-900/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                 >
                    <Building2 size={20} /> {t.manageUsers}
                 </button>
                 </>
               )}
            </nav>
         </div>

         <div className="mt-auto p-6 border-t border-slate-800">
             <div className="flex gap-2 justify-center mb-6">
                 {(['en', 'pt', 'es'] as Language[]).map(l => (
                     <button 
                       key={l}
                       onClick={() => setLang(l)}
                       className={`text-xs font-bold px-3 py-1 rounded-full border transition-all ${lang === l ? 'bg-white text-slate-900 border-white' : 'text-slate-500 border-slate-700 hover:border-slate-500'}`}
                     >
                        {l.toUpperCase()}
                     </button>
                 ))}
             </div>
             <button 
               onClick={handleLogout}
               className="w-full flex items-center justify-center gap-2 text-red-400 hover:bg-red-500/10 py-3 rounded-xl transition-colors font-bold text-sm"
             >
                <LogOut size={18} /> Logout
             </button>
         </div>
      </aside>

      {/* --- Main Content Area --- */}
      <main className="md:ml-64 p-4 md:p-8 max-w-7xl mx-auto">
        {!authChecked ? (
          <div className="flex items-center justify-center h-[60vh]">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : !currentUser ? (
          <Auth onLoginSuccess={handleLoginSuccess} lang={lang} setLang={setLang} />
        ) : (
           <>
              {currentView === View.DASHBOARD && renderDashboard()}
              
              {currentView === View.CHECK_IN_CAMERA && (
                <div className="max-w-2xl mx-auto animate-fade-in text-center">
                   <h2 className="text-2xl font-bold text-slate-800 mb-2">{t.step1}</h2>
                   <p className="text-slate-500 mb-6">{t.facePosition}</p>
                   
                   {validationError && (
                      <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 flex items-center gap-2 justify-center font-bold">
                          <AlertTriangle /> {validationError}
                      </div>
                   )}
                   
                   <CameraCapture onCapture={handlePhotoCaptured} lang={lang} variant="default" />
                   
                   <button onClick={() => setCurrentView(View.DASHBOARD)} className="mt-8 text-slate-400 font-bold hover:text-slate-600">
                      {t.cancel}
                   </button>
                </div>
              )}

              {currentView === View.CHECK_IN_VALIDATING && (
                 <div className="flex flex-col items-center justify-center h-[50vh] animate-fade-in">
                    <ScanFace size={64} className="text-[#3DCD58] animate-pulse mb-6" />
                    <h3 className="text-xl font-bold text-slate-800">{t.validatingFace}</h3>
                 </div>
              )}

              {currentView === View.CHECK_IN_SURVEY && (
                 <div className="animate-fade-in">
                     <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-slate-800">{t.step2}</h2>
                        <p className="text-slate-500">Self-Assessment</p>
                     </div>
                     {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl shadow-sm border border-slate-100">
                           <div className="w-12 h-12 border-4 border-[#3DCD58] border-t-transparent rounded-full animate-spin mb-4"></div>
                           <p className="font-bold text-slate-700 animate-pulse">{t.analyzing}</p>
                           <p className="text-xs text-slate-400 mt-2">Gemini AI is assessing fatigue markers...</p>
                        </div>
                     ) : (
                        <HealthSurvey onSubmit={handleSurveySubmit} onCancel={() => setCurrentView(View.DASHBOARD)} lang={lang} />
                     )}
                 </div>
              )}

              {currentView === View.CHECK_IN_RESULT && renderResult()}
              
              {currentView === View.TEAM_OVERVIEW && renderSupervisorView()}
              
              {currentView === View.ADMIN_PANEL && renderAdminPanel()}
           </>
        )}
      </main>
    </div>
  );
};

export default App;