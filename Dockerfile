ARG VERSION=0.4.0
ARG BUILD_DATE=development
ARG GIT_SHA=development

FROM node:24.20.0-bookworm-slim@sha256:ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev && mkdir /data-seed

FROM gcr.io/distroless/cc-debian12:nonroot@sha256:9dac0a79194e45a7da0158a9c6da57b217585af0786db3845d1f0ec1a0dd182f AS runtime
ARG VERSION
ARG BUILD_DATE
ARG GIT_SHA
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8080 DATABASE_PATH=/data/app.sqlite PLACE_DATABASE_PATH=/app/reference/geonames-cities.db3 COOKIE_SECURE=true APP_VERSION=${VERSION} BUILD_DATE=${BUILD_DATE} GIT_SHA=${GIT_SHA}
WORKDIR /app
COPY --from=build --chown=65532:65532 /usr/local/bin/node /usr/local/bin/node
COPY --from=build --chown=65532:65532 /app/package.json /app/package-lock.json ./
COPY --from=build --chown=65532:65532 /app/node_modules ./node_modules
COPY --from=build --chown=65532:65532 /app/src ./src
COPY --from=build --chown=65532:65532 /app/dist ./dist
COPY --from=build --chown=65532:65532 /app/data/geonames-cities.db3 ./reference/geonames-cities.db3
COPY --from=build --chown=65532:65532 /app/LICENSE /app/NOTICE /app/THIRD_PARTY_LICENSES.md ./
COPY --from=build --chown=65532:65532 /data-seed /data
USER 65532:65532
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD ["/usr/local/bin/node", "-e", "fetch('http://127.0.0.1:8080/health/ready').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
ENTRYPOINT ["/usr/local/bin/node"]
CMD ["--import", "tsx", "src/server/index.ts"]
