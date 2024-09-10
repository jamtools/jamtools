# Dockerfile for mkdocs builder

FROM python:3.9-slim

WORKDIR /app

RUN apt-get update && apt-get install -y curl \
    && curl -fsSL https://deb.nodesource.com/setup_16.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

RUN pip install mkdocs mkdocs-material mkdocs-typedoc mkdocs-include-markdown-plugin

RUN mkdir docs

COPY .. .

WORKDIR docs

RUN npm i

EXPOSE 8000

CMD ["mkdocs", "serve", "--dev-addr=0.0.0.0:8000"]
