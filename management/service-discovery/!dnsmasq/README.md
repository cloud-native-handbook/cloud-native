# dnsmasq

DNSmasq 是一个轻量级 DHCP 和 DNS 缓存服务器。

## 安装部署

* 安装

```bash
# CentOS
$ yum install -y dnsmasq bind-utils

# Ubuntu
$ apt-get install -y dnsmasq dnsutils
```

* 配置

```bash
# 备份
$ cp /etc/{dnsmasq.conf,dnsmasq.conf.bak}

$ cat /etc/dnsmasq.conf
resolv-file=/etc/resolv.dnsmasq.conf
strict-order
no-hosts
addn-hosts=/etc/dnsmasq.hosts
listen-address=192.168.10.103,127.0.0.1
server=/svc.cluster.local/192.168.10.102
cache-size=150
```

参数说明：

* domain: 待查
* resolv-file: 从指定文件获取上游 DNS 服务器，默认是 /etc/resolv.conf。
* strict-order: 严格按照 resolv-file 文件中的顺序从上到下进行 DNS 解析，直到解析成功为止。
* no-resolv: 不读取本地 /etc/resolv.conf 文件以及 resolv-file 设置的文件。
* no-hosts: 不读取本地 /etc/hosts 文件，默认是先读取 hosts 文件查找，再查找缓存域名，最后到上游 DNS 查找。
* addn-hosts: 指定附加的 hosts 文件，每次修改需要重启 dnsmasq。
* listen-address: 监听地址，设置为服务器内网 IP 或外网 IP，多个地址可以用逗号分隔。
* server: 设置存根域或上游 DNS；存根域，即针对不同的域名使用不同的 DNS，如：`server=/cloud.local/172.254.0.2`；上游 DNS，如：`server=1.2.4.8`；server 可以添加多个，越往下优先级越高。
* address: 设置域名所解析到的 IP 地址，如：'address=/blog.com/1.2.3.4'，如果希望包含多个 IP 地址，可以使用 `addn-hosts`；`address` 优先级高于 hosts 文件。
* bogus-nxdomain: 防止 DNS 污染。
* cache-size: 设置 DNS 缓存大小。
* 192.168.10.103: dnsmasq 服务器的 IP。
* 192.168.10.102: 代理 kubedns 或 coredns 的 ingress-nginx 节点 IP。
* DNS 优先级（由高到低）：address 参数（从上往下） => hosts 文件（从上往下） => server 参数（从下往上） => resolv-file 文件（从上往下）。

配置上游 DNS：

```bash
$ vi /etc/resolv.dnsmasq.conf
nameserver 114.114.114.114
nameserver 8.8.8.8

# 创建 hosts 文件（如果目前没有内容，可暂时置为空）
$ vi /etc/dnsmasq.hosts
192.168.10.99 api.k8s.local
192.168.10.122 ui.k8s.local
192.168.10.123 harbor.k8s.local
```

检查配置文件是否配置正确：

```bash
$ dnsmasq --test
dnsmasq: syntax check OK.
```

* 启动

```bash
# CentOS
$ systemctl start dnsmasq
$ systemctl enable dnsmasq

# 验证服务
$ systemctl status -l dnsmasq

$ netstat -tupln | grep 53
tcp   0  0  0.0.0.0:53  0.0.0.0:*  LISTEN  33146/dnsmasq
tcp6  0  0  :::53       :::*       LISTEN  33146/dnsmasq
udp   0  0  0.0.0.0:53  0.0.0.0:*          33146/dnsmasq
udp6  0  0  :::53       :::*               33146/dnsmasq

# 排查日志
$ journalctl -f -u dnsmasq
```

```bash
# Ubuntu
$ service dnsmasq start
```

* 测试

```bash
$ dig badiu.com @192.168.10.103 +short

$ dig kubernetes-dashboard.kube-system.svc.cluster.local @192.168.10.103 +short
```

## 参考

* [Linux 安装 DNSmasq 搭建自己的公共 DNS](https://www.xiaoz.me/archives/8303)
* [10 分钟 dnsmasq 搭建](https://mritd.me/2016/09/01/10%E5%88%86%E9%92%9F-dnsmasq-%E6%90%AD%E5%BB%BA/#一安装)
* [DNSMASQ manpage](http://www.thekelleys.org.uk/dnsmasq/docs/dnsmasq-man.html)
* [DNSMASQ dbus-interface](http://www.thekelleys.org.uk/dnsmasq/docs/DBus-interface)
* [spring-cloud kubernetes 实践](https://blog.csdn.net/idea77/article/details/83446335)
