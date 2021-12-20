FROM node

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . . 

RUN sed -i "s/127.0.0.1:27017/mongodb/" .env

ENV PORT=3000

EXPOSE 3000

CMD [ "node", "index.js" ]


