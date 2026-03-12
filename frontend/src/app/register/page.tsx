"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Lock, ArrowRight, UserPlus, CheckCircle2 } from 'lucide-react';

export default function RegisterPage() {
    const [nickname, setNickname] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [session, setSession] = useState('오전');
    const [runningLevel, setRunningLevel] = useState('입문');
    const [timePreferences, setTimePreferences] = useState<string[]>([]);
    const [goal, setGoal] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    // Redirect if already logged in
    useEffect(() => {
        if (localStorage.getItem('user')) {
            router.push('/');
        }
    }, [router]);

    const handleTimePreferenceToggle = (pref: string) => {
        setTimePreferences(prev =>
            prev.includes(pref) ? prev.filter(p => p !== pref) : [...prev, pref]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (nickname && password && name && session && runningLevel) {
            setIsLoading(true);
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        nickname,
                        password,
                        name,
                        session,
                        running_level: runningLevel,
                        time_preferences: timePreferences,
                        goal
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    localStorage.setItem('user', JSON.stringify(data.user));
                    localStorage.setItem('token', data.token);
                    router.push('/');
                } else {
                    const errData = await res.json();
                    setError(errData.detail || '회원가입에 실패했습니다.');
                    setIsLoading(false);
                }
            } catch {
                setError('서버 연결 오류가 발생했습니다. 백엔드 서버가 켜져 있는지 확인해주세요.');
                setIsLoading(false);
            }
        }
    };

    return (
        <div className="flex-1 flex min-h-screen items-center justify-center p-4 relative overflow-hidden bg-[#0f172a]">
            {/* Dynamic Background Gradients */}
            <div className="absolute fixed top-[-20%] left-[-10%] w-[60%] h-[60%] bg-brand-600/20 blur-[130px] rounded-full pointer-events-none animate-pulse" style={{ animationDuration: '4s' }} />
            <div className="absolute fixed bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-purple-600/20 blur-[130px] rounded-full pointer-events-none animate-pulse" style={{ animationDuration: '5s' }} />

            <div className="card-container w-full max-w-md relative z-10 p-8 border border-white/5 bg-[#1e293b]/80 backdrop-blur-xl my-8">
                <div className="flex justify-center mb-6">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-purple-500 flex items-center justify-center shadow-lg shadow-brand-500/30">
                        <UserPlus className="h-8 w-8 text-white" />
                    </div>
                </div>

                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                        회원가입
                    </h1>
                    <p className="text-slate-400 text-sm">
                        함께 달릴 친구를 찾아보세요
                    </p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-400 ml-1 uppercase tracking-wider">이름 *</label>
                        <input
                            type="text"
                            placeholder="실명을 입력하세요"
                            className="input-field bg-[#0f172a]/50 border-white/5 focus:border-brand-500/50"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-400 ml-1 uppercase tracking-wider">세션 *</label>
                        <select
                            className="input-field bg-[#0f172a]/50 border-white/5 focus:border-brand-500/50 appearance-none"
                            value={session}
                            onChange={(e) => setSession(e.target.value)}
                            required
                        >
                            <option value="오전">오전 세션</option>
                            <option value="오후">오후 세션</option>
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-400 ml-1 uppercase tracking-wider">닉네임 *</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <User className="h-5 w-5 text-slate-500 group-focus-within:text-brand-500 transition-colors" />
                            </div>
                            <input
                                type="text"
                                placeholder="사용할 닉네임 (아이디 역할)"
                                className="input-field pl-11 bg-[#0f172a]/50 border-white/5 focus:border-brand-500/50"
                                value={nickname}
                                onChange={(e) => setNickname(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-400 ml-1 uppercase tracking-wider">비밀번호 *</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-brand-500 transition-colors" />
                            </div>
                            <input
                                type="password"
                                placeholder="••••••••"
                                className="input-field pl-11 bg-[#0f172a]/50 border-white/5 focus:border-brand-500/50"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-white/5 mt-4">
                        <label className="text-xs font-medium text-slate-400 ml-1 uppercase tracking-wider">내 달리기 실력 *</label>
                        <div className="grid grid-cols-1 gap-2">
                            {[
                                { val: '입문', label: '1km 뛰기도 벅차요' },
                                { val: '초보', label: '1~3km은 쉬지 않고 달려요' },
                                { val: '중급', label: '3~5km 정도는 쉬지 않고 달려요' },
                                { val: '고급', label: '그냥 잘 뛰어요' },
                            ].map(level => (
                                <label key={level.val} className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all ${runningLevel === level.val ? 'bg-brand-500/10 border-brand-500 text-white' : 'bg-[#0f172a]/50 border-white/5 text-slate-400 hover:border-white/10'}`}>
                                    <input
                                        type="radio"
                                        name="runningLevel"
                                        value={level.val}
                                        checked={runningLevel === level.val}
                                        onChange={() => setRunningLevel(level.val)}
                                        className="hidden"
                                    />
                                    <div className="flex justify-between w-full items-center">
                                        <div>
                                            <span className="font-medium mr-2">{level.val}</span>
                                            <span className="text-xs opacity-70">{level.label}</span>
                                        </div>
                                        {runningLevel === level.val && <CheckCircle2 className="h-4 w-4 text-brand-500" />}
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2 pt-2">
                        <label className="text-xs font-medium text-slate-400 ml-1 uppercase tracking-wider">선호하는 시간 (선택)</label>
                        <div className="grid grid-cols-2 gap-2">
                            {['기상 직후', '오전시간', '오후시간', '야간'].map(pref => (
                                <label key={pref} className={`flex items-center justify-center p-2 rounded-xl border cursor-pointer transition-all text-sm ${timePreferences.includes(pref) ? 'bg-purple-500/20 border-purple-500 text-white' : 'bg-[#0f172a]/50 border-white/5 text-slate-400 hover:border-white/10'}`}>
                                    <input
                                        type="checkbox"
                                        checked={timePreferences.includes(pref)}
                                        onChange={() => handleTimePreferenceToggle(pref)}
                                        className="hidden"
                                    />
                                    {pref}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-1 pt-2">
                        <label className="text-xs font-medium text-slate-400 ml-1 uppercase tracking-wider">내 목표 (선택)</label>
                        <input
                            type="text"
                            placeholder="올해 10km 완주 등"
                            className="input-field bg-[#0f172a]/50 border-white/5 focus:border-brand-500/50"
                            value={goal}
                            onChange={(e) => setGoal(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || !nickname || !password || !name || !session || !runningLevel}
                        className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 mt-4 rounded-xl text-sm font-semibold tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <span className="animate-pulse">가입 중...</span>
                        ) : (
                            <>
                                <span>회원가입 완료</span>
                                <ArrowRight className="h-4 w-4" />
                            </>
                        )}
                    </button>

                    <div className="text-center mt-4 pt-4 border-t border-white/5">
                        <button
                            type="button"
                            onClick={() => router.push('/login')}
                            className="text-slate-400 hover:text-white transition-colors text-sm"
                        >
                            이미 계정이 있으신가요? (로그인)
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
