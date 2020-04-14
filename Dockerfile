# build stage
FROM node:12-alpine as buildfront
WORKDIR /app
COPY . .
RUN npm ci --ignore-scripts && npm run build

# prod stage
FROM nginx:1.17.9-alpine
WORKDIR /usr/share/nginx/html
COPY --from=buildfront /app/dist .
