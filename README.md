# GitHub Labspace Generator - Docker Desktop Extension

🚀 Transform any GitHub repository into a one-click development environment with broad language support.

## Features

- **🔍 Smart Repository Analysis**: Automatically detects tech stack, dependencies, and services
- **🌍 Broad Language Support**: Node.js, Python, Go, Java, Ruby, Rust, PHP, .NET, Dart/Flutter
- **🐳 Docker Integration**: Generates docker-compose.yml and Dockerfile when needed
- **💻 VS Code Ready**: Creates devcontainer.json and workspace settings
- **⚡ One-Click Generation**: Complete labspace setup in seconds
- **📦 Download Package**: Get all configuration files as a ZIP package

## Supported Technologies

| Language/Framework | Auto-Detection | Generated Config |
|-------------------|----------------|------------------|
| Node.js | ✅ package.json | Docker + VS Code |
| Python | ✅ requirements.txt | Docker + VS Code |
| Go | ✅ go.mod | Docker + VS Code |
| Java | ✅ pom.xml/build.gradle | Docker + VS Code |
| Ruby | ✅ Gemfile | Docker + VS Code |
| Rust | ✅ Cargo.toml | Docker + VS Code |
| PHP | ✅ composer.json | Docker + VS Code |
| .NET | ✅ .csproj files | Docker + VS Code |
| Dart/Flutter | ✅ pubspec.yaml | Docker + VS Code |

## Quick Start

### 1. Build the Extension

```bash
# Clone the repository
git clone https://github.com/ajeetraina/labspace-generator-extension.git
cd labspace-generator-extension

# Install dependencies
npm install

# Build the Docker image
npm run build:extension

# Install the extension
npm run install:extension
```

### 2. Use the Extension

1. Open Docker Desktop
2. Go to Extensions tab
3. Find "GitHub Labspace Generator"
4. Paste any GitHub repository URL
5. Click "Analyze" to detect the tech stack
6. Click "Generate Labspace" for one-click setup
7. Download the complete labspace package

### 3. Use Your Labspace

```bash
# Extract the downloaded ZIP file
unzip labspace-package.zip
cd your-repo-name

# Option 1: Docker Compose
docker-compose up -d

# Option 2: VS Code Dev Container
# Open folder in VS Code and click "Reopen in Container"
```

## Generated Files

Your labspace package includes:

- **`docker-compose.yml`**: Multi-service Docker setup
- **`.devcontainer/devcontainer.json`**: VS Code dev container config
- **`.vscode/settings.json`**: Optimized VS Code settings
- **`.vscode/extensions.json`**: Recommended extensions
- **`scripts/start.sh`**: Startup script for your application
- **`LABSPACE.md`**: Complete setup and usage guide

## Development

### Project Structure

```
github-labspace-generator/
├── metadata.json              # Extension metadata
├── Dockerfile                # Extension container
├── package.json              # Dependencies and scripts
├── src/
│   ├── App.jsx               # React frontend
│   ├── server.js             # Node.js backend
│   └── templates/            # Labspace templates
├── public/                   # Static assets
└── dist/                    # Built frontend
```

### Local Development

```bash
# Start development servers
npm run dev

# Run frontend only
npm run dev:frontend

# Run backend only
npm run dev:backend

# Run tests
npm test

# Lint code
npm run lint
```

### API Endpoints

- `POST /api/analyze` - Analyze GitHub repository
- `POST /api/generate` - Generate labspace configuration
- `GET /download/:filename` - Download generated package

### Environment Variables

Create a `.env` file for optional configuration:

```env
# Optional: GitHub token for higher API rate limits
GITHUB_TOKEN=your_github_token

# Optional: Custom port
PORT=3001
```

## Architecture

### Frontend (React + Tailwind)
- Clean, responsive UI for GitHub URL input
- Real-time repository analysis display
- One-click labspace generation
- Download management

### Backend (Node.js + Express)
- GitHub API integration for repository analysis
- Multi-language tech stack detection
- Template-based configuration generation
- ZIP package creation for downloads

### Analysis Engine
- Automatic language detection from config files
- Service detection (databases, caches, web servers)
- Port detection and mapping
- Dependency analysis

## Customization

### Adding New Language Support

1. Update `detectTechStack()` in `server.js`
2. Add new template generation logic
3. Update frontend language icons and display
4. Add appropriate VS Code extensions

### Custom Templates

Modify the template methods in `LabspaceGenerator` class:
- `generateDockerCompose()`
- `generateDevContainer()`
- `generateVSCodeSettings()`
- `generateStartupScript()`

## Troubleshooting

### Common Issues

**Extension won't install:**
- Ensure Docker Desktop is running
- Check that the image built successfully: `docker images | grep labspace-generator`

**Repository analysis fails:**
- Check internet connectivity
- Verify the GitHub URL is correct and public
- Consider adding a GitHub token for private repos

**Generated labspace doesn't work:**
- Check the repository has the expected files (package.json, requirements.txt, etc.)
- Verify Docker is running when using docker-compose
- Check logs: `docker-compose logs`

### Debug Mode

Enable debug logging by setting:
```bash
export DEBUG=labspace-generator:*
```

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Roadmap

- [ ] Support for more languages (Kotlin, Swift, etc.)
- [ ] Custom service detection (MongoDB, Elasticsearch, etc.)
- [ ] Template customization UI
- [ ] Direct deployment to cloud platforms
- [ ] GitHub integration for automatic labspace updates
- [ ] Team sharing and collaboration features

---

**Made with ❤️ for the developer community**