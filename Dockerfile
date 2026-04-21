FROM node:20-alpine
WORKDIR /app
COPY index.html server.js package.json ./
COPY api/ ./api/
EXPOSE 8080
CMD ["node", "server.js"]
