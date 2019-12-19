# Docker

## Iptables

新版本的 Docker 默认关闭了 iptables 的转发功能，需要手动开启它。

```bash
$ # 默认
$ iptables -L -n | grep FORWARD
Chain FORWARD (policy DROP)

$ # 开启
$ iptables -P FORWARD ACCEPT
```

## 修改时区（TZ）

* Alpine

```bash
# 方式一
$ date
$ apk add -U tzdata
$ cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime
$ date

# 方式二
$ date
$ apk add -U tzdata
$ export TZ=Asia/Shanghai # 可以先在 Dockerfile 中指定： ENV TZ=Asia/Shanghai，运行容器的时候再通过环境变量进行修改
$ date
```

* Ubuntu

```bash
# 方式一
$ date
$ apt-get update && apt-get install -y tzdata
$ cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime
$ date

# 方式二
$ date
$ apt-get update && apt-get install -y tzdata
$ export TZ=Asia/Shanghai # 同上
$ date
```


## Dockerfile

https://mritd.me/2017/11/12/ci-cd-dockerfile/


## 镜像加速

* [Docker 中国官方镜像加速](https://www.docker-cn.com/registry-mirror)
