'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnalysisResultsProps, SecurityIssue } from '@/types/security';

function getSeverityStyles(severity: string) {
  switch (severity.toLowerCase()) {
    case 'critical':
      return {
        badge: 'text-red-700 bg-red-100 border-red-200 dark:text-red-300 dark:bg-red-950/60 dark:border-red-800/70',
        accentBorder: 'border-l-red-500',
        dot: 'bg-red-500',
      };
    case 'high':
      return {
        badge: 'text-orange-700 bg-orange-100 border-orange-200 dark:text-orange-300 dark:bg-orange-950/60 dark:border-orange-800/70',
        accentBorder: 'border-l-orange-500',
        dot: 'bg-orange-500',
      };
    case 'medium':
      return {
        badge: 'text-amber-700 bg-amber-100 border-amber-200 dark:text-amber-300 dark:bg-amber-950/60 dark:border-amber-800/70',
        accentBorder: 'border-l-amber-500',
        dot: 'bg-amber-500',
      };
    case 'low':
      return {
        badge: 'text-emerald-700 bg-emerald-100 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/60 dark:border-emerald-800/70',
        accentBorder: 'border-l-emerald-500',
        dot: 'bg-emerald-500',
      };
    default:
      return {
        badge: 'text-gray-700 bg-gray-100 border-gray-200 dark:text-gray-300 dark:bg-gray-800 dark:border-gray-700',
        accentBorder: 'border-l-gray-400',
        dot: 'bg-gray-400',
      };
  }
}

interface CodeSnippetBlockProps {
  title: string;
  variant: 'vulnerable' | 'recommended';
  code: string;
  canApply?: boolean;
  wasApplied?: boolean;
  onApply?: () => void;
}

/**
 * IDE-styled read-only code viewer with line numbers, diff prefix, extendable height, Copy & Apply
 */
function CodeSnippetBlock({
  title,
  variant,
  code,
  canApply,
  wasApplied,
  onApply,
}: CodeSnippetBlockProps) {
  const [copied, setCopied] = useState(false);
  const [expandedCode, setExpandedCode] = useState(false);
  const [wrapLines, setWrapLines] = useState(true);

  const lines = useMemo(() => {
    const normalized = (code || '').replace(/\r\n/g, '\n').trimEnd();
    return normalized ? normalized.split('\n') : [''];
  }, [code]);

  const isLong = lines.length > 10;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const isVulnerable = variant === 'vulnerable';
  const headerClasses = isVulnerable
    ? 'bg-red-50/90 dark:bg-red-950/40 border-red-200/80 dark:border-red-900/60 text-red-800 dark:text-red-300'
    : 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-200/80 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300';

  const containerBorder = isVulnerable
    ? 'border-red-200/80 dark:border-red-900/60'
    : 'border-emerald-200/80 dark:border-emerald-900/60';

  const lineHighlight = isVulnerable
    ? 'bg-red-500/[0.05] dark:bg-red-500/[0.08]'
    : 'bg-emerald-500/[0.05] dark:bg-emerald-500/[0.08]';

  const prefixSymbol = isVulnerable ? '-' : '+';
  const prefixColor = isVulnerable
    ? 'text-red-500 dark:text-red-400'
    : 'text-emerald-600 dark:text-emerald-400';

  return (
    <div className={`rounded-lg border ${containerBorder} overflow-hidden bg-editor-bg flex flex-col`}>
      {/* Snippet Header Bar */}
      <div className={`flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 border-b text-xs font-medium ${headerClasses}`}>
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold">{prefixSymbol}</span>
          <span>{title}</span>
          <span className="opacity-70 font-mono text-[11px]">({lines.length} {lines.length === 1 ? 'line' : 'lines'})</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setWrapLines((w) => !w)}
            className="px-2 py-0.5 rounded bg-white/60 dark:bg-black/30 hover:bg-white dark:hover:bg-black/50 text-[11px] transition-colors"
          >
            {wrapLines ? 'No Wrap' : 'Wrap'}
          </button>

          {isLong && (
            <button
              type="button"
              onClick={() => setExpandedCode((e) => !e)}
              className="px-2 py-0.5 rounded bg-white/60 dark:bg-black/30 hover:bg-white dark:hover:bg-black/50 text-[11px] transition-colors"
            >
              {expandedCode ? 'Collapse' : 'Extend'}
            </button>
          )}

          <button
            type="button"
            onClick={handleCopy}
            className="px-2 py-0.5 rounded bg-white/70 dark:bg-black/30 hover:bg-white dark:hover:bg-black/50 text-[11px] font-semibold transition-colors"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>

          {!isVulnerable && onApply && (
            <button
              type="button"
              onClick={onApply}
              disabled={!canApply && !wasApplied}
              title={
                wasApplied
                  ? 'Recommended change applied to editor'
                  : canApply
                    ? 'Replace vulnerable snippet in the Source Editor with this recommended fix'
                    : 'Snippet differs from exact editor lines — click Copy to paste manually'
              }
              className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                wasApplied
                  ? 'bg-emerald-600 text-white'
                  : canApply
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                    : 'bg-black/5 dark:bg-white/5 opacity-50 cursor-not-allowed'
              }`}
            >
              {wasApplied ? 'Applied ✓' : 'Apply to Editor'}
            </button>
          )}
        </div>
      </div>

      {/* Code Lines Viewer */}
      <div
        className={`overflow-auto font-mono text-[12.5px] leading-6 ${
          expandedCode ? 'max-h-[650px]' : 'max-h-[260px]'
        }`}
      >
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, i) => (
              <tr key={i} className={`${lineHighlight} hover:brightness-95 dark:hover:brightness-110`}>
                <td className="select-none w-10 px-2.5 text-right text-[11px] text-editor-gutter-text bg-editor-gutter border-r border-border/60 align-top">
                  {i + 1}
                </td>
                <td className={`select-none w-6 pl-2 text-center font-bold align-top ${prefixColor}`}>
                  {prefixSymbol}
                </td>
                <td
                  className={`px-3 text-editor-text align-top ${
                    wrapLines ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'
                  }`}
                >
                  {line || ' '}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Extendable security results and recommended code changes viewer
 */
export default function AnalysisResults({
  analysisResults,
  isAnalyzing,
  error,
  codeContent,
  onApplyFix,
  isExpanded,
  onToggleExpand,
}: AnalysisResultsProps) {
  const [expandedCards, setExpandedCards] = useState<Record<number, boolean>>({});
  const [appliedFixes, setAppliedFixes] = useState<Record<number, boolean>>({});
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [diffLayout, setDiffLayout] = useState<'split' | 'stacked'>('split');
  const [summaryExpanded, setSummaryExpanded] = useState(true);

  // Expand all findings by default whenever a new analysis arrives
  useEffect(() => {
    if (analysisResults?.issues) {
      const next: Record<number, boolean> = {};
      analysisResults.issues.forEach((_, idx) => {
        next[idx] = true;
      });
      setExpandedCards(next);
      setAppliedFixes({});
      setSeverityFilter('all');
    }
  }, [analysisResults]);

  const counts = useMemo(() => {
    const base = { all: 0, critical: 0, high: 0, medium: 0, low: 0 };
    if (!analysisResults) return base;
    base.all = analysisResults.issues.length;
    for (const issue of analysisResults.issues) {
      const sev = issue.severity.toLowerCase() as keyof typeof base;
      if (sev in base) base[sev] += 1;
    }
    return base;
  }, [analysisResults]);

  const filteredIssues = useMemo(() => {
    if (!analysisResults) return [];
    return analysisResults.issues
      .map((issue, originalIndex) => ({ issue, originalIndex }))
      .filter(({ issue }) =>
        severityFilter === 'all' ? true : issue.severity.toLowerCase() === severityFilter
      );
  }, [analysisResults, severityFilter]);

  const toggleAllCards = (open: boolean) => {
    if (!analysisResults) return;
    const next: Record<number, boolean> = {};
    analysisResults.issues.forEach((_, idx) => {
      next[idx] = open;
    });
    setExpandedCards(next);
  };

  const canApplySnippet = (issue: SecurityIssue): boolean => {
    const target = issue.code?.trim();
    if (!target || !codeContent) return false;
    return codeContent.includes(target);
  };

  const handleApplyIssueFix = (index: number, issue: SecurityIssue) => {
    const ok = onApplyFix(issue.code, issue.fix);
    if (ok) {
      setAppliedFixes((prev) => ({ ...prev, [index]: true }));
    }
  };

  const jumpToAndExpandIssue = (index: number) => {
    setSeverityFilter('all');
    setExpandedCards((prev) => ({ ...prev, [index]: true }));
    const el = document.getElementById(`finding-card-${index}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-border bg-surface-muted">
        <div className="flex items-center gap-2.5">
          <h2 className="text-sm font-semibold text-foreground">
            Security Findings &amp; Recommended Changes
          </h2>
          {analysisResults && (
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-primary/10 text-primary">
              {analysisResults.issues.length}{' '}
              {analysisResults.issues.length === 1 ? 'issue' : 'issues'}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {analysisResults && analysisResults.issues.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setDiffLayout((d) => (d === 'split' ? 'stacked' : 'split'))}
                className="px-2.5 py-1 rounded border border-border bg-surface hover:bg-surface-muted text-foreground transition-colors"
                title="Switch between side-by-side and stacked code comparison"
              >
                Diff View: {diffLayout === 'split' ? 'Side-by-Side' : 'Stacked'}
              </button>
              <button
                type="button"
                onClick={() => toggleAllCards(true)}
                className="px-2.5 py-1 rounded hover:bg-surface text-gray-600 dark:text-gray-300 transition-colors"
              >
                Expand All
              </button>
              <button
                type="button"
                onClick={() => toggleAllCards(false)}
                className="px-2.5 py-1 rounded hover:bg-surface text-gray-600 dark:text-gray-300 transition-colors"
              >
                Collapse All
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onToggleExpand}
            className="px-2.5 py-1 rounded hover:bg-surface text-gray-600 dark:text-gray-300 font-medium transition-colors"
            title={isExpanded ? 'Restore split view' : 'Maximize findings panel'}
          >
            {isExpanded ? 'Restore Split' : 'Maximize'}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-5">
        {error && (
          <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/70 rounded-lg p-4 text-sm text-red-700 dark:text-red-300">
            <strong className="font-semibold">Analysis Error:</strong> {error}
          </div>
        )}

        {!analysisResults && !error && (
          <div className="rounded-lg border border-dashed border-border bg-editor-bg p-10 text-center">
            {isAnalyzing ? (
              <div className="flex flex-col items-center gap-3">
                <svg className="animate-spin h-7 w-7 text-primary" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                <p className="text-sm font-medium text-foreground">
                  Running Semgrep static analysis &amp; AI security review...
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Scanning ruleset and generating recommended code fixes (typically 15–35 seconds).
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-foreground">
                  Ready for security inspection
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Paste code into the Source Editor, open a file, or load the C# (.NET) sample, then click <strong>Analyze Code</strong>.
                </p>
              </div>
            )}
          </div>
        )}

        {analysisResults && (
          <div className="space-y-5">
            {/* Extendable Executive Summary */}
            <div className="rounded-lg border border-blue-200 dark:border-blue-900/70 bg-blue-50/70 dark:bg-blue-950/30 overflow-hidden">
              <button
                type="button"
                onClick={() => setSummaryExpanded((s) => !s)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-left"
              >
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-900 dark:text-blue-300">
                  Executive Summary
                </span>
                <span className="text-xs text-blue-700 dark:text-blue-400 font-medium">
                  {summaryExpanded ? 'Hide' : 'Show'}
                </span>
              </button>
              {summaryExpanded && (
                <div className="px-4 pb-3.5 text-sm leading-relaxed text-blue-950 dark:text-blue-200 border-t border-blue-200/60 dark:border-blue-900/50 pt-2.5">
                  {analysisResults.summary}
                </div>
              )}
            </div>

            {analysisResults.issues.length === 0 ? (
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-lg p-5 text-emerald-800 dark:text-emerald-300 text-sm">
                No security vulnerabilities were identified in this code.
              </div>
            ) : (
              <>
                {/* Prioritized Recommended Changes Checklist */}
                <div className="rounded-lg border border-border bg-surface-muted p-4">
                  <div className="flex items-center justify-between mb-2.5">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                      Recommended Action Plan ({analysisResults.issues.length})
                    </h3>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">
                      Click any item to jump to its code fix
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {analysisResults.issues.map((issue, idx) => {
                      const styles = getSeverityStyles(issue.severity);
                      const firstFixLine = issue.fix.trim().split('\n')[0];
                      return (
                        <li key={idx}>
                          <button
                            type="button"
                            onClick={() => jumpToAndExpandIssue(idx)}
                            className="w-full flex flex-wrap items-center justify-between gap-2 text-left px-3 py-2 rounded-md bg-surface hover:bg-primary/5 border border-border/80 transition-colors text-xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${styles.dot}`} />
                              <span className="font-semibold text-foreground truncate">
                                #{idx + 1} Fix {issue.title}
                              </span>
                              {appliedFixes[idx] && (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-medium text-[10px]">
                                  Applied
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-md">
                              CVSS {issue.cvss_score.toFixed(1)} • {firstFixLine}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* Severity Filter Pills */}
                <div className="flex flex-wrap items-center gap-2">
                  {(
                    [
                      ['all', `All (${counts.all})`],
                      ['critical', `Critical (${counts.critical})`],
                      ['high', `High (${counts.high})`],
                      ['medium', `Medium (${counts.medium})`],
                      ['low', `Low (${counts.low})`],
                    ] as const
                  ).map(([key, label]) => {
                    const count = counts[key];
                    if (key !== 'all' && count === 0) return null;
                    const active = severityFilter === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSeverityFilter(key)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                          active
                            ? 'bg-primary text-white border-primary'
                            : 'bg-surface text-foreground border-border hover:bg-surface-muted'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {/* Extendable Finding Cards */}
                <div className="space-y-4">
                  {filteredIssues.map(({ issue, originalIndex }) => {
                    const isOpen = !!expandedCards[originalIndex];
                    const styles = getSeverityStyles(issue.severity);
                    const matchable = canApplySnippet(issue);
                    const applied = !!appliedFixes[originalIndex];

                    return (
                      <article
                        id={`finding-card-${originalIndex}`}
                        key={originalIndex}
                        className={`rounded-lg border border-border border-l-4 ${styles.accentBorder} bg-surface shadow-xs overflow-hidden transition-all`}
                      >
                        {/* Accordion Card Header */}
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedCards((prev) => ({
                              ...prev,
                              [originalIndex]: !prev[originalIndex],
                            }))
                          }
                          className="w-full flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-surface-muted/60 hover:bg-surface-muted text-left transition-colors"
                        >
                          <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                            <span
                              className={`inline-flex px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide rounded-full border ${styles.badge}`}
                            >
                              {issue.severity}
                            </span>
                            <span className="font-mono text-xs px-2 py-0.5 rounded bg-editor-bg border border-border text-foreground font-semibold">
                              CVSS {issue.cvss_score.toFixed(1)}
                            </span>
                            <h4 className="text-sm font-semibold text-foreground">
                              {issue.title}
                            </h4>
                            {applied && (
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold">
                                Fix Applied ✓
                              </span>
                            )}
                          </div>

                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 shrink-0">
                            {isOpen ? 'Collapse ▲' : 'Expand ▼'}
                          </span>
                        </button>

                        {/* Expanded Issue Details & Editor Diff */}
                        {isOpen && (
                          <div className="p-4 space-y-4 border-t border-border">
                            <div>
                              <h5 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                                Security Impact &amp; Explanation
                              </h5>
                              <p className="text-sm leading-relaxed text-foreground/90">
                                {issue.description}
                              </p>
                            </div>

                            <div
                              className={
                                diffLayout === 'split'
                                  ? 'grid grid-cols-1 xl:grid-cols-2 gap-4'
                                  : 'space-y-4'
                              }
                            >
                              <CodeSnippetBlock
                                title="Vulnerable Code"
                                variant="vulnerable"
                                code={issue.code}
                              />
                              <CodeSnippetBlock
                                title="Recommended Change"
                                variant="recommended"
                                code={issue.fix}
                                canApply={matchable}
                                wasApplied={applied}
                                onApply={() => handleApplyIssueFix(originalIndex, issue)}
                              />
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}