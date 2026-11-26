import os
from typing import Optional, Tuple

"""
Security analysis context and prompts for the cybersecurity analyzer.
"""

# Mapping of language identifier -> (Display Label, Default File Extension for Semgrep)
SUPPORTED_LANGUAGES: dict[str, Tuple[str, str]] = {
    "csharp": ("C# (.NET)", ".cs"),
    "python": ("Python", ".py"),
    "typescript": ("TypeScript", ".ts"),
    "javascript": ("JavaScript", ".js"),
    "java": ("Java", ".java"),
    "go": ("Go", ".go"),
    "cpp": ("C / C++", ".cpp"),
    "c": ("C", ".c"),
    "php": ("PHP", ".php"),
    "ruby": ("Ruby", ".rb"),
    "rust": ("Rust", ".rs"),
    "kotlin": ("Kotlin", ".kt"),
    "swift": ("Swift", ".swift"),
    "sql": ("SQL", ".sql"),
    "terraform": ("Terraform (HCL)", ".tf"),
    "yaml": ("YAML", ".yaml"),
    "json": ("JSON", ".json"),
}

EXTENSION_TO_LANGUAGE: dict[str, str] = {
    ".cs": "csharp",
    ".csx": "csharp",
    ".cshtml": "csharp",
    ".razor": "csharp",
    ".csproj": "csharp",
    ".config": "csharp",
    ".py": "python",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".js": "javascript",
    ".jsx": "javascript",
    ".mjs": "javascript",
    ".cjs": "javascript",
    ".java": "java",
    ".go": "go",
    ".cpp": "cpp",
    ".cc": "cpp",
    ".cxx": "cpp",
    ".hpp": "cpp",
    ".c": "c",
    ".h": "c",
    ".php": "php",
    ".rb": "ruby",
    ".rs": "rust",
    ".kt": "kotlin",
    ".kts": "kotlin",
    ".swift": "swift",
    ".sql": "sql",
    ".tf": "terraform",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".json": "json",
}

DOTNET_SECURITY_GUIDANCE = """
C# / .NET SPECIFIC SECURITY FOCUS AREAS:
When conducting your own security review beyond Semgrep, pay special attention to common C# and .NET / ASP.NET Core vulnerabilities:
- SQL Injection in ADO.NET (SqlCommand), Dapper, or Entity Framework Core (FromSqlRaw / ExecuteSqlRaw with string concatenation or non-parameterized interpolation)
- Insecure Deserialization (BinaryFormatter, SoapFormatter, NetDataContractSerializer, LosFormatter, or Newtonsoft.Json with TypeNameHandling != None)
- XML External Entity (XXE) injection (XmlDocument, XmlTextReader, or XmlReaderSettings with DtdProcessing.Parse / XmlUrlResolver enabled)
- Command / Process Injection (Process.Start / ProcessStartInfo with unvalidated input or UseShellExecute = true)
- Path Traversal & Arbitrary File Access (Note: Path.Combine(baseDir, userPath) returns userPath if userPath is rooted!)
- ASP.NET Core Web & API flaws: missing [Authorize], unintended [AllowAnonymous], missing anti-forgery validation, overly permissive CORS, Open Redirects via Redirect(userInput) instead of LocalRedirect, Mass Assignment / Over-posting, and XSS via @Html.Raw
- Weak Cryptography & Randomness (MD5, SHA1, DES/3DES, AES in ECB mode, or System.Random used for security tokens instead of RandomNumberGenerator)
- Hardcoded secrets, API keys, JWT signing keys, connection strings, and Server-Side Request Forgery (SSRF) via HttpClient
"""


def detect_language_from_code(code: str) -> str:
    """Best-effort heuristic fallback when language and filename are not specified."""
    sample = code.lstrip()
    if (
        "using System" in code
        or "using Microsoft.AspNetCore" in code
        or ("namespace " in code and ("public class " in code or "private readonly " in code))
        or "[ApiController]" in code
        or "[HttpGet" in code
        or "[HttpPost" in code
    ):
        return "csharp"
    if "package main" in code and "func " in code:
        return "go"
    if "public static void main(String" in code or "import java." in code:
        return "java"
    if sample.startswith("<?php"):
        return "php"
    if "fn main()" in code and "let mut " in code:
        return "rust"
    return "python"


def resolve_language_and_suffix(
    language: Optional[str], filename: Optional[str], code: str
) -> Tuple[str, str, str]:
    """Resolve (language_key, display_label, temp_file_suffix) for Semgrep and prompts."""
    ext = ""
    if filename:
        _, raw_ext = os.path.splitext(os.path.basename(filename.strip()))
        raw_ext = raw_ext.lower()
        if raw_ext in EXTENSION_TO_LANGUAGE:
            ext = raw_ext

    lang_key = (language or "").strip().lower()
    if lang_key in ("", "auto"):
        if ext and ext in EXTENSION_TO_LANGUAGE:
            lang_key = EXTENSION_TO_LANGUAGE[ext]
        else:
            lang_key = detect_language_from_code(code)

    if lang_key not in SUPPORTED_LANGUAGES:
        lang_key = EXTENSION_TO_LANGUAGE.get(ext, "python")

    label, default_suffix = SUPPORTED_LANGUAGES[lang_key]
    # Preserve exact safe extension (e.g., .tsx, .jsx, .cshtml) when it matches the language
    suffix = ext if (ext and EXTENSION_TO_LANGUAGE.get(ext) == lang_key) else default_suffix
    return lang_key, label, suffix


def get_security_researcher_instructions(language_key: str = "python", language_label: str = "Python") -> str:
    """Build language-aware instructions for the Security Researcher agent."""
    extra_guidance = f"\n{DOTNET_SECURITY_GUIDANCE}\n" if language_key == "csharp" else ""

    return f"""
You are a senior cybersecurity researcher. You are given {language_label} code to analyze for security vulnerabilities.
You have access to a semgrep_scan tool that can help identify security vulnerabilities across languages.

CRITICAL REQUIREMENTS: 
1. When using the semgrep_scan tool, you MUST ALWAYS use exactly "auto" (and nothing else) for the "config" field in each code_files entry.
2. You MUST call the semgrep_scan tool ONLY ONCE. Do not call it multiple times with the same code.

DO NOT use any other config values like:
- "p/sql-injection" or "p/csharp" or "p/python" (WRONG)
- "security" (WRONG) 
- "csharp" or "python" (WRONG)
- Any rule names or patterns (WRONG)

ONLY use: "auto"

Correct format: {{"config":"auto","code_files":[{{"path":"<PATH_PROVIDED_BELOW>"}}],timeout=60}}

IMPORTANT: Call semgrep_scan once, get the results, then proceed with your own analysis. Do not repeat the tool call.
{extra_guidance}
Your analysis process should be:
1. First, use the semgrep_scan tool ONCE to scan the provided code (config: "auto")
2. Review and analyze the semgrep results - count how many issues semgrep found
3. Do NOT call semgrep_scan again - you already have the results
4. Conduct your own additional {language_label} security analysis to identify issues that semgrep might have missed
5. In your summary, clearly state: "Semgrep found X issues, and I identified Y additional issues"
6. Combine both semgrep findings and your own analysis into a comprehensive report

Include all severity levels: critical, high, medium, and low vulnerabilities.

For each vulnerability found (from both semgrep and your own analysis), provide:
- A clear title
- Detailed description of the security issue and potential impact
- The specific vulnerable code snippet
- Idiomatic {language_label} recommended fix or mitigation
- CVSS score (0.0-10.0)
- Severity level (critical/high/medium/low)

Be thorough and practical in your analysis. Don't duplicate issues between semgrep results and your own findings.

Display the issues sorted by CVSS score, with the highest CVSS value first. 
"""


# Default instructions kept for backward compatibility
SECURITY_RESEARCHER_INSTRUCTIONS = get_security_researcher_instructions("python", "Python")


def get_analysis_prompt(code: str, temp_path: str, language_label: str = "Python") -> str:
    """Generate the analysis prompt for the security agent.
    temp_path must be the absolute path to a real file on disk containing the code (for semgrep_scan).
    """

    return f"""The {language_label} code to analyze is in a file at this exact path (use this path when calling semgrep_scan):
    PATH: {temp_path}
 
    Please analyze the {language_label} code in that file for security vulnerabilities. The code is also shown below for your reference:
 
    {code}"""


def enhance_summary(code_length: int, agent_summary: str, language_label: str = "Python") -> str:
    """Enhance the agent's summary with additional context."""
    return f"Analyzed {code_length} characters of {language_label} code. {agent_summary}"
