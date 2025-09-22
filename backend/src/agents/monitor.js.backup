// backend/src/agents/monitor.js
const fs = require('fs').promises;
const path = require('path');

class MonitorAgent {
  constructor() {
    this.name = 'Monitor';
    this.logs = [];
    this.metrics = {
      executions: 0,
      errors: 0,
      warnings: 0,
      averageResponseTime: 0,
      uptime: Date.now(),
      agentStatus: new Map()
    };
    this.logDir = path.join(__dirname, '../../logs');
    this.initializeLogDirectory();
  }

  async initializeLogDirectory() {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
  }

  async trackExecution(agentName, operation, data) {
    const execution = {
      timestamp: new Date().toISOString(),
      agent: agentName,
      operation: operation,
      data: data,
      duration: 0,
      status: 'started'
    };

    const executionId = `${agentName}-${Date.now()}`;
    this.logs.push(execution);
    
    console.log(`
  MONITOR: Tracking ${agentName}
   Operation: ${operation}
   ID: ${executionId}
    `);

    // FIX: Capturar startTime corretamente
    const startTime = Date.now();

    return {
      executionId,
      startTime,
      complete: async (result, error = null) => {
        // FIX: Calcular duration corretamente
        execution.duration = Date.now() - startTime;
        execution.status = error ? 'failed' : 'completed';
        execution.result = result;
        execution.error = error;

        await this.logToFile(execution);
        this.updateMetrics(execution);
        
        if (error) {
          await this.handleError(agentName, error, execution);
        }

        return execution;
      }
    };
  }

  async logToFile(execution) {
    const logFileName = `${execution.agent}-${new Date().toISOString().split('T')[0]}.log`;
    const logPath = path.join(this.logDir, logFileName);
    
    const logEntry = `[${execution.timestamp}] ${execution.agent} - ${execution.operation}
Status: ${execution.status}
Duration: ${execution.duration}ms
${execution.error ? `Error: ${execution.error}` : ''}
${'-'.repeat(50)}\n`;

    try {
      await fs.appendFile(logPath, logEntry);
    } catch (error) {
      console.error('Failed to write log:', error);
    }
  }

  updateMetrics(execution) {
    this.metrics.executions++;
    
    if (execution.status === 'failed') {
      this.metrics.errors++;
    }
    
    // Update average response time
    const currentAvg = this.metrics.averageResponseTime;
    this.metrics.averageResponseTime = 
      (currentAvg * (this.metrics.executions - 1) + execution.duration) / this.metrics.executions;
    
    // Update agent status
    this.metrics.agentStatus.set(execution.agent, {
      lastExecution: execution.timestamp,
      status: execution.status,
      executionCount: (this.metrics.agentStatus.get(execution.agent)?.executionCount || 0) + 1
    });
  }

  async handleError(agentName, error, execution) {
    console.error(`
  ERROR DETECTED in ${agentName}
   Operation: ${execution.operation}
   Error: ${error.message || error}
   Time: ${execution.timestamp}
    `);

    // Log critical errors to separate file
    const criticalLogPath = path.join(this.logDir, 'critical-errors.log');
    const errorEntry = `[${execution.timestamp}] CRITICAL ERROR - ${agentName}
Operation: ${execution.operation}
Error: ${error.stack || error}
Data: ${JSON.stringify(execution.data, null, 2)}
${'='.repeat(50)}\n`;

    await fs.appendFile(criticalLogPath, errorEntry);

    // Send alert if error rate is high
    if (this.metrics.errors / this.metrics.executions > 0.1) {
      this.sendAlert('High error rate detected', {
        errorRate: `${(this.metrics.errors / this.metrics.executions * 100).toFixed(2)}%`,
        agent: agentName,
        recentErrors: this.metrics.errors
      });
    }
  }

  getSystemHealth() {
    const errorRate = this.metrics.executions > 0 
      ? (this.metrics.errors / this.metrics.executions * 100).toFixed(2)
      : 0;
    
    const uptime = Date.now() - this.metrics.uptime;
    const uptimeHours = Math.floor(uptime / 3600000);
    const uptimeMinutes = Math.floor((uptime % 3600000) / 60000);
    
    const health = {
      status: errorRate < 5 ? 'healthy' : errorRate < 15 ? 'degraded' : 'critical',
      metrics: {
        totalExecutions: this.metrics.executions,
        errorRate: `${errorRate}%`,
        averageResponseTime: `${Math.round(this.metrics.averageResponseTime)}ms`,
        uptime: `${uptimeHours}h ${uptimeMinutes}m`,
        activeAgents: this.metrics.agentStatus.size
      },
      // FIX: Corrigido de "agentagentStatuses" para "agentStatuses"
      agentStatuses: Array.from(this.metrics.agentStatus.entries()).map(([name, status]) => ({
        name,
        ...status
      }))
    };

    return health;
  }

  async generateDailyReport() {
    const report = {
      date: new Date().toISOString().split('T')[0],
      summary: {
        totalExecutions: this.metrics.executions,
        successfulExecutions: this.metrics.executions - this.metrics.errors,
        failedExecutions: this.metrics.errors,
        errorRate: `${((this.metrics.errors / this.metrics.executions) * 100).toFixed(2)}%`,
        averageResponseTime: `${Math.round(this.metrics.averageResponseTime)}ms`
      },
      agentPerformance: Array.from(this.metrics.agentStatus.entries()).map(([name, data]) => ({
        agent: name,
        executions: data.executionCount,
        lastRun: data.lastExecution,
        status: data.status
      })),
      topErrors: this.getTopErrors(),
      recommendations: this.generateRecommendations()
    };

    const reportPath = path.join(this.logDir, `daily-report-${report.date}.json`);
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    console.log(`
  DAILY REPORT GENERATED
   Date: ${report.date}
   Total Executions: ${report.summary.totalExecutions}
   Success Rate: ${100 - parseFloat(report.summary.errorRate)}%
   Avg Response: ${report.summary.averageResponseTime}
   Report saved to: ${reportPath}
    `);

    return report;
  }

  getTopErrors() {
    const errorCounts = {};
    this.logs
      .filter(log => log.error)
      .forEach(log => {
        const errorKey = log.error.message || log.error;
        errorCounts[errorKey] = (errorCounts[errorKey] || 0) + 1;
      });

    return Object.entries(errorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([error, count]) => ({ error, count }));
  }

  generateRecommendations() {
    const recommendations = [];
    
    const errorRate = (this.metrics.errors / this.metrics.executions) * 100;
    if (errorRate > 10) {
      recommendations.push('High error rate detected. Review error logs and implement fixes.');
    }

    if (this.metrics.averageResponseTime > 5000) {
      recommendations.push('Response times are slow. Consider optimizing agent performance.');
    }

    const inactiveAgents = Array.from(this.metrics.agentStatus.entries())
      .filter(([_, data]) => {
        const lastRun = new Date(data.lastExecution);
        const hoursSinceRun = (Date.now() - lastRun) / 3600000;
        return hoursSinceRun > 24;
      });

    if (inactiveAgents.length > 0) {
      recommendations.push(`${inactiveAgents.length} agents have been inactive for >24 hours.`);
    }

    if (recommendations.length === 0) {
      recommendations.push('System is running optimally. No actions required.');
    }

    return recommendations;
  }

  sendAlert(message, data) {
    console.log(`
  ALERT: ${message}
   ${JSON.stringify(data, null, 2)}
    `);
    // In production, this would send actual alerts (email, Slack, etc.)
  }

  async cleanup() {
    // Clean old logs (keep last 7 days)
    const files = await fs.readdir(this.logDir);
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;

    for (const file of files) {
      const filePath = path.join(this.logDir, file);
      const stats = await fs.stat(filePath);
      if (now - stats.mtime.getTime() > sevenDays) {
        await fs.unlink(filePath);
        console.log(`Cleaned old log: ${file}`);
      }
    }
  }
}

module.exports = MonitorAgent;