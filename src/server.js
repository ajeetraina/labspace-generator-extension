const express = require('express');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const archiver = require('archiver');

class RepositoryAnalyzer {
  constructor() {
    this.githubToken = process.env.GITHUB_TOKEN; // Optional for higher rate limits
  }

  async analyzeRepository(githubUrl) {
    const { owner, repo } = this.parseGithubUrl(githubUrl);
    
    try {
      // Fetch repository metadata
      const repoData = await this.fetchRepositoryData(owner, repo);
      
      // Fetch file structure
      const files = await this.fetchFileStructure(owner, repo);
      
      // Detect tech stack
      const techStack = await this.detectTechStack(owner, repo, files);
      
      // Detect ports and services
      const services = await this.detectServices(owner, repo, files);
      
      return {
        owner,
        name: repo,
        description: repoData.description,
        files: files.map(f => f.path),
        techStack,
        services,
        ports: this.extractPorts(services),
        hasDocker: files.some(f => f.path === 'Dockerfile'),
        hasTests: files.some(f => f.path.includes('test')),
        estimatedSetupTime: this.estimateSetupTime(techStack, services)
      };
    } catch (error) {
      throw new Error(`Failed to analyze repository: ${error.message}`);
    }
  }

  parseGithubUrl(url) {
    const match = url.match(/github\.com\/([^\/]+)\/([^\/\?]+)/);
    if (!match) throw new Error('Invalid GitHub URL');
    
    const [, owner, repo] = match;
    return { owner, repo: repo.replace(/\.git$/, '') };
  }

  async fetchRepositoryData(owner, repo) {
    const headers = this.githubToken ? 
      { Authorization: `token ${this.githubToken}` } : {};
    
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}`,
      { headers }
    );
    
    return response.data;
  }

  async fetchFileStructure(owner, repo, path = '') {
    const headers = this.githubToken ? 
      { Authorization: `token ${this.githubToken}` } : {};
    
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      { headers }
    );
    
    let files = [];
    
    for (const item of response.data) {
      if (item.type === 'file') {
        files.push({
          path: item.path,
          name: item.name,
          size: item.size
        });
      } else if (item.type === 'dir' && item.name !== '.git') {
        // Recursively fetch subdirectories (limit depth for performance)
        if (path.split('/').length < 3) {
          const subFiles = await this.fetchFileStructure(owner, repo, item.path);
          files = files.concat(subFiles);
        }
      }
    }
    
    return files;
  }

  async detectTechStack(owner, repo, files) {
    const techStack = [];
    const configFiles = {};
    
    // Fetch key configuration files
    const keyFiles = [
      'package.json',
      'requirements.txt',
      'Gemfile',
      'go.mod',
      'pom.xml',
      'build.gradle',
      'Cargo.toml',
      'composer.json',
      'pubspec.yaml'
    ];
    
    for (const fileName of keyFiles) {
      const file = files.find(f => f.path === fileName);
      if (file) {
        try {
          configFiles[fileName] = await this.fetchFileContent(owner, repo, fileName);
        } catch (error) {
          console.warn(`Could not fetch ${fileName}:`, error.message);
        }
      }
    }
    
    // Node.js detection
    if (configFiles['package.json']) {
      const packageJson = JSON.parse(configFiles['package.json']);
      techStack.push({
        name: 'Node.js',
        icon: '🟢',
        version: packageJson.engines?.node || '>=16.0.0',
        dependencies: Object.keys(packageJson.dependencies || {}).slice(0, 8),
        devDependencies: Object.keys(packageJson.devDependencies || {}).slice(0, 5),
        scripts: packageJson.scripts || {}
      });
    }
    
    // Python detection
    if (configFiles['requirements.txt']) {
      const requirements = configFiles['requirements.txt'].split('\n')
        .filter(line => line.trim() && !line.startsWith('#'))
        .slice(0, 10);
      
      techStack.push({
        name: 'Python',
        icon: '🐍',
        version: '3.9+',
        dependencies: requirements.map(req => req.split('==')[0].split('>=')[0].trim())
      });
    }
    
    // Go detection
    if (configFiles['go.mod']) {
      const goModContent = configFiles['go.mod'];
      const goVersion = goModContent.match(/go (\d+\.\d+)/)?.[1] || 'latest';
      
      techStack.push({
        name: 'Go',
        icon: '🐹',
        version: goVersion
      });
    }
    
    // Java detection
    if (configFiles['pom.xml'] || configFiles['build.gradle']) {
      techStack.push({
        name: 'Java',
        icon: '☕',
        version: '11+',
        buildTool: configFiles['pom.xml'] ? 'Maven' : 'Gradle'
      });
    }
    
    // Ruby detection
    if (configFiles['Gemfile']) {
      const rubyVersion = configFiles['Gemfile'].match(/ruby ['"](.+?)['"]/)?.[1] || 'latest';
      techStack.push({
        name: 'Ruby',
        icon: '💎',
        version: rubyVersion
      });
    }
    
    // Rust detection
    if (configFiles['Cargo.toml']) {
      techStack.push({
        name: 'Rust',
        icon: '🦀',
        version: 'latest'
      });
    }
    
    // PHP detection
    if (configFiles['composer.json'] || files.some(f => f.path.endsWith('.php'))) {
      techStack.push({
        name: 'PHP',
        icon: '🐘',
        version: '8.1+'
      });
    }
    
    // Dart/Flutter detection
    if (configFiles['pubspec.yaml']) {
      techStack.push({
        name: 'Dart/Flutter',
        icon: '🎯',
        version: 'latest'
      });
    }
    
    // Docker detection
    if (files.some(f => f.path === 'Dockerfile')) {
      techStack.push({
        name: 'Docker',
        icon: '🐳',
        version: 'latest'
      });
    }
    
    return techStack;
  }

  async detectServices(owner, repo, files) {
    const services = [];
    
    // Check for database files or references
    const hasDatabase = files.some(f => 
      f.path.includes('database') || 
      f.path.includes('db') ||
      f.path.includes('migration')
    );
    
    if (hasDatabase) {
      services.push({
        name: 'Database',
        type: 'postgres', // Default, could be detected more specifically
        port: 5432
      });
    }
    
    // Check for Redis
    const hasRedis = files.some(f => f.path.includes('redis'));
    if (hasRedis) {
      services.push({
        name: 'Redis',
        type: 'redis',
        port: 6379
      });
    }
    
    // Check for web server
    const hasWeb = files.some(f => 
      f.path.includes('server') || 
      f.path.includes('app') ||
      f.name === 'index.js' ||
      f.name === 'main.py' ||
      f.name === 'app.py'
    );
    
    if (hasWeb) {
      services.push({
        name: 'Web Server',
        type: 'web',
        port: 3000 // Default, could be detected from code
      });
    }
    
    return services;
  }

  async fetchFileContent(owner, repo, filePath) {
    const headers = this.githubToken ? 
      { Authorization: `token ${this.githubToken}` } : {};
    
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
      { headers }
    );
    
    return Buffer.from(response.data.content, 'base64').toString('utf-8');
  }

  extractPorts(services) {
    return services.map(service => service.port);
  }

  estimateSetupTime(techStack, services) {
    let minutes = 1; // Base time
    
    minutes += techStack.length * 0.5; // 30 seconds per technology
    minutes += services.length * 1; // 1 minute per service
    
    if (minutes < 2) return '1-2 minutes';
    if (minutes < 5) return '2-5 minutes';
    if (minutes < 10) return '5-10 minutes';
    return '10+ minutes';
  }
}

class LabspaceGenerator {
  constructor() {
    this.templates = {
      dockerCompose: this.getDockerComposeTemplate(),
      devContainer: this.getDevContainerTemplate(),
      vscodeSettings: this.getVSCodeSettingsTemplate(),
      readme: this.getReadmeTemplate()
    };
  }

  async generateLabspace(repoData, outputPath) {
    const labspaceFiles = {};
    
    // Generate docker-compose.yml
    labspaceFiles['docker-compose.yml'] = this.generateDockerCompose(repoData);
    
    // Generate devcontainer.json
    labspaceFiles['.devcontainer/devcontainer.json'] = this.generateDevContainer(repoData);
    
    // Generate VS Code settings
    labspaceFiles['.vscode/settings.json'] = this.generateVSCodeSettings(repoData);
    labspaceFiles['.vscode/extensions.json'] = this.generateVSCodeExtensions(repoData);
    
    // Generate README
    labspaceFiles['LABSPACE.md'] = this.generateReadme(repoData);
    
    // Generate startup script
    labspaceFiles['scripts/start.sh'] = this.generateStartupScript(repoData);
    
    // Create ZIP package
    await this.createZipPackage(labspaceFiles, outputPath);
    
    return {
      files: Object.keys(labspaceFiles),
      downloadPath: outputPath
    };
  }

  generateDockerCompose(repoData) {
    const { techStack, services, name } = repoData;
    
    let compose = {
      version: '3.8',
      services: {}
    };
    
    // Add main application service
    const mainTech = techStack[0];
    if (mainTech) {
      compose.services.app = {
        build: '.',
        ports: [`${services.find(s => s.type === 'web')?.port || 3000}:${services.find(s => s.type === 'web')?.port || 3000}`],
        volumes: ['.:/workspace'],
        environment: ['NODE_ENV=development'],
        depends_on: []
      };
      
      // Add Dockerfile if not exists
      if (!repoData.hasDocker) {
        // Would generate appropriate Dockerfile based on tech stack
      }
    }
    
    // Add database service if needed
    if (services.some(s => s.name === 'Database')) {
      compose.services.db = {
        image: 'postgres:13',
        environment: [
          'POSTGRES_DB=appdb',
          'POSTGRES_USER=user',
          'POSTGRES_PASSWORD=password'
        ],
        ports: ['5432:5432'],
        volumes: ['db_data:/var/lib/postgresql/data']
      };
      
      if (compose.services.app) {
        compose.services.app.depends_on.push('db');
      }
    }
    
    // Add Redis if needed
    if (services.some(s => s.name === 'Redis')) {
      compose.services.redis = {
        image: 'redis:6-alpine',
        ports: ['6379:6379']
      };
      
      if (compose.services.app) {
        compose.services.app.depends_on.push('redis');
      }
    }
    
    // Add volumes
    if (services.some(s => s.name === 'Database')) {
      compose.volumes = {
        db_data: {}
      };
    }
    
    return `# Generated Labspace Docker Compose\n# Repository: ${name}\n# Generated: ${new Date().toISOString()}\n\n${require('yaml').dump(compose)}`;
  }

  generateDevContainer(repoData) {
    const { techStack, services } = repoData;
    const mainTech = techStack[0];
    
    const devContainer = {
      name: `${repoData.name} Development Environment`,
      dockerComposeFile: '../docker-compose.yml',
      service: 'app',
      workspaceFolder: '/workspace',
      
      customizations: {
        vscode: {
          settings: {
            'terminal.integrated.defaultProfile.linux': 'bash'
          },
          extensions: this.getRecommendedExtensions(techStack)
        }
      },
      
      forwardPorts: services.map(s => s.port),
      
      postCreateCommand: this.getPostCreateCommand(techStack),
      
      remoteUser: 'root'
    };
    
    return JSON.stringify(devContainer, null, 2);
  }

  generateVSCodeSettings(repoData) {
    const settings = {
      'editor.tabSize': 2,
      'editor.insertSpaces': true,
      'files.autoSave': 'onDelay',
      'files.autoSaveDelay': 1000,
      'terminal.integrated.cwd': '${workspaceFolder}',
    };
    
    // Add language-specific settings
    repoData.techStack.forEach(tech => {
      switch (tech.name) {
        case 'Node.js':
          settings['typescript.preferences.quoteStyle'] = 'single';
          settings['javascript.preferences.quoteStyle'] = 'single';
          break;
        case 'Python':
          settings['python.defaultInterpreterPath'] = '/usr/local/bin/python';
          settings['python.formatting.provider'] = 'black';
          break;
        case 'Go':
          settings['go.toolsManagement.autoUpdate'] = true;
          break;
      }
    });
    
    return JSON.stringify(settings, null, 2);
  }

  generateVSCodeExtensions(repoData) {
    const extensions = {
      recommendations: []
    };
    
    // Add extensions based on tech stack
    repoData.techStack.forEach(tech => {
      switch (tech.name) {
        case 'Node.js':
          extensions.recommendations.push(
            'ms-vscode.vscode-node-debug2',
            'esbenp.prettier-vscode',
            'ms-vscode.vscode-typescript-next'
          );
          break;
        case 'Python':
          extensions.recommendations.push(
            'ms-python.python',
            'ms-python.flake8'
          );
          break;
        case 'Go':
          extensions.recommendations.push('golang.go');
          break;
        case 'Java':
          extensions.recommendations.push(
            'redhat.java',
            'vscjava.vscode-java-pack'
          );
          break;
        case 'Docker':
          extensions.recommendations.push('ms-azuretools.vscode-docker');
          break;
      }
    });
    
    // Add general development extensions
    extensions.recommendations.push(
      'ms-vscode.vscode-json',
      'redhat.vscode-yaml',
      'ms-vscode.vscode-eslint'
    );
    
    return JSON.stringify(extensions, null, 2);
  }

  generateReadme(repoData) {
    return `# ${repoData.name} - Development Environment\n\nThis labspace was automatically generated for the repository: \`${repoData.owner}/${repoData.name}\`\n\n## 🚀 Quick Start\n\n### Option 1: Docker Compose\n\`\`\`bash\ndocker-compose up -d\n\`\`\`\n\n### Option 2: VS Code Dev Containers\n1. Open this folder in VS Code\n2. Click "Reopen in Container" when prompted\n3. Wait for the container to build and start\n\n## 🛠 Detected Tech Stack\n\n${repoData.techStack.map(tech => `- **${tech.name}** ${tech.version ? `(${tech.version})` : ''}`).join('\n')}\n\n## 🔧 Services\n\n${repoData.services.map(service => `- **${service.name}**: http://localhost:${service.port}`).join('\n')}\n\n## 📋 Available Scripts\n\nRun these commands inside the development environment:\n\n\`\`\`bash\n# Start the application\n./scripts/start.sh\n\n# Install dependencies (if needed)\nnpm install  # or pip install -r requirements.txt, go mod tidy, etc.\n\n# Run tests (if available)\n${repoData.hasTests ? 'npm test' : '# No tests detected'}\n\`\`\`\n\n## 🐳 Docker Services\n\nThis labspace includes the following Docker services:\n- **Application**: Your main application service\n${repoData.services.includes('Database') ? '- **Database**: PostgreSQL database' : ''}\n${repoData.services.includes('Redis') ? '- **Redis**: Redis cache/session store' : ''}\n\n## 📁 Generated Files\n\n- \`docker-compose.yml\`: Multi-service Docker setup\n- \`.devcontainer/\`: VS Code development container configuration\n- \`.vscode/\`: VS Code settings and extensions\n- \`scripts/start.sh\`: Startup script for the application\n\n## 🔧 Customization\n\nYou can customize this labspace by:\n1. Modifying \`docker-compose.yml\` for additional services\n2. Updating \`.devcontainer/devcontainer.json\` for VS Code settings\n3. Adding environment variables in \`.env\` file\n4. Modifying \`scripts/start.sh\` for custom startup commands\n\n---\n\nGenerated by GitHub Labspace Generator on ${new Date().toLocaleDateString()}\n`;
  }

  generateStartupScript(repoData) {
    const { techStack } = repoData;
    let script = `#!/bin/bash\n\n# Generated startup script for ${repoData.name}\necho "🚀 Starting ${repoData.name} development environment..."\n\n`;

    // Add startup commands based on tech stack
    techStack.forEach(tech => {
      switch (tech.name) {
        case 'Node.js':
          script += `\n# Install Node.js dependencies\nif [ -f "package.json" ]; then\n    echo "📦 Installing Node.js dependencies..."\n    npm install\n    \n    # Start the application\n    if npm run dev > /dev/null 2>&1; then\n        echo "🎯 Starting development server..."\n        npm run dev\n    elif npm start > /dev/null 2>&1; then\n        echo "🎯 Starting application..."\n        npm start\n    else\n        echo "🎯 Starting with node..."\n        node index.js || node server.js || node app.js\n    fi\nfi\n`;
          break;
          
        case 'Python':
          script += `\n# Install Python dependencies\nif [ -f "requirements.txt" ]; then\n    echo "🐍 Installing Python dependencies..."\n    pip install -r requirements.txt\n    \n    # Start the application\n    echo "🎯 Starting Python application..."\n    python app.py || python main.py || python server.py\nfi\n`;
          break;
          
        case 'Go':
          script += `\n# Install Go dependencies\nif [ -f "go.mod" ]; then\n    echo "🐹 Installing Go dependencies..."\n    go mod tidy\n    \n    # Start the application\n    echo "🎯 Starting Go application..."\n    go run .\nfi\n`;
          break;
      }
    });

    script += `\necho "✅ Application started successfully!"\necho "🌐 Access your application at: http://localhost:3000"\n`;

    return script;
  }

  getRecommendedExtensions(techStack) {
    const extensions = ['ms-vscode.vscode-json'];
    
    techStack.forEach(tech => {
      switch (tech.name) {
        case 'Node.js':
          extensions.push('ms-vscode.vscode-typescript-next', 'esbenp.prettier-vscode');
          break;
        case 'Python':
          extensions.push('ms-python.python');
          break;
        case 'Go':
          extensions.push('golang.go');
          break;
        case 'Docker':
          extensions.push('ms-azuretools.vscode-docker');
          break;
      }
    });
    
    return extensions;
  }

  getPostCreateCommand(techStack) {
    const commands = [];
    
    techStack.forEach(tech => {
      switch (tech.name) {
        case 'Node.js':
          commands.push('npm install');
          break;
        case 'Python':
          commands.push('pip install -r requirements.txt');
          break;
        case 'Go':
          commands.push('go mod tidy');
          break;
      }
    });
    
    return commands.join(' && ');
  }

  async createZipPackage(files, outputPath) {
    return new Promise((resolve, reject) => {
      const output = require('fs').createWriteStream(outputPath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      output.on('close', resolve);
      archive.on('error', reject);
      
      archive.pipe(output);
      
      Object.entries(files).forEach(([filePath, content]) => {
        archive.append(content, { name: filePath });
      });
      
      archive.finalize();
    });
  }

  // Template methods (simplified for brevity)
  getDockerComposeTemplate() { return ''; }
  getDevContainerTemplate() { return ''; }
  getVSCodeSettingsTemplate() { return ''; }
  getReadmeTemplate() { return ''; }
}

// Express API
const app = express();
app.use(express.json());
app.use(express.static('dist'));

const analyzer = new RepositoryAnalyzer();
const generator = new LabspaceGenerator();

// API Routes
app.post('/api/analyze', async (req, res) => {
  try {
    const { githubUrl } = req.body;
    const analysis = await analyzer.analyzeRepository(githubUrl);
    res.json(analysis);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/generate', async (req, res) => {
  try {
    const { repoData } = req.body;
    const outputPath = `/tmp/labspace-${repoData.name}-${Date.now()}.zip`;
    
    const result = await generator.generateLabspace(repoData, outputPath);
    
    res.json({
      success: true,
      downloadUrl: `/download/${path.basename(outputPath)}`,
      files: result.files
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/download/:filename', (req, res) => {
  const filePath = `/tmp/${req.params.filename}`;
  res.download(filePath);
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Labspace Generator API running on port ${PORT}`);
});

module.exports = { RepositoryAnalyzer, LabspaceGenerator };