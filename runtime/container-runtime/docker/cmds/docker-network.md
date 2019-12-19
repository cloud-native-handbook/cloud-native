# docker network 命令

## 网络

docker 1.12 自带网络插件：`bridge`（默认）、`host`、`macvlan`、`null`和`overlay`

```sh
$ docker network ls # 所有网络
$ docker network inspect [network] # 网络信息
$ docker network rm [network] # 删除网络
$ docker network create --driver bridge --subnet 172.17.2.0/24 --gateway 172.17.2.1 mynet # 创建本地网络，默认的 bridge 驱动自动桥接到系统虚拟网卡 docker0
$ docker network create --driver calico --ipam-driver calico --subnet [CIDR] [network_name] # calico 网络（需要先安装 calico 网络插件）
```
