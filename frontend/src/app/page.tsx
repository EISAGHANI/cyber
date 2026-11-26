'use client';

import { useEffect, useState } from 'react';
import {
  AnalysisResponse,
  detectLanguageFromFileName,
  LanguageId,
} from '@/types/security';
import CodeInput from '@/components/CodeInput';
import AnalysisResults from '@/components/AnalysisResults';

// Force relative URLs in production builds
// Only use localhost when explicitly running in development mode
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'development' &&
  typeof window !== 'undefined' &&
  window.location?.hostname === 'localhost'
    ? 'http://localhost:8000'
    : '');

const SAMPLE_CSHARP_CODE = `using System;
using System.Data.SqlClient;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;

namespace FlightAI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AirlineController : ControllerBase
    {
        private const string ConnectionString = "Server=prod-sql.local;Database=Bookings;User Id=sa;Password=SuperSecretPassword123!;";

        [HttpGet("price")]
        public IActionResult GetTicketPrice([FromQuery] string city)
        {
            using var connection = new SqlConnection(ConnectionString);
            connection.Open();

            // SQL Injection via string interpolation
            var query = $"SELECT Price FROM TicketPrices WHERE City = '{city}'";
            using var command = new SqlCommand(query, connection);
            return Ok(new { city, price = command.ExecuteScalar() });
        }

        [HttpPost("preferences")]
        public IActionResult ImportPreferences([FromBody] string rawJson)
        {
            // Insecure deserialization
            var prefs = JsonConvert.DeserializeObject(rawJson, new JsonSerializerSettings
            {
                TypeNameHandling = TypeNameHandling.All
            });
            return Ok(prefs);
        }

        [HttpGet("invoice")]
        public IActionResult DownloadInvoice([FromQuery] string fileName)
        {
            // Path traversal
            var bytes = System.IO.File.ReadAllBytes(Path.Combine("/var/app/invoices", fileName));
            return File(bytes, "application/pdf", fileName);
        }

        public static string HashPassword(string password)
        {
            using var md5 = MD5.Create();
            return Convert.ToHexString(md5.ComputeHash(Encoding.UTF8.GetBytes(password)));
        }
    }
}`;

/**
 * Main IDE-style application workbench for multi-language security code analysis
 */
export default function Home() {
  const [codeContent, setCodeContent] = useState('');
  const [previousCode, setPreviousCode] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageId>('csharp');
  const [analysisResults, setAnalysisResults] = useState<AnalysisResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // UI Theme & Extendable Panel State
  const [isDark, setIsDark] = useState(true);
  const [workspaceLayout, setWorkspaceLayout] = useState<'stacked' | 'split'>('stacked');
  const [expandedPanel, setExpandedPanel] = useState<'none' | 'editor' | 'results'>('none');

  // Initialize theme from localStorage (defaults to Dark Mode for IDE feel)
  useEffect(() => {
    const saved = localStorage.getItem('cyber-analyzer-theme');
    const useDark = saved ? saved === 'dark' : true;
    setIsDark(useDark);
    document.documentElement.classList.toggle('dark', useDark);
  }, []);

  const toggleDarkMode = () => {
    setIsDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle('dark', next);
      localStorage.setItem('cyber-analyzer-theme', next ? 'dark' : 'light');
      return next;
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const detectedLanguage = detectLanguageFromFileName(file.name);
    setSelectedLanguage(detectedLanguage ?? 'auto');
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCodeContent(content);
      setPreviousCode(null);
      setAnalysisResults(null);
      setError(null);
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleLoadSampleCSharp = () => {
    setSelectedLanguage('csharp');
    setFileName('AirlineController.cs');
    setCodeContent(SAMPLE_CSHARP_CODE);
    setPreviousCode(null);
    setAnalysisResults(null);
    setError(null);
  };

  const handleCodeChange = (newCode: string) => {
    setCodeContent(newCode);
    if (error) setError(null);
  };

  const handleClearCode = () => {
    setCodeContent('');
    setPreviousCode(null);
    setFileName('');
    setAnalysisResults(null);
    setError(null);
  };

  const handleApplyFix = (vulnerableSnippet: string, recommendedFix: string): boolean => {
    const target = vulnerableSnippet?.trim();
    if (!target || !codeContent.includes(target)) {
      return false;
    }
    setPreviousCode(codeContent);
    setCodeContent(codeContent.replace(target, recommendedFix.trim()));
    return true;
  };

  const handleUndoFix = () => {
    if (previousCode !== null) {
      setCodeContent(previousCode);
      setPreviousCode(null);
    }
  };

  const handleAnalyzeCode = async () => {
    if (!codeContent.trim()) {
      alert('Please paste or open a code file first');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    if (expandedPanel === 'editor') {
      setExpandedPanel('none');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: codeContent,
          language: selectedLanguage,
          filename: fileName || undefined,
        }),
      });

      if (!response.ok) {
        let detail = `HTTP error! status: ${response.status}`;
        try {
          const errBody = await response.json();
          if (errBody?.detail) detail = errBody.detail;
        } catch {
          // keep default HTTP status message
        }
        throw new Error(detail);
      }

      const results: AnalysisResponse = await response.json();
      setAnalysisResults(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      {/* Top IDE Header Bar */}
      <header className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur px-4 sm:px-6 py-3">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center font-mono font-bold text-sm">
              {'</>'}
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                Cybersecurity Code Analyzer
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Semgrep + AI Security Workbench • C# (.NET), Python, TypeScript, Java, Go &amp; more
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {previousCode !== null && (
              <button
                type="button"
                onClick={handleUndoFix}
                className="px-3 py-1.5 rounded-md text-xs font-medium bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-colors"
              >
                Undo Applied Fix
              </button>
            )}

            {/* Layout Switcher (Desktop) */}
            {expandedPanel === 'none' && (
              <button
                type="button"
                onClick={() =>
                  setWorkspaceLayout((l) => (l === 'stacked' ? 'split' : 'stacked'))
                }
                className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-border bg-surface-muted hover:bg-background transition-colors"
                title="Switch between stacked and side-by-side IDE layout"
              >
                Layout: {workspaceLayout === 'stacked' ? 'Stacked' : 'Side-by-Side'}
              </button>
            )}

            {/* Dark / Light Mode Toggle */}
            <button
              type="button"
              onClick={toggleDarkMode}
              aria-label="Toggle dark mode"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-border bg-surface-muted hover:bg-background transition-colors"
            >
              {isDark ? (
                <>
                  <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Light Mode
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                  Dark Mode
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Extendable Workbench */}
      <main className="max-w-[1600px] mx-auto p-4 sm:p-6">
        <div
          className={
            expandedPanel !== 'none'
              ? 'space-y-6'
              : workspaceLayout === 'split'
                ? 'grid grid-cols-1 lg:grid-cols-2 gap-6 items-start'
                : 'space-y-6'
          }
        >
          {expandedPanel !== 'results' && (
            <CodeInput
              codeContent={codeContent}
              fileName={fileName}
              selectedLanguage={selectedLanguage}
              onLanguageChange={setSelectedLanguage}
              onCodeChange={handleCodeChange}
              onLoadSampleCSharp={handleLoadSampleCSharp}
              onClearCode={handleClearCode}
              onFileUpload={handleFileUpload}
              onAnalyzeCode={handleAnalyzeCode}
              isAnalyzing={isAnalyzing}
              isExpanded={expandedPanel === 'editor'}
              onToggleExpand={() =>
                setExpandedPanel((p) => (p === 'editor' ? 'none' : 'editor'))
              }
            />
          )}

          {expandedPanel !== 'editor' && (
            <AnalysisResults
              analysisResults={analysisResults}
              isAnalyzing={isAnalyzing}
              error={error}
              codeContent={codeContent}
              onApplyFix={handleApplyFix}
              isExpanded={expandedPanel === 'results'}
              onToggleExpand={() =>
                setExpandedPanel((p) => (p === 'results' ? 'none' : 'results'))
              }
            />
          )}
        </div>
      </main>
    </div>
  );
}