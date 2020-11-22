# 镜像

## 镜像安全性

* 密码不得写入镜像，必要时可以在运行时通过环境变量等方式植入

## 镜像加速

| Source                 | Porxy in China     | 示例                                                           |
| ---------------------- | ------------------ | -------------------------------------------------------------- |
| dockerhub（docker.io） | dockerhub.azk8s.cn | `docker pull dockerhub.azk8s.cn/library/<imagename>:<version>` |
| gcr.io                 | gcr.azk8s.cn       |
| quay.io                | quay.azk8s.cn      |

## 镜像优化

镜像由一系列文件系统层组成，且后一个镜像层依赖于前一个镜像层。当改变某一个镜像层时，其后的每一层都将发生改变。
对于已经推送或拉取过的镜像，再次推送或拉取时只会推送或拉取发生变化的部分。意味着如果某一层发生变化，除了推送或拉取该镜像层，还会推送或拉取其后的每一层。

* 按从最不可能发生变化到最有可能发生变化的顺序对镜像层进行排序

## 参考

* [Docker Registry Proxy Cache 帮助](http://mirror.azk8s.cn/help/docker-registry-proxy-cache.html)
