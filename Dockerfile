
FROM node:22-bookworm

# Install Python for the scraper subprocess
RUN apt-get update && apt-get install -y python3 python3-pip python3-venv && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

# Install backend dependencies
WORKDIR /app/backend
RUN npm install

# Install scraper dependencies (--break-system-packages needed on Debian 12)
WORKDIR /app/scraper
RUN pip3 install -r requirements.txt --break-system-packages

WORKDIR /app/backend
EXPOSE 4000
CMD ["node", "server.js"]