# Use the official lightweight NGINX image
FROM nginx:1.25-alpine

# Remove the default NGINX configuration file to prevent conflicts
RUN rm /etc/nginx/conf.d/default.conf

# Copy our custom routing configuration into the container
COPY nginx.conf /etc/nginx/conf.d/

# Expose port 80 for internal traffic from the host's port 8080
EXPOSE 80
