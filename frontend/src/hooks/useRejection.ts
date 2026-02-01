import { useState, useCallback } from 'react';
import type {
  RejectionReason,
  RejectionStats,
  RejectionRule,
  PatternAnalysis,
} from '../types/rejection';

export function useRejection() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rejectCandidate = useCallback(
    async (candidateId: string, reason: RejectionReason, notes?: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/candidates/${candidateId}/reject`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason, notes }),
        });
        if (!response.ok) throw new Error('Failed to reject candidate');
        return await response.json();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const shortlistCandidate = useCallback(async (candidateId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/candidates/${candidateId}/shortlist`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to shortlist candidate');
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const undoFeedback = useCallback(async (candidateId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/candidates/${candidateId}/undo`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to undo feedback');
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getStats = useCallback(async (): Promise<RejectionStats> => {
    const response = await fetch('/api/rejection/stats');
    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
  }, []);

  const getRules = useCallback(async (): Promise<RejectionRule[]> => {
    const response = await fetch('/api/rejection/rules');
    if (!response.ok) throw new Error('Failed to fetch rules');
    return response.json();
  }, []);

  const updateRule = useCallback(
    async (
      ruleId: string,
      updates: Partial<Pick<RejectionRule, 'name' | 'description' | 'enabled'>>,
    ) => {
      const response = await fetch(`/api/rejection/rules/${ruleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update rule');
      return response.json();
    },
    [],
  );

  const deleteRule = useCallback(async (ruleId: string) => {
    const response = await fetch(`/api/rejection/rules/${ruleId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete rule');
    return response.json();
  }, []);

  const analyzePatterns = useCallback(async (): Promise<{
    patterns: PatternAnalysis[];
  }> => {
    const response = await fetch('/api/rejection/analyze', { method: 'POST' });
    if (!response.ok) throw new Error('Failed to analyze patterns');
    return response.json();
  }, []);

  const generateRules = useCallback(async (): Promise<{ created: number }> => {
    const response = await fetch('/api/rejection/generate-rules', {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to generate rules');
    return response.json();
  }, []);

  return {
    isLoading,
    error,
    rejectCandidate,
    shortlistCandidate,
    undoFeedback,
    getStats,
    getRules,
    updateRule,
    deleteRule,
    analyzePatterns,
    generateRules,
  };
}
