# PowerDNS

PowerDNS 成立于 20 世纪 90 年代后期，是开源 DNS 软件的主要提供商。

## 域名方案

### 总体规划

假设：一个租户一个命名空间。

各个租户使用 `<service>.<namspace>.svc.cluster.local` 域名来访问各自的服务（通过对外开放 kube-dns/coredns 的方式来实现）。
公共服务使用 `*.k8s.local` 域名来访问（需要自建 dns，将域名解析到 Nginx Ingress Controller 节点，并结合 ingress 来使用）。

### 方案一

1. 将 k8s 的 kube-dns/coredns 对外（Ingress）
2. 在 kube-dns/coredns 上配置存根域：×.k8s.local --> pdns
3. PC --> ×.svc.cluster.local --> kube-dns/coredns --> ServiceIP
   PC --> ×.k8s.local --> kube-dns/coredns （需配置存根域） --> pdns --> NIC（Nginx Ingress Controller） IP
   PC --> ×.× --> kube-dns/coredns（需配置上游 DNS） --> Internet （这一步可选，让 PC 直接走继承本地 NameServer）
4. 路由器层绑定

## 组件

4.x以后pdns被分割成了3个组件:

* PowerDNS Authoritative Server
* PowerDNS Recursor
* PowerDNS Admin Uwsgi

## 安装

### 安装 pdns

安装文档：https://doc.powerdns.com/authoritative/installation.html

```bash
$ yum install pdns-backend-mysql -y
```

### 配置 pdns

需要注意开启内置的httpapi,参考文档上的是4.x的,yum安装的3.x的

参考：https://github.com/ngoduykhanh/PowerDNS-Admin

```bash
experimental-json-interface=yes
experimental-api-key=changeme
webserver=yes
webserver-address=0.0.0.0

launch=gmysql
gmysql-host=127.0.0.1
gmysql-user=root
gmysql-dbname=pdns
gmysql-password=mysecretpassword

#recursor=114.114.114.114
recursor=192.168.100.100    #这是我内网dns
allow-recursion=0.0.0.0/0
```

### 调试

```bash
$ /usr/sbin/pdns_server --daemon=no --guardian=no --loglevel=9
```

### 其他

数据库需要插入数据
3.x和4.x表结构都一样

### 安装 PowerDNS-Admin

官方有个基于php的,太重,于是找了个flask的部署上去了.
https://github.com/ngoduykhanh/PowerDNS-Admin

## Docker 容器化方案

* julianxhokaxhiu/docker-powerdns

https://github.com/julianxhokaxhiu/docker-powerdns

```bash
$ docker run \
  --restart=always \
  -d \
  -p 53:53 \
  -p 53:53/udp \
  -p 80:8080 \
  -v "/home/user/data:/srv/data" \
  julianxhokaxhiu/docker-powerdns
```

* pschiffe/docker-pdns

https://github.com/pschiffe/docker-pdns

## 使用 k8s 来部署

根据企业自身的内部环境，自行决定是否要使用 k8s 来部署。

## 参考

* [PowerDNS/pdns](https://github.com/PowerDNS/pdns)
* [PowerDNS-Admin](https://github.com/ngoduykhanh/PowerDNS-Admin)
* [powerdns+mysql,实现私有作用域转发](http://blog.csdn.net/iiiiher/article/details/78559771)