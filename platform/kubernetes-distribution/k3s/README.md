# K3s

## 架构

![How it Works](.images/how-it-works.svg)

## 增删

## 最低系统要求

* Linux 3.10+
* 每个 Server 至少 512MB 内存
* 每个 Node 至少 75MB 内存
* 磁盘空间 200MB
* CPU 架构为 x86_64、ARMv7 或 ARM64

> 适合在树莓派上运行

## 快速入门

1. 下载 [k3s 最新版](https://github.com/rancher/k3s/releases/latest)
2. 安装

```bash
# Linux x86_64
$ sudo wget https://github.com/rancher/k3s/releases/download/v0.5.0/k3s -O /usr/local/bin/k3s
```

```bash
# MacOS
```

### 运行

* 运行 Server

```bash
# 运行 Server
$ sudo k8s server &

# 检查
$ sudo k3s kubectl get node
```