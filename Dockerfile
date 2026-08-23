FROM ghcr.io/puppeteer/puppeteer:latest

# Set working directory
WORKDIR /app

# Switch to root to ensure file permissions match
USER root

# Copy dependency definitions
COPY package*.json ./

# Install dependencies cleanly
RUN npm ci --only=production || RUN npm install

# Copy application source code
COPY . .

# Set proper ownership for the non-root Puppeteer user
RUN chown -R pptruser:pptruser /app

# Switch back to non-root user for security
USER pptruser

# Expose app port and start
EXPOSE 3000
CMD ["node", "index.js"]