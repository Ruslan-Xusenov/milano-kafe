# AGENTS.md

## Repository Overview

This repository is a multi-language monorepo containing services, libraries, tools, and shared components.

Primary languages:
- Python
- Go
- JavaScript
- TypeScript
- Java

The objective is to keep the codebase maintainable, consistent, secure, and well-tested.

---

# General Rules

- Always understand the existing code before making changes.
- Prefer modifying existing files instead of creating new ones.
- Never introduce breaking changes unless explicitly requested.
- Keep changes as small and focused as possible.
- Preserve backward compatibility whenever feasible.
- Avoid unnecessary refactoring.

---

# Code Style

## General

- Write clean, readable code.
- Use meaningful names.
- Remove unused imports and dead code.
- Avoid duplicated logic.
- Follow the project's existing conventions.

---

## Python

- Follow PEP 8.
- Prefer type hints.
- Use dataclasses where appropriate.
- Keep functions small.
- Prefer pathlib over os.path.

---

## Go

- Follow standard Go formatting.
- Keep packages focused.
- Return errors instead of panicking.
- Avoid global mutable state.

---

## JavaScript / TypeScript

- Prefer TypeScript for new code.
- Use ES Modules.
- Avoid `any` unless unavoidable.
- Prefer async/await.
- Keep functions pure where possible.

---

## Java

- Follow standard Java conventions.
- Prefer composition over inheritance.
- Avoid unnecessary object creation.
- Keep classes focused on a single responsibility.

---

# Testing

Before finishing work:

- Run relevant tests.
- Do not ignore failing tests.
- Add tests for new features when appropriate.
- Avoid reducing existing test coverage.

---

# Formatting

Format modified files using the project's formatter if available.

Examples:

- Python → black / ruff
- Go → gofmt
- JS/TS → prettier
- Java → google-java-format

---

# Dependencies

Before adding new dependencies:

- Check whether an existing dependency already solves the problem.
- Prefer standard libraries.
- Minimize dependency bloat.

---

# Documentation

Update documentation whenever:

- Public APIs change.
- Configuration changes.
- Commands change.
- Developer workflows change.

---

# Security

Never:

- Commit secrets.
- Commit API keys.
- Commit passwords.
- Commit tokens.
- Commit certificates containing private keys.

Mask sensitive information in logs.

---

# Git

Keep commits:

- Small
- Atomic
- Descriptive

Avoid unrelated changes.

---

# Performance

Prefer simple solutions first.

Optimize only after identifying bottlenecks.

Avoid premature optimization.

---

# Project Structure

Possible directories include:

- apps/
- services/
- packages/
- libs/
- tools/
- scripts/
- docs/
- infrastructure/

Respect existing architecture.

---

# Before Completing Any Task

Always verify:

- Code builds successfully.
- Tests pass.
- Formatting is correct.
- No obvious lint issues remain.
- Documentation is updated if necessary.

If verification cannot be performed, clearly state what could not be verified and why.