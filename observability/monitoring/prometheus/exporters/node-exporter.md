# Node exporter

```sh
$ docker run -d --name=node-exporter --net=host --pid=host -v "/:/host:ro" prom/node-exporter --path.rootfs=/host
```
