FROM node:20-alpine

WORKDIR /app

# Copy dependency files first (better layer caching)
COPY package*.json ./
RUN npm install

# Copy the rest of the app
COPY . .

# Default environment variables (can be overridden in docker-compose)
ENV PORT=5005 \
    NODE_ENV=development

# Not strictly needed, but documents which port the app uses
EXPOSE 5005

# Use nodemon for dev (npm run dev) or node for prod (npm start)
CMD ["npm", "run", "dev"]