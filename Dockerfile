FROM node:7

RUN mkdir -p /root/src/app
WORKDIR /root/src/app

COPY package.json /usr/src/app/
RUN npm install

COPY . /root/src/app

EXPOSE 3000

CMD ["npm", "start"]