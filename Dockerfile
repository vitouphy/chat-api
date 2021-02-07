FROM node:8.7.0-alpine

ARG BOT_URL
ARG PAGE_ACCESS_TOKEN
ARG PORT
ARG DB_USER
ARG DB_PASSWORD
ARG DB_DBNAME
ARG DB_HOST

ENV BOT_URL ${BOT_URL}
ENV PAGE_ACCESS_TOKEN ${PAGE_ACCESS_TOKEN}
ENV PORT ${PORT}
ENV DB_USER ${DB_USER}
ENV DB_PASSWORD ${DB_PASSWORD}
ENV DB_DBNAME ${DB_DBNAME}
ENV DB_HOST ${DB_HOST}

COPY . /app
WORKDIR /app

RUN npm install && npm cache clean --force
EXPOSE 8080

CMD [ "node", "index.js" ]
