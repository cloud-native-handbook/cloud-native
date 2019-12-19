# docker volume 命令

## 存储卷

```sh
$ docker volume ls # 所有卷
$ docker volume inspect [volume] # 卷信息
$ docker volume rm [volume] # 删除卷
$ docker volume create --driver local [volume] # 创建本地卷
$ docker volume create --driver rexray [volume] # 基于 rexray 卷插件创建卷（需要先安装 rexray 卷插件）
```
