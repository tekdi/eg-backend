# Base image
FROM node:18-alpine

# Create a non-root user and group
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Create app directory
WORKDIR /usr/src/app

# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

# Install app dependencies
RUN npm install

# Bundle app source
COPY . .

# WORKDIR src/

# Debug: Print the contents of the build context
RUN ls -l /usr/src/app

# Creates a "dist" folder with the production build
RUN npm run build

# Change ownership of the application directory to the non-root user
RUN chown -R appuser:appgroup /usr/src/app

# Switch to the non-root user
USER appuser

# Start the server using the production build
CMD [ "node", "dist/main.js" ]
