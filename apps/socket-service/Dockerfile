# Use Node base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy dependency files and install
COPY package*.json ./

RUN npm install

# Copy rest of the source code
COPY . .

# Default environment variables (can be overridden in docker-compose)
ENV PORT=5006 \
    NODE_ENV=development

# Expose the port your app runs on
EXPOSE 5006

# Start the application
# CMD ["npm", "start"]
CMD ["npm", "run", "dev"]
