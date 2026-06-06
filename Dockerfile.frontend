FROM node:20

WORKDIR /app/frontend

COPY frontend/package.json .

# força resolução correta no Linux
RUN npm install --include=optional

COPY frontend .

RUN npm run build

RUN npm install -g serve

EXPOSE 10000
CMD ["serve", "-s", "dist", "-l", "10000"]