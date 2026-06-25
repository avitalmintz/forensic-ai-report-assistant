# Forensic AI Report Generator

A production web application built for [Fifth Avenue Forensics](https://fifthavenueforensics.com/) that helps forensic psychologists draft psychiatric evaluation reports for court proceedings. The application uses Anthropic's Claude through Amazon Bedrock to generate structured first drafts while keeping the clinician in control of every factual claim.

I designed, built, and deployed the application as the firm's sole technical resource. The application consists of a single-page frontend hosted on AWS Amplify, Amazon Cognito for clinician authentication, and an AWS Lambda backend that securely invokes Claude through Amazon Bedrock while streaming responses back to the browser.

## Background

Forensic psychiatric evaluations for the courts follow a strict format: relevant history, instant offense, mental status examination, and risk assessment, each with its own conventions for tone, attribution, and structure. Producing these reports from raw interview notes is slow, repetitive work, and the stakes (court testimony, parole decisions, competency evaluations, and other legal proceedings) leave no room for invented facts.

Because these evaluations contain protected health information, clinicians could not rely on consumer AI tools or a generic language model interface. Instead, the practice required a secure, authenticated application that standardized prompts, managed report templates, accepted evaluation notes through a controlled workflow, and invoked Claude through Amazon Bedrock within a HIPAA-eligible AWS environment. 

The goal was to reduce the repetitive work of drafting while ensuring the model never added, inferred, or softened any information the clinician did not provide.

## How it works

The clinician moves through a deliberate, staged workflow rather than a freeform chatbot:

1. **Insert the base prompt** that defines the report-writing task and its constraints.
2. **Select a disorder category** (Schizophrenia Spectrum, PTSD / Trauma, Bipolar / Mood) and **insert example reports** that demonstrate formatting only.
3. **Paste the standardized evaluation notes**, which are the sole source of factual content.
4. **Generate a structured first draft**, streamed back section by section and rendered as formatted text for review and editing.

Example reports always come before the notes. The model is instructed not to begin drafting until the clinician's notes are supplied, which keeps formatting separate from factual content.

## Design principles

The system prompt is designed around clinician oversight rather than automation:

- **Every factual statement must be traceable to the evaluation notes.** The model may organize and synthesize existing information but may not introduce new diagnoses, risk factors, recommendations, or reasoning.
- **Forensic attribution is enforced.** Self-reported information is framed as such ("the examinee reported"), record-derived information is attributed to records, and nothing is presented as independently verified unless the notes explicitly support it.
- **Missing information is flagged, not filled.** Where the report format expects content the notes do not supply, the draft inserts an explicit `INSERT ___ HERE` placeholder instead of guessing, so clinicians can catch gaps before finalizing.

These design choices make the application usable in a forensic setting, where a hallucinated detail is a legal liability, not just a mistake.

## Architecture

The stack runs entirely on Amazon Web Services (AWS), chosen so that protected health information never leaves HIPAA-eligible infrastructure. Each service was picked to meet a specific compliance or workflow need, not just to make the app run.

```
Browser (single-page app)
    │
    ├── Amazon Cognito ──── clinician authentication
    │
    └── AWS Lambda (Function URL, streaming)
            │
            └── Amazon Bedrock ──── Claude
```

AWS Amplify hosts the frontend and provides continuous deployment (CI/CD), separate from the runtime request path shown above.

- **Frontend:** Vanilla HTML/CSS/JavaScript single-page application, with disorder-specific templates and example reports embedded as reference data.
- **Authentication:** Amazon Cognito user pool limiting access to authorized clinicians.
- **Backend:** AWS Lambda exposed through a Function URL, securely invoking Claude through Amazon Bedrock and streaming responses back to the browser.
- **AI within AWS:** Claude runs through Amazon Bedrock rather than a third-party API, so evaluation notes stay inside the AWS environment. Practice data is not retained or used to train foundation models.
- **Deployment:** AWS Amplify (deployed internally as `claude-dashboard`).
- **Rendering:** Marked.js for Markdown output.

## Beyond the code

The project also included the operational work required to deploy the application within a clinical practice:

- Researched HIPAA requirements, evaluated HIPAA-eligible AWS services, designed the cloud architecture, and coordinated the Business Associate Agreement (BAA) required for deployment.
- Rolled out the application and onboarded clinicians across the practice.
- Wrote internal documentation describing the security model, deployment process, and clinician oversight workflow.
- Prepared a client-facing brief for court partners, including the Brooklyn Mental Health Court, explaining how AI was incorporated responsibly into the evaluation process.

## Tech stack

**Frontend:** HTML · CSS · JavaScript (Vanilla)

**Cloud:** AWS Lambda · Amazon Cognito · AWS Amplify

**AI:** Amazon Bedrock · Anthropic Claude

**Libraries:** Marked.js
