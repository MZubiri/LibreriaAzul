FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000 DATA_DIR=/data
RUN apk add --no-cache wget su-exec && addgroup -S app && adduser -S app -G app && mkdir -p /data && chown -R app:app /data /app
COPY --from=deps --chown=app:app /app/node_modules ./node_modules
COPY --chown=app:app . .
RUN chmod +x /app/docker-entrypoint.sh
EXPOSE 3000
VOLUME ["/data"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD wget -qO- http://127.0.0.1:3000/health || exit 1
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]
