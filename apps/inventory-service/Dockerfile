# Use Node base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy dependency files and install
COPY package*.json ./
RUN npm install

# Copy rest of the source code
COPY . .

# Set environment variables (or rely on .env)
ENV PORT=5002

# Expose the port your app runs on
EXPOSE 5002

# Start the application
# CMD ["npm", "start"]
CMD ["npm", "run", "dev"]

