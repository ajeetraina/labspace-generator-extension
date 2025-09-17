import React, { useState } from 'react';
import { 
  Github, 
  Play, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Download,
  FileText,
  Code,
  Database,
  Globe
} from 'lucide-react';

const LabspaceGenerator = () => {
  const [githubUrl, setGithubUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [repoData, setRepoData] = useState(null);
  const [labspaceGenerated, setLabspaceGenerated] = useState(false);
  const [error, setError] = useState('');

  const detectTechStack = (files, packageJson, requirements, gemfile, goMod) => {
    const techStack = [];
    
    // Language detection based on files and configs
    if (packageJson) {
      techStack.push({
        name: 'Node.js',
        icon: '🟢',
        version: packageJson.engines?.node || 'latest',
        dependencies: Object.keys(packageJson.dependencies || {}).slice(0, 5)
      });
    }
    
    if (requirements) {
      techStack.push({
        name: 'Python',
        icon: '🐍',
        version: '3.9+',
        dependencies: requirements.split('\n').slice(0, 5).map(dep => dep.split('==')[0])
      });
    }
    
    if (files.includes('Dockerfile')) {
      techStack.push({
        name: 'Docker',
        icon: '🐳',
        version: 'latest'
      });
    }
    
    if (files.includes('pom.xml') || files.includes('build.gradle')) {
      techStack.push({
        name: 'Java',
        icon: '☕',
        version: '11+',
        buildTool: files.includes('pom.xml') ? 'Maven' : 'Gradle'
      });
    }
    
    if (goMod) {
      techStack.push({
        name: 'Go',
        icon: '🐹',
        version: goMod.match(/go (\d+\.\d+)/)?.[1] || 'latest'
      });
    }
    
    if (gemfile) {
      techStack.push({
        name: 'Ruby',
        icon: '💎',
        version: gemfile.match(/ruby ['"](.+?)['"]/)?.[1] || 'latest'
      });
    }
    
    if (files.some(f => f.endsWith('.php'))) {
      techStack.push({
        name: 'PHP',
        icon: '🐘',
        version: '8.1+'
      });
    }
    
    if (files.includes('Cargo.toml')) {
      techStack.push({
        name: 'Rust',
        icon: '🦀',
        version: 'latest'
      });
    }
    
    if (files.some(f => f.endsWith('.cs') || f.endsWith('.csproj'))) {
      techStack.push({
        name: '.NET',
        icon: '💜',
        version: '6.0+'
      });
    }
    
    return techStack;
  };

  const analyzeRepository = async () => {
    if (!githubUrl.trim()) {
      setError('Please enter a GitHub URL');
      return;
    }
    
    setIsAnalyzing(true);
    setError('');
    setRepoData(null);
    
    try {
      // Extract repo info from URL
      const match = githubUrl.match(/github\.com\/([^\/]+)\/([^\/\?]+)/);
      if (!match) {
        throw new Error('Invalid GitHub URL format');
      }
      
      const [, owner, repo] = match;
      const repoName = repo.replace(/\.git$/, '');
      
      // Call backend API to analyze repository
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ githubUrl }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to analyze repository');
      }
      
      const analysisData = await response.json();
      setRepoData(analysisData);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateLabspace = async () => {
    setIsGenerating(true);
    
    try {
      // Call backend API to generate labspace
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ repoData }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate labspace');
      }
      
      const result = await response.json();
      setLabspaceGenerated(true);
      
    } catch (err) {
      setError('Failed to generate labspace');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadLabspace = () => {
    // Trigger download of generated labspace files
    const downloadUrl = `/download/labspace-${repoData.name}-${Date.now()}.zip`;
    window.open(downloadUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Github className="w-8 h-8 mr-3 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-800">GitHub Labspace Generator</h1>
          </div>
          <p className="text-gray-600">Transform any GitHub repository into a one-click development environment</p>
        </div>

        {/* URL Input */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            GitHub Repository URL
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/username/repository"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={analyzeRepository}
              disabled={isAnalyzing}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Code className="w-4 h-4" />
                  Analyze
                </>
              )}
            </button>
          </div>
          {error && (
            <div className="mt-3 flex items-center gap-2 text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Repository Analysis Results */}
        {repoData && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Repository Analysis</h2>
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span>Analysis Complete</span>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Repository Info */}
              <div>
                <h3 className="font-medium text-gray-700 mb-3">Repository Details</h3>
                <div className="space-y-2 text-sm">
                  <div><strong>Name:</strong> {repoData.name}</div>
                  <div><strong>Owner:</strong> {repoData.owner}</div>
                  <div><strong>Files:</strong> {repoData.files.length} detected</div>
                  <div><strong>Setup Time:</strong> ~{repoData.estimatedSetupTime}</div>
                </div>
              </div>

              {/* Features */}
              <div>
                <h3 className="font-medium text-gray-700 mb-3">Features Detected</h3>
                <div className="space-y-2">
                  {repoData.hasDocker && (
                    <div className="flex items-center gap-2 text-blue-600">
                      <CheckCircle className="w-4 h-4" />
                      <span>Docker support</span>
                    </div>
                  )}
                  {repoData.hasTests && (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span>Test suite included</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-purple-600">
                    <Globe className="w-4 h-4" />
                    <span>Ports: {repoData.ports.join(', ')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tech Stack */}
            <div className="mt-6">
              <h3 className="font-medium text-gray-700 mb-3">Detected Tech Stack</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {repoData.techStack.map((tech, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-2xl mb-1">{tech.icon}</div>
                    <div className="font-medium text-sm">{tech.name}</div>
                    <div className="text-xs text-gray-500">{tech.version}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <div className="mt-6 pt-6 border-t">
              <button
                onClick={generateLabspace}
                disabled={isGenerating || labspaceGenerated}
                className="w-full py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating Labspace...
                  </>
                ) : labspaceGenerated ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Labspace Generated!
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Generate Labspace
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Generated Labspace */}
        {labspaceGenerated && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Labspace Ready!</h2>
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-green-800 mb-2">
                <CheckCircle className="w-4 h-4" />
                <span className="font-medium">Generation Complete</span>
              </div>
              <p className="text-sm text-green-700">
                Your labspace has been generated with all necessary configuration files,
                Docker setup, and development environment ready to use.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="font-medium text-blue-900">docker-compose.yml</div>
                  <div className="text-xs text-blue-600">Multi-service setup</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                <Database className="w-5 h-5 text-purple-600" />
                <div>
                  <div className="font-medium text-purple-900">devcontainer.json</div>
                  <div className="text-xs text-purple-600">VS Code integration</div>
                </div>
              </div>
            </div>

            <button
              onClick={downloadLabspace}
              className="w-full py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              Download Labspace Package
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LabspaceGenerator;