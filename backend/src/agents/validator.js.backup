// backend/src/agents/validator.js
const { ESLint } = require('eslint');
const acorn = require('acorn');

class ValidatorAgent {
  constructor() {
    this.name = 'Validator';
    this.eslint = new ESLint({
      baseConfig: {
        env: {
          es2021: true,
          node: true
        },
        parserOptions: {
          ecmaVersion: 12,
          sourceType: 'module'
        },
        rules: {
          'no-unused-vars': 'warn',
          'no-undef': 'error',
          'no-console': 'off',
          'semi': ['error', 'always'],
          'quotes': ['error', 'single']
        }
      }
    });
  }

  async validateCode(code, language = 'javascript') {
    console.log('VALIDATOR: Starting code validation...');
    
    const report = {
      valid: true,
      errors: [],
      warnings: [],
      security: [],
      quality: {
        complexity: 0,
        maintainability: 0,
        testability: 0
      },
      suggestions: []
    };

    try {
      // Syntax validation
      const syntaxCheck = this.validateSyntax(code, language);
      if (!syntaxCheck.valid) {
        report.valid = false;
        report.errors.push(...syntaxCheck.errors);
      }

      // Security checks
      const securityCheck = this.checkSecurity(code);
      report.security = securityCheck.issues;
      if (securityCheck.critical) {
        report.valid = false;
      }

      // Error handling validation
      const errorHandling = this.checkErrorHandling(code);
      if (!errorHandling.adequate) {
        report.warnings.push(...errorHandling.issues);
      }

      // Dependency validation
      const dependencies = this.validateDependencies(code);
      if (dependencies.missing.length > 0) {
        report.warnings.push(`Missing imports: ${dependencies.missing.join(', ')}`);
      }

      // Code quality metrics
      report.quality = this.calculateQualityMetrics(code);

      // Generate suggestions
      report.suggestions = this.generateSuggestions(code, report);

      // ESLint validation for JavaScript
      if (language === 'javascript') {
        const lintResults = await this.eslint.lintText(code);
        for (const result of lintResults) {
          for (const message of result.messages) {
            if (message.severity === 2) {
              report.errors.push(`Line ${message.line}: ${message.message}`);
            } else {
              report.warnings.push(`Line ${message.line}: ${message.message}`);
            }
          }
        }
      }

    } catch (error) {
      report.valid = false;
      report.errors.push(`Validation error: ${error.message}`);
    }

    this.logReport(report);
    return report;
  }

  validateSyntax(code, language) {
    const result = { valid: true, errors: [] };
    
    try {
      if (language === 'javascript') {
        acorn.parse(code, { ecmaVersion: 2021 });
      } else if (language === 'python') {
        // Basic Python syntax check (would need python-parser in real implementation)
        if (!code.includes('def ') && !code.includes('class ')) {
          result.warnings = ['No functions or classes defined'];
        }
      }
    } catch (error) {
      result.valid = false;
      result.errors.push(`Syntax error: ${error.message}`);
    }
    
    return result;
  }

  checkSecurity(code) {
    const issues = [];
    let critical = false;
    
    // Check for dangerous patterns
    const dangerousPatterns = [
      { pattern: /eval\(/, message: 'Use of eval() is dangerous', severity: 'critical' },
      { pattern: /exec\(/, message: 'Use of exec() can be dangerous', severity: 'critical' },
      { pattern: /\$\{.*\}/, message: 'Template literals in queries can cause injection', severity: 'warning' },
      { pattern: /password\s*=\s*["']/, message: 'Hardcoded password detected', severity: 'critical' },
      { pattern: /api[_-]?key\s*=\s*["']/, message: 'Hardcoded API key detected', severity: 'critical' }
    ];
    
    for (const check of dangerousPatterns) {
      if (check.pattern.test(code)) {
        issues.push({
          message: check.message,
          severity: check.severity
        });
        if (check.severity === 'critical') {
          critical = true;
        }
      }
    }
    
    return { issues, critical };
  }

  checkErrorHandling(code) {
    const issues = [];
    let adequate = true;
    
    // Check for try-catch blocks
    const tryCount = (code.match(/try\s*{/g) || []).length;
    const catchCount = (code.match(/catch\s*\(/g) || []).length;
    
    if (tryCount < catchCount) {
      issues.push('Mismatched try-catch blocks');
      adequate = false;
    }
    
    // Check for unhandled promises
    if (code.includes('async') || code.includes('await')) {
      if (!code.includes('try') && !code.includes('.catch')) {
        issues.push('Async code without error handling');
        adequate = false;
      }
    }
    
    // Check for error logging
    if (!code.includes('console.error') && !code.includes('logger')) {
      issues.push('No error logging found');
    }
    
    return { adequate, issues };
  }

  validateDependencies(code) {
    const imports = [];
    const missing = [];
    
    // Extract imports/requires
    const requirePattern = /require\(['"](.+?)['"]\)/g;
    const importPattern = /import .+ from ['"](.+?)['"]/g;
    
    let match;
    while ((match = requirePattern.exec(code)) !== null) {
      imports.push(match[1]);
    }
    while ((match = importPattern.exec(code)) !== null) {
      imports.push(match[1]);
    }
    
    // Check if common used modules are imported
    if (code.includes('express(') && !imports.includes('express')) {
      missing.push('express');
    }
    if (code.includes('fs.') && !imports.some(i => i.includes('fs'))) {
      missing.push('fs');
    }
    
    return { imports, missing };
  }

  calculateQualityMetrics(code) {
    const lines = code.split('\n');
    const totalLines = lines.length;
    const commentLines = lines.filter(l => l.trim().startsWith('//')).length;
    const emptyLines = lines.filter(l => l.trim() === '').length;
    const codeLines = totalLines - commentLines - emptyLines;
    
    // Cyclomatic complexity (simplified)
    const complexity = (code.match(/if\s*\(|for\s*\(|while\s*\(|case\s+/g) || []).length + 1;
    
    // Maintainability index (simplified)
    const maintainability = Math.max(0, Math.min(100, 
      171 - 5.2 * Math.log(codeLines) - 0.23 * complexity - 16.2 * Math.log(codeLines)
    ));
    
    // Testability (based on function count and size)
    const functionCount = (code.match(/function\s+\w+|=>\s*{|\w+\s*\(/g) || []).length;
    const avgFunctionSize = functionCount > 0 ? codeLines / functionCount : codeLines;
    const testability = avgFunctionSize < 20 ? 100 : Math.max(0, 100 - (avgFunctionSize - 20) * 2);
    
    return {
      complexity: Math.round(complexity),
      maintainability: Math.round(maintainability),
      testability: Math.round(testability),
      codeLines,
      commentRatio: Math.round((commentLines / totalLines) * 100)
    };
  }

  generateSuggestions(code, report) {
    const suggestions = [];
    
    if (report.quality.complexity > 10) {
      suggestions.push('Consider breaking down complex functions into smaller ones');
    }
    
    if (report.quality.commentRatio < 10) {
      suggestions.push('Add more comments to improve code documentation');
    }
    
    if (report.quality.testability < 50) {
      suggestions.push('Refactor large functions to improve testability');
    }
    
    if (!code.includes('test') && !code.includes('spec')) {
      suggestions.push('Consider adding unit tests for this code');
    }
    
    if (report.security.length > 0) {
      suggestions.push('Address security issues before deployment');
    }
    
    return suggestions;
  }

  logReport(report) {
    console.log(`
╔════════════════════════════════════════════╗
║            VALIDATION REPORT               ║
╠════════════════════════════════════════════╣
║ Status: ${report.valid ? 'VALID' : 'INVALID'}                       ║
║ Errors: ${String(report.errors.length).padEnd(35)}║
║ Warnings: ${String(report.warnings.length).padEnd(33)}║
║ Security Issues: ${String(report.security.length).padEnd(26)}║
║ Code Quality:                              ║
║   - Complexity: ${String(report.quality.complexity).padEnd(27)}║
║   - Maintainability: ${String(report.quality.maintainability).padEnd(22)}║
║   - Testability: ${String(report.quality.testability).padEnd(26)}║
╚════════════════════════════════════════════╝
    `);
    
    if (report.errors.length > 0) {
      console.log('❌ Errors:', report.errors);
    }
    if (report.warnings.length > 0) {
      console.log('⚠️ Warnings:', report.warnings);
    }
    if (report.suggestions.length > 0) {
      console.log('💡 Suggestions:', report.suggestions);
    }
  }
}

module.exports = ValidatorAgent;