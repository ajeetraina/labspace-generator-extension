import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  
  // Build configuration for Docker Desktop Extension
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    
    rollupOptions: {
      input: {
        main: 'index.html'
      }
    },
    
    // Optimize for production
    minify: 'terser',
    sourcemap: false,
    
    // Ensure compatibility with Docker Desktop Extension environment
    target: 'es2015'
  },
  
  // Development server configuration
  server: {
    port: 5173,
    host: true, // Allow external connections
    
    // Proxy API calls to the backend during development
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      }
    }
  },
  
  // CSS configuration
  css: {
    postcss: {
      plugins: [
        require('tailwindcss'),
        require('autoprefixer'),
      ]
    }
  },
  
  // Define environment variables
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'lucide-react']
  }
})