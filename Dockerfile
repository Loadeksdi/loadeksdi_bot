FROM node:15-alpine

WORKDIR /app

COPY . /app/

RUN apk add --no-cache python make g++

RUN yarn

CMD [ "node", "index.js" ]