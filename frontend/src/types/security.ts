/**
 * Type definitions and language metadata for security analysis components
 */

export type LanguageId =
  | 'auto'
  | 'csharp'
  | 'python'
  | 'typescript'
  | 'javascript'
  | 'java'
  | 'go'
  | 'cpp'
  | 'c'
  | 'php'
  | 'ruby'
  | 'rust'
  | 'kotlin'
  | 'swift'
  | 'sql'
  | 'terraform'
  | 'yaml'
  | 'json';

export interface LanguageOption {
  id: LanguageId;
  label: string;
  extensions: string[];
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { id: 'auto', label: 'Auto-detect', extensions: [] },
  { id: 'csharp', label: 'C# (.NET)', extensions: ['.cs', '.csx', '.cshtml', '.razor', '.csproj', '.config'] },
  { id: 'python', label: 'Python', extensions: ['.py'] },
  { id: 'typescript', label: 'TypeScript', extensions: ['.ts', '.tsx'] },
  { id: 'javascript', label: 'JavaScript', extensions: ['.js', '.jsx', '.mjs', '.cjs'] },
  { id: 'java', label: 'Java', extensions: ['.java'] },
  { id: 'go', label: 'Go', extensions: ['.go'] },
  { id: 'cpp', label: 'C / C++', extensions: ['.cpp', '.cc', '.cxx', '.hpp'] },
  { id: 'c', label: 'C', extensions: ['.c', '.h'] },
  { id: 'php', label: 'PHP', extensions: ['.php'] },
  { id: 'ruby', label: 'Ruby', extensions: ['.rb'] },
  { id: 'rust', label: 'Rust', extensions: ['.rs'] },
  { id: 'kotlin', label: 'Kotlin', extensions: ['.kt', '.kts'] },
  { id: 'swift', label: 'Swift', extensions: ['.swift'] },
  { id: 'sql', label: 'SQL', extensions: ['.sql'] },
  { id: 'terraform', label: 'Terraform (HCL)', extensions: ['.tf'] },
  { id: 'yaml', label: 'YAML', extensions: ['.yaml', '.yml'] },
  { id: 'json', label: 'JSON', extensions: ['.json'] },
];

export const ACCEPTED_FILE_EXTENSIONS = SUPPORTED_LANGUAGES
  .flatMap((lang) => lang.extensions)
  .join(',');

export function detectLanguageFromFileName(fileName: string): LanguageId | null {
  const lower = fileName.trim().toLowerCase();
  const dotIndex = lower.lastIndexOf('.');
  if (dotIndex === -1) return null;
  const ext = lower.slice(dotIndex);
  const match = SUPPORTED_LANGUAGES.find((lang) => lang.extensions.includes(ext));
  return match ? match.id : null;
}

export interface SecurityIssue {
  title: string;
  description: string;
  code: string;
  fix: string;
  cvss_score: number;
  severity: 'critical' | 'high' | 'medium' | 'low' | string;
}

export interface AnalysisResponse {
  summary: string;
  issues: SecurityIssue[];
}

export interface FileUploadProps {
  fileName: string;
  selectedLanguage: LanguageId;
  onLanguageChange: (language: LanguageId) => void;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onLoadSampleCSharp: () => void;
  onClearCode: () => void;
  onAnalyzeCode: () => void;
  isAnalyzing: boolean;
  hasCode: boolean;
}

export interface CodeInputProps {
  codeContent: string;
  fileName: string;
  selectedLanguage: LanguageId;
  onLanguageChange: (language: LanguageId) => void;
  onCodeChange: (code: string) => void;
  onLoadSampleCSharp: () => void;
  onClearCode: () => void;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onAnalyzeCode: () => void;
  isAnalyzing: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export interface AnalysisResultsProps {
  analysisResults: AnalysisResponse | null;
  isAnalyzing: boolean;
  error: string | null;
  codeContent: string;
  onApplyFix: (vulnerableSnippet: string, recommendedFix: string) => boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
}