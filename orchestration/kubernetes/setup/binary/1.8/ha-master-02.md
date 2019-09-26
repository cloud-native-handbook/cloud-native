# HA Master

Master 之中除了 apiserver 外其他组件都通过 etcd 选举，apiserver 默认不作任何处理。在每个 node 上启动一个 nginx 来反向代理所有 apiserver，node 上 kubelet、kube-proxy 连接本地的 nginx 代理端口，当 nginx 发现无法连接后端时会自动踢掉出问题的 apiserver，从而实现 apiserver 的 HA。


## 部署 Nginx 代理

### 设置 Nginx 配置

```bash
$ mkdir -p /etc/nginx

$ cat << EOF > /etc/nginx/nginx.conf
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
    listen        0.0.0.0:8443;
    proxy_pass    kube_apiserver;
    proxy_timeout 10m;
    proxy_connect_timeout 1s;
  }
}
EOF
```

### 创建 systemd unit

```bash
$ cat <<EOF > /etc/systemd/system/nginx-lb.service
[Unit]
Description=kube-apiserver nginx
Wants=docker.socket
After=docker.service

[Service]
User=root
PermissionsStartOnly=true
ExecStart=/usr/bin/docker run \\
  --name nginx-lb \\
  --net=host \\
  --restart=always \\
  -v /etc/nginx:/etc/nginx \\
  nginx:1.13-alpine
ExecStartPre=-/usr/bin/docker rm -f nginx-lb
ExecStop=/usr/bin/docker stop nginx-lb
Restart=always
RestartSec=15s
TimeoutStartSec=30s

[Install]
WantedBy=multi-user.target
EOF
```

### 启动 Nginx

```bash
# 运行
systemctl daemon-reload
systemctl enable nginx-lb
systemctl restart nginx-lb

# 查看状态
$ systemctl status nginx-lb

# 检查服务
$ netstat -tpln | grep 8443

# 排查日志
$ journalctl -f -u nginx-lb
```

## 部署 Keepalived

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
