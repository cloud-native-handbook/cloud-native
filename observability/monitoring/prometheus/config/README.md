# Prometheus 配置

## Reload 配置

先开启 `Lifecycle`

```sh
$ kill -HUP 1234

$ curl -X POST http://localhost:9090/-/reload
```
