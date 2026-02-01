import { useState, useEffect, useCallback } from 'react';
import { useRejection } from '../hooks/useRejection';
import type {
  RejectionStats,
  RejectionRule,
  PatternAnalysis,
} from '../types/rejection';
import { REJECTION_REASON_LABELS } from '../types/rejection';

interface RejectionDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RejectionDashboard({ isOpen, onClose }: RejectionDashboardProps) {
  const [stats, setStats] = useState<RejectionStats | null>(null);
  const [rules, setRules] = useState<RejectionRule[]>([]);
  const [patterns, setPatterns] = useState<PatternAnalysis[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<'stats' | 'rules'>('stats');

  const { getStats, getRules, updateRule, deleteRule, analyzePatterns, generateRules } =
    useRejection();

  const loadData = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const [statsData, rulesData] = await Promise.all([getStats(), getRules()]);
      setStats(statsData);
      setRules(rulesData);
    } catch (error) {
      console.error('Failed to load rejection data:', error);
    } finally {
      setIsLoadingStats(false);
    }
  }, [getStats, getRules]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const result = await analyzePatterns();
      setPatterns(result.patterns);
    } catch (error) {
      console.error('Failed to analyze patterns:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateRules = async () => {
    setIsAnalyzing(true);
    try {
      await generateRules();
      await loadData();
    } catch (error) {
      console.error('Failed to generate rules:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleToggleRule = async (rule: RejectionRule) => {
    try {
      await updateRule(rule.id, { enabled: !rule.enabled });
      setRules((prev) =>
        prev.map((r) =>
          r.id === rule.id ? { ...r, enabled: !r.enabled } : r,
        ),
      );
    } catch (error) {
      console.error('Failed to toggle rule:', error);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('이 규칙을 삭제하시겠습니까?')) return;
    try {
      await deleteRule(ruleId);
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
    } catch (error) {
      console.error('Failed to delete rule:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden">
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="absolute inset-4 md:inset-8 lg:inset-16 flex items-center justify-center">
        <div
          className="relative w-full max-w-4xl max-h-full bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b border-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-cyan-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-100">
                  거부 학습 대시보드
                </h2>
                <p className="text-sm text-slate-400">
                  거부 패턴 분석 및 자동 규칙 관리
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="flex border-b border-slate-800/50">
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'stats'
                  ? 'text-cyan-400 border-b-2 border-cyan-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              통계
            </button>
            <button
              onClick={() => setActiveTab('rules')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'rules'
                  ? 'text-cyan-400 border-b-2 border-cyan-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              규칙 관리
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {isLoadingStats ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : activeTab === 'stats' ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/30 text-center">
                    <div className="text-2xl font-bold text-red-400">
                      {stats?.totalRejected ?? 0}
                    </div>
                    <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">
                      총 거부
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/30 text-center">
                    <div className="text-2xl font-bold text-emerald-400">
                      {stats?.totalShortlisted ?? 0}
                    </div>
                    <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">
                      관심 후보
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/30 text-center">
                    <div className="text-2xl font-bold text-cyan-400">
                      {stats?.activeRules ?? 0}
                    </div>
                    <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">
                      활성 규칙
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/30 text-center">
                    <div className="text-2xl font-bold text-amber-400">
                      {stats?.recentRejections ?? 0}
                    </div>
                    <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">
                      최근 7일
                    </div>
                  </div>
                </div>

                {stats?.reasonDistribution && stats.reasonDistribution.length > 0 && (
                  <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/30">
                    <h3 className="text-sm font-semibold text-slate-300 mb-4">
                      거부 이유 분포
                    </h3>
                    <div className="space-y-3">
                      {stats.reasonDistribution.map((item) => (
                        <div key={item.reason}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-slate-300">
                              {REJECTION_REASON_LABELS[item.reason]}
                            </span>
                            <span className="text-slate-400">
                              {item.percentage}% ({item.count}명)
                            </span>
                          </div>
                          <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full"
                              style={{ width: `${item.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="flex-1 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium transition-colors disabled:opacity-50"
                  >
                    {isAnalyzing ? '분석 중...' : '패턴 분석'}
                  </button>
                  <button
                    onClick={handleGenerateRules}
                    disabled={isAnalyzing}
                    className="flex-1 px-4 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white font-medium transition-colors disabled:opacity-50"
                  >
                    {isAnalyzing ? '생성 중...' : '규칙 자동 생성'}
                  </button>
                </div>

                {patterns.length > 0 && (
                  <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/30">
                    <h3 className="text-sm font-semibold text-slate-300 mb-4">
                      발견된 패턴
                    </h3>
                    <div className="space-y-2">
                      {patterns.map((pattern, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50"
                        >
                          <div>
                            <span className="text-sm text-slate-200">
                              {pattern.description}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-slate-400">
                              신뢰도: {Math.round(pattern.confidence * 100)}%
                            </span>
                            <span className="text-slate-400">
                              적중: {pattern.hitCount}회
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {rules.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <svg
                      className="w-12 h-12 mx-auto mb-4 text-slate-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                    <p>아직 생성된 규칙이 없습니다.</p>
                    <p className="text-sm mt-1">
                      후보자를 거부하면 패턴이 학습됩니다.
                    </p>
                  </div>
                ) : (
                  rules.map((rule) => (
                    <div
                      key={rule.id}
                      className={`p-4 rounded-xl border transition-colors ${
                        rule.enabled
                          ? 'bg-slate-800/30 border-slate-700/30'
                          : 'bg-slate-900/50 border-slate-800/50 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-slate-200">
                              {rule.name}
                            </span>
                            {rule.autoGenerated && (
                              <span className="px-1.5 py-0.5 text-[10px] rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                                자동
                              </span>
                            )}
                          </div>
                          {rule.description && (
                            <p className="text-sm text-slate-400 mb-2">
                              {rule.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span>신뢰도: {Math.round(rule.confidence * 100)}%</span>
                            <span>적중: {rule.hitCount}회</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleRule(rule)}
                            className={`relative w-11 h-6 rounded-full transition-colors ${
                              rule.enabled ? 'bg-cyan-500' : 'bg-slate-700'
                            }`}
                          >
                            <div
                              className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                                rule.enabled ? 'left-6' : 'left-1'
                              }`}
                            />
                          </button>
                          <button
                            onClick={() => handleDeleteRule(rule.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
