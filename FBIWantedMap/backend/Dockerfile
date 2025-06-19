# Use Node.js as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy files
COPY package*.json ./
RUN npm install
COPY . .

# Expose port
EXPOSE 3000

# Start the app
CMD ["npm", "start"]