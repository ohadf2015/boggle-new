'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Shield, Smartphone, Monitor,
  CheckCircle2, XCircle, Target, Puzzle, Gamepad2,
} from 'lucide-react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { getSession } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { useTheme } from '@/utils/ThemeContext';
import { PageLoader } from '@/components/ui/PageLoader';
import { AdminSidebar } from '@/components/admin/sidebar/AdminSidebar';
import { AdminBottomNav } from '@/components/admin/sidebar/AdminBottomNav';
import { AdminSubNav } from '@/components/admin/sidebar/AdminSubNav';
import { Loader } from '@/components/ui/Loader';

interface GuestProfile {
  session_id: string;
  device_type: string | null;
  browser: string | null;
  language: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
  country: string | null;
  first_visit_at: string;
  last_visit_at: string;
  user_id: string | null;
  linked_at: string | null;
  created_at: string;
  missing?: boolean;
}

interface GameSession {
  id: string;
  mode: string;
  language: string;
  score: number;
  words_found: { word?: string; points?: number; length?: number }[] | null;
  room_code: string | null;
  final_rank: number | null;
  duration_seconds: number;
  started_at: string;
  completed_at: string | null;
  completed: boolean;
  difficulty: string | null;
  is_first_game: boolean;
  player_count: number | null;
  tokens_earned: number;
  tokens_spent: number;
  clues_used: number;
}

interface WordHuntAttempt {
  id: string;
  language: string;
  puzzle_number: number;
  solved: boolean;
  attempts_used: number;
  target_word: string;
  efficiency_score: number;
  completed_at: string | null;
  created_at: string;
}

interface DailyPuzzleAttempt {
  id: string;
  puzzle_number: number;
  language: string;
  score: number;
  word_count: number;
  time_seconds: number;
  longest_word: string | null;
  completed_at: string;
}

interface DetailResponse {
  success: boolean;
  profile: GuestProfile;
  gameSessions: GameSession[];
  wordHuntAttempts: WordHuntAttempt[];
  dailyPuzzleAttempts: DailyPuzzleAttempt[];
}

const COUNTRY_FLAG_OFFSET = 0x1f1a5;
function countryToFlag(code?: string | null): string {
  if (!code || code.length !== 2) return '';
  const upper = code.toUpperCase();
  return String.fromCodePoint(
    upper.charCodeAt(0) + COUNTRY_FLAG_OFFSET,
    upper.charCodeAt(1) + COUNTRY_FLAG_OFFSET,
  );
}

function formatDuration(seconds: number): string {
  if (!seconds) return '0s';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function GuestDetailPageClient() {
  const router = useRouter();
  const params = useParams<{ sessionId: string }>();
  const sessionId = params?.sessionId as string;
  const { language } = useLanguage();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const { user, profile: userProfile, isAdmin, loading: authLoading } = useAuth();

  const [authToken, setAuthToken] = useState<string | null>(null);
  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const getAuthToken = useCallback(async () => {
    try {
      const { data: { session } } = await getSession();
      return session?.access_token || null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isAdmin) {
      getAuthToken().then(setAuthToken);
    }
  }, [authLoading, isAdmin, getAuthToken]);

  useEffect(() => {
    if (!authToken || !sessionId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/guests/${sessionId}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (!res.ok) throw new Error('Failed to fetch guest detail');
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authToken, sessionId]);

  const isProfileLoading = !authLoading && user && !userProfile;

  if (!authLoading && !isProfileLoading && (!user || !isAdmin)) {
    return (
      <div className="flex-1 bg-neo-navy text-neo-white flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-neo-lime mx-auto mb-4" />
          <h1 className="text-2xl font-neo-display text-neo-white mb-2">Admin Access Required</h1>
          <Button onClick={() => router.push(`/${language}`)} variant="outline">
            <DirectionalIcon icon={ArrowLeft} className="w-4 h-4 me-2" /> Back to Home
          </Button>
        </div>
      </div>
    );
  }

  if (authLoading || isProfileLoading || !authToken) {
    return (
      <div className="flex-1 bg-neo-navy text-neo-white flex items-center justify-center">
        <PageLoader size="lg" text="Loading..." />
      </div>
    );
  }

  const isRTL = language === 'he';
  const guest = data?.profile;
  const totalGames =
    (data?.gameSessions.length || 0) +
    (data?.wordHuntAttempts.length || 0) +
    (data?.dailyPuzzleAttempts.length || 0);

  return (
    <div className={cn(
      'flex-1 flex flex-col w-full overflow-x-hidden min-h-screen',
      isDarkMode ? 'bg-neo-navy' : 'bg-linear-to-br from-blue-50 via-white to-purple-50',
      isRTL && 'rtl',
    )}>
      <Header />
      <AdminSubNav />
      <div className="flex flex-1">
        <AdminSidebar />

        <main className="flex-1 min-w-0 px-4 py-6 sm:px-6 lg:px-8 pb-20 sm:pb-6">
          <div className="flex items-center gap-4 mb-6">
            <Link
              href={`/${language}/admin/guests`}
              className="text-slate-400 hover:text-neo-white"
            >
              <DirectionalIcon icon={ArrowLeft} className="w-5 h-5" />
            </Link>
            <div>
              <h1 className={cn('text-2xl font-bold font-mono', isDarkMode ? 'text-white' : 'text-gray-900')}>
                {sessionId.slice(0, 12)}…
              </h1>
              <p className="text-sm text-slate-500">Guest player detail</p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Loader size="lg" /></div>
          ) : !guest ? (
            <Card><CardContent className="p-6 text-slate-500">Guest session not found.</CardContent></Card>
          ) : (
            <div className="space-y-6">
              {/* Profile card */}
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    {guest.linked_at || guest.user_id ? (
                      <span className="inline-flex items-center gap-1 text-sm bg-neo-lime/20 text-neo-lime px-2 py-1 rounded">
                        <CheckCircle2 className="w-4 h-4" /> Converted
                        {guest.user_id && (
                          <Link
                            href={`/${language}/admin/players/${guest.user_id}`}
                            className="ms-2 underline"
                          >
                            view profile
                          </Link>
                        )}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-sm bg-slate-600/30 text-slate-400 px-2 py-1 rounded">
                        <XCircle className="w-4 h-4" /> Not converted
                      </span>
                    )}
                    {guest.country && (
                      <span className="text-sm">
                        {countryToFlag(guest.country)} {guest.country}
                      </span>
                    )}
                    {guest.device_type && (
                      <span className="inline-flex items-center gap-1 text-sm text-slate-400">
                        {(guest.device_type || '').toLowerCase().match(/mobile|phone|android|ios/) ? (
                          <Smartphone className="w-4 h-4" />
                        ) : (
                          <Monitor className="w-4 h-4" />
                        )}
                        {guest.device_type}
                        {guest.browser && <span className="text-slate-500">· {guest.browser}</span>}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <Field label="Session ID" value={guest.session_id} mono />
                    <Field label="Language" value={guest.language || '—'} />
                    <Field
                      label="First visit"
                      value={new Date(guest.first_visit_at).toLocaleString()}
                    />
                    <Field
                      label="Last visit"
                      value={new Date(guest.last_visit_at).toLocaleString()}
                    />
                    <Field label="UTM source" value={guest.utm_source || '—'} />
                    <Field label="UTM medium" value={guest.utm_medium || '—'} />
                    <Field label="UTM campaign" value={guest.utm_campaign || '—'} />
                    <Field
                      label="Referrer"
                      value={guest.referrer || '—'}
                      title={guest.referrer || undefined}
                      truncate
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Activity summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <SummaryCard label="Total games" value={totalGames} icon={<Gamepad2 className="w-4 h-4" />} />
                <SummaryCard
                  label="Multiplayer / single"
                  value={data?.gameSessions.length || 0}
                  icon={<Gamepad2 className="w-4 h-4" />}
                />
                <SummaryCard
                  label="Word Hunt"
                  value={data?.wordHuntAttempts.length || 0}
                  icon={<Target className="w-4 h-4" />}
                />
                <SummaryCard
                  label="Daily challenge"
                  value={data?.dailyPuzzleAttempts.length || 0}
                  icon={<Puzzle className="w-4 h-4" />}
                />
              </div>

              {/* Game sessions */}
              {data?.gameSessions && data.gameSessions.length > 0 && (
                <SectionTable title="Boggle / multiplayer sessions" icon={<Gamepad2 className="w-4 h-4" />}>
                  <table className="w-full text-sm">
                    <thead className="text-xs text-slate-400 uppercase">
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-2">Time</th>
                        <th className="text-left py-2">Mode</th>
                        <th className="text-left py-2">Lang</th>
                        <th className="text-right py-2">Score</th>
                        <th className="text-right py-2">Words</th>
                        <th className="text-right py-2">Duration</th>
                        <th className="text-left py-2">Room</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.gameSessions.map((s) => (
                        <tr key={s.id} className="border-b border-slate-800/50">
                          <td className="py-2 whitespace-nowrap">
                            {new Date(s.started_at).toLocaleString()}
                          </td>
                          <td className="py-2">
                            {s.mode}
                            {s.is_first_game && (
                              <span className="ms-1 text-xs text-neo-lime">★ first</span>
                            )}
                          </td>
                          <td className="py-2">{s.language}</td>
                          <td className="py-2 text-right font-mono">{s.score}</td>
                          <td className="py-2 text-right font-mono">{s.words_found?.length ?? 0}</td>
                          <td className="py-2 text-right">{formatDuration(s.duration_seconds)}</td>
                          <td className="py-2 font-mono text-xs">{s.room_code || 'solo'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </SectionTable>
              )}

              {/* Word hunt */}
              {data?.wordHuntAttempts && data.wordHuntAttempts.length > 0 && (
                <SectionTable title="Word Hunt attempts" icon={<Target className="w-4 h-4" />}>
                  <table className="w-full text-sm">
                    <thead className="text-xs text-slate-400 uppercase">
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-2">Time</th>
                        <th className="text-left py-2">Lang</th>
                        <th className="text-right py-2">Puzzle #</th>
                        <th className="text-left py-2">Target</th>
                        <th className="text-right py-2">Attempts</th>
                        <th className="text-right py-2">Solved</th>
                        <th className="text-right py-2">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.wordHuntAttempts.map((a) => (
                        <tr key={a.id} className="border-b border-slate-800/50">
                          <td className="py-2 whitespace-nowrap">
                            {new Date(a.created_at).toLocaleString()}
                          </td>
                          <td className="py-2">{a.language}</td>
                          <td className="py-2 text-right font-mono">{a.puzzle_number}</td>
                          <td className="py-2 font-mono">{a.target_word}</td>
                          <td className="py-2 text-right font-mono">{a.attempts_used}</td>
                          <td className="py-2 text-right">
                            {a.solved ? (
                              <CheckCircle2 className="w-4 h-4 inline text-neo-lime" />
                            ) : (
                              <XCircle className="w-4 h-4 inline text-slate-500" />
                            )}
                          </td>
                          <td className="py-2 text-right font-mono">{a.efficiency_score}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </SectionTable>
              )}

              {/* Daily puzzle */}
              {data?.dailyPuzzleAttempts && data.dailyPuzzleAttempts.length > 0 && (
                <SectionTable title="Daily challenge attempts" icon={<Puzzle className="w-4 h-4" />}>
                  <table className="w-full text-sm">
                    <thead className="text-xs text-slate-400 uppercase">
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-2">Time</th>
                        <th className="text-left py-2">Lang</th>
                        <th className="text-right py-2">Puzzle #</th>
                        <th className="text-right py-2">Score</th>
                        <th className="text-right py-2">Words</th>
                        <th className="text-right py-2">Duration</th>
                        <th className="text-left py-2">Longest</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.dailyPuzzleAttempts.map((a) => (
                        <tr key={a.id} className="border-b border-slate-800/50">
                          <td className="py-2 whitespace-nowrap">
                            {new Date(a.completed_at).toLocaleString()}
                          </td>
                          <td className="py-2">{a.language}</td>
                          <td className="py-2 text-right font-mono">{a.puzzle_number}</td>
                          <td className="py-2 text-right font-mono">{a.score}</td>
                          <td className="py-2 text-right font-mono">{a.word_count}</td>
                          <td className="py-2 text-right">{formatDuration(a.time_seconds)}</td>
                          <td className="py-2 font-mono text-xs">{a.longest_word || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </SectionTable>
              )}

              {totalGames === 0 && (
                <Card>
                  <CardContent className="p-6 text-slate-500 text-center">
                    This guest visited but never completed a game.
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </main>
      </div>

      <AdminBottomNav />
    </div>
  );
}

function Field({
  label, value, mono, truncate, title,
}: { label: string; value: string; mono?: boolean; truncate?: boolean; title?: string }) {
  return (
    <div>
      <div className="text-xs text-slate-400 uppercase">{label}</div>
      <div
        className={cn(
          'text-sm',
          mono && 'font-mono',
          truncate && 'truncate',
        )}
        title={title}
      >
        {value}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon }: { label: string; value: number; icon?: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-slate-400 uppercase inline-flex items-center gap-1">
          {icon}
          {label}
        </div>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
      </CardContent>
    </Card>
  );
}

function SectionTable({
  title, icon, children,
}: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-sm font-bold mb-3 inline-flex items-center gap-2">
          {icon}
          {title}
        </h3>
        <div className="overflow-x-auto">{children}</div>
      </CardContent>
    </Card>
  );
}
