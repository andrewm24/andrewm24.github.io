FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt
COPY . /app
CMD ["gunicorn", "trainerhub.wsgi:application", "--bind", "0.0.0.0:8000"]
