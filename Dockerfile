FROM node:20.18.0-alpine3.20 as builder

WORKDIR /app

COPY package.json package.json
COPY package.json package.json
COPY tsconfig.json tsconfig.json
COPY src/ src/

RUN npm install
# RUN npm install -g typescript@5.6.3

ENV NODE_ENV=production
RUN npm run build

RUN wget https://gobinaries.com/tj/node-prune --output-document - | /bin/sh && node-prune

FROM node:20.18.0-alpine3.20

WORKDIR /app

# Copy over the minimal distribution and node modules.
COPY entrypoint.sh /app/entrypoint.sh
COPY --from=builder /app/dist dist/
COPY --from=builder /app/node_modules node_modules/

# Run the index.js and accept all other command line arguments.
ENTRYPOINT [ "/app/entrypoint.sh" ]
