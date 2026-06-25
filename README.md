# Forensic AI Report Generator

A web application built for [Fifth Avenue Forensics](https://fifthavenueforensics.com/) that helps forensic psychologists draft structured psychiatric evaluation reports for court proceedings, with the clinician kept in control of every factual claim.

I built and deployed it as the firm's sole technical resource. It runs entirely on AWS, which was a deliberate choice: because the tool handles patient notes, the architecture had to meet HIPAA requirements, so a good part of the work was researching those requirements and the relevant legal guidelines and setting up the AWS services to match.

## Background

Forensic psychiatric evaluations for the courts follow a strict format: relevant history, instant offenses, mental status examination, and risk assessment, each with its own conventions for tone, attribution, and structure. Producing a first draft from raw interview notes is slow, repetitive work, and the stakes (court testimony, parole and competency determinations) leave no room for invented facts.

The aim was to take the repetitive drafting off the clinician's plate without ever letting the model add, infer, or soften anything they did not write.

## How it works

The clinician moves through a deliberate, staged workflow rather than a freeform chatbot:

1. **Insert the base prompt** that defines the report-writing task and its constraints.
2. **Select a disorder category** (Schizophrenia Spectrum, PTSD / Trauma, Bipolar / Mood) and **insert example reports** that demonstrate formatting only.
3. **Paste the standardized evaluation notes**, which are the sole source of factual content.
4. **Generate a structured first draft**, streamed back section by section and rendered as formatted text for review and editing.

The staging is intentional. Examples are provided strictly for format, and the model is instructed not to begin drafting until the notes arrive, so style and substance never bleed together.

## Design principles

The system prompt does most of the careful work, and it is built around clinician oversight rather than automation:

- **Every factual statement must be traceable to the notes.** The model may organize and synthesize what is already there, but may not introduce new diagnoses, risk factors, recommendations, or reasoning.
- **Forensic attribution is enforced.** Self-reported information is framed as such ("the examinee reported"), record-derived information is attributed to records, and nothing is presented as independently verified unless the notes say so.
- **Missing information is flagged, not filled.** Where the format expects content the notes do not supply, the draft inserts an explicit `INSERT ___ HERE` placeholder instead of guessing, so gaps surface for the clinician rather than hiding.

These choices are what make the tool usable in a setting where a hallucinated detail is not a bug but a liability.

## Architecture

The whole system is built on Amazon Web Services (AWS), chosen specifically so that protected health information never leaves HIPAA-eligible infrastructure. Each service was selected to satisfy a particular compliance or workflow requirement, not just to make the app run.

```
Browser (single-page app)
    |
    ├── Amazon Cognito ──── clinician authentication
    |
    └── AWS Lambda (Function URL, streaming)
              |
              └── Amazon Bedrock ──── Claude
    |
  AWS Amplify ──── hosting + CI/CD
```

- **Frontend**: Vanilla HTML/CSS/JavaScript single-page app, with disorder-specific templates and example reports embedded as inert data blocks.
- **Authentication**: Amazon Cognito user pool, limiting access to authorized clinicians.
- **Backend**: AWS Lambda exposed via a Function URL, calling Claude through Amazon Bedrock with responses streamed back to the browser.
- **AI within AWS**: Claude is accessed through Amazon Bedrock rather than a third-party API, so the model runs inside AWS and evaluation notes never leave the HIPAA-eligible environment, with no data retention and no training on practice data.
- **Deployment**: AWS Amplify (the app was deployed as `claude-dashboard`).
- **Rendering**: Marked.js for Markdown output.

## Beyond the code

The application shipped alongside the work that made it safe to use in practice:

- Researching HIPAA and the applicable legal guidelines and putting a Business Associate Agreement (BAA) in place with AWS to cover the infrastructure.
- Rollout and onboarding across the practice for clinician users.
- Internal documentation describing the data safeguards and the clinician-oversight model.
- A client-facing brief prepared for court partners (including the Brooklyn Mental Health Court) explaining how AI was being used responsibly in the evaluation process.

## Tech stack

HTML/CSS/JavaScript (vanilla) · AWS Lambda · Amazon Cognito · Amazon Bedrock (Claude) · AWS Amplify · Marked.js
