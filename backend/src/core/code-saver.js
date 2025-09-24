const fs = require('fs').promises;
const path = require('path');

class CodeSaver {
    constructor() {
        this.outputDir = path.join(__dirname, '../../generated-agents');
    }

    async saveAgent(agentSpec) {
        const agentDir = path.join(this.outputDir, agentSpec.name);
        await fs.mkdir(agentDir, { recursive: true });
        
        // Save each generated file
        if (agentSpec.code && agentSpec.code.files) {
            for (const [filePath, content] of Object.entries(agentSpec.code.files)) {
                const fullPath = path.join(agentDir, filePath);
                const dir = path.dirname(fullPath);
                await fs.mkdir(dir, { recursive: true });
                await fs.writeFile(fullPath, content);
            }
            
            // Save package.json
            if (agentSpec.code.package) {
                await fs.writeFile(
                    path.join(agentDir, 'package.json'),
                    JSON.stringify(agentSpec.code.package, null, 2)
                );
            }
            
            // Save README
            if (agentSpec.code.readme) {
                await fs.writeFile(
                    path.join(agentDir, 'README.md'),
                    agentSpec.code.readme
                );
            }
        }
        
        return agentDir;
    }
}

module.exports = CodeSaver;