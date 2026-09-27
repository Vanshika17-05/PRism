FROM python:3.12-slim
WORKDIR /app
COPY python-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY python-service/app ./app
RUN useradd --create-home --uid 10001 prism && mkdir -p /data/chroma && chown -R prism:prism /app /data
USER prism
EXPOSE 8100
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8100"]
