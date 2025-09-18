FROM node:18-alpine

WORKDIR /app

# Copy dependency files first (better layer caching)
COPY package*.json ./
RUN npm install

# Copy the rest of the app
COPY . .

# Default environment variables (can be overridden in docker-compose)

# Use nodemon for dev (npm run dev) or node for prod (npm start)
CMD ["npm", "run", "dev"]