# Load Balancer

## Keepalived + HAProxy

Keepalived 是一个类似于 layer 3, 4 & 5 交换机制的软件，也就是我们平时说的第 3 层、第 4 层和第 5 层交换。

HAProxy 是一款提供高可用性、负载均衡以及基于 TCP（第四层）和 HTTP（第七层）应用的代理软件


## 准备工作

### 使用内核 IPVS 模块

```bash
# 使用 modprobe 命令手动加载
modprobe ip_vs
modprobe ip_vs_rr
modprobe ip_vs_wrr

# 配置操作系统启动是自动加载 IPVS 模块
echo "ip_vs" >> /etc/modules
echo "ip_vs_rr" >> /etc/modules
echo "ip_vs_wrr" >> /etc/modules

# 查看是否 ip_vs 模块是否成功加载
lsmod | grep ip_vs
```

### 修改内核参数

为了使keepalived将数据包转发到真实的后端服务器，每一个lb node都需要开启IP转发功能

```bash
echo "net.ipv4.ip_forward = 1" >> /etc/sysctl.conf
``` 

另外，keepalived设置的VIP有可能为非本地IP地址，所以我们还需要使能非本地IP地址绑定功能：

```bash
echo "net.ipv4.ip_nonlocal_bind = 1" >> /etc/sysctl.conf
```

```bash
sysctl -p
```

### 安装

```bash
yum install -y keepalived
yum install -y haproxy
#yum install -y ipvsadm
#yum install psmisc # killall
#yum -y install inotify-tools
```

## HAProxy

haproxy 代理 ssl 配置有两种方式：
  * haproxy 本身提供 SSL 证书，后面的 web 服务器走正常的http协议；
  * haproxy 本身只提供代理，直接转发 client 端的 HTTPS 请求到后端的 web 服务器。注意：这种模式下 “mode” 必须是“tcp” 模式, 即仅支持4层代理。

### 配置 HAProxy

前端 http、后端 https

```bash
$ cp /etc/haproxy/{haproxy.cfg,haproxy.cfg.bak}
$ cat <<EOF > /etc/haproxy/haproxy.cfg
global
    log         127.0.0.1 local3

    chroot      /var/lib/haproxy
    pidfile     /var/run/haproxy.pid
    maxconn     4000
    user        haproxy
    group       haproxy
    daemon

    # turn on stats unix socket
    stats socket /var/lib/haproxy/stats

defaults
    mode                    http
    log                     global
    option                  dontlognull
    option http-server-close
    option                  redispatch
    retries                 3
    timeout http-request    10s
    timeout queue           1m
    timeout connect         10s
    timeout client          1m
    timeout server          1m
    timeout http-keep-alive 10s
    timeout check           10s
    maxconn                 3000

listen kube-apiserver
    mode tcp
    bind 0.0.0.0:8443
    balance     roundrobin
    server  kube-master-1 192.168.10.80:6443 check
    server  kube-master-1 192.168.10.81:6443 check
    server  kube-master-1 192.168.10.82:6443 check

listen haproxy-stats
    mode http
    bind 0.0.0.0:8888
    transparent
    stats refresh 30s
    stats uri /haproxy?stats
EOF
```

### HAProxy docker

```bash
systemctl stop haproxy

cat <<EOF > /etc/systemd/system/haproxy-proxy.service
[Unit]
Description=kubernetes apiserver docker wrapper
Wants=docker.socket
After=docker.service

[Service]
User=root
PermissionsStartOnly=true
ExecStart=/usr/bin/docker run \
  --net=host \
  -v /etc/haproxy:/etc/haproxy \
  --name haproxy-proxy \
  --restart=on-failure:5 \
  --memory=512M \
  dockercloud/haproxy
ExecStartPre=-/usr/bin/docker rm -f haproxy-proxy
ExecStop=/usr/bin/docker stop haproxy-proxy
Restart=always
RestartSec=15s
TimeoutStartSec=30s

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl stop haproxy
systemctl restart haproxy-proxy
systemctl status haproxy-proxy
```

### 运行 HAProxy

```bash
# 启动
$ systemctl enable haproxy
$ systemctl restart haproxy

# 查看状态
$ systemctl status haproxy

# 浏览器访问
$ curl http://xxx.xxx.xxx.xxx/haproxy?stats

# 排查日志
$ journalctl -f -u haproxy
```


## Keepalived

三个 Master 节点的状态全为 `BACKUP`，并且优先级均为 100。

### 配置 keepalived

```bash
$ cat <<EOF > /etc/keepalived/keepalived.conf
global_defs {
  vrrp_version 3
  vrrp_iptables HAPROXY-KEEPALIVED-VIP
}

vrrp_script check_haproxy {
  script "pidof haproxy"
  interval 1
  weight -5
  fall 2
  rise 1
}

vrrp_instance VI_KUBE_APISERVER {
  state BACKUP
  interface em1
  virtual_router_id 51
  priority 100
  nopreempt
  advert_int 1

  track_interface {
    em1
  }

  track_script {
    check_haproxy
  }

  virtual_ipaddress {
    192.168.10.99
  }
}

virtual_server 192.168.10.99 8443 {
  delay_loop 5
  lvs_sched wlc
  lvs_method NAT
  persistence_timeout 1800
  protocol TCP

  real_server 192.168.10.80 8443 {
    weight 1
    TCP_CHECK {
      connect_port 8443
      connect_timeout 3
    }
  }
  real_server 192.168.10.81 8443 {
    weight 1
    TCP_CHECK {
      connect_port 8443
      connect_timeout 3
    }
  }
  real_server 192.168.10.82 8443 {
    weight 1
    TCP_CHECK {
      connect_port 8443
      connect_timeout 3
    }
  }
}
EOF
```

```bash
$ cat <<EOF > /etc/keepalived/keepalived.conf
global_defs {
  enable_traps
  router_id LVS_DEVEL
}

vrrp_script check_haproxy {
  script "pidof haproxy"
  interval 1
  weight -5
  fall 2
  rise 1
}

vrrp_instance VI_KUBE_APISERVER {
  state BACKUP
  priority 100
  interface em1
  track_interface {
    em1
  }
  virtual_router_id 51
  advert_int 1
  authentication {
    auth_type PASS
    auth_pass 1111
  }
  virtual_ipaddress {
    192.168.10.99
  }
  track_script {
    check_haproxy
  }
}
EOF
```

### 运行 Keepalived

```bash
# 启动
$ systemctl enable haproxy
$ systemctl restart keepalived

# 查看状态
$ systemctl status keepalived

# 排查日志
$ journalctl -f -u keepalived
```

### 检查 VIP 是否生效

```bash
# 三个节点
$ ip addr show em1
em1: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc mq state UP qlen 1000
  link/ether d4:be:d9:b6:97:fe brd ff:ff:ff:ff:ff:ff
  inet 192.168.10.82/24 brd 192.168.10.255 scope global em1
     valid_lft forever preferred_lft forever
  inet 192.168.10.99/32 scope global em1
     valid_lft forever preferred_lft forever
  inet6 fe80::67ee:f4d8:6945:c318/64 scope link
     valid_lft forever preferred_lft forever

# 尝试关闭 haproxy 或/和 keepalived（尤其是关闭 haproxy），观察 VIP 是否会漂移到其他节点
# systemctl stop haproxy
# systemctl stop keepalived
```




> https://askubuntu.com/questions/81797/nslookup-finds-ip-but-ping-doesnt

## 参考

* [Kubernetes Master High Availability 高级实践](https://segmentfault.com/a/1190000005832319)
* [使用 IPVS 实现 Kubernetes 入口流量负载均衡](http://blog.csdn.net/qq_34463875/article/details/72730489)
* [Kubernetes 高可用负载均衡与集群外服务访问实践](https://www.kubernetes.org.cn/2812.html)
* [How To Set Up Highly Available HAProxy Servers with Keepalived and Floating IPs on Ubuntu 14.04](https://www.digitalocean.com/community/tutorials/how-to-set-up-highly-available-haproxy-servers-with-keepalived-and-floating-ips-on-ubuntu-14-04)
* [真正的 inotify + rsync 实时同步 彻底告别同步慢](https://www.cnblogs.com/jackyyou/p/5681126.html)
* [](https://www.cnblogs.com/shihaiming/p/6868172.html)

* https://www.cnblogs.com/fansik/p/6248684.html
> http://www.keepalived.org/LVS-NAT-Keepalived-HOWTO.html
> https://tools.ietf.org/html/rfc5798

* [Kube-apiserver with Keepalived and HAProxy for HA](https://icicimov.github.io/blog/kubernetes/Kubernetes-cluster-step-by-step-Part5/)
