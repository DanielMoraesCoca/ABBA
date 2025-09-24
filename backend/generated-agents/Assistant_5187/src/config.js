module.exports = {
    name: 'Assistant_5187',
    version: '1.0.0',
    environment: {
  "NODE_ENV": "development",
  "PORT": 3662,
  "LOG_LEVEL": "debug"
},
    features: {
  "rateLimit": false,
  "authentication": false,
  "caching": false,
  "monitoring": true,
  "errorHandling": true
},
    performance: {
  "maxConcurrent": 10,
  "timeout": 30000,
  "retries": 3
}
};