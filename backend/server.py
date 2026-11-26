import tempfile  # to create a file on disk for semgrep_scan
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import List, Optional, Tuple
from dotenv import load_dotenv
from agents import Agent, Runner, trace

from context import (
    get_security_researcher_instructions,
    get_analysis_prompt,
    enhance_summary,
    resolve_language_and_suffix,
)
from mcp_servers import create_semgrep_server

load_dotenv(override=True)

app = FastAPI(title="Cybersecurity Analyzer API")

# Configure CORS for development and production
cors_origins = [
    "http://localhost:3000",  # Local development
    "http://frontend:3000",  # Docker development
]

# In production, allow same-origin requests (static files served from same domain)
if os.getenv("ENVIRONMENT") == "production":
    cors_origins.append(
        "*"
    )  # Allow all origins in production since we serve frontend from same domain

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    code: str
    language: Optional[str] = Field(
        default=None,
        description="Language identifier (e.g., 'csharp', 'python', 'typescript', 'auto')",
    )
    filename: Optional[str] = Field(
        default=None,
        description="Optional filename used to infer language and file extension for Semgrep",
    )


class SecurityIssue(BaseModel):
    title: str = Field(description="Brief title of the security vulnerability")
    description: str = Field(
        description="Detailed description of the security issue and its potential impact"
    )
    code: str = Field(
        description="The specific vulnerable code snippet that demonstrates the issue"
    )
    fix: str = Field(description="Recommended code fix or mitigation strategy")
    cvss_score: float = Field(description="CVSS score from 0.0 to 10.0 representing severity")
    severity: str = Field(description="Severity level: critical, high, medium, or low")


class SecurityReport(BaseModel):
    summary: str = Field(description="Executive summary of the security analysis")
    issues: List[SecurityIssue] = Field(description="List of identified security vulnerabilities")


def validate_request(request: AnalyzeRequest) -> None:
    """Validate the analysis request."""
    if not request.code.strip():
        raise HTTPException(status_code=400, detail="No code provided for analysis")


def check_api_keys() -> None:
    """Verify required API keys are configured."""
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")


def create_security_agent(semgrep_server, language_key: str, language_label: str) -> Agent:
    """Create and configure the security analysis agent."""
    return Agent(
        name="Security Researcher",
        instructions=get_security_researcher_instructions(language_key, language_label),
        model="gpt-4.1-mini",
        mcp_servers=[semgrep_server],
        output_type=SecurityReport,
    )


async def run_security_analysis(
    code: str, language: Optional[str] = None, filename: Optional[str] = None
) -> Tuple[SecurityReport, str]:
    """Execute the security analysis workflow."""
    lang_key, lang_label, suffix = resolve_language_and_suffix(language, filename, code)

    with trace("Security Researcher"):
        async with create_semgrep_server() as semgrep:
            agent = create_security_agent(semgrep, lang_key, lang_label)
            try:
                with tempfile.NamedTemporaryFile(
                    mode="w", suffix=suffix, encoding="utf-8", delete=False
                ) as temp:
                    temp.write(code)
                    temp_path = temp.name
                try:
                    result = await Runner.run(
                        agent, input=get_analysis_prompt(code, temp_path, lang_label)
                    )
                    sorted_report = result.final_output_as(SecurityReport)
                    sorted_report.issues.sort(key=lambda issue: issue.cvss_score, reverse=True)

                    return sorted_report, lang_label
                finally:
                    try:
                        os.unlink(temp_path)
                    except OSError:
                        pass
            except Exception as err:
                print(f"Unexpected {err=}, {type(err)=}")
                raise


def format_analysis_response(
    code: str, report: SecurityReport, language_label: str
) -> SecurityReport:
    """Format the final analysis response."""
    enhanced_summary = enhance_summary(len(code), report.summary, language_label)
    return SecurityReport(summary=enhanced_summary, issues=report.issues)


@app.post("/api/analyze", response_model=SecurityReport)
async def analyze_code(request: AnalyzeRequest) -> SecurityReport:
    """
    Analyze source code for security vulnerabilities using OpenAI Agents and Semgrep.

    Supports C# (.NET), Python, TypeScript/JavaScript, Java, Go, C/C++, PHP, Ruby, Rust, and more.
    """
    validate_request(request)
    check_api_keys()

    try:
        report, lang_label = await run_security_analysis(
            request.code, request.language, request.filename
        )
        return format_analysis_response(request.code, report, lang_label)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"message": "Cybersecurity Analyzer API"}


# Mount static files for frontend
if os.path.exists("static"):
    app.mount("/", StaticFiles(directory="static", html=True), name="static")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
