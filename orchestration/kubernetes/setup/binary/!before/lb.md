# Load Balancer

## Keepalived + HAProxy

Keepalived 是一个类似于 layer 3, 4 & 5 交换机制的软件，也就是我们平时说的第 3 层、第 4 层和第 5 层交换。

HAProxy 是一款提供高可用性、负载均衡以及基于 TCP（第四层）和 HTTP（第七层）应用的代理软件


## 准备工作

### 使用内核 IPVS 模块

```bash
# 手动加载 ipvs 模块
```

```bash
# 配置操作系统启动是自动加载 IPVS 模块
echo "ip_vs" >> /etc/modules
echo "ip_vs_rr" >> /etc/modules
echo "ip_vs_wrr" >> /etc/modules

# 查看是否 ip_vs 模块是否成功加载
lsmod | grep ip_vs

# 使用 modprobe 命令手动加载
modprobe ip_vs
modprobe ip_vs_rr
modprobe ip_vs_wrr
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
```

```bash
yum -y install inotify-tools
```

## HAProxy

haproxy 代理 ssl 配置有两种方式：
  * haproxy 本身提供 SSL 证书，后面的 web 服务器走正常的http协议；
  * haproxy 本身只提供代理，直接转发 client 端的 HTTPS 请求到后端的 web 服务器。注意：这种模式下 “mode” 必须是“tcp” 模式, 即仅支持4层代理。

### 前端 http、后端 http

```bash
# kube-lb-1: 172.72.4.100
# kube-lb-2: 172.72.4.101
$ cp /etc/haproxy/{haproxy.cfg,haproxy.cfg.bak}
$ vi /etc/haproxy/haproxy.cfg
global
  # [err warning info debug]
  log         127.0.0.1 local0 err
  maxconn     51200
  chroot      /var/lib/haproxy
  pidfile     /var/run/haproxy.pid
  stats socket /var/lib/haproxy/stats
  daemon

defaults
  log                     global
  mode                    http
  option                  httplog
  option                  dontlognull
  retries                 3
  timeout http-request    10s
  timeout queue           1m
  timeout connect         10s
  timeout client          1m
  timeout server          1m
  timeout http-keep-alive 10s
  timeout check           10s
  maxconn                 3000

frontend frontend-apiserver-http
  bind *:8080
  option forwardfor

  acl local_net src 172.72.4.0/24
  http-request allow if local_net
  http-request deny

  default_backend backend-apiserver-http

backend backend-apiserver-http
  balance roundrobin
  option forwardfor

  server k8s-master-1 192.168.10.80:8080 check
  server k8s-master-2 192.168.10.81:8080 check
  server k8s-master-3 192.168.10.82:8080 check

# 开启 haproxy 的健康检查页面
listen haproxy-stats
  bind  0.0.0.0:80
  log  global
  # 这里是 http
  mode  http
  maxconn  10
  stats  enable
  # Hide  HAPRoxy version, a necessity for any public-facing site
  # stats  hide-version
  stats  refresh 30s
  stats  show-node
  stats  realm Haproxy\ Statistics
  stats  auth admin:admin
  stats uri /haproxy?stats
```

校验：

```bash
# 校验 apiserver
$ kubectl get pod --server=http://172.72.4.100:8080
$ kubectl get pod --server=http://172.72.4.101:8080

# 校验监控（浏览器），账号密码为 admin:admin
$ curl http://172.72.4.100/haproxy?stats
$ curl http://172.72.4.101/haproxy?stats
```

### 后端 http、前端 https

```bash

```

### 前端 http、后端 https

配置haproxy用tcp穿透https即haproxy可不用配置证书

```bash
$ cp /etc/haproxy/{haproxy.cfg,haproxy.cfg.bak}
$ vi /etc/haproxy/haproxy.cfg
global
    log         127.0.0.1 local3

    #      local2.*                 /var/log/haproxy.log
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
    server  kube-master-80 192.168.10.80:6443 check
    server  kube-master-81 192.168.10.81:6443 check
    server  kube-master-82 192.168.10.82:6443 check

listen haproxy-stats
    mode http
    bind 0.0.0.0:8888
    transparent
    stats refresh 30s
    stats uri /haproxy?stats
```

```bash
$ systemctl restart haproxy
$ systemctl status haproxy
```

这里有个坑：如果 LB 不是部署到 Master 节点上的话会提示类似以下错误：

```bash
$ kubectl get pod
Unable to connect to the server: x509: certificate is valid for 127.0.0.1, 192.168.10.80, 192.168.10.81, 192.168.10.82, 10.254.0.1, not 172.72.4.100
```

原因是在为 `kube-apiserver` 签发证书时并没有信任代理节点的 IP（只信任了 Master 节点的 IP），因此无法正常代理后端的 ssl 认证的 kube-apiserver。


### 配置 rsyslog 收集 haproxy 日志

```bash
$ echo -e '$ModLoad imudp \n $UDPServerRun 514 \n local2.* /var/log/haproxy.log' >> /etc/rsyslog.conf

$ tail -f /var/log/haproxy.log 
```


## Nginx

```bash
$ vi /etc/nginx/nginx.conf
error_log stderr notice;

worker_processes auto;
events {
  multi_accept on;
  use epoll;
  worker_connections 1024;
}

stream {
  upstream kube_apiserver {
    least_conn;
    server 192.168.10.80:6443;
    server 192.168.10.81:6443;
    server 192.168.10.82:6443;
  }

  server {
    listen        0.0.0.0:9443;
    proxy_pass    kube_apiserver;
    proxy_timeout 10m;
    proxy_connect_timeout 1s;
  }
}
```

```bash
$ docker run -itd --name nginx-proxy --restart=always -p 9443:9443 \
  -v /etc/nginx:/etc/nginx \
  --net=host \
  --restart=on-failure:5 \
  --memory=512M \
  nginx:1.13.5-alpine
```

## Keepalived

```bash
$ vi /etc/keepalived/keepalived.conf

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
  virtual_router_id 50
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

virtual_server 192.168.10.99 6443 {
  delay_loop 5
  lvs_sched wlc
  lvs_method NAT
  persistence_timeout 1800
  protocol TCP

  real_server 192.168.10.80 6443 {
    weight 1
    TCP_CHECK {
      connect_port 6443
      connect_timeout 3
    }
  }
  real_server 192.168.10.81 6443 {
    weight 1
    TCP_CHECK {
      connect_port 6443
      connect_timeout 3
    }
  }
  real_server 192.168.10.82 6443 {
    weight 1
    TCP_CHECK {
      connect_port 6443
      connect_timeout 3
    }
  }
}
```

```
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

vrrp_instance VI_1 {
  state MASTER
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
```


## Keepalived

### 主（kube-lb-1）

```bash
$ cp /etc/keepalived/{keepalived.conf,keepalived.conf.bak}
$ vi /etc/keepalived/keepalived.conf
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

vrrp_instance VI_KEBE_APISERVER {
  state BACKUP
  priority 99
  interface eth1
  track_interface {
    eth1
  }
  virtual_router_id 51
  advert_int 1
  authentication {
    auth_type PASS
    auth_pass 1111
  }
  virtual_ipaddress {
    172.72.4.2 dev eth1 label eth1:vip
  }
  track_script {
    check_haproxy
  }
}

vrrp_instance VI_HOST_GW {
  state MASTER
  priority 100
  interface eth1
  track_interface {
    eth1
  }
  virtual_router_id 52
  advert_int 1
  authentication {
    auth_type PASS
    auth_pass 1111
  }
  virtual_ipaddress {
    172.72.4.3 dev eth1 label eth1:vip
  }
  track_script {
    check_haproxy
  }
}
```


### 备（kube-lb-1）

```
vrrp_instance VI_KEBE_APISERVER {
  ...
  state MASTER
  priority 100
  ...
}

vrrp_instance VI_HOST_GW {
  ...
  state BACKUP
  priority 99
  ...
}
```

### 检查 VIP 是否生效

```bash
$ ip addr show eth1

# 排查日志
$ journalctl -f -u keepalived
```

### kube-keepalived-vip 配置

```
global_defs {
  vrrp_version 3
  vrrp_iptables KUBE-KEEPALIVED-VIP
}

vrrp_instance vips {
  state BACKUP
  interface eth1
  virtual_router_id 50
  priority 100
  nopreempt
  advert_int 1

  track_interface {
    eth1
  }

  virtual_ipaddress { 
    172.72.4.97
  }
}



# Service: default/nginx
virtual_server 172.72.4.97 8000 {
  delay_loop 5
  lvs_sched wlc
  lvs_method NAT
  persistence_timeout 1800
  protocol TCP

  
  real_server 10.1.135.186 80 {
    weight 1
    TCP_CHECK {
      connect_port 80
      connect_timeout 3
    }
  }

  real_server 10.1.169.175 80 {
    weight 1
    TCP_CHECK {
      connect_port 80
      connect_timeout 3
    }
  }

}
```



## 实时同步 HAProxy 配置

LB 节点的 HAProxy 对外提供的服务是一样，因此需要确保 LB 节点之间的配置是一致的。

rsync + inotify: haproxy_rsync.sh

需要 LB 节点之间可以无密钥互访。


## 边界网关、边界 DNS

```bash
$ nslookup kubernetes-dashboard.kube-system.svc.cluster.local 10.254.0.2
```

Ubuntu 在 /etc/resolv.conf 中依然无法正常解析，解决办法：

```bash
$ vi /etc/nsswitch.conf
#hosts:          files mdns4_minimal [NOTFOUND=return] dns
hosts: files dns

# 或

$ apt-get remove -y libnss-mdns
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