/**
 * Coder Agent - Gera código funcional para os agentes
 */

const path = require('path');

class CoderAgent {
    constructor() {
        this.name = 'Coder';
        this.role = 'code_generation';
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
        try {
            // Main processing logic here
            console.log('Processing:', input);
            {{processingLogic}}
            return { processed: true, timestamp: new Date() };
        } catch (error) {
            console.error('Processing error:', error.message);
            throw error;
        }
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
        this.data = []; // In-memory storage
    }

    async query(params) {
        try {
            console.log('Querying with:', params);
            {{queryLogic}}
            return { data: [], count: 0 };
        } catch (error) {
            console.error('Query error:', error.message);
            return { data: [], count: 0, error: error.message };
        }
    }

    async insert(data) {
        try {
            console.log('Inserting:', data);
            {{insertLogic}}
            return { success: true, id: Date.now() };
        } catch (error) {
            console.error('Insert error:', error.message);
            return { success: false, error: error.message };
        }
    }

    async update(id, data) {
        try {
            console.log('Updating:', id, data);
            {{updateLogic}}
            return { success: true, updated: 1 };
        } catch (error) {
            console.error('Update error:', error.message);
            return { success: false, error: error.message };
        }
    }

    async delete(id) {
        try {
            console.log('Deleting:', id);
            {{deleteLogic}}
            return { success: true, deleted: 1 };
        } catch (error) {
            console.error('Delete error:', error.message);
            return { success: false, error: error.message };
        }
    }
}

module.exports = DataService;`
        };
    }

    /**
     * Processa arquitetura e gera código
     */
    async process(message, context) {
        const startTime = Date.now();
        
        try {
            console.log('CODER: Generating code from architecture...');
            
            const architecture = message;
            
            // Validate input
            if (!architecture || !architecture.fileStructure) {
                throw new Error('Invalid architecture provided');
            }
            
            // Gerar código para cada arquivo na arquitetura
            const generatedCode = {
                agentId: architecture.agentId,
                name: architecture.name,
                files: {},
                package: this.generatePackageJson(architecture),
                readme: this.generateReadme(architecture),
                totalFiles: 0,
                totalLines: 0,
                success: true,
                processingTime: 0
            };
            
            // Gerar arquivo principal (index.js)
            generatedCode.files['index.js'] = this.generateMainFile(architecture);
            
            // Gerar arquivos por estrutura
            for (const [folder, files] of Object.entries(architecture.fileStructure)) {
                for (const file of files) {
                    const code = this.generateFileCode(file, architecture);
                    const filePath = path.join(folder, file).replace(/^\//, '');
                    generatedCode.files[filePath] = code;
                }
            }
            
            // Calcular métricas
            generatedCode.totalFiles = Object.keys(generatedCode.files).length;
            generatedCode.totalLines = Object.values(generatedCode.files)
                .reduce((sum, code) => sum + code.split('\n').length, 0);
            generatedCode.processingTime = Date.now() - startTime;
            
            console.log(`CODER: Generated ${generatedCode.totalFiles} files with ${generatedCode.totalLines} lines of code`);
            
            return generatedCode;
            
        } catch (error) {
            console.error(`[${this.name}] Error:`, error.message);
            return {
                success: false,
                error: error.message,
                processingTime: Date.now() - startTime
            };
        }
    }

    /**
     * Gera arquivo principal
     */
    generateMainFile(architecture) {
        let code = this.codeTemplates.index;
        
        // Sanitize agent name for valid JS identifier
        const agentName = this.sanitizeClassName(architecture.name || 'Agent');
        
        // Substituir placeholders
        code = code.replace(/{{agentName}}/g, agentName);
        code = code.replace('{{capabilities}}', JSON.stringify(architecture.capabilities || []));
        code = code.replace('{{port}}', architecture.config?.environment?.PORT || 3000);
        
        // Adicionar lógica de processamento baseada no tipo
        let processingLogic = '';
        switch(architecture.type) {
            case 'support':
                processingLogic = `
            // Support agent logic
            const response = { type: 'support', data: input };`;
                break;
            case 'analyst':
                processingLogic = `
            // Analyst agent logic
            const analysis = { type: 'analysis', data: input };`;
                break;
            case 'assistant':
                processingLogic = `
            // Assistant agent logic
            const task = { type: 'task', data: input };`;
                break;
            default:
                processingLogic = `
            // Generic processing
            const result = { type: 'generic', data: input };`;
        }
        
        code = code.replace('{{processingLogic}}', processingLogic);
        
        return code;
    }

    /**
     * Gera código para arquivo específico
     */
    generateFileCode(filename, architecture) {
        const lowerFilename = filename.toLowerCase();
        
        // Identificar tipo de arquivo
        if (lowerFilename.includes('handler')) {
            return this.generateHandler(filename, architecture);
        } else if (lowerFilename.includes('service')) {
            return this.generateService(filename, architecture);
        } else if (lowerFilename === 'config.js') {
            return this.generateConfig(architecture);
        } else if (lowerFilename.includes('utils') || lowerFilename.includes('validator')) {
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
        const handlerType = filename.replace(/handler\.js$/i, '').toLowerCase();
        
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
                return { text: 'Processando comando...' };`;
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
            database: (architecture.dependencies || []).includes('pg') ? 'postgresql' : 'memory',
            cache: (architecture.dependencies || []).includes('redis'),
        };
        
        code = code.replace('{{config}}', JSON.stringify(config));
        
        // Adicionar lógica específica
        if (config.database === 'postgresql') {
            code = code.replace('{{queryLogic}}', `
            // PostgreSQL query
            const query = 'SELECT * FROM data WHERE id = $1';
            // Implementation would go here
            return { data: [], count: 0 };`);
        } else {
            code = code.replace('{{queryLogic}}', `
            // In-memory query
            const filtered = this.data.filter(item => {
                return Object.keys(params).every(key => item[key] === params[key]);
            });
            return { data: filtered, count: filtered.length };`);
        }
        
        // Simplificar outros métodos
        code = code.replace('{{insertLogic}}', `
            this.data.push({ id: Date.now(), ...data });`);
        code = code.replace('{{updateLogic}}', `
            const index = this.data.findIndex(item => item.id === id);
            if (index >= 0) this.data[index] = { ...this.data[index], ...data };`);
        code = code.replace('{{deleteLogic}}', `
            const index = this.data.findIndex(item => item.id === id);
            if (index >= 0) this.data.splice(index, 1);`);
        
        return code;
    }

    /**
     * Gera arquivo de configuração
     */
    generateConfig(architecture) {
        const config = architecture.config || {};
        
        return `module.exports = {
    name: '${this.escapeString(config.name || 'agent')}',
    version: '${this.escapeString(config.version || '1.0.0')}',
    environment: ${JSON.stringify(config.environment || {}, null, 2)},
    features: ${JSON.stringify(config.features || {}, null, 2)},
    performance: ${JSON.stringify(config.performance || {}, null, 2)}
};`;
    }

    /**
     * Gera utilitários
     */
    generateUtils(filename) {
        if (filename.toLowerCase().includes('validator')) {
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
        const className = this.sanitizeClassName(path.basename(filename, '.js'));
        
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
        const dependencies = architecture.dependencies || [];
        const depsObject = {};
        
        dependencies.forEach(dep => {
            if (typeof dep === 'string' && dep.length > 0) {
                depsObject[dep] = 'latest';
            }
        });
        
        return {
            name: (architecture.name || 'agent').toLowerCase().replace(/[^a-z0-9]/g, '-'),
            version: '1.0.0',
            description: `Agent: ${architecture.name || 'Unknown'}`,
            main: 'index.js',
            scripts: {
                start: 'node index.js',
                dev: 'nodemon index.js',
                test: 'echo "No tests yet"'
            },
            dependencies: depsObject,
            devDependencies: {
                nodemon: '^3.0.0'
            }
        };
    }

    /**
     * Gera README
     */
    generateReadme(architecture) {
        return `# ${architecture.name || 'Agent'}

## Description
${architecture.type || 'Generic'} agent with ${(architecture.capabilities || []).join(', ') || 'basic'} capabilities.

## Installation
\`\`\`bash
npm install
\`\`\`

## Usage
\`\`\`bash
npm start
\`\`\`

## Architecture
- Type: ${architecture.type || 'Unknown'}
- Complexity: ${architecture.complexity || 'Medium'}
- Files: ${architecture.estimatedFiles || 'N/A'}
- Estimated LOC: ${architecture.estimatedLinesOfCode || 'N/A'}

## Data Flow
${(architecture.dataFlow || []).join(' → ') || 'Not specified'}

## Dependencies
${(architecture.dependencies || []).join(', ') || 'None'}

---
Generated by ABBA Platform
`;
    }

    /**
     * Sanitize string for safe inclusion in code
     */
    escapeString(str) {
        if (!str) return '';
        return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
    }

    /**
     * Sanitize class/variable name
     */
    sanitizeClassName(name) {
        if (!name || typeof name !== 'string') return 'Agent';
        
        // Remove non-alphanumeric, capitalize first letter
        let sanitized = name.replace(/[^a-zA-Z0-9]/g, '');
        
        // Ensure doesn't start with number
        if (/^\d/.test(sanitized)) {
            sanitized = 'Agent' + sanitized;
        }
        
        // Ensure not empty
        if (!sanitized) {
            sanitized = 'Agent';
        }
        
        // Capitalize first letter
        return sanitized.charAt(0).toUpperCase() + sanitized.slice(1);
    }
}

module.exports = CoderAgent;