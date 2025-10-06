# Use a lightweight and stable Node.js image
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy the top-level package.json and package-lock.json to leverage Docker caching
COPY package*.json ./

# Install all dependencies for the entire monorepo.
# This ensures that shared libs in the `libs` folder are available.
RUN npm install

# Copy the entire project structure into the container.
# This makes all 'apps' and 'libs' available.
COPY . .

# Expose a default port. This can be overridden in docker-compose.
EXPOSE 8080

# The command to run the application.
# It will execute the start script defined in the root package.json for the specified service.
# For example, it will run `npm start --workspace=api-gateway`
# CMD ["npm", "run", "--workspace"]
