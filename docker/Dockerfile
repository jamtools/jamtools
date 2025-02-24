FROM node:20.17-bullseye
# FROM node:20.17-slim

RUN apt-get update && apt-get install -y netcat

RUN npm i -g tsx

RUN mkdir /app
WORKDIR /app

COPY apps/ ./apps/
COPY packages/ ./packages/
COPY scripts/ ./scripts/
COPY configs/ ./configs/
COPY package.json .
COPY package-lock.json .
COPY tsconfig.json .
COPY .node-version .
COPY turbo.json .

RUN npm i

ENV DISABLE_IO="true"

RUN npm run build

CMD ["npm", "start"]
