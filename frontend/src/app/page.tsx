"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format, isPast, addDays, addHours } from 'date-fns';
import { LogOut, Plus, Users as UsersIcon, MapPin, Calendar, Info, Check, X, User } from 'lucide-react';

// --- Types ---
type SessionType = 'fixed' | 'custom';
interface Session {
  id: string;
  title: string;
  type: SessionType;
  location: string;
  event_time: Date;
  max_participants: number;
  created_by: string;
}

interface Attendee {
  id: string;
  session_id: string;
  user_id: string;
  user_nickname: string;
  time_preference?: 'morning' | 'afternoon';
}

interface UserData {
  id: string;
  nickname: string;
  name?: string;
}

// --- Initial Mock Data ---
const INITIAL_SESSIONS: Session[] = [];
const INITIAL_ATTENDEES: Attendee[] = [];

export default function DashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);

  // App State
  const [sessions, setSessions] = useState<Session[]>(INITIAL_SESSIONS);
  const [attendees, setAttendees] = useState<Attendee[]>(INITIAL_ATTENDEES);

  // UI State
  const [isClient, setIsClient] = useState(false);
  const [infoModalSessionId, setInfoModalSessionId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Mounted check to prevent hydration mismatch
  useEffect(() => {
    setIsClient(true);
    const stored = localStorage.getItem('user');
    if (!stored) {
      router.push('/login');
    } else {
      setCurrentUser(JSON.parse(stored));
      fetchSessions();
    }
  }, [router]);

  const fetchSessions = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/sessions`);
      if (res.ok) {
        const data = await res.json();
        setSessions([...data.fixed, ...data.custom]);

        // Fetch attendees for all sessions (in a real app, this might be a single bulk endpoint or joined in the session query)
        // For simplicity, we'll fetch them individually or the backend handles it.
        // Let's modify the backend to return basic attendee data or just use the current participants count.
        // Right now the backend returns current_participants on the session object.
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    }

    // In our mock backend, attendees aren't returned globally yet, so we'll fetch them when needed or just rely on the count for now.
    // Actually, we need to know if the CURRENT user has joined.
    // The easiest way for a prototype is to just keep attendees locally or add a 'joined' boolean to the backend response.
    // For this prototype, I'll let the user manage local state for immediately joined appearance, 
    // but actual joins will ping the backend.
  };

  if (!isClient || !currentUser) return <div className="min-h-screen bg-[#0f172a] text-slate-50 flex items-center justify-center">Loading...</div>;

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/login');
  };

  const handleJoin = async (sessionId: string, timePref?: 'morning' | 'afternoon') => {
    if (!currentUser) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/sessions/${sessionId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id || currentUser.nickname, // Fallback if id is missing in older mock data
          nickname: currentUser.nickname,
          name: currentUser.name || '', // Need to ensure currentUser actually has name for this prototype
          time_preference: timePref
        })
      });

      if (res.ok) {
        const data = await res.json();
        setAttendees([...attendees, data.attendee]);
        // Refresh sessions to get updated count
        fetchSessions();
      } else {
        const errData = await res.json();
        alert(errData.detail || '참여에 실패했습니다.');
      }
    } catch (err) {
      alert('서버 오류가 발생했습니다.');
    }
  };

  const handleCancel = async (sessionId: string) => {
    if (!currentUser) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/sessions/${sessionId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id || currentUser.nickname
        })
      });

      if (res.ok) {
        setAttendees(attendees.filter(a => !(a.session_id === sessionId && a.user_id === (currentUser.id || currentUser.nickname))));
        fetchSessions();
      } else {
        const errData = await res.json();
        alert(errData.detail || '취소에 실패했습니다.');
      }
    } catch (err) {
      alert('서버 오류가 발생했습니다.');
    }
  };

  // Filter out expired custom sessions
  const activeSessions = sessions.filter(s => {
    if (s.type === 'custom' && isPast(new Date(s.event_time))) return false;
    return true; // Keep all fixed sessions (in real app, fixed sessions would just update their dates automatically)
  });

  const fixedSessions = activeSessions.filter(s => s.type === 'fixed');
  const customSessions = activeSessions.filter(s => s.type === 'custom');

  // --- Components ---
  const SessionCard = ({ session }: { session: Session }) => {
    const sessionAttendees = attendees.filter(a => a.session_id === session.id);
    const isJoined = sessionAttendees.some(a => a.user_id === currentUser.id);
    const isFull = sessionAttendees.length >= session.max_participants;
    const expired = isPast(new Date(session.event_time));

    // Handle time preference select for fixed sessions
    const [timePref, setTimePref] = useState<'morning' | 'afternoon'>('morning');

    return (
      <div className="card-container flex flex-col h-full group">
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md mb-2 inline-block ${session.type === 'fixed' ? 'bg-brand-500/20 text-brand-300' : 'bg-purple-500/20 text-purple-300'}`}>
              {session.type === 'fixed' ? '정규 세션' : '자율 세션'}
            </span>
            <h3 className="text-xl font-bold text-white group-hover:text-brand-400 transition-colors">{session.title}</h3>
          </div>
          <button
            onClick={() => setInfoModalSessionId(session.id)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
            title="참여자 정보"
          >
            <Info className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2 mb-6 flex-1 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-brand-500" />
            <span>{session.type === 'fixed' ? '평일 오전 08시 30분' : format(new Date(session.event_time), 'yyyy년 MM월 dd일 HH:mm')}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-brand-500" />
            <span>{session.type === 'fixed' ? '대운동장' : session.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <UsersIcon className="w-4 h-4 text-brand-500" />
            {session.type === 'fixed' ? (
              <span>{sessionAttendees.length} 명 참여 (정원 제한 없음)</span>
            ) : (
              <>
                <span>{sessionAttendees.length} / {session.max_participants} 명 참여</span>
                {isFull && <span className="text-red-400 text-xs ml-auto bg-red-500/10 px-2 py-0.5 rounded">마감</span>}
              </>
            )}
          </div>
        </div>

        {session.type === 'fixed' && !isJoined && !expired && !isFull && (
          <div className="mb-4 flex gap-2">
            <button
              onClick={() => setTimePref('morning')}
              className={`flex-1 py-1 rounded-md text-sm transition-colors border ${timePref === 'morning' ? 'bg-brand-500/20 border-brand-500 text-white' : 'border-white/10 text-slate-400'}`}
            >
              오전
            </button>
            <button
              onClick={() => setTimePref('afternoon')}
              className={`flex-1 py-1 rounded-md text-sm transition-colors border ${timePref === 'afternoon' ? 'bg-brand-500/20 border-brand-500 text-white' : 'border-white/10 text-slate-400'}`}
            >
              오후
            </button>
          </div>
        )}

        {isJoined ? (
          <button onClick={() => handleCancel(session.id)} className="btn-danger w-full flex items-center justify-center gap-2">
            <X className="w-4 h-4" /> 취소하기
          </button>
        ) : (
          <button
            onClick={() => handleJoin(session.id, session.type === 'fixed' ? timePref : undefined)}
            disabled={isFull || expired}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4" /> {expired ? '종료됨' : isFull ? '정원 초과' : '참여하기'}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 max-w-7xl mx-auto w-full relative">
      {/* Header */}
      <header className="flex justify-between items-center mb-10 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">AnyRun</h1>
          <p className="text-sm text-slate-400">안녕하세요, <span className="text-brand-400 font-semibold">{currentUser.nickname}</span>님!</p>
        </div>
        <button onClick={handleLogout} className="flex flex-col md:flex-row items-center gap-2 text-slate-400 hover:text-white transition-colors">
          <LogOut className="w-5 h-5" />
          <span className="text-sm hidden md:inline">로그아웃</span>
        </button>
      </header>

      {/* Main Split Layout */}
      <div className="flex flex-col lg:flex-row gap-8 flex-1">
        {/* Left/Top: Fixed Sessions */}
        <section className="flex-1 lg:max-w-[40%]">
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="w-2 h-6 bg-brand-500 rounded-full"></span>
              정규 세션
            </h2>
          </div>
          <div className="space-y-4">
            {fixedSessions.length === 0 ? (
              <p className="text-slate-500 text-sm">현재 등록된 정규 세션이 없습니다.</p>
            ) : (
              fixedSessions.map(session => <SessionCard key={session.id} session={session} />)
            )}
          </div>
        </section>

        {/* Vertical Divider for Desktop */}
        <div className="hidden lg:block w-px bg-white/5 mx-4" />

        {/* Right/Bottom: Custom Sessions */}
        <section className="flex-1">
          <div className="mb-6 flex justify-between items-center pb-2">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="w-2 h-6 bg-purple-500 rounded-full"></span>
              자율 세션
            </h2>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="bg-brand-600 hover:bg-brand-500 text-white text-sm px-4 py-2 rounded-xl transition-all shadow-lg flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> 세션 만들기
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customSessions.length === 0 ? (
              <p className="text-slate-500 text-sm col-span-2 text-center py-10 border border-dashed border-white/10 rounded-2xl">
                진행 중인 자율 세션이 없습니다.<br />새로운 세션을 만들어보세요!
              </p>
            ) : (
              customSessions.map(session => <SessionCard key={session.id} session={session} />)
            )}
          </div>
        </section>
      </div>

      {/* Info Modal (Floating Window) */}
      {infoModalSessionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setInfoModalSessionId(null)} />
          <div className="bg-[#1e293b] border border-white/10 p-6 rounded-2xl w-full max-w-sm relative z-10 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <UsersIcon className="w-5 h-5 text-brand-400" /> 참여자 목록
            </h3>
            <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-2">
              <SessionAttendeesList sessionId={infoModalSessionId} />
            </div>
            <button onClick={() => setInfoModalSessionId(null)} className="mt-6 w-full btn-secondary">닫기</button>
          </div>
        </div>
      )}

      {/* Create Session Modal */}
      {createModalOpen && (
        <CreateSessionModal
          onClose={() => setCreateModalOpen(false)}
          onCreate={async (newSession) => {
            try {
              const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/sessions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  ...newSession,
                  event_time: newSession.event_time.toISOString(),
                  type: 'custom',
                  created_by: currentUser.id || currentUser.nickname,
                  creator_nickname: currentUser.nickname,
                  creator_name: currentUser.name || ''
                })
              });

              if (res.ok) {
                const data = await res.json();
                setSessions([...sessions, data.session]);
                setCreateModalOpen(false);
                fetchSessions(); // Refresh list to get accurate counts
              } else {
                alert('세션 생성에 실패했습니다.');
              }
            } catch {
              alert('서버 연결 오류');
            }
          }}
        />
      )}
    </div>
  );
}

function SessionAttendeesList({ sessionId }: { sessionId: string }) {
  const [fetchedAttendees, setFetchedAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAttendees = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/sessions/${sessionId}/attendees`);
        if (res.ok) {
          const data = await res.json();
          setFetchedAttendees(data.attendees);
        }
      } catch {
        // console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAttendees();
  }, [sessionId]);

  if (loading) return <p className="text-slate-500 text-sm text-center py-4">로딩 중...</p>;
  if (fetchedAttendees.length === 0) return <p className="text-slate-500 text-sm text-center py-4">아직 참여자가 없습니다.</p>;

  return (
    <>
      {fetchedAttendees.map(a => (
        <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-600 to-purple-500 flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">{a.user_nickname}</p>
            {a.time_preference && (
              <p className="text-xs text-brand-400 border border-brand-500/30 bg-brand-500/10 px-1.5 py-0.5 mt-1 rounded inline-block">
                {a.time_preference === 'morning' ? '오전' : '오후'}
              </p>
            )}
          </div>
        </div>
      ))}
    </>
  );
}

// Simple separate component for creating a session
function CreateSessionModal({ onClose, onCreate }: { onClose: () => void, onCreate: (session: { title: string; location: string; event_time: Date; max_participants: number }) => void }) {
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');

  // Custom Date/Time State
  const today = new Date();
  const [month, setMonth] = useState((today.getMonth() + 1).toString().padStart(2, '0'));
  const [day, setDay] = useState(today.getDate().toString().padStart(2, '0'));
  const [hour, setHour] = useState('19'); // Default 7 PM
  const [minute, setMinute] = useState('00');

  const [maxParticipants, setMaxParticipants] = useState('4');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const currentYear = new Date().getFullYear();
    const dateStr = `${currentYear}-${month}-${day}T${hour}:${minute}:00`;
    onCreate({
      title,
      location,
      event_time: new Date(dateStr),
      max_participants: parseInt(maxParticipants, 10)
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-[#1e293b] border border-white/10 p-6 rounded-2xl w-full max-w-md relative z-10 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">자율 세션 만들기</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">제목</label>
            <input required type="text" className="input-field" value={title} onChange={e => setTitle(e.target.value)} placeholder="예: 한강 야간 러닝" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">장소</label>
            <input required type="text" className="input-field" value={location} onChange={e => setLocation(e.target.value)} placeholder="예: 반포대교 남단" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">시간 설정</label>
            <div className="flex gap-2">
              {/* Month */}
              <div className="flex-1 relative">
                <select className="input-field appearance-none pl-3 pr-8" value={month} onChange={e => setMonth(e.target.value)}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m.toString().padStart(2, '0')}>{m}월</option>
                  ))}
                </select>
              </div>
              {/* Day */}
              <div className="flex-1 relative">
                <select className="input-field appearance-none pl-3 pr-8" value={day} onChange={e => setDay(e.target.value)}>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                    <option key={d} value={d.toString().padStart(2, '0')}>{d}일</option>
                  ))}
                </select>
              </div>
              {/* Hour */}
              <div className="flex-1 relative">
                <select className="input-field appearance-none pl-3 pr-8" value={hour} onChange={e => setHour(e.target.value)}>
                  {Array.from({ length: 24 }, (_, i) => i).map(h => (
                    <option key={h} value={h.toString().padStart(2, '0')}>{h}시</option>
                  ))}
                </select>
              </div>
              {/* Minute */}
              <div className="flex-1 relative">
                <select className="input-field appearance-none pl-3 pr-8" value={minute} onChange={e => setMinute(e.target.value)}>
                  {['00', '10', '20', '30', '40', '50'].map(min => (
                    <option key={min} value={min}>{min}분</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">모집 인원 ({maxParticipants}명)</label>
            <input type="range" min="2" max="20" className="w-full accent-brand-500" value={maxParticipants} onChange={e => setMaxParticipants(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary w-full mt-4">생성하기</button>
        </form>
      </div>
    </div>
  );
}
