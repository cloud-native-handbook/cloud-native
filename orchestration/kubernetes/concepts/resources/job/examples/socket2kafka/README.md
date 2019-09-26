# Socket2Kafka

## 构建

```bash
$ docker build -f Dockerfile -t job/socket2kafka:1030-1 .
```

## 部署

```bash
$ docker run -it --rm --name socket2kafka --net host job/socket2kafka:1030-1 /socket2kafka.py 16198 192.168.18.220:9092 beijing-boloomo
```
