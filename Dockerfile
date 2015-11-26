FROM node:4.2.1

RUN apt-get update -y && apt-get install -y haproxy

WORKDIR /var/app

COPY package.json /var/app/
RUN npm install --production --silent || (cat `find . -name 'npm*.log'`; exit $?)
COPY . /var/app

CMD npm start
