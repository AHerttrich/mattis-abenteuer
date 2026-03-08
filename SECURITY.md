# Security Policy

## Reporting a Vulnerability

**Please do NOT open a public issue for security vulnerabilities.**

Instead, email: **alexander.herttrich@gmail.com**

We commit to:
- **48-hour response** to acknowledge your report
- **Best-effort fix timeline** based on severity
- **Credit** in the release notes (if desired)

## Supported Versions

| Version | Supported |
|---|---|
| 0.x.x (current) | ✅ |
| < 0.1.0 | ❌ |

## Security Practices

| Practice | Implementation |
|---|---|
| **Dependency scanning** | Dependabot (weekly), `npm audit` in CI |
| **Secret detection** | Gitleaks pre-commit hook |
| **Code analysis** | ESLint security rules |
| **Secrets management** | `.env` locally (gitignored), never committed |
| **Supply chain** | Lock file committed, reviewed dependency updates |
| **SAST** | ESLint static analysis in CI pipeline |

## Scope

This is a client-side browser game with no server component. The primary security concerns are:

- **Dependency vulnerabilities** — malicious or vulnerable npm packages
- **Secret leakage** — API keys or credentials accidentally committed
- **Supply chain attacks** — compromised build tools or dependencies

Server-side security, authentication, and data encryption are out of scope for this project.
