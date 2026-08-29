FROM ghcr.io/puppeteer/puppeteer:25.3.0

USER root

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN chown -R pptruser:pptruser /app

USER pptruser

ENV NODE_ENV=production
ENV PORT=10000

EXPOSE 10000

CMD ["node", "src/server.js"]