// backend/src/core/metrics.js
class MetricsCollector {
    constructor() {
      this.metrics = {
        agentsCreated: 0,
        linesGenerated: 0,
        executionTimes: [],
        successCount: 0,
        failureCount: 0,
        agentsUsedToBuild: 0,
        timeSaved: 0,
        createdAgents: [],
        startTime: Date.now()
      };
    }
  
    recordAgentCreation(agentName, lines, time, success = true, createdByAgent = false) {
      this.metrics.agentsCreated++;
      this.metrics.linesGenerated += lines;
      this.metrics.executionTimes.push(time);
      
      if (success) {
        this.metrics.successCount++;
      } else {
        this.metrics.failureCount++;
      }
      
      if (createdByAgent) {
        this.metrics.agentsUsedToBuild++;
      }
      
      // Assuming 10 lines per hour manual coding
      this.metrics.timeSaved += (lines / 10) * 60; // in minutes
      
      this.metrics.createdAgents.push({
        name: agentName,
        lines: lines,
        time: time,
        timestamp: new Date().toISOString(),
        createdByABBA: createdByAgent
      });
      
      this.logMetrics(agentName, lines, createdByAgent);
    }
  
    logMetrics(agentName, lines, createdByAgent) {
      const source = createdByAgent ? '🤖 ABBA' : '👤 Manual';
      console.log(`
  ╔════════════════════════════════════════════╗
  ║              METRICS UPDATE                ║
  ╠════════════════════════════════════════════╣
  ║ Agent Created: ${agentName.padEnd(28)}     ║
  ║ Lines of Code: ${String(lines).padEnd(28)} ║
  ║ Created by: ${source.padEnd(31)}           ║
  ║ Total Agents: ${String(this.metrics.agentsCreated).padEnd(29)}║
  ║ Total Lines: ${String(this.metrics.linesGenerated).padEnd(30)}║
  ║ Success Rate: ${this.getSuccessRate().padEnd(29)}║
  ║ Time Saved: ${this.getTimeSaved().padEnd(31)}║
  ║ Acceleration: ${this.getAcceleration().padEnd(29)}║
  ╚════════════════════════════════════════════╝
      `);
    }
  
    getSuccessRate() {
      const total = this.metrics.successCount + this.metrics.failureCount;
      if (total === 0) return '0%';
      return `${Math.round((this.metrics.successCount / total) * 100)}%`;
    }
  
    getTimeSaved() {
      const hours = Math.floor(this.metrics.timeSaved / 60);
      const minutes = Math.round(this.metrics.timeSaved % 60);
      return `${hours}h ${minutes}m`;
    }
  
    getAcceleration() {
      if (this.metrics.executionTimes.length === 0) return '1x';
      const avgTime = this.metrics.executionTimes.reduce((a, b) => a + b, 0) / this.metrics.executionTimes.length;
      const manualTime = (this.metrics.linesGenerated / 10) * 3600000; // ms for manual coding
      const acceleration = manualTime / (avgTime * this.metrics.agentsCreated);
      return `${acceleration.toFixed(1)}x`;
    }
  
    getMetrics() {
      return {
        ...this.metrics,
        successRate: this.getSuccessRate(),
        timeSavedFormatted: this.getTimeSaved(),
        acceleration: this.getAcceleration(),
        avgExecutionTime: this.metrics.executionTimes.length > 0 
          ? Math.round(this.metrics.executionTimes.reduce((a, b) => a + b, 0) / this.metrics.executionTimes.length)
          : 0
      };
    }
  
    getDailyReport() {
      const runtime = Date.now() - this.metrics.startTime;
      const hours = Math.floor(runtime / 3600000);
      const minutes = Math.floor((runtime % 3600000) / 60000);
      
      return {
        date: new Date().toLocaleDateString(),
        runtime: `${hours}h ${minutes}m`,
        agentsCreated: this.metrics.agentsCreated,
        agentsByABBA: this.metrics.agentsUsedToBuild,
        totalLines: this.metrics.linesGenerated,
        successRate: this.getSuccessRate(),
        timeSaved: this.getTimeSaved(),
        acceleration: this.getAcceleration(),
        topAgents: this.metrics.createdAgents
          .sort((a, b) => b.lines - a.lines)
          .slice(0, 5)
      };
    }
  }
  
  module.exports = new MetricsCollector();