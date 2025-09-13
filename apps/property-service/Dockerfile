FROM node:18-alpine

WORKDIR /app

# Copy dependency files first (better layer caching)
COPY package*.json ./
RUN npm install

# Copy the rest of the app
COPY . .

# Default environment variables (can be overridden in docker-compose)
ENV PORT=8080 \
    NODE_ENV=development

EXPOSE 8080

CMD ["npm", "run", "dev"]
