# Contributing to WhatsApp Health Assistant Chatbot

We love your input! We want to make contributing to this project as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## 🚀 Development Process

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

### Pull Requests Process

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that pull request!

## 🛠️ Local Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Git

### Setup Steps
```bash
# Clone your fork
git clone https://github.com/your-username/whatsapp-health-assistant.git
cd whatsapp-health-assistant

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Add your API keys to .env
# See README.md for how to get API keys

# Start development server
npm run dev
```

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- --testNamePattern="AI Service"

# Run tests in watch mode
npm run test:watch
```

### Adding Tests
- Place test files in `__tests__/` directory
- Use descriptive test names
- Test both success and error cases
- Mock external API calls

Example test structure:
```javascript
describe('Health Knowledge Service', () => {
  test('should return disease information for valid query', () => {
    // Test implementation
  });

  test('should handle invalid disease names gracefully', () => {
    // Test implementation
  });
});
```

## 📝 Coding Standards

### Code Style
- Use 2 spaces for indentation
- Use semicolons
- Use single quotes for strings
- Use meaningful variable names
- Add comments for complex logic

### File Structure
```
src/
├── controllers/     # Request handlers
├── services/        # Business logic
├── utils/          # Helper functions
├── middleware/     # Express middleware
└── data/           # Static data files
```

### Naming Conventions
- **Files**: camelCase (e.g., `aiService.js`)
- **Functions**: camelCase (e.g., `processHealthQuery`)
- **Classes**: PascalCase (e.g., `WhatsAppController`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRY_ATTEMPTS`)

## 🐛 Bug Reports

We use GitHub issues to track public bugs. Report a bug by [opening a new issue](https://github.com/your-username/whatsapp-health-assistant/issues).

### Great Bug Reports Include:
- A quick summary and/or background
- Steps to reproduce
  - Be specific!
  - Give sample code if you can
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

### Bug Report Template
```markdown
**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Send message '...'
2. Bot responds with '...'
3. Expected response was '...'

**Expected behavior**
A clear and concise description of what you expected to happen.

**Environment:**
- Deployment platform: [e.g., Azure, Render]
- Node.js version: [e.g., 18.17.0]
- WhatsApp provider: [e.g., Twilio]

**Additional context**
Add any other context about the problem here.
```

## 💡 Feature Requests

We welcome feature requests! Please:

1. **Check existing issues** to avoid duplicates
2. **Provide clear use case** - explain the problem you're trying to solve
3. **Consider alternatives** - what other solutions have you considered?
4. **Think about implementation** - how might this feature work?

### Feature Request Template
```markdown
**Is your feature request related to a problem?**
A clear and concise description of what the problem is.

**Describe the solution you'd like**
A clear and concise description of what you want to happen.

**Describe alternatives you've considered**
A clear and concise description of any alternative solutions or features you've considered.

**Additional context**
Add any other context or screenshots about the feature request here.
```

## 🏥 Health Content Guidelines

When contributing health-related content:

### Medical Accuracy
- **Verify information** with reliable medical sources
- **Include disclaimers** for medical advice
- **Avoid diagnosis** - provide general information only
- **Cultural sensitivity** - consider Indian healthcare context

### Reliable Sources
- WHO (World Health Organization)
- Indian Ministry of Health and Family Welfare
- AIIMS (All India Institute of Medical Sciences)
- Peer-reviewed medical journals

### Content Review Process
1. Medical content requires review by healthcare professionals
2. Include source citations for medical facts
3. Test with medical professionals when possible

## 🌐 Internationalization

### Adding New Languages
1. Add language detection to `languageService.js`
2. Add translations to health knowledge base
3. Update emergency contact numbers for region
4. Test with native speakers

### Translation Guidelines
- Use culturally appropriate medical terms
- Consider regional dialects
- Maintain medical accuracy in translation
- Include phonetic spelling for pronunciation

## 🔒 Security Guidelines

### Security Considerations
- **Never commit** API keys or secrets
- **Validate all inputs** to prevent injection attacks
- **Use HTTPS** for all external communications
- **Rate limit** to prevent abuse
- **Log security events** without exposing sensitive data

### Reporting Security Issues
Please email security issues to security@healthassistant.ai rather than posting publicly.

## 📚 Documentation

### Code Documentation
- Use JSDoc comments for functions and classes
- Include parameter types and return values
- Provide usage examples

Example:
```javascript
/**
 * Processes a health query and returns appropriate response
 * @param {string} query - User's health question
 * @param {string} language - Detected language code
 * @param {Object} context - User's conversation context
 * @returns {Promise<Object>} Response object with text and metadata
 */
async function processHealthQuery(query, language, context) {
  // Implementation
}
```

### API Documentation
- Document all endpoints
- Include request/response examples
- Specify error codes and messages

## 🎯 Contribution Areas

### High Priority
- Medical content expansion
- Language support improvements
- Performance optimizations
- Test coverage improvements

### Medium Priority
- UI/UX enhancements
- Analytics features
- Integration with more AI providers
- Voice quality improvements

### Good First Issues
- Documentation improvements
- Code cleanup
- Adding tests
- Minor bug fixes

Look for issues labeled `good first issue` or `help wanted`.

## 📋 Pull Request Checklist

Before submitting a pull request, please ensure:

- [ ] Code follows the style guidelines
- [ ] Self-review of code completed
- [ ] Comments added to hard-to-understand areas
- [ ] Documentation updated if needed
- [ ] Tests added/updated and passing
- [ ] No new linting errors
- [ ] Environment variables documented if added
- [ ] Breaking changes documented

## 🏆 Recognition

Contributors will be:
- Listed in the project's CONTRIBUTORS.md file
- Mentioned in release notes for significant contributions
- Given credit in documentation

## 📞 Questions?

Don't hesitate to ask questions by:
- Opening a GitHub issue with the `question` label
- Emailing developers@healthassistant.ai
- Joining our developer Discord (link in main README)

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to accessible healthcare technology! 🏥❤️