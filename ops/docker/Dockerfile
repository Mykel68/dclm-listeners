# Build Stage
FROM opeoniye/node16:latest AS build
WORKDIR /app
COPY ./src/package*.json ./
# install libs & deps
ARG NODE_ENV
ENV NODE_ENV=$NODE_ENV
RUN if [ "$NODE_ENV" = "development" ]; then \
    # for development \
    npm install; \
    npm cache clean --force; \
  elif [ "$NODE_ENV" = "production" ]; then \
    # for production \
    npm ci --omit=dev; \
    npm cache clean --force; \
  else \
    echo "Nodejs NODE_ENV variable not defined"; \
    exit 1; \
  fi
COPY ./src .

# Final Stage
FROM opeoniye/node16:latest
WORKDIR /var/www
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/ .
COPY --chown=node:node ./ops/sh/run.sh /var/docker/run.sh

# run user as node
USER node

# run when container starts
# ENTRYPOINT ["/var/docker/run.sh"]

# start app
CMD ["dumb-init", "pm2-runtime", "ecosystem.config.js"]
