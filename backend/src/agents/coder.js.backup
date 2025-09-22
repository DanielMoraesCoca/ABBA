/**
 * Coder Agent - Gera código funcional para os agentes
 */

class CoderAgent {
    constructor() {
      this.id = 'coder';
      
      // Templates de código base
      this.codeTemplates = {
        index: `const express = require('express');
  const cors = require('cors');
  const dotenv = require('dotenv');
  
  dotenv.config();
  
  class {{agentName}} {
    constructor() {
      this.name = '{{agentName}}';
      this.version = '1.0.0';
      this.capabilities = {{capabilities}};
      this.app = express();
      this.setupMiddleware();
      this.setupRoutes();
    }
  
    setupMiddleware() {
      this.app.use(cors());
      this.app.use(express.json());
    }
  
    setupRoutes() {
      this.app.get('/health', (req, res) => {
        res.json({ status: 'ok', agent: this.name });
      });
      
      this.app.post('/execute', async (req, res) => {
        try {
          const result = await this.process(req.body);
          res.json({ success: true, result });
        } catch (error) {
          res.status(500).json({ success: false, error: error.message });
        }
      });
    }
  
    async process(input) {
      // Main processing logic here
      console.log('Processing:', input);
      {{processingLogic}}
      return { processed: true, timestamp: new Date() };
    }
  
    start(port = {{port}}) {
      this.app.listen(port, () => {
        console.log(\`\${this.name} running on port \${port}\`);
      });
    }
  }
  
  module.exports = {{agentName}};
  
  // Auto-start if run directly
  if (require.main === module) {
    const agent = new {{agentName}}();
    agent.start();
  }`,
  
        messageHandler: `class MessageHandler {
    constructor() {
      this.patterns = {{patterns}};
    }
  
    async handle(message) {
      console.log('Handling message:', message);
      
      // Extract intent
      const intent = this.extractIntent(message);
      
      // Process based on intent
      const response = await this.processIntent(intent, message);
      
      return response;
    }
  
    extractIntent(message) {
      const text = message.toLowerCase();
      {{intentLogic}}
      return 'default';
    }
  
    async processIntent(intent, message) {
      switch(intent) {
        {{intentCases}}
        default:
          return this.defaultResponse(message);
      }
    }
  
    defaultResponse(message) {
      return {
        text: 'Message received and processed',
        original: message,
        timestamp: new Date()
      };
    }
  }
  
  module.exports = MessageHandler;`,
  
        dataService: `class DataService {
    constructor() {
      this.config = {{config}};
    }
  
    async query(params) {
      console.log('Querying with:', params);
      {{queryLogic}}
      return { data: [], count: 0 };
    }
  
    async insert(data) {
      console.log('Inserting:', data);
      {{insertLogic}}
      return { success: true, id: Date.now() };
    }
  
    async update(id, data) {
      console.log('Updating:', id, data);
      {{updateLogic}}
      return { success: true, updated: 1 };
    }
  
    async delete(id) {
      console.log('Deleting:', id);
      {{deleteLogic}}
      return { success: true, deleted: 1 };
    }
  }
  
  module.exports = DataService;`
      };
    }
  
    /**
     * Processa arquitetura e gera código
     */
    async process(message, context) {
      console.log('CODER: Generating code from architecture...');
      
      const architecture = message;
      
      // Gerar código para cada arquivo na arquitetura
      const generatedCode = {
        agentId: architecture.agentId,
        name: architecture.name,
        files: {},
        package: this.generatePackageJson(architecture),
        readme: this.generateReadme(architecture),
        totalFiles: 0,
        totalLines: 0
      };
      
      // Gerar arquivo principal (index.js)
      generatedCode.files['index.js'] = this.generateMainFile(architecture);
      
      // Gerar arquivos por estrutura
      for (const [folder, files] of Object.entries(architecture.fileStructure)) {
        for (const file of files) {
          const code = this.generateFileCode(file, architecture);
          const filePath = `${folder}/${file}`.replace('//', '/');
          generatedCode.files[filePath] = code;
        }
      }
      
      // Calcular métricas
      generatedCode.totalFiles = Object.keys(generatedCode.files).length;
      generatedCode.totalLines = Object.values(generatedCode.files)
        .reduce((sum, code) => sum + code.split('\n').length, 0);
      
      console.log(`CODER: Generated ${generatedCode.totalFiles} files with ${generatedCode.totalLines} lines of code`);
      
      return generatedCode;
    }
  
    /**
     * Gera arquivo principal
     */
    generateMainFile(architecture) {
      let code = this.codeTemplates.index;
      
      // Substituir placeholders
      code = code.replace(/{{agentName}}/g, architecture.name.replace(/[^a-zA-Z0-9]/g, ''));
      code = code.replace('{{capabilities}}', JSON.stringify(architecture.capabilities || []));
      code = code.replace('{{port}}', architecture.config?.environment?.PORT || 3000);
      
      // Adicionar lógica de processamento baseada no tipo
      let processingLogic = '';
      switch(architecture.type) {
        case 'support':
          processingLogic = `
      // Support agent logic
      const response = await this.handleSupportRequest(input);`;
          break;
        case 'analyst':
          processingLogic = `
      // Analyst agent logic
      const analysis = await this.analyzeData(input);`;
          break;
        case 'assistant':
          processingLogic = `
      // Assistant agent logic
      const task = await this.executeTask(input);`;
          break;
        default:
          processingLogic = `
      // Generic processing
      const result = await this.genericProcess(input);`;
      }
      
      code = code.replace('{{processingLogic}}', processingLogic);
      
      return code;
    }
  
    /**
     * Gera código para arquivo específico
     */
    generateFileCode(filename, architecture) {
      // Identificar tipo de arquivo
      if (filename.includes('Handler')) {
        return this.generateHandler(filename, architecture);
      } else if (filename.includes('Service')) {
        return this.generateService(filename, architecture);
      } else if (filename.includes('config')) {
        return this.generateConfig(architecture);
      } else if (filename.includes('utils') || filename.includes('validator')) {
        return this.generateUtils(filename);
      }
      
      // Arquivo genérico
      return this.generateGenericFile(filename, architecture);
    }
  
    /**
     * Gera handler
     */
    generateHandler(filename, architecture) {
      let code = this.codeTemplates.messageHandler;
      
      // Customizar baseado no tipo de handler
      const handlerType = filename.replace('Handler.js', '').toLowerCase();
      
      let patterns = [];
      let intentLogic = '';
      let intentCases = '';
      
      if (handlerType === 'message') {
        patterns = ['greeting', 'question', 'command'];
        intentLogic = `
      if (text.includes('olá') || text.includes('oi')) return 'greeting';
      if (text.includes('?')) return 'question';
      if (text.startsWith('/')) return 'command';`;
        intentCases = `
        case 'greeting':
          return { text: 'Olá! Como posso ajudar?' };
        case 'question':
          return { text: 'Vou verificar isso para você.' };
        case 'command':
          return await this.executeCommand(message);`;
      }
      
      code = code.replace('{{patterns}}', JSON.stringify(patterns));
      code = code.replace('{{intentLogic}}', intentLogic);
      code = code.replace('{{intentCases}}', intentCases);
      
      return code;
    }
  
    /**
     * Gera service
     */
    generateService(filename, architecture) {
      let code = this.codeTemplates.dataService;
      
      const config = {
        database: architecture.dependencies?.includes('pg') ? 'postgresql' : 'memory',
        cache: architecture.dependencies?.includes('redis'),
      };
      
      code = code.replace('{{config}}', JSON.stringify(config));
      
      // Adicionar lógica específica
      if (config.database === 'postgresql') {
        code = code.replace('{{queryLogic}}', `
      // PostgreSQL query
      const client = await this.getClient();
      const result = await client.query('SELECT * FROM data WHERE ?', params);
      return result.rows;`);
      } else {
        code = code.replace('{{queryLogic}}', `
      // In-memory query
      return this.data.filter(item => item.match(params));`);
      }
      
      // Simplificar outros métodos
      code = code.replace('{{insertLogic}}', '// Insert implementation');
      code = code.replace('{{updateLogic}}', '// Update implementation');
      code = code.replace('{{deleteLogic}}', '// Delete implementation');
      
      return code;
    }
  
    /**
     * Gera arquivo de configuração
     */
    generateConfig(architecture) {
      const config = architecture.config || {};
      
      return `module.exports = {
    name: '${config.name}',
    version: '${config.version}',
    environment: ${JSON.stringify(config.environment, null, 2)},
    features: ${JSON.stringify(config.features, null, 2)},
    performance: ${JSON.stringify(config.performance, null, 2)}
  };`;
    }
  
    /**
     * Gera utilitários
     */
    generateUtils(filename) {
      if (filename.includes('validator')) {
        return `class Validator {
    static validate(data, rules) {
      const errors = [];
      
      for (const [field, rule] of Object.entries(rules)) {
        if (rule.required && !data[field]) {
          errors.push(\`\${field} is required\`);
        }
        if (rule.type && typeof data[field] !== rule.type) {
          errors.push(\`\${field} must be \${rule.type}\`);
        }
      }
      
      return { valid: errors.length === 0, errors };
    }
  }
  
  module.exports = Validator;`;
      }
      
      return `// Utility functions
  module.exports = {
    formatDate: (date) => new Date(date).toISOString(),
    generateId: () => Date.now().toString(36),
    sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms))
  };`;
    }
  
    /**
     * Gera arquivo genérico
     */
    generateGenericFile(filename, architecture) {
      const className = filename.replace('.js', '').replace(/^\w/, c => c.toUpperCase());
      
      return `class ${className} {
    constructor() {
      this.name = '${className}';
    }
    
    async execute(params) {
      console.log('Executing ${className}:', params);
      // Implementation here
      return { success: true };
    }
  }
  
  module.exports = ${className};`;
    }
  
    /**
     * Gera package.json
     */
    generatePackageJson(architecture) {
      return {
        name: architecture.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        version: '1.0.0',
        description: `Agent: ${architecture.name}`,
        main: 'index.js',
        scripts: {
          start: 'node index.js',
          dev: 'nodemon index.js',
          test: 'echo "No tests yet"'
        },
        dependencies: architecture.dependencies.reduce((deps, dep) => {
          deps[dep] = 'latest';
          return deps;
        }, {}),
        devDependencies: {
          nodemon: '^3.0.0'
        }
      };
    }
  
    /**
     * Gera README
     */
    generateReadme(architecture) {
      return `# ${architecture.name}
  
  ## Description
  ${architecture.type} agent with ${architecture.capabilities?.join(', ')} capabilities.
  
  ## Installation
  \`\`\`bash
  npm install
  \`\`\`
  
  ## Usage
  \`\`\`bash
  npm start
  \`\`\`
  
  ## Architecture
  - Type: ${architecture.type}
  - Complexity: ${architecture.complexity}
  - Files: ${architecture.estimatedFiles}
  - Estimated LOC: ${architecture.estimatedLinesOfCode}
  
  ## Data Flow
  ${architecture.dataFlow?.join(' → ')}
  
  ## Dependencies
  ${architecture.dependencies?.join(', ')}
  
  ---
  Generated by ABBA Platform
  `;
    }
  }
  
  module.exports = CoderAgent;