"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format, isPast, addDays, addHours } from 'date-fns';
import { LogOut, Plus, Users as UsersIcon, MapPin, Calendar, Info, Check, X, User, AlertCircle, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// --- Types ---
type SessionType = 'fixed' | 'custom';
interface Session {
  id: string;
  title: string;
  type: SessionType;
  location: string;
  event_time: string | Date;
  max_participants: number;
  created_by: string;
  host_nickname?: string;
  current_participants?: number;
}

interface Attendee {
  id: string;
  session_id: string;
  user_id: string;
  user_nickname: string;
  time_preference?: 'morning' | 'afternoon';
}

export default function DashboardPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState<string | null>(null);
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [tempNickname, setTempNickname] = useState('');

  // App State
  const [sessions, setSessions] = useState<Session[]>([]);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);

  // UI State
  const [isClient, setIsClient] = useState(false);
  const [infoModalSessionId, setInfoModalSessionId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const storedNickname = localStorage.getItem('nickname');
    if (!storedNickname) {
      setShowNicknameModal(true);
    } else {
      setNickname(storedNickname);
    }
  }, []);

  useEffect(() => {
    if (nickname) {
      fetchSessions();
      fetchAttendees();
    }
  }, [nickname]);

  const fetchSessions = async () => {
    setLoading(true);
    const { data: dbSessions, error } = await supabase
      .from('sessions')
      .select('*')
      .order('event_time', { ascending: true });

    if (error) {
      console.error('Error fetching sessions:', error);
    } else {
      setSessions(dbSessions || []);
    }
    setLoading(false);
  };

  const fetchAttendees = async () => {
    const { data, error } = await supabase
      .from('attendees')
      .select('*, sessions(id)');
    
    if (error) {
       console.error('Error fetching attendees:', error);
    } else {
       // Format or store as needed
       setAttendees(data as any || []);
    }
  };

  const handleNicknameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempNickname.trim()) {
      localStorage.setItem('nickname', tempNickname.trim());
      setNickname(tempNickname.trim());
      setShowNicknameModal(false);
    }
  };

  const handleJoin = async (sessionId: string, timePref?: 'morning' | 'afternoon') => {
    if (!nickname) return;

    // Check if already joined
    const alreadyJoined = attendees.some(a => a.session_id === sessionId && a.user_id === nickname);
    if (alreadyJoined) {
      alert("이미 참여 중인 세션입니다.");
      return;
    }

    const { error } = await supabase
      .from('attendees')
      .insert({
        session_id: sessionId,
        user_id: nickname,
        user_nickname: nickname,
        time_preference: timePref
      });

    if (error) {
      alert("참여에 실패했습니다: " + error.message);
    } else {
      fetchSessions();
      fetchAttendees();
    }
  };

  const handleCancel = async (sessionId: string) => {
    if (!nickname) return;

    const { error } = await supabase
      .from('attendees')
      .delete()
      .eq('session_id', sessionId)
      .eq('user_id', nickname);

    if (error) {
      alert("취소에 실패했습니다: " + error.message);
    } else {
      fetchSessions();
      fetchAttendees();
    }
  };

  if (!isClient) return null;

  const activeSessions = sessions.filter(s => {
    if (s.type === 'custom' && isPast(new Date(s.event_time))) return false;
    return true;
  });

  const fixedSessions = activeSessions.filter(s => s.type === 'fixed');
  const customSessions = activeSessions.filter(s => s.type === 'custom');

  // --- Components ---
  const SessionCard = ({ session }: { session: Session }) => {
    const sessionAttendees = attendees.filter(a => a.session_id === session.id);
    const isJoined = sessionAttendees.some(a => a.user_id === nickname);
    const isFull = session.type === 'custom' && sessionAttendees.length >= session.max_participants;
    const expired = isPast(new Date(session.event_time));
    const [timePref, setTimePref] = useState<'morning' | 'afternoon'>('morning');

    return (
      <div className="card-container flex flex-col h-full group bg-slate-800/40 border border-white/5 p-6 rounded-2xl hover:border-brand-500/30 transition-all">
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md mb-2 inline-block ${session.type === 'fixed' ? 'bg-brand-500/20 text-brand-300' : 'bg-purple-500/20 text-purple-300'}`}>
              {session.type === 'fixed' ? '정규 세션' : '자율 세션'}
            </span>
            <h3 className="text-xl font-bold text-white group-hover:text-brand-400 transition-colors">{session.title}</h3>
            {session.host_nickname && (
               <p className="text-xs text-slate-500 mt-1">주최자: <span className="text-slate-300">{session.host_nickname}</span></p>
            )}
          </div>
          <button
            onClick={() => setInfoModalSessionId(session.id)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
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
            <span>{session.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <UsersIcon className="w-4 h-4 text-brand-500" />
            <span>{sessionAttendees.length}{session.type === 'custom' ? ` / ${session.max_participants}` : ''} 명 참여</span>
          </div>
        </div>

        {session.type === 'fixed' && !isJoined && !expired && (
          <div className="mb-4 flex gap-2">
            <button onClick={() => setTimePref('morning')} className={`flex-1 py-1 rounded-md text-sm border ${timePref === 'morning' ? 'bg-brand-500/20 border-brand-500 text-white' : 'border-white/10 text-slate-400'}`}>오전</button>
            <button onClick={() => setTimePref('afternoon')} className={`flex-1 py-1 rounded-md text-sm border ${timePref === 'afternoon' ? 'bg-brand-500/20 border-brand-500 text-white' : 'border-white/10 text-slate-400'}`}>오후</button>
          </div>
        )}

        {isJoined ? (
          <button onClick={() => handleCancel(session.id)} className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl transition-all flex items-center justify-center gap-2">
            <X className="w-4 h-4" /> 참여 취소
          </button>
        ) : (
          <button
            onClick={() => handleJoin(session.id, session.type === 'fixed' ? timePref : undefined)}
            disabled={isFull || expired}
            className="w-full py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Check className="w-4 h-4" /> {expired ? '종료됨' : isFull ? '정원 초과' : '참여하기'}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-50 flex flex-col">
      {/* Nickname Modal Overlay */}
      {showNicknameModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#1e293b] border border-white/10 p-8 rounded-3xl w-full max-w-sm shadow-2xl">
            <h2 className="text-2xl font-bold mb-2">반갑습니다!</h2>
            <p className="text-slate-400 text-sm mb-6">사용하실 닉네임을 입력해주세요.</p>
            <form onSubmit={handleNicknameSubmit}>
              <input
                autoFocus
                required
                type="text"
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 mb-4 focus:border-brand-500 outline-none transition-all"
                placeholder="닉네임 입력"
                value={tempNickname}
                onChange={e => setTempNickname(e.target.value)}
              />
              <button type="submit" className="w-full py-3 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl transition-all">
                시작하기
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col p-4 md:p-8 max-w-7xl mx-auto w-full">
        {/* Header */}
        <header className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-black italic tracking-tighter text-white">ANYRUN</h1>
            <p className="text-sm text-brand-400 font-medium">Hello, {nickname || 'Runner'}</p>
          </div>
          {nickname && (
            <button 
                onClick={() => { localStorage.removeItem('nickname'); window.location.reload(); }}
                className="p-2 text-slate-400 hover:text-white transition-colors"
                title="닉네임 변경"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </header>

        {/* Rules Section */}
        <section className="mb-10 bg-gradient-to-br from-brand-600/20 to-purple-600/20 border border-brand-500/20 rounded-3xl p-6 relative overflow-hidden">
            <div className="relative z-10">
                <h2 className="text-xl font-bold flex items-center gap-2 mb-3">
                    <ShieldCheck className="w-5 h-5 text-brand-400" />
                    이용 규칙 및 안내
                </h2>
                <ul className="space-y-2 text-sm text-slate-300">
                    <li className="flex gap-2">
                        <span className="text-brand-400 font-bold">•</span>
                        <span>정규 세션은 평일 오전 8시 30분 대운동장에서 진행됩니다.</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="text-brand-400 font-bold">•</span>
                        <span>자율 세션은 누구나 자유롭게 생성하고 참여할 수 있습니다.</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="text-brand-400 font-bold">•</span>
                        <span>참여가 어려울 경우 다른 분들을 위해 반드시 참여 취소를 해주세요.</span>
                    </li>
                    <li className="flex gap-2 text-brand-300 font-medium">
                        <span className="text-brand-400 font-bold">•</span>
                        <span>매너 있는 러닝 문화를 함께 만들어가요!</span>
                    </li>
                </ul>
            </div>
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-brand-500/10 blur-3xl rounded-full" />
        </section>

        {/* Main Content */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">Loading...</div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-10">
            {/* Left: Fixed */}
            <div className="flex-1 lg:max-w-md">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <span className="w-2 h-6 bg-brand-500 rounded-full" />
                정규 세션
              </h2>
              <div className="space-y-4">
                {fixedSessions.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-10 border border-dashed border-white/5 rounded-2xl">등록된 정규 세션이 없습니다.</p>
                ) : (
                  fixedSessions.map(s => <SessionCard key={s.id} session={s} />)
                )}
              </div>
            </div>

            {/* Right: Custom */}
            <div className="flex-1">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <span className="w-2 h-6 bg-purple-500 rounded-full" />
                  자율 세션
                </h2>
                <button
                  onClick={() => setCreateModalOpen(true)}
                  className="bg-brand-600 hover:bg-brand-500 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-brand-900/20 flex items-center gap-2 text-sm"
                >
                  <Plus className="w-4 h-4" /> 세션 만들기
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customSessions.length === 0 ? (
                  <div className="col-span-full py-20 text-center border border-dashed border-white/5 rounded-3xl">
                    <p className="text-slate-500 text-sm mb-4">현재 진행 중인 자율 세션이 없습니다.</p>
                  </div>
                ) : (
                  customSessions.map(s => <SessionCard key={s.id} session={s} />)
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info Modal */}
      {infoModalSessionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setInfoModalSessionId(null)} />
          <div className="bg-[#1e293b] border border-white/10 p-6 rounded-2xl w-full max-w-sm relative z-10 shadow-2xl animate-in zoom-in duration-200">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 border-b border-white/5 pb-4">
              <UsersIcon className="w-5 h-5 text-brand-400" /> 참여자 정보
            </h3>
            <div className="max-h-[50vh] overflow-y-auto space-y-3 pr-2">
              <SessionAttendeesList sessionId={infoModalSessionId} attendees={attendees} />
            </div>
            <button onClick={() => setInfoModalSessionId(null)} className="mt-8 w-full py-3 bg-slate-700 hover:bg-slate-600 rounded-xl transition-all">닫기</button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {createModalOpen && (
        <CreateSessionModal
          onClose={() => setCreateModalOpen(false)}
          onCreate={async (newSession) => {
            const { data, error } = await supabase
              .from('sessions')
              .insert({
                ...newSession,
                type: 'custom',
                created_by: nickname,
                host_nickname: nickname
              })
              .select();

            if (error) {
              alert("세션 생성 실패: " + error.message);
            } else if (data && data[0]) {
              // Auto join host
              await supabase.from('attendees').insert({
                session_id: data[0].id,
                user_id: nickname,
                user_nickname: nickname
              });
              setCreateModalOpen(false);
              fetchSessions();
              fetchAttendees();
            }
          }}
        />
      )}
    </div>
  );
}

function SessionAttendeesList({ sessionId, attendees }: { sessionId: string, attendees: Attendee[] }) {
  const sessionAttendees = attendees.filter(a => a.session_id === sessionId);
  
  if (sessionAttendees.length === 0) return <p className="text-slate-500 text-sm text-center py-4">아직 참여자가 없습니다.</p>;

  return (
    <>
      {sessionAttendees.map((a, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/40 border border-white/5">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-600 to-purple-500 flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">{a.user_nickname}</p>
            {a.time_preference && (
              <span className="text-[10px] text-brand-400 border border-brand-500/30 bg-brand-500/5 px-2 py-0.5 rounded-full mt-1 inline-block">
                {a.time_preference === 'morning' ? '오전 참여' : '오후 참여'}
              </span>
            )}
          </div>
        </div>
      ))}
    </>
  );
}

function CreateSessionModal({ onClose, onCreate }: { onClose: () => void, onCreate: (session: any) => void }) {
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [month, setMonth] = useState('03');
  const [day, setDay] = useState('14');
  const [hour, setHour] = useState('19');
  const [minute, setMinute] = useState('00');
  const [maxParticipants, setMaxParticipants] = useState('4');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const currentYear = new Date().getFullYear();
    const isoDate = `${currentYear}-${month}-${day}T${hour}:${minute}:00Z`;
    onCreate({
      title,
      location,
      event_time: isoDate,
      max_participants: parseInt(maxParticipants, 10)
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-[#1e293b] border border-white/10 p-8 rounded-3xl w-full max-w-md relative z-10 shadow-2xl">
        <h3 className="text-2xl font-bold mb-6">자율 세션 만들기</h3>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 mb-2 block uppercase tracking-wider font-bold">세션 제목</label>
            <input required type="text" className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand-500 transition-all" value={title} onChange={e => setTitle(e.target.value)} placeholder="예: 한강 야간 러닝" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-2 block uppercase tracking-wider font-bold">활동 장소</label>
            <input required type="text" className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand-500 transition-all" value={location} onChange={e => setLocation(e.target.value)} placeholder="예: 반포대교 남단" />
          </div>
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">월</label>
              <select className="w-full bg-slate-900/50 border border-white/10 rounded-lg p-2 outline-none text-sm" value={month} onChange={e => setMonth(e.target.value)}>
                {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')).map(m => (<option key={m} value={m}>{m}월</option>))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">일</label>
              <select className="w-full bg-slate-900/50 border border-white/10 rounded-lg p-2 outline-none text-sm" value={day} onChange={e => setDay(e.target.value)}>
                {Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0')).map(d => (<option key={d} value={d}>{d}일</option>))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">시</label>
              <select className="w-full bg-slate-900/50 border border-white/10 rounded-lg p-2 outline-none text-sm" value={hour} onChange={e => setHour(e.target.value)}>
                {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map(h => (<option key={h} value={h}>{h}시</option>))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">분</label>
              <select className="w-full bg-slate-900/50 border border-white/10 rounded-lg p-2 outline-none text-sm" value={minute} onChange={e => setMinute(e.target.value)}>
                {['00', '10', '20', '30', '40', '50'].map(m => (<option key={m} value={m}>{m}분</option>))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-2 block uppercase tracking-wider font-bold">최대 인원: {maxParticipants}명</label>
            <input type="range" min="2" max="20" className="w-full accent-brand-500 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer" value={maxParticipants} onChange={e => setMaxParticipants(e.target.value)} />
          </div>
          <div className="flex gap-3 mt-8">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl transition-all font-bold">취소</button>
            <button type="submit" className="flex-2 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl transition-all font-bold">생성하기</button>
          </div>
        </form>
      </div>
    </div>
  );
}
