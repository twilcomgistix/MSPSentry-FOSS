FROM node:12.18.1
ENV NODE_ENV=production

ENV TZ=America/Chicago
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

RUN mkdir -p /app
WORKDIR /app

COPY . /app

RUN npm install

CMD bash -c "node index.js"