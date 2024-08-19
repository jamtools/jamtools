# Dockerfile for mkdocs builder

FROM python:3.9-slim

WORKDIR /app

RUN pip install mkdocs mkdocs-material

COPY . .

EXPOSE 8000

CMD ["mkdocs", "serve", "--dev-addr=0.0.0.0:8000"]
