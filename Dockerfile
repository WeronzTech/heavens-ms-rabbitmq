# Use the official lightweight NGINX image
FROM nginx:1.25-alpine

# Remove the default NGINX configuration file
RUN rm /etc/nginx/conf.d/default.conf

# Copy our custom routing configuration into the container
COPY nginx.conf /etc/nginx/conf.d/

# Expose port 80 for internal traffic
EXPOSE 8080

