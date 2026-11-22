FROM node:26.13.0-alpine
WORKDIR /app
COPY index.html server.js package.json ./
COPY api/ ./api/
COPY assets/ ./assets/
EXPOSE 8080
CMD ["node", "server.js"]
