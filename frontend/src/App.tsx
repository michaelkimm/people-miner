import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { RejectDialog } from './components/RejectDialog';
import { ActionButtons } from './components/ActionButtons';
import { RejectionDashboard } from './components/RejectionDashboard';
import { useRejection } from './hooks/useRejection';
import type { CandidateStatus, RejectionReason } from './types/rejection';

interface SolvedAcProfile {
  handle: string;
  tier: number;
  tierName: string;
  rating: number;
  solvedCount: number;
  maxStreak: number;
  classLevel: number;
  classDecoration: string | null;
}

interface Candidate {
  id: string;
  githubUsername: string;
  name: string | null;
  email: string | null;
  bio: string | null;
  company: string | null;
  location: string | null;
  avatarUrl: string | null;
  totalScore: number | null;
  followers: number;
  publicRepos: number;
  sources: { sourceName: string; sourceType: string }[];
  solvedAcProfile?: SolvedAcProfile | null;
  status: CandidateStatus;
}

interface CandidateDetail extends Candidate {
  repositories?: {
    name: string;
    description: string | null;
    stargazersCount: number;
    forksCount: number;
    language: string | null;
  }[];
  scoringResults?: {
    strategyName: string;
    score: number;
    details: Record<string, unknown>;
  }[];
  solvedAcProfile?: SolvedAcProfile | null;
}

interface CrawlProgress {
  jobId: string;
  source?: string;
  status: string;
  message: string;
  found?: number;
  new?: number;
}

interface CandidatesResponse {
  data: Candidate[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

const SCORE_RANGES = [
  { label: 'All', min: 0, max: 100 },
  { label: '80+', min: 80, max: 100 },
  { label: '60-79', min: 60, max: 79 },
  { label: '40-59', min: 40, max: 59 },
  { label: '<40', min: 0, max: 39 },
];

type TargetRole = 'all' | 'backend' | 'frontend' | 'mobile' | 'fullstack';

const ROLE_OPTIONS: { value: TargetRole; label: string }[] = [
  { value: 'all', label: 'All Roles' },
  { value: 'backend', label: 'Backend' },
  { value: 'frontend', label: 'Frontend' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'fullstack', label: 'Fullstack' },
];

const SOURCE_COLORS: Record<string, string> = {
  'github-trending': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  'github-search': 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  'dev-event': 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  'korean-blog': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  default: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
};

function getScoreColor(score: number | null): string {
  if (score === null) return 'from-slate-600 to-slate-700';
  if (score >= 80) return 'from-emerald-500 to-emerald-600';
  if (score >= 60) return 'from-amber-500 to-amber-600';
  if (score >= 40) return 'from-orange-500 to-orange-600';
  return 'from-slate-500 to-slate-600';
}

function getScoreTextColor(score: number | null): string {
  if (score === null) return 'text-slate-400';
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-amber-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-slate-400';
}

function getSolvedAcTierColor(tier: number): string {
  if (tier >= 26) return '#ff0062'; // Ruby
  if (tier >= 21) return '#00b4fc'; // Diamond
  if (tier >= 16) return '#27e2a4'; // Platinum
  if (tier >= 11) return '#ec9a00'; // Gold
  if (tier >= 6) return '#435f7a';  // Silver
  if (tier >= 1) return '#ad5600';  // Bronze
  return '#2d2d2d'; // Unrated
}

function getSolvedAcTierBgClass(tier: number): string {
  if (tier >= 26) return 'bg-[#ff0062]/20 border-[#ff0062]/40 text-[#ff0062]'; // Ruby
  if (tier >= 21) return 'bg-[#00b4fc]/20 border-[#00b4fc]/40 text-[#00b4fc]'; // Diamond
  if (tier >= 16) return 'bg-[#27e2a4]/20 border-[#27e2a4]/40 text-[#27e2a4]'; // Platinum
  if (tier >= 11) return 'bg-[#ec9a00]/20 border-[#ec9a00]/40 text-[#ec9a00]'; // Gold
  if (tier >= 6) return 'bg-[#435f7a]/20 border-[#435f7a]/40 text-[#9cb0c4]';  // Silver
  if (tier >= 1) return 'bg-[#ad5600]/20 border-[#ad5600]/40 text-[#d4833c]';  // Bronze
  return 'bg-slate-700/20 border-slate-600/40 text-slate-500'; // Unrated
}

function App() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isCrawling, setIsCrawling] = useState(false);
  const [progress, setProgress] = useState<CrawlProgress[]>([]);
  const [, setSocket] = useState<Socket | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState('all');
  const [selectedScoreRange, setSelectedScoreRange] = useState(SCORE_RANGES[0]);
  const [selectedRole, setSelectedRole] = useState<TargetRole>('backend');
  const [availableSources, setAvailableSources] = useState<string[]>([]);
  
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 20;

  const [excludeRejected, setExcludeRejected] = useState(true);
  const [autoExclude, setAutoExclude] = useState(true);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingCandidate, setRejectingCandidate] = useState<Candidate | null>(null);
  const [dashboardOpen, setDashboardOpen] = useState(false);

  const { rejectCandidate, shortlistCandidate, undoFeedback, isLoading: isActionLoading } = useRejection();

  useEffect(() => {
    const newSocket = io('http://localhost:3000', { transports: ['websocket'] });
    setSocket(newSocket);

    newSocket.on('crawl-progress', (data: CrawlProgress) => {
      setProgress((prev) => [...prev, data]);
      if (data.status === 'finished') {
        setIsCrawling(false);
        fetchCandidates();
      }
    });

    return () => {
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    const fetchSources = async () => {
      try {
        const response = await fetch('/api/candidates/sources');
        const data: { name: string; count: number }[] = await response.json();
        setAvailableSources(data.map(s => s.name));
      } catch (error) {
        console.error('Failed to fetch sources:', error);
      }
    };
    fetchSources();
  }, []);

  const fetchCandidates = useCallback(async (page = currentPage) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        sortBy: 'totalScore',
        order: 'desc',
        limit: String(itemsPerPage),
        page: String(page),
      });
      
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }
      if (selectedSource !== 'all') {
        params.append('source', selectedSource);
      }
      if (selectedScoreRange.min > 0 || selectedScoreRange.max < 100) {
        params.append('minScore', String(selectedScoreRange.min));
        params.append('maxScore', String(selectedScoreRange.max));
      }
      if (excludeRejected) {
        params.append('excludeRejected', 'true');
      }
      if (autoExclude) {
        params.append('autoExclude', 'true');
      }
      if (selectedRole !== 'all') {
        params.append('role', selectedRole);
      }

      const response = await fetch(`/api/candidates?${params.toString()}`);
      const data: CandidatesResponse = await response.json();
      setCandidates(data.data);
      setTotalCount(data.meta.total);
      setTotalPages(data.meta.totalPages);
    } catch (error) {
      console.error('Failed to fetch candidates:', error);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedSource, selectedScoreRange, selectedRole, currentPage, excludeRejected, autoExclude]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedSource, selectedScoreRange, selectedRole, excludeRejected, autoExclude]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchCandidates(currentPage);
    }, 300);
    return () => clearTimeout(debounce);
  }, [currentPage, searchQuery, selectedSource, selectedScoreRange, selectedRole, excludeRejected, autoExclude, fetchCandidates]);

  const handleRejectClick = (candidate: Candidate) => {
    setRejectingCandidate(candidate);
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async (reason: RejectionReason, notes?: string) => {
    if (!rejectingCandidate) return;
    try {
      await rejectCandidate(rejectingCandidate.id, reason, notes);
      setCandidates((prev) =>
        prev.map((c) =>
          c.id === rejectingCandidate.id ? { ...c, status: 'REJECTED' as CandidateStatus } : c,
        ),
      );
      if (selectedCandidate?.id === rejectingCandidate.id) {
        setSelectedCandidate({ ...selectedCandidate, status: 'REJECTED' as CandidateStatus });
      }
      if (excludeRejected) {
        setCandidates((prev) => prev.filter((c) => c.id !== rejectingCandidate.id));
      }
    } finally {
      setRejectDialogOpen(false);
      setRejectingCandidate(null);
    }
  };

  const handleShortlist = async (candidateId: string) => {
    try {
      await shortlistCandidate(candidateId);
      setCandidates((prev) =>
        prev.map((c) =>
          c.id === candidateId ? { ...c, status: 'SHORTLISTED' as CandidateStatus } : c,
        ),
      );
    } catch (error) {
      console.error('Failed to shortlist:', error);
    }
  };

  const handleUndo = async (candidateId: string) => {
    try {
      await undoFeedback(candidateId);
      setCandidates((prev) =>
        prev.map((c) =>
          c.id === candidateId ? { ...c, status: 'ACTIVE' as CandidateStatus } : c,
        ),
      );
    } catch (error) {
      console.error('Failed to undo:', error);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const fetchCandidateDetail = async (id: string) => {
    setIsDetailLoading(true);
    try {
      const response = await fetch(`/api/candidates/${id}`);
      const data: CandidateDetail = await response.json();
      setSelectedCandidate(data);
      setIsPanelOpen(true);
    } catch (error) {
      console.error('Failed to fetch candidate detail:', error);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleRowClick = (candidate: Candidate) => {
    fetchCandidateDetail(candidate.id);
  };

  const closePanel = () => {
    setIsPanelOpen(false);
    setTimeout(() => setSelectedCandidate(null), 300);
  };

  const startCrawl = async () => {
    setIsCrawling(true);
    setProgress([]);
    try {
      await fetch('/api/crawler/start', { method: 'POST' });
    } catch (error) {
      console.error('Failed to start crawl:', error);
      setIsCrawling(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/3 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative">
        <header className="border-b border-slate-800/50 backdrop-blur-xl bg-slate-900/50 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-cyan-400 via-violet-400 to-emerald-400 bg-clip-text text-transparent">
                  People Miner
                </h1>
                <p className="text-slate-400 mt-1 text-sm sm:text-base">
                  Channel Corporation Talent Discovery
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-slate-300 text-sm font-medium">
                    {totalCount.toLocaleString()} candidates
                  </span>
                </div>
                <button
                  onClick={startCrawl}
                  disabled={isCrawling}
                  className={`group relative px-6 py-3 rounded-xl font-semibold text-white overflow-hidden transition-all duration-300 ${
                    isCrawling
                      ? 'bg-slate-700 cursor-not-allowed'
                      : 'bg-gradient-to-r from-cyan-500 to-violet-500 hover:shadow-lg hover:shadow-cyan-500/25 hover:scale-105'
                  }`}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {isCrawling ? (
                      <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Crawling...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        Discover
                      </>
                    )}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="mb-6 p-4 rounded-2xl bg-slate-900/50 border border-slate-800/50 backdrop-blur-sm">
            <div className="flex flex-col lg:flex-row gap-4 lg:items-end">
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                  Search
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search by name, username, or company..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                    Role
                  </label>
                  <div className="relative">
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value as TargetRole)}
                      className="appearance-none w-full sm:w-36 px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all cursor-pointer"
                    >
                      {ROLE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                    Source
                  </label>
                  <div className="relative">
                    <select
                      value={selectedSource}
                      onChange={(e) => setSelectedSource(e.target.value)}
                      className="appearance-none w-full sm:w-48 px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all cursor-pointer"
                    >
                      <option value="all">All Sources</option>
                      {availableSources.map((source) => (
                        <option key={source} value={source}>
                          {source}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                    Score Range
                  </label>
                  <div className="flex gap-1 p-1 bg-slate-800/50 border border-slate-700/50 rounded-xl">
                    {SCORE_RANGES.map((range) => (
                      <button
                        key={range.label}
                        onClick={() => setSelectedScoreRange(range)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          selectedScoreRange.label === range.label
                            ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                        }`}
                      >
                        {range.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6 mt-4 pt-4 border-t border-slate-800/50">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={excludeRejected}
                    onChange={(e) => setExcludeRejected(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500/50 focus:ring-offset-0"
                  />
                  <span className="text-sm text-slate-300">거부한 후보 숨기기</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoExclude}
                    onChange={(e) => setAutoExclude(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500/50 focus:ring-offset-0"
                  />
                  <span className="text-sm text-slate-300">학습 규칙으로 자동 제외</span>
                </label>

                <button
                  onClick={() => setDashboardOpen(true)}
                  className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span className="text-sm font-medium">학습 대시보드</span>
                </button>
              </div>
            </div>
          </div>

          {isCrawling && progress.length > 0 && (
            <div className="mb-6 p-4 rounded-2xl bg-slate-900/50 border border-slate-800/50 backdrop-blur-sm overflow-hidden">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative">
                  <div className="w-3 h-3 rounded-full bg-cyan-500 animate-ping absolute" />
                  <div className="w-3 h-3 rounded-full bg-cyan-500" />
                </div>
                <h2 className="font-semibold text-lg text-slate-100">Crawling Progress</h2>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {progress.map((p, i) => (
                  <div
                    key={i}
                    className={`text-sm p-3 rounded-xl border backdrop-blur-sm transition-all duration-300 ${
                      p.status === 'error'
                        ? 'bg-red-500/10 border-red-500/30 text-red-300'
                        : p.status === 'completed'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                    }`}
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <div className="flex items-center gap-2">
                      {p.status === 'error' ? (
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : p.status === 'completed' ? (
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 flex-shrink-0 animate-spin" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      )}
                      <span>{p.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-slate-700 rounded-full" />
                <div className="absolute top-0 left-0 w-16 h-16 border-4 border-cyan-500 rounded-full animate-spin border-t-transparent" />
              </div>
              <p className="mt-6 text-slate-400 text-lg">Loading candidates...</p>
            </div>
          ) : candidates.length === 0 ? (
            <div className="text-center py-24 px-4">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-slate-800/50 border border-slate-700/50 flex items-center justify-center">
                <svg className="w-12 h-12 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-300 mb-2">No candidates found</h3>
              <p className="text-slate-500 max-w-md mx-auto">
                {searchQuery || selectedSource !== 'all' || selectedScoreRange.label !== 'All'
                  ? 'Try adjusting your filters to find more candidates.'
                  : 'Click the "Discover" button to start crawling for talented developers.'}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl bg-slate-900/50 border border-slate-800/50 backdrop-blur-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-800/50">
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Rank
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Profile
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Score
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">
                        Company
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">
                        Followers
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Sources
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/30">
                    {candidates.map((candidate, index) => {
                      const rank = (currentPage - 1) * itemsPerPage + index + 1;
                      return (
                      <tr
                        key={candidate.id}
                        onClick={() => handleRowClick(candidate)}
                        className="group hover:bg-slate-800/30 cursor-pointer transition-colors duration-200"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                            rank === 1
                              ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-slate-900'
                              : rank === 2
                              ? 'bg-gradient-to-br from-slate-300 to-slate-500 text-slate-900'
                              : rank === 3
                              ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-white'
                              : 'bg-slate-800/50 text-slate-400'
                          }`}>
                            {rank}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <img
                                src={candidate.avatarUrl || '/placeholder.png'}
                                alt={candidate.githubUsername}
                                className="h-12 w-12 rounded-xl object-cover ring-2 ring-slate-700/50 group-hover:ring-cyan-500/50 transition-all"
                              />
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-slate-900 flex items-center justify-center">
                                <svg className="w-3 h-3 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                                </svg>
                              </div>
                            </div>
                            <div className="min-w-0 max-w-[180px]">
                              <div className="flex items-center gap-2">
                                <span 
                                  className="text-sm font-semibold text-slate-100 group-hover:text-cyan-400 transition-colors truncate max-w-[120px]"
                                  title={candidate.name || candidate.githubUsername}
                                >
                                  {candidate.name || candidate.githubUsername}
                                </span>
                                {candidate.solvedAcProfile && (
                                  <span
                                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border flex-shrink-0 ${getSolvedAcTierBgClass(candidate.solvedAcProfile.tier)}`}
                                    title={`solved.ac: ${candidate.solvedAcProfile.tierName}`}
                                  >
                                    {candidate.solvedAcProfile.tierName.split(' ')[0]}
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-slate-500 truncate" title={`@${candidate.githubUsername}`}>
                                @{candidate.githubUsername}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r ${getScoreColor(candidate.totalScore)}`}>
                            <svg className="w-4 h-4 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <span className="text-white font-bold">
                              {candidate.totalScore?.toFixed(1) || '-'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 hidden md:table-cell">
                          {candidate.company ? (
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                              {candidate.company}
                            </div>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 hidden lg:table-cell">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            {candidate.followers.toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-nowrap gap-1.5 max-w-[200px]">
                            {candidate.sources.slice(0, 2).map((source, i) => (
                              <span
                                key={i}
                                className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border whitespace-nowrap truncate max-w-[90px] ${
                                  SOURCE_COLORS[source.sourceName] || SOURCE_COLORS.default
                                }`}
                                title={source.sourceName}
                              >
                                {source.sourceName}
                              </span>
                            ))}
                            {candidate.sources.length > 2 && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-700/50 text-slate-400 border border-slate-600/50 whitespace-nowrap">
                                +{candidate.sources.length - 2}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <ActionButtons
                            candidateId={candidate.id}
                            status={candidate.status || 'ACTIVE'}
                            onReject={() => handleRejectClick(candidate)}
                            onShortlist={handleShortlist}
                            onUndo={handleUndo}
                            isLoading={isActionLoading}
                          />
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-slate-800/50 flex items-center justify-between">
                  <div className="text-sm text-slate-500">
                    {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount.toLocaleString()}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handlePageChange(1)}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    
                    <div className="flex items-center gap-1 mx-2">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                              currentPage === pageNum
                                ? 'bg-cyan-500 text-white'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handlePageChange(totalPages)}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {isPanelOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden" onClick={closePanel}>
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity" />
        </div>
      )}
      
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-xl z-50 transform transition-transform duration-300 ease-out ${
          isPanelOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full bg-slate-900/95 backdrop-blur-xl border-l border-slate-800/50 shadow-2xl overflow-hidden flex flex-col">
          {isDetailLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-slate-700 rounded-full" />
                <div className="absolute top-0 left-0 w-16 h-16 border-4 border-cyan-500 rounded-full animate-spin border-t-transparent" />
              </div>
            </div>
          ) : selectedCandidate ? (
            <>
              <div className="relative h-32 bg-gradient-to-br from-cyan-500/20 via-violet-500/20 to-emerald-500/20">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
                <button
                  onClick={closePanel}
                  className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-slate-900/50 border border-slate-700/50 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="relative px-6 -mt-12">
                <div className="flex items-end gap-4">
                  <img
                    src={selectedCandidate.avatarUrl || '/placeholder.png'}
                    alt={selectedCandidate.githubUsername}
                    className="w-24 h-24 rounded-2xl ring-4 ring-slate-900 object-cover"
                  />
                  <div className="pb-2">
                    <h2 className="text-xl font-bold text-slate-100">
                      {selectedCandidate.name || selectedCandidate.githubUsername}
                    </h2>
                    <a
                      href={`https://github.com/${selectedCandidate.githubUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center gap-1"
                    >
                      @{selectedCandidate.githubUsername}
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/30 text-center">
                    <div className={`text-2xl font-bold ${getScoreTextColor(selectedCandidate.totalScore)}`}>
                      {selectedCandidate.totalScore?.toFixed(1) || '-'}
                    </div>
                    <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Score</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/30 text-center">
                    <div className="text-2xl font-bold text-slate-100">
                      {selectedCandidate.followers.toLocaleString()}
                    </div>
                    <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Followers</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/30 text-center">
                    <div className="text-2xl font-bold text-slate-100">
                      {selectedCandidate.publicRepos}
                    </div>
                    <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Repos</div>
                  </div>
                </div>

                {selectedCandidate.solvedAcProfile && (
                  <div className="p-4 rounded-xl border" style={{ 
                    backgroundColor: `${getSolvedAcTierColor(selectedCandidate.solvedAcProfile.tier)}10`,
                    borderColor: `${getSolvedAcTierColor(selectedCandidate.solvedAcProfile.tier)}30`
                  }}>
                    <div className="flex items-center gap-3 mb-4">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${getSolvedAcTierColor(selectedCandidate.solvedAcProfile.tier)}25` }}
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill={getSolvedAcTierColor(selectedCandidate.solvedAcProfile.tier)}>
                          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                        </svg>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 uppercase tracking-wider">solved.ac</div>
                        <div className="font-bold" style={{ color: getSolvedAcTierColor(selectedCandidate.solvedAcProfile.tier) }}>
                          {selectedCandidate.solvedAcProfile.tierName}
                        </div>
                      </div>
                      <a
                        href={`https://solved.ac/profile/${selectedCandidate.solvedAcProfile.handle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto text-slate-500 hover:text-slate-300 transition-colors"
                        title="View on solved.ac"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center">
                        <div className="text-lg font-bold text-slate-100">
                          {selectedCandidate.solvedAcProfile.solvedCount.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider">Solved</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-slate-100">
                          {selectedCandidate.solvedAcProfile.rating.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider">Rating</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-slate-100">
                          {selectedCandidate.solvedAcProfile.maxStreak}
                        </div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider">Max Streak</div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedCandidate.bio && (
                  <div>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Bio</h3>
                    <p className="text-slate-300 text-sm leading-relaxed">{selectedCandidate.bio}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {selectedCandidate.company && (
                    <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/30">
                      <div className="flex items-center gap-2 text-slate-500 mb-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <span className="text-xs uppercase tracking-wider">Company</span>
                      </div>
                      <div className="text-slate-200 font-medium">{selectedCandidate.company}</div>
                    </div>
                  )}
                  {selectedCandidate.location && (
                    <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/30">
                      <div className="flex items-center gap-2 text-slate-500 mb-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-xs uppercase tracking-wider">Location</span>
                      </div>
                      <div className="text-slate-200 font-medium">{selectedCandidate.location}</div>
                    </div>
                  )}
                  {selectedCandidate.email && (
                    <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/30 col-span-2">
                      <div className="flex items-center gap-2 text-slate-500 mb-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xs uppercase tracking-wider">Email</span>
                      </div>
                      <a href={`mailto:${selectedCandidate.email}`} className="text-cyan-400 hover:text-cyan-300 font-medium">
                        {selectedCandidate.email}
                      </a>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Discovery Sources</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedCandidate.sources.map((source, i) => (
                      <span
                        key={i}
                        className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium border ${
                          SOURCE_COLORS[source.sourceName] || SOURCE_COLORS.default
                        }`}
                      >
                        {source.sourceName}
                      </span>
                    ))}
                  </div>
                </div>

                {selectedCandidate.scoringResults && selectedCandidate.scoringResults.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Score Breakdown</h3>
                    <div className="space-y-2">
                      {selectedCandidate.scoringResults.map((result, i) => (
                        <div key={i} className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/30">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-slate-300">{result.strategyName}</span>
                            <span className={`text-sm font-bold ${getScoreTextColor(result.score)}`}>
                              {result.score.toFixed(1)}
                            </span>
                          </div>
                          <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${getScoreColor(result.score)}`}
                              style={{ width: `${result.score}%` }}
                            />
                          </div>
                          
                          {result.strategyName === 'codeQuality' && typeof result.details?.breakdown === 'object' && result.details.breakdown !== null && (() => {
                            const breakdown = result.details.breakdown as { testing?: number; cicd?: number; documentation?: number; commitQuality?: number; ossContributions?: number; typeSafety?: number };
                            return (
                              <div className="mt-3 pt-3 border-t border-slate-700/30">
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/50">
                                    <div className="w-7 h-7 rounded-md bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                                      <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="text-[10px] text-slate-500 uppercase tracking-wider">Testing</div>
                                      <div className="text-xs font-semibold text-slate-200">
                                        {breakdown.testing?.toFixed(0) ?? 0}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/50">
                                    <div className="w-7 h-7 rounded-md bg-cyan-500/15 flex items-center justify-center flex-shrink-0">
                                      <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                      </svg>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="text-[10px] text-slate-500 uppercase tracking-wider">CI/CD</div>
                                      <div className="text-xs font-semibold text-slate-200">
                                        {breakdown.cicd?.toFixed(0) ?? 0}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/50">
                                    <div className="w-7 h-7 rounded-md bg-violet-500/15 flex items-center justify-center flex-shrink-0">
                                      <svg className="w-3.5 h-3.5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                      </svg>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="text-[10px] text-slate-500 uppercase tracking-wider">Docs</div>
                                      <div className="text-xs font-semibold text-slate-200">
                                        {breakdown.documentation?.toFixed(0) ?? 0}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/50">
                                    <div className="w-7 h-7 rounded-md bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                                      <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                      </svg>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="text-[10px] text-slate-500 uppercase tracking-wider">Commits</div>
                                      <div className="text-xs font-semibold text-slate-200">
                                        {breakdown.commitQuality?.toFixed(0) ?? 0}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/50">
                                    <div className="w-7 h-7 rounded-md bg-rose-500/15 flex items-center justify-center flex-shrink-0">
                                      <svg className="w-3.5 h-3.5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                      </svg>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="text-[10px] text-slate-500 uppercase tracking-wider">OSS</div>
                                      <div className="text-xs font-semibold text-slate-200">
                                        {breakdown.ossContributions?.toFixed(0) ?? 0}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/50">
                                    <div className="w-7 h-7 rounded-md bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                                      <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                      </svg>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="text-[10px] text-slate-500 uppercase tracking-wider">Types</div>
                                      <div className="text-xs font-semibold text-slate-200">
                                        {breakdown.typeSafety?.toFixed(0) ?? 0}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedCandidate.repositories && selectedCandidate.repositories.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Top Repositories</h3>
                    <div className="space-y-3">
                      {selectedCandidate.repositories.slice(0, 5).map((repo, i) => (
                        <a
                          key={i}
                          href={`https://github.com/${selectedCandidate.githubUsername}/${repo.name}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-4 rounded-xl bg-slate-800/30 border border-slate-700/30 hover:border-cyan-500/30 hover:bg-slate-800/50 transition-colors group"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-slate-200 group-hover:text-cyan-400 transition-colors truncate">
                                {repo.name}
                              </div>
                              {repo.description && (
                                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{repo.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-500 flex-shrink-0">
                              {repo.language && (
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-cyan-500" />
                                  {repo.language}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.48 8.279-7.416-3.967-7.417 3.967 1.481-8.279-6.064-5.828 8.332-1.151z"/>
                                </svg>
                                {repo.stargazersCount}
                              </span>
                              <span className="flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                </svg>
                                {repo.forksCount}
                              </span>
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-slate-800/50 space-y-3">
                {selectedCandidate.status === 'REJECTED' ? (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                    <span className="text-red-400 font-medium">거부된 후보입니다</span>
                    <button
                      onClick={() => {
                        handleUndo(selectedCandidate.id);
                        setSelectedCandidate({ ...selectedCandidate, status: 'ACTIVE' });
                      }}
                      disabled={isActionLoading}
                      className="px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      되돌리기
                    </button>
                  </div>
                ) : selectedCandidate.status === 'SHORTLISTED' ? (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                    <span className="text-emerald-400 font-medium">관심 후보입니다</span>
                    <button
                      onClick={() => {
                        handleUndo(selectedCandidate.id);
                        setSelectedCandidate({ ...selectedCandidate, status: 'ACTIVE' });
                      }}
                      disabled={isActionLoading}
                      className="px-4 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      되돌리기
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        handleShortlist(selectedCandidate.id);
                        setSelectedCandidate({ ...selectedCandidate, status: 'SHORTLISTED' });
                      }}
                      disabled={isActionLoading}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition-colors disabled:opacity-50"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                      관심 후보
                    </button>
                    <button
                      onClick={() => {
                        setRejectingCandidate(selectedCandidate);
                        setRejectDialogOpen(true);
                      }}
                      disabled={isActionLoading}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold transition-colors disabled:opacity-50"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      거부
                    </button>
                  </div>
                )}

                <a
                  href={`https://github.com/${selectedCandidate.githubUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 font-semibold transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  View Full Profile on GitHub
                </a>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <RejectDialog
        isOpen={rejectDialogOpen}
        candidateName={rejectingCandidate?.name || rejectingCandidate?.githubUsername || ''}
        onConfirm={handleRejectConfirm}
        onCancel={() => {
          setRejectDialogOpen(false);
          setRejectingCandidate(null);
        }}
      />

      <RejectionDashboard
        isOpen={dashboardOpen}
        onClose={() => setDashboardOpen(false)}
      />
    </div>
  );
}

export default App;
