# Use a lightweight Node.js image as the base
# '18-alpine' is a good choice for production due to its small size
FROM node:18-alpine

# Set the working directory inside the container
# All subsequent commands will run from this directory
WORKDIR /usr/src/app

# Copy the package.json and package-lock.json (or yarn.lock) files first
# This helps Docker cache the node_modules layer, speeding up builds
# if only code changes
COPY package*.json ./

# Install project dependencies
RUN npm install

# Copy the rest of your backend source code into the container
COPY . .

# Set an environment variable for the port your app will listen on
# This makes the port configurable (Elastic Beanstalk might use a different port)
ENV PORT 5000

# Inform Docker that the container listens on this port at runtime
# This is informational, not a network rule
EXPOSE 5000

# Specify the command to run when the container starts
# This executes the "start" script defined in your package.json
CMD [ "npm", "start" ]