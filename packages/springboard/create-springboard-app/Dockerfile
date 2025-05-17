from node:20.17-bullseye

RUN apt-get update && apt-get install -y netcat

RUN mkdir /app
WORKDIR /app

# RUN npm i -g typescript
# RUN npm i -g tsx

ADD package.json ./package.json
ADD tsconfig.json ./tsconfig.json

RUN npm install

ADD src ./src
ADD example ./example
ADD scripts ./scripts

RUN npm run prebuild
RUN npm run build-cli

RUN mkdir workspace
WORKDIR /app/workspace

RUN npx create-springboard-app

# RUN tsx cli-src/cli.ts
RUN npx sb build src/index.tsx

CMD ["npx", "sb", "start"]
