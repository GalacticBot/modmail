FROM node:lts-alpine3.12
WORKDIR /modmail
COPY . .
RUN yarn install --production
VOLUME [ "/modmail/modmail_cache" ]
CMD ["node", "index.js"]