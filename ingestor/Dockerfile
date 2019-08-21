FROM node:11.4 AS installer
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --quiet

FROM installer AS builder
WORKDIR /usr/src/app
COPY ./src src
COPY tsconfig.json .
RUN npm run build

FROM node:11.4-slim
WORKDIR /app
COPY --from=builder /usr/src/app/build build
COPY --from=builder /usr/src/app/node_modules node_modules
EXPOSE 8080
CMD [ "node", "build/server.js" ]