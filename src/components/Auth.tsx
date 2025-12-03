import React, { useState } from 'react';
import { UserRole, Language, BusinessUnit, Segment } from '../types';
import { ShieldCheck, UserPlus, LogIn, Mail, Lock, User, RefreshCw, Trash2, Camera, Upload, Image as ImageIcon } from 'lucide-react';
import { loginUser, registerUser, resetToSeedData, clearAllData } from '../services/storage';
import { CameraCapture } from './CameraCapture';
import { translations } from '../utils/translations';

interface AuthProps {
  onLoginSuccess: () => void;
  lang: Language;
  setLang: (l: Language) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLoginSuccess, lang, setLang }) => {
  const t = translations[lang];
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState(1); // 1: Form, 2: Photo
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [photoMode, setPhotoMode] = useState<'camera' | 'upload'>('camera');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: UserRole.TECHNICIAN,
    accessCode: '',
    businessUnit: '' as BusinessUnit | '',
    segment: '' as Segment | ''
  });

  const validateAccessCode = () => {
    if (formData.role === UserRole.TECHNICIAN && formData.accessCode !== '@123') {
      throw new Error(`Invalid code for Technician. Hint: @123`);
    }
    if (formData.role === UserRole.SUPERVISOR && formData.accessCode !== '@456') {
      throw new Error(`Invalid code for Gestor. Hint: @456`);
    }
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!isLogin) {
      try {
        validateAccessCode();
        if (formData.role === UserRole.TECHNICIAN && (!formData.businessUnit || !formData.segment)) {
             throw new Error("Please select Business Unit and Segment");
        }
        setStep(2); // Go to photo
      } catch (err: any) {
        setError(err.message);
      }
    } else {
      handleLogin();
    }
  };

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      await loginUser(formData.email, formData.password);
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || "Authentication failed");
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!capturedPhoto) {
      setError('Please provide a photo first');
      return;
    }
    setIsLoading(true);
    try {
      await registerUser(
          formData.name, 
          formData.email, 
          formData.password, 
          formData.role, 
          capturedPhoto,
          formData.businessUnit || undefined,
          formData.segment || undefined
      );
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetDemo = () => {
    // Immediate execution without confirm dialog for online environment compatibility
    resetToSeedData();
    window.location.reload();
  };

  const handleClearAll = () => {
    // Immediate execution without confirm dialog
    clearAllData();
    window.location.reload();
  };

  const getSegments = (bu: BusinessUnit) => {
    if (bu === BusinessUnit.SECURE_POWER) return [Segment.UPS, Segment.COOLING];
    if (bu === BusinessUnit.POWER_SYSTEMS) return [Segment.ENERGY, Segment.ASSISTENCIA_TECNICA];
    return [];
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      
      {/* Left Column: Brand & Visuals */}
      <div className="md:w-1/2 bg-[#3DCD58] relative overflow-hidden flex flex-col justify-between p-8 md:p-12 text-white">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
           <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
             <path d="M0 100 L100 0 L100 100 Z" fill="white" />
           </svg>
        </div>

        <div className="relative z-10 animate-fade-in">
           <div className="flex items-center gap-3 mb-8">
              <div className="bg-white text-[#3DCD58] p-2.5 rounded-xl shadow-lg">
                <ShieldCheck size={36} strokeWidth={2.5} />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight">SE EcoHealth</h1>
           </div>
           
           <div className="space-y-6 max-w-lg">
              <h2 className="text-4xl md:text-5xl font-extrabold leading-tight">
                {t.slogan}
              </h2>
              <p className="text-lg text-emerald-50 font-medium leading-relaxed opacity-90">
                {t.appDesc}
              </p>
           </div>
        </div>

        <div className="relative z-10 text-xs font-semibold text-emerald-100 mt-12 md:mt-0 tracking-wide uppercase">
           © {new Date().getFullYear()} {t.internalUse}
        </div>
      </div>

      {/* Right Column: Form */}
      <div className="md:w-1/2 flex items-center justify-center p-4 md:p-12 bg-white relative">
        
        <div className="absolute top-6 right-6 flex gap-2">
            {(['en', 'pt', 'es'] as Language[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-3 py-1 text-xs font-bold rounded-full transition-all border flex items-center gap-1 ${lang === l ? 'bg-slate-900 text-white border-slate-900' : 'text-slate-500 border-slate-200 hover:border-slate-400 bg-white'}`}
              >
                {l.toUpperCase()}
              </button>
            ))}
        </div>

        <div className="w-full max-w-md space-y-8 animate-fade-in">
            <div className="text-center md:text-left">
                <h3 className="text-3xl font-bold text-slate-900 mb-2">
                    {step === 2 ? t.takePhoto : (isLogin ? t.welcomeBack : t.createAccount)}
                </h3>
                <p className="text-slate-500 text-lg">
                    {step === 2 ? t.photoModeDesc : (isLogin ? t.signInDesc : t.createAcctDesc)}
                </p>
            </div>

            {step === 1 && (
            <>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button 
                    onClick={() => { setIsLogin(true); setError(''); }}
                    className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${isLogin ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                    {t.login}
                    </button>
                    <button 
                    onClick={() => { setIsLogin(false); setError(''); }}
                    className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${!isLogin ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                    {t.register}
                    </button>
                </div>

                <form onSubmit={handleNextStep} className="space-y-5">
                    {error && (
                    <div className="p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 font-medium flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span> {error}
                    </div>
                    )}

                    {!isLogin && (
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 ml-1">{t.fullName}</label>
                        <div className="relative">
                        <User className="absolute left-3.5 top-3.5 text-slate-400" size={18} />
                        <input
                            type="text"
                            required={!isLogin}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#3DCD58] focus:border-[#3DCD58] outline-none transition-all placeholder:text-slate-400"
                            placeholder="John Doe"
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                        />
                        </div>
                    </div>
                    )}

                    <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 ml-1">{t.email}</label>
                    <div className="relative">
                        <Mail className="absolute left-3.5 top-3.5 text-slate-400" size={18} />
                        {/* Changed type to "text" to allow simple IDs like 1@1 */}
                        <input
                        type="text"
                        required
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#3DCD58] focus:border-[#3DCD58] outline-none transition-all placeholder:text-slate-400"
                        placeholder="name@se.com or 1@1"
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        />
                    </div>
                    </div>

                    <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 ml-1">{t.password}</label>
                    <div className="relative">
                        <Lock className="absolute left-3.5 top-3.5 text-slate-400" size={18} />
                        <input
                        type="password"
                        required
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#3DCD58] focus:border-[#3DCD58] outline-none transition-all placeholder:text-slate-400"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={e => setFormData({...formData, password: e.target.value})}
                        />
                    </div>
                    </div>

                    {!isLogin && (
                    <>
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 ml-1">{t.role}</label>
                                <select 
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#3DCD58] outline-none text-sm transition-all"
                                    value={formData.role}
                                    onChange={(e) => setFormData({...formData, role: e.target.value as UserRole})}
                                >
                                    <option value={UserRole.TECHNICIAN}>{t.technician}</option>
                                    <option value={UserRole.SUPERVISOR}>Gestor</option>
                                </select>
                             </div>
                             <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 ml-1">{t.accessCode}</label>
                                <input
                                type="text"
                                required
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#3DCD58] outline-none transition-all"
                                placeholder="@123"
                                value={formData.accessCode}
                                onChange={e => setFormData({...formData, accessCode: e.target.value})}
                                />
                             </div>
                        </div>

                        {formData.role === UserRole.TECHNICIAN && (
                            <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 ml-1">{t.businessUnit}</label>
                                <select 
                                    className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#3DCD58] outline-none text-sm appearance-none transition-all"
                                    value={formData.businessUnit}
                                    onChange={(e) => setFormData({...formData, businessUnit: e.target.value as BusinessUnit, segment: ''})}
                                >
                                    <option value="">{t.selectBu}</option>
                                    <option value={BusinessUnit.SECURE_POWER}>{t.buSecurePower}</option>
                                    <option value={BusinessUnit.POWER_SYSTEMS}>{t.buPowerSystems}</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 ml-1">{t.segment}</label>
                                <select 
                                    className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#3DCD58] outline-none text-sm appearance-none transition-all"
                                    disabled={!formData.businessUnit}
                                    value={formData.segment}
                                    onChange={(e) => setFormData({...formData, segment: e.target.value as Segment})}
                                >
                                    <option value="">{t.selectSegment}</option>
                                    {formData.businessUnit && getSegments(formData.businessUnit).map(s => (
                                        <option key={s} value={s}>{
                                            s === Segment.UPS ? t.segUps :
                                            s === Segment.COOLING ? t.segCooling :
                                            s === Segment.ENERGY ? t.segEnergy :
                                            t.segAssistencia
                                        }</option>
                                    ))}
                                </select>
                            </div>
                            </div>
                        )}
                    </>
                    )}

                    <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-[#3DCD58] text-white py-4 rounded-xl font-bold shadow-lg shadow-emerald-100 hover:bg-[#2fb149] active:scale-95 transition-all flex items-center justify-center gap-2 mt-6 text-lg"
                    >
                    {isLoading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <>
                        {isLogin ? <LogIn size={20} /> : <UserPlus size={20} />}
                        {isLogin ? t.signIn : 'Next Step'}
                        </>
                    )}
                    </button>
                </form>
            </>
            )}

            {step === 2 && (
             <div className="animate-fade-in text-center">
                <button onClick={() => setStep(1)} className="mb-6 text-slate-500 hover:text-[#3DCD58] flex items-center justify-center gap-1 mx-auto text-sm font-bold">
                   &larr; {t.back}
                </button>

                {/* Photo Mode Switcher */}
                {!capturedPhoto && (
                  <div className="flex bg-slate-100 p-1 rounded-lg mb-6 max-w-xs mx-auto">
                    <button 
                      onClick={() => setPhotoMode('camera')}
                      className={`flex-1 py-2 text-xs font-bold rounded flex items-center justify-center gap-2 transition-all ${photoMode === 'camera' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}
                    >
                      <Camera size={16} /> {t.useCamera}
                    </button>
                    <button 
                      onClick={() => setPhotoMode('upload')}
                      className={`flex-1 py-2 text-xs font-bold rounded flex items-center justify-center gap-2 transition-all ${photoMode === 'upload' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}
                    >
                      <Upload size={16} /> {t.uploadPhoto}
                    </button>
                  </div>
                )}
                
                {capturedPhoto ? (
                    <div className="flex flex-col items-center">
                        <img src={capturedPhoto} alt="Captured" className="w-40 h-40 rounded-full object-cover border-4 border-[#3DCD58] mb-6 shadow-xl" />
                        <div className="flex gap-4 w-full">
                            <button onClick={() => setCapturedPhoto(null)} className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50">{t.retry}</button>
                            <button 
                                onClick={handleRegister} 
                                disabled={isLoading}
                                className="flex-1 py-3 bg-[#3DCD58] text-white rounded-xl font-bold shadow-lg hover:bg-[#2fb149] flex justify-center items-center"
                            >
                                {isLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : t.createAccount}
                            </button>
                        </div>
                    </div>
                ) : (
                   photoMode === 'camera' ? (
                      <CameraCapture onCapture={setCapturedPhoto} variant="profile" />
                   ) : (
                      <div className="w-full max-w-md mx-auto aspect-[4/3] border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 flex flex-col items-center justify-center cursor-pointer hover:border-[#3DCD58] hover:bg-emerald-50 transition-all relative">
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={handleFileUpload}
                          />
                          <ImageIcon size={48} className="text-slate-300 mb-4" />
                          <p className="font-bold text-slate-600">{t.uploadHint}</p>
                          <p className="text-xs text-slate-400 mt-2">JPG, PNG (Max 5MB)</p>
                      </div>
                   )
                )}
             </div>
            )}
            
            <div className="pt-8 border-t border-slate-100">
                 <p className="text-center text-sm text-slate-500 mb-3">
                    {t.needHelp} <strong className="text-slate-800">Miqueias de Sousa</strong>
                 </p>
                 <div className="flex justify-center gap-6 opacity-50 hover:opacity-100 transition-opacity">
                    <button onClick={handleResetDemo} className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-slate-400 hover:text-blue-600">
                        <RefreshCw size={12} /> {t.resetDemo}
                    </button>
                    <button onClick={handleClearAll} className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-slate-400 hover:text-red-600">
                        <Trash2 size={12} /> {t.startFresh}
                    </button>
                 </div>
            </div>
        </div>
      </div>
    </div>
  );
};