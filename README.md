# Forensic AI Report Generator

A web application built for [Fifth Avenue Forensics](https://fifthavenueforensics.com/) that uses Claude AI to assist forensic psychologists in generating structured psychiatric evaluation reports for court proceedings.

## Overview

Forensic psychiatric evaluations require detailed, structured reports covering relevant history, instant offenses, mental status examination, and risk assessment. This tool streamlines the report drafting process by allowing clinicians to input evaluation notes and receive AI-generated structured reports that follow court-mandated formatting requirements.

Built and deployed as the sole developer while working as an AI Consultant at Fifth Avenue Forensics.

## Architecture

```
Browser (index.html)
    |
    ├── AWS Cognito ── Authentication (clinician login)
    |
    └── AWS Lambda ── Claude API ── Streaming report generation
    |
    └── AWS Amplify ── Static hosting + CI/CD
```

- **Frontend**: Single-page application with disorder-specific templates (Schizophrenia Spectrum, PTSD/Trauma, Bipolar/Mood Disorders)
- **Authentication**: AWS Cognito user pool with secure clinician access
- **Backend**: AWS Lambda function calling Claude API with streaming responses
- **Deployment**: AWS Amplify with HIPAA-compliant infrastructure
- **AI**: Anthropic Claude for structured report generation with domain-specific prompting

## Features

- Disorder-category selection with tailored report templates
- Real-time streaming AI responses
- Structured output following court report standards (Relevant History, Instant Offenses, Mental Status Examination, Risk Assessment)
- Secure authentication for authorized clinicians only
- Markdown rendering for formatted report output

## Tech Stack

- HTML/CSS/JavaScript (vanilla)
- AWS Lambda, Cognito, Amplify
- Anthropic Claude API
- Marked.js for markdown rendering
