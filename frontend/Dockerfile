# --- build ---
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Empty = same-origin /api (proxied by nginx below). Set to a full URL to call a remote API instead.
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# --- serve ---
FROM nginx:1.27-alpine
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
# Where nginx forwards /api; the compose service name by default.
ENV BACKEND_URL=http://backend:8000 \
    NGINX_RESOLVER=127.0.0.11
EXPOSE 80
