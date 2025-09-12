// backend/src/core/logger.js
const fs = require('fs').promises;
const path = require('path');

class Logger {
  constructor() {
    this.logDir = path.join(__dirname, '../../logs');
    this.levels = {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3
    };
    this.currentLevel = this.levels.INFO;
    this.initializeLogDirectory();
  }

  async initializeLogDirectory() {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
  }

  formatMessage(level, message, context = {}) {
    const timestamp = new Date().toISOString();
    const contextStr = Object.keys(context).length > 0 
      ? ` | ${JSON.stringify(context)}` 
      : '';
    
    return `[${timestamp}] [${level}] ${message}${contextStr}`;
  }

  async writeToFile(level, message) {
    const date = new Date().toISOString().split('T')[0];
    const logFile = path.join(this.logDir, `app-${date}.log`);
    
    try {
      await fs.appendFile(logFile, message + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  async log(level, message, context = {}) {
    const levelName = Object.keys(this.levels).find(
      key => this.levels[key] === level
    );
    
    if (level > this.currentLevel) return;

    const formattedMessage = this.formatMessage(levelName, message, context);
    
    // Console output with colors
    switch(level) {
      case this.levels.ERROR:
        console.error('\x1b[31m' + formattedMessage + '\x1b[0m');
        break;
      case this.levels.WARN:
        console.warn('\x1b[33m' + formattedMessage + '\x1b[0m');
        break;
      case this.levels.INFO:
        console.log('\x1b[36m' + formattedMessage + '\x1b[0m');
        break;
      case this.levels.DEBUG:
        console.log('\x1b[90m' + formattedMessage + '\x1b[0m');
        break;
    }
    
    // Write to file
    await this.writeToFile(levelName, formattedMessage);
  }

  error(message, context) {
    return this.log(this.levels.ERROR, message, context);
  }

  warn(message, context) {
    return this.log(this.levels.WARN, message, context);
  }

  info(message, context) {
    return this.log(this.levels.INFO, message, context);
  }

  debug(message, context) {
    return this.log(this.levels.DEBUG, message, context);
  }

  setLevel(level) {
    if (typeof level === 'string') {
      this.currentLevel = this.levels[level.toUpperCase()] || this.levels.INFO;
    } else {
      this.currentLevel = level;
    }
  }
}

module.exports = new Logger();