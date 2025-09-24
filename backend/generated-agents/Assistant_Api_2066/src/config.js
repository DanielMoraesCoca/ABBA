module.exports = {
    name: 'Assistant_Api_2066',
    version: '1.0.0',
    environment: {
  "NODE_ENV": "development",
  "PORT": 3324,
  "LOG_LEVEL": "debug"
},
    features: {
  "rateLimit": false,
  "authentication": true,
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