FROM node:lts AS builder
# FROM node:18-alpine AS builder
WORKDIR /app

ARG VITE_IS_DOCKER
ARG VITE_ENV
ARG VITE_SERVER_URL
ENV VITE_IS_DOCKER=${VITE_IS_DOCKER}
ENV VITE_ENV=${VITE_ENV}
ENV VITE_SERVER_URL=${VITE_SERVER_URL}

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm i 

COPY . .
RUN pnpm build

FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
