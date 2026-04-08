FROM node:20-alpine
WORKDIR /app
COPY index.html server.js package.json ./
COPY netlify/functions/ ./netlify/functions/
EXPOSE 8080
CMD ["node", "server.js"]
