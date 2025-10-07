# Use official Node.js 18 Alpine as a lightweight base image
FROM node:18-alpine

# Set working directory inside container
WORKDIR /usr/src/app

# Copy package files and install deps first (cache optimization)
COPY package*.json ./

RUN npm install

# Copy source code
COPY . .

# Build TypeScript to JavaScript (output is assumed in 'dist' folder)
RUN npm run build

# Expose port (adjust if your app uses a different port)
EXPOSE 3000

# Start the app (runs the compiled JavaScript)
CMD ["npm", "start"]
