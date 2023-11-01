one way:
docker run jupyter/datascience-notebook

the other:
docker-compose up -d
docker logs tesis-prueba-jupyter-1 | grep http://127.0.0.1:8888/lab\?token\=
