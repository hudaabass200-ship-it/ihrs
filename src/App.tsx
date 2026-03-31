import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Moon, Sun, Plus, Briefcase, Upload, FileText, CheckCircle, XCircle, Loader2, Trash2 } from 'lucide-react';
import { JobProfile, CVResult } from './types';
import { analyzeCV } from './services/gemini';
import { cn } from './lib/utils';

export default function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [profiles, setProfiles] = useState<JobProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [results, setResults] = useState<CVResult[]>([]);
  
  // Load from local storage
  useEffect(() => {
    const savedProfiles = localStorage.getItem('hr-profiles');
    const savedResults = localStorage.getItem('hr-results');
    const savedTheme = localStorage.getItem('hr-theme');
    
    if (savedProfiles) setProfiles(JSON.parse(savedProfiles));
    if (savedResults) setResults(JSON.parse(savedResults));
    if (savedTheme === 'dark') setDarkMode(true);
  }, []);

  // Save to local storage
  useEffect(() => {
    localStorage.setItem('hr-profiles', JSON.stringify(profiles));
    localStorage.setItem('hr-results', JSON.stringify(results));
    localStorage.setItem('hr-theme', darkMode ? 'dark' : 'light');
    
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [profiles, results, darkMode]);

  const activeProfile = profiles.find(p => p.id === activeProfileId);
  const activeResults = results.filter(r => r.jobProfileId === activeProfileId);

  const handleCreateProfile = () => {
    const newProfile: JobProfile = {
      id: uuidv4(),
      title: 'وظيفة جديدة',
      field: '',
      experience: '',
      skills: '',
      otherRequirements: ''
    };
    setProfiles([...profiles, newProfile]);
    setActiveProfileId(newProfile.id);
  };

  const handleUpdateProfile = (id: string, updates: Partial<JobProfile>) => {
    setProfiles(profiles.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const handleDeleteProfile = (id: string) => {
    setProfiles(profiles.filter(p => p.id !== id));
    setResults(results.filter(r => r.jobProfileId !== id));
    if (activeProfileId === id) {
      setActiveProfileId(null);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !activeProfile) return;
    
    const files = Array.from(e.target.files) as File[];
    
    for (const file of files) {
      const resultId = uuidv4();
      
      // Add pending result
      setResults(prev => [{
        id: resultId,
        jobProfileId: activeProfile.id,
        candidateName: 'جاري التحليل...',
        score: 0,
        strengths: [],
        summary: '',
        fileName: file.name,
        status: 'processing'
      }, ...prev]);

      try {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64String = (reader.result as string).split(',')[1];
          
          try {
            const analysis = await analyzeCV(base64String, file.type, activeProfile);
            
            setResults(prev => prev.map(r => r.id === resultId ? {
              ...r,
              candidateName: analysis.candidateName || 'غير معروف',
              score: analysis.score || 0,
              strengths: analysis.strengths || [],
              summary: analysis.summary || '',
              status: 'success'
            } : r));
          } catch (error) {
            console.error(error);
            setResults(prev => prev.map(r => r.id === resultId ? {
              ...r,
              status: 'error',
              errorMessage: 'حدث خطأ أثناء تحليل السيرة الذاتية'
            } : r));
          }
        };
        reader.readAsDataURL(file);
      } catch (error) {
        setResults(prev => prev.map(r => r.id === resultId ? {
          ...r,
          status: 'error',
          errorMessage: 'فشل في قراءة الملف'
        } : r));
      }
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteResult = (id: string) => {
    setResults(results.filter(r => r.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200" dir="rtl">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h1 className="text-xl font-bold">نظام فحص السير الذاتية (HR Screening)</h1>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8">
        
        {/* Sidebar / Tabs */}
        <div className="w-full md:w-64 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">ملفات الوظائف</h2>
            <button
              onClick={handleCreateProfile}
              className="p-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
              title="إضافة وظيفة جديدة"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-2">
            {profiles.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">لا توجد وظائف مضافة. قم بإضافة وظيفة للبدء.</p>
            ) : (
              profiles.map(profile => (
                <div
                  key={profile.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors border",
                    activeProfileId === profile.id
                      ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700"
                  )}
                  onClick={() => setActiveProfileId(profile.id)}
                >
                  <span className="font-medium truncate">{profile.title || 'بدون عنوان'}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteProfile(profile.id);
                    }}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {!activeProfile ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center flex flex-col items-center justify-center h-full min-h-[400px]">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-4">
                <Briefcase className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">اختر أو أنشئ ملف وظيفة</h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-md">
                قم بإنشاء ملف وظيفة لتحديد المتطلبات والخبرات المطلوبة، ثم ابدأ برفع السير الذاتية لتحليلها ومطابقتها.
              </p>
              <button
                onClick={handleCreateProfile}
                className="mt-6 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                <span>إنشاء وظيفة جديدة</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Profile Details Form */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">تفاصيل ومتطلبات الوظيفة</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المسمى الوظيفي</label>
                    <input
                      type="text"
                      value={activeProfile.title}
                      onChange={(e) => handleUpdateProfile(activeProfile.id, { title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      placeholder="مثال: Senior Frontend Developer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المجال</label>
                    <input
                      type="text"
                      value={activeProfile.field}
                      onChange={(e) => handleUpdateProfile(activeProfile.id, { field: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      placeholder="مثال: هندسة البرمجيات"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">سنوات الخبرة المطلوبة</label>
                    <input
                      type="text"
                      value={activeProfile.experience}
                      onChange={(e) => handleUpdateProfile(activeProfile.id, { experience: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      placeholder="مثال: +5 سنوات"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المهارات الأساسية</label>
                    <input
                      type="text"
                      value={activeProfile.skills}
                      onChange={(e) => handleUpdateProfile(activeProfile.id, { skills: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      placeholder="مثال: React, TypeScript, Tailwind"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">متطلبات أخرى</label>
                    <textarea
                      value={activeProfile.otherRequirements}
                      onChange={(e) => handleUpdateProfile(activeProfile.id, { otherRequirements: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all min-h-[80px]"
                      placeholder="أي متطلبات إضافية..."
                    />
                  </div>
                </div>
              </div>

              {/* Upload Area */}
              <div 
                className="bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-blue-300 dark:border-blue-700 p-8 text-center hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  multiple 
                  accept=".pdf,text/plain"
                  onChange={handleFileUpload}
                />
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-semibold mb-2">ارفع السير الذاتية هنا</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  يمكنك رفع أكثر من ملف في نفس الوقت (PDF, TXT)
                </p>
              </div>

              {/* Results Grid */}
              {activeResults.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    نتائج الفحص ({activeResults.length})
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {activeResults.map(result => (
                      <div key={result.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm relative overflow-hidden">
                        {/* Status Indicator */}
                        <div className="absolute top-0 right-0 left-0 h-1 bg-gray-100 dark:bg-gray-700">
                          {result.status === 'processing' && (
                            <div className="h-full bg-blue-500 animate-pulse w-full"></div>
                          )}
                          {result.status === 'success' && (
                            <div className={cn("h-full w-full", result.score >= 80 ? "bg-green-500" : result.score >= 50 ? "bg-yellow-500" : "bg-red-500")}></div>
                          )}
                          {result.status === 'error' && (
                            <div className="h-full bg-red-500 w-full"></div>
                          )}
                        </div>

                        <div className="flex justify-between items-start mt-2 mb-4">
                          <div>
                            <h4 className="font-bold text-lg flex items-center gap-2">
                              {result.candidateName}
                              {result.status === 'processing' && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                              {result.status === 'success' && <CheckCircle className="w-4 h-4 text-green-500" />}
                              {result.status === 'error' && <XCircle className="w-4 h-4 text-red-500" />}
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]" title={result.fileName}>{result.fileName}</p>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            {result.status === 'success' && (
                              <div className="flex flex-col items-center">
                                <span className={cn(
                                  "text-2xl font-black",
                                  result.score >= 80 ? "text-green-600 dark:text-green-400" : 
                                  result.score >= 50 ? "text-yellow-600 dark:text-yellow-400" : 
                                  "text-red-600 dark:text-red-400"
                                )}>
                                  {result.score}%
                                </span>
                                <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">التطابق</span>
                              </div>
                            )}
                            <button 
                              onClick={() => handleDeleteResult(result.id)}
                              className="text-gray-400 hover:text-red-500 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {result.status === 'success' && (
                          <div className="space-y-4">
                            <div>
                              <h5 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">أهم المميزات</h5>
                              <ul className="flex flex-wrap gap-2">
                                {result.strengths.map((strength, i) => (
                                  <li key={i} className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-md border border-blue-100 dark:border-blue-800">
                                    {strength}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <h5 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">ملخص</h5>
                              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                {result.summary}
                              </p>
                            </div>
                          </div>
                        )}

                        {result.status === 'error' && (
                          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-md text-sm">
                            {result.errorMessage}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
