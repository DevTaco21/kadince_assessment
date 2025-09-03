# Use a fuller Debian-based Node image so prebuilt sqlite3 binaries work out of the box
FROM node:20-bullseye

ENV NODE_ENV=production \
    PORT=4000

# Create app directory
WORKDIR /app

# Copy manifests and install only production deps
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# Copy source
COPY src ./src

# Ensure SQLite data dir exists
RUN mkdir -p /app/data

EXPOSE 4000

CMD ["node", "src/index.js"] 