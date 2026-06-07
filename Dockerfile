FROM apify/actor-node:24

COPY --chown=myuser:myuser package*.json Dockerfile ./

RUN npm --quiet set progress=false \
    && npm install --omit=dev --omit=optional \
    && rm -r ~/.npm

COPY --chown=myuser:myuser . ./

ENV APIFY_LOG_LEVEL=INFO

CMD npm start --silent
