# Contributing to Dytallix SDKs

First off, thanks for taking the time to contribute! 🎉

The following is a set of guidelines for contributing to the Dytallix SDKs. These are mostly guidelines, not rules. Use your best judgment, and feel free to propose changes to this document in a pull request.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [I Have a Question](#i-have-a-question)
- [I Want To Contribute](#i-want-to-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Enhancements](#suggesting-enhancements)
  - [Your First Code Contribution](#your-first-code-contribution)
  - [Pull Requests](#pull-requests)
- [Styleguides](#styleguides)
  - [Rust](#rust)
  - [TypeScript](#typescript)

## Code of Conduct

This project and everyone participating in it is governed by the [Dytallix Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## I Have a Question

> **Note:** Please don't file an issue to ask a question. You'll get faster results by using the resources below.

If you have questions about using the SDKs, contact us via:
- [GitHub Issues](https://github.com/DytallixHQ/Dytallix/issues) (tag with `question`)
- [Twitter/X @DytallixHQ](https://twitter.com/DytallixHQ)

## I Want To Contribute

### Reporting Bugs

This section guides you through submitting a bug report. Following these guidelines helps maintainers and the community understand your report, reproduce the behavior, and find related reports.

**Before Submitting a Bug Report:**
* **Check the [documentation](README.md)** or [Stack Overflow](https://stackoverflow.com/) to see if you might be using the function incorrectly.
* **Search** the existing issues to see if the bug has already been reported.

**How to Submit a Good Bug Report:**
* Use a clear and descriptive title.
* Describe the exact steps which reproduce the problem.
* Provide specific examples to demonstrate the steps.
* Describe the behavior you observed after following the steps.
* Explain which behavior you expected to see instead and why.
* Include screenshots and animated GIFs which show you following the described steps.

### Suggesting Enhancements

This section guides you through submitting an enhancement suggestion, including completely new features and minor improvements to existing functionality.

**How to Submit a Good Enhancement Suggestion:**
* Use a clear and descriptive title.
* Provide a step-by-step description of the suggested enhancement.
* Provide specific examples to demonstrate the need.
* Describe the current behavior and explain which behavior you expected to see instead.

### Pull Requests

The process described here has several goals:
- Maintain Dytallix's quality.
- Fix problems that are important to users.
- Engage the community in working toward the best possible SDK.

**Steps:**
1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes (`cargo test` for Rust, `npm test` for TS).
5. Make sure your code lints (`cargo clippy` / `npm run lint`).
6. Issue that pull request!

## Styleguides

### Rust
* Use `rustfmt` to format your code.
* Ensure `cargo clippy` passes without warnings.
* Follow standard Rust naming conventions (snake_case for functions/vars, PascalCase for types).

### TypeScript
* Use `Prettier` for formatting.
* Ensure `ESLint` passes.
* Use strict type definitions (avoid `any` where possible).

## License

By contributing, you agree that your contributions will be licensed under its Apache 2.0 License.
