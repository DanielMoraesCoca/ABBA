// backend/src/agents/code-reviewer.js
class CodeReviewerAgent {
    constructor() {
      this.name = 'CodeReviewer';
      this.reviewChecks = [
        'naming-conventions',
        'error-handling',
        'documentation',
        'performance',
        'security',
        'maintainability'
      ];
    }
  
    async reviewCode(code, filename) {
      console.log(`CODE REVIEWER: Analyzing ${filename}...`);
      
      const review = {
        filename,
        score: 0,
        issues: [],
        suggestions: [],
        strengths: []
      };
  
      // Check naming conventions
      this.checkNamingConventions(code, review);
      
      // Check error handling
      this.checkErrorHandling(code, review);
      
      // Check documentation
      this.checkDocumentation(code, review);
      
      // Check for common issues
      this.checkCommonIssues(code, review);
      
      // Calculate final score
      review.score = this.calculateScore(review);
      
      return review;
    }
  
    checkNamingConventions(code, review) {
      // Check for camelCase in variables
      const badVarNames = code.match(/\b[a-z]+_[a-z]+\b/g);
      if (badVarNames) {
        review.issues.push({
          type: 'naming',
          severity: 'low',
          message: `Found snake_case variables: ${badVarNames.join(', ')}. Use camelCase.`
        });
      }
  
      // Check for PascalCase in classes
      const classPattern = /class\s+([a-z][a-zA-Z]*)/g;
      let match;
      while ((match = classPattern.exec(code)) !== null) {
        review.issues.push({
          type: 'naming',
          severity: 'medium',
          message: `Class '${match[1]}' should start with uppercase (PascalCase)`
        });
      }
  
      // Good naming found
      if (!badVarNames && !match) {
        review.strengths.push('Good naming conventions');
      }
    }
  
    checkErrorHandling(code, review) {
      // Check for try-catch blocks
      const tryCount = (code.match(/try\s*{/g) || []).length;
      const catchCount = (code.match(/catch\s*\(/g) || []).length;
      
      if (tryCount === 0 && code.includes('async')) {
        review.issues.push({
          type: 'error-handling',
          severity: 'high',
          message: 'Async code without try-catch blocks'
        });
      }
  
      // Check for unhandled promises
      if (code.includes('.then(') && !code.includes('.catch(')) {
        review.issues.push({
          type: 'error-handling',
          severity: 'medium',
          message: 'Promises without .catch() handlers'
        });
      }
  
      if (tryCount > 0) {
        review.strengths.push('Has error handling');
      }
    }
  
    checkDocumentation(code, review) {
      const lines = code.split('\n');
      const codeLines = lines.filter(l => l.trim() && !l.trim().startsWith('//')).length;
      const commentLines = lines.filter(l => l.trim().startsWith('//')).length;
      
      const commentRatio = commentLines / (codeLines + commentLines);
      
      if (commentRatio < 0.1) {
        review.issues.push({
          type: 'documentation',
          severity: 'low',
          message: 'Code lacks sufficient comments (< 10%)'
        });
      } else if (commentRatio > 0.15) {
        review.strengths.push('Well documented code');
      }
  
      // Check for JSDoc comments
      if (code.includes('/**') && code.includes('*/')) {
        review.strengths.push('Has JSDoc documentation');
      }
    }
  
    checkCommonIssues(code, review) {
      // Check for console.log in production code
      const consoleLogs = (code.match(/console\.log/g) || []).length;
      if (consoleLogs > 5) {
        review.suggestions.push('Consider using a proper logging system instead of console.log');
      }
  
      // Check for hardcoded values
      if (code.match(/localhost:\d+|127\.0\.0\.1/)) {
        review.issues.push({
          type: 'configuration',
          severity: 'medium',
          message: 'Hardcoded localhost URLs found. Use environment variables.'
        });
      }
  
      // Check for TODO comments
      const todos = (code.match(/TODO|FIXME|XXX/g) || []).length;
      if (todos > 0) {
        review.suggestions.push(`Found ${todos} TODO/FIXME comments that need attention`);
      }
  
      // Check for security issues
      if (code.includes('eval(')) {
        review.issues.push({
          type: 'security',
          severity: 'critical',
          message: 'Use of eval() is a security risk'
        });
      }
    }
  
    calculateScore(review) {
      let score = 100;
      
      // Deduct points for issues
      review.issues.forEach(issue => {
        switch(issue.severity) {
          case 'critical': score -= 20; break;
          case 'high': score -= 10; break;
          case 'medium': score -= 5; break;
          case 'low': score -= 2; break;
        }
      });
      
      // Add points for strengths
      score += review.strengths.length * 3;
      
      return Math.max(0, Math.min(100, score));
    }
  
    async reviewProject() {
      const fs = require('fs').promises;
      const path = require('path');
      const srcDir = path.join(__dirname, '..');
      
      const files = [
        'index.js',
        'agents/orchestrator.js',
        'agents/interpreter.js',
        'agents/architect.js',
        'agents/coder.js',
        'core/mcp-server.js'
      ];
      
      const projectReview = {
        totalScore: 0,
        fileReviews: [],
        summary: {
          totalIssues: 0,
          criticalIssues: 0,
          suggestions: []
        }
      };
      
      for (const file of files) {
        try {
          const filePath = path.join(srcDir, file);
          const code = await fs.readFile(filePath, 'utf8');
          const review = await this.reviewCode(code, file);
          
          projectReview.fileReviews.push(review);
          projectReview.totalScore += review.score;
          projectReview.summary.totalIssues += review.issues.length;
          projectReview.summary.criticalIssues += 
            review.issues.filter(i => i.severity === 'critical').length;
        } catch (error) {
          console.error(`Could not review ${file}:`, error.message);
        }
      }
      
      projectReview.totalScore = Math.round(projectReview.totalScore / files.length);
      
      this.printReviewReport(projectReview);
      return projectReview;
    }
  
    printReviewReport(review) {
      console.log('\n' + '='.repeat(50));
      console.log('         CODE REVIEW REPORT         ');
      console.log('='.repeat(50));
      console.log(`Overall Score: ${review.totalScore}/100`);
      console.log(`Total Issues: ${review.summary.totalIssues}`);
      console.log(`Critical Issues: ${review.summary.criticalIssues}`);
      console.log('\nFile Reviews:');
      console.log('-'.repeat(50));
      
      review.fileReviews.forEach(fileReview => {
        console.log(`\n📄 ${fileReview.filename}`);
        console.log(`   Score: ${fileReview.score}/100`);
        console.log(`   Issues: ${fileReview.issues.length}`);
        console.log(`   Strengths: ${fileReview.strengths.join(', ') || 'None identified'}`);
        
        if (fileReview.issues.length > 0) {
          console.log('   Issues Found:');
          fileReview.issues.forEach(issue => {
            console.log(`     - [${issue.severity.toUpperCase()}] ${issue.message}`);
          });
        }
      });
      
      console.log('\n' + '='.repeat(50));
    }
  }
  
  module.exports = CodeReviewerAgent;