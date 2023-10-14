# Build the Next.js app
FROM node:16

WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
RUN npm run export

EXPOSE 3000
CMD ["npm", "start"]
