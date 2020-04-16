# build stage
FROM node:12-alpine as buildfront
WORKDIR /app
COPY . .
RUN npm ci --ignore-scripts && npm run build

# prod stage
FROM gmportfolio/pf-static-server:latest
WORKDIR /usr/share/nginx/html
COPY --from=buildfront /app/dist .
