FROM node:20
RUN apt-get update && apt-get install -y android-tools-adb
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 8899
CMD ["node", "server.js"]