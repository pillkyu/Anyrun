"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Lock, ArrowRight, Activity } from 'lucide-react';

export default function LoginPage() {
    const [nickname, setNickname] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    // Redirect if already logged in
    useEffect(() => {
        if (localStorage.getItem('user')) {
            router.push('/');
        }
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (nickname && password) {
            setIsLoading(true);
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nickname, password })
                });

                if (res.ok) {
                    const data = await res.json();
                    localStorage.setItem('user', JSON.stringify(data.user));
                    localStorage.setItem('token', data.token);
                    router.push('/');
                } else {
                    const errData = await res.json();
                    setError(errData.detail || '로그인에 실패했습니다.');
                    setIsLoading(false);
                }
            } catch {
                setError('서버 연결 오류가 발생했습니다. 백엔드 서버가 실행 중인지 확인해주세요.');
                setIsLoading(false);
            }
        }
    };

    return (
        <div className="flex-1 flex min-h-screen items-center justify-center p-4 relative overflow-hidden bg-[#0f172a]">
            {/* Dynamic Background Gradients */}
            <div className="absolute fixed top-[-20%] left-[-10%] w-[60%] h-[60%] bg-brand-600/20 blur-[130px] rounded-full pointer-events-none animate-pulse" style={{ animationDuration: '4s' }} />
            <div className="absolute fixed bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-purple-600/20 blur-[130px] rounded-full pointer-events-none animate-pulse" style={{ animationDuration: '5s' }} />

            <div className="card-container w-full max-w-md relative z-10 p-8 border border-white/5 bg-[#1e293b]/80 backdrop-blur-xl">
                <div className="flex justify-center mb-6">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-purple-500 flex items-center justify-center shadow-lg shadow-brand-500/30">
                        <Activity className="h-8 w-8 text-white" />
                    </div>
                </div>

                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">오픈 러닝</h1>
                    <p className="text-slate-400 text-sm">다시 오신 것을 환영합니다</p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-400 ml-1 uppercase tracking-wider">닉네임</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <User className="h-5 w-5 text-slate-500 group-focus-within:text-brand-500 transition-colors" />
                            </div>
                            <input
                                type="text"
                                placeholder="닉네임을 입력하세요"
                                className="input-field pl-11 bg-[#0f172a]/50 border-white/5 focus:border-brand-500/50"
                                value={nickname}
                                onChange={(e) => setNickname(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-400 ml-1 uppercase tracking-wider">비밀번호</label>
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

                    <button
                        type="submit"
                        disabled={isLoading || !nickname || !password}
                        className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 mt-4 rounded-xl text-sm font-semibold tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <span className="animate-pulse">접속 중...</span>
                        ) : (
                            <>
                                <span>Let&apos;s Run!</span>
                                <ArrowRight className="h-4 w-4" />
                            </>
                        )}
                    </button>

                    <div className="text-center mt-4 pt-4 border-t border-white/5">
                        <button
                            type="button"
                            onClick={() => router.push('/register')}
                            className="text-slate-400 hover:text-white transition-colors text-sm"
                        >
                            Join us! (회원가입)
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
