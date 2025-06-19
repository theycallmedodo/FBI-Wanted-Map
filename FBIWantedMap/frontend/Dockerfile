# Use official nginx image as base
FROM nginx:alpine

# usuwanie domyslnej zawartosci nginx
RUN rm -rf /usr/share/nginx/html/*

# kopiuj statyczne pliki frontendu do folderu serwowanego przez nginx
COPY frontend-build /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]