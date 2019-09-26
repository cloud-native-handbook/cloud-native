# 入门

## 构建

```bash
# 假设你已经安装了 Go 并配置了 GOPATH 环境变量
$ go version && echo $GOPATH
go version go1.10 linux/amd64
/root/go
```

```bash
$ go get github.com/coreos/dex
$ cd $GOPATH/src/github.com/coreos/dex
$ make
```

## 配置

```bash
$ ./bin/dex serve examples/config-dev.yaml
```

## 运行客户端

```bash
$ ./bin/example-app
```

## 参考

* [Getting started](https://github.com/coreos/dex/blob/master/Documentation/getting-started.md)
