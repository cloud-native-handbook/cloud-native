# Router

## 测试 TCP 服务

```yaml
apiVersion: v1
kind: Service
metadata:
  name: mysql
spec:
  type: ClusterIP
  selector:
    app: mysql
  ports:
  - port: 3306
    targetPort: 3306

---

apiVersion: apps/v1beta2
kind: Deployment
metadata:
  name: mysql
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mysql
  strategy:
    type: Recreate
  template:
    metadata:
      labels:
        app: mysql
    spec:
      containers:
      - image: mysql:5.6
        name: mysql
        env:
        - name: MYSQL_ROOT_PASSWORD
          value: '123456'
        - name: MYSQL_ROOT_HOST
          value: '%'
        ports:
        - containerPort: 3306
          name: mysql
        volumeMounts:
        - name: mysql-persistent-storage
          mountPath: /var/lib/mysql
      volumes:
      - name: mysql-persistent-storage
        emptyDir: {}
```

## 共享内部 DNS

客户端如何使用集群内部 DNS 来访问 K8S 服务，目前有 3 种策略（需要打通 Pod IP 和 Service IP）：

1. 直接使用 CoreDNS/KubeDNS Service IP 作为上游 DNS
2. 使用 nginx-ingress-controller（NIC） 的 UDP 代理 CoreDNS/KubeDNS Service，然后使用 NIC 的Host IP 作为上游 DNS
3. 在集群外部署一个带 kubernetes 插件的 CoreDNS（跟集群内的 CoreDNS 完全一样），然后使用该 DNS 作为上游 DNS（如果还有其他 DNS 的话；也可以像我一样直接使用该 CoreDNS 作为总 DNS）

### Ubuntu 客户端

* 先检查 DNS 是否可以正常解析

```bash
$ sudo apt-get install -y dnsutils
$ nslookup kubernetes-dashboard.kube-system.svc.cluster.local 172.254.0.2
```

* 添加内部的 DNS 服务器

```bash
# 添加 dns 到最上层
$ vi /etc/resolvconf/resolv.conf.d/head
search svc.cluster.local cluster.local # -_-
nameserver 172.254.0.2 # -_-
nameserver 114.114.114.114

# 立即生效
$ resolvconf -u

# 检查是否生效
$ cat /etc/resolv.conf
```

Ubuntu 在添加 DNS 服务器后再尝试能否正常解析，并尝试用浏览器打开，如果不能用浏览器打开再进行如下操作：

```bash
# 方法一（修改）
$ vi /etc/nsswitch.conf
#hosts:          files mdns4_minimal [NOTFOUND=return] dns
hosts: files dns

# 方法二（移除）
$ apt-get remove -y libnss-mdns
```

### Windows 客户端

```bash

```

## 配置 calico

注意，calicocatl 我是安装在k8s的master服务器上的，在主控节点上运行创建边界路由器
此处在master3服务器上执行开通边界网关这台机的calicoctl用于管理BGP 的命令。它主要面向在私有云上运行的用户，并希望与其底层基础架构对等。

```bash
$ cat <<EOF | calicoctl create -f -
apiVersion: v1
kind: bgpPeer
metadata:
  peerIP: 192.168.10.120
  scope: global
spec:
  asNumber: 64512
EOF

$ calicoctl get bgppeer
SCOPE    PEERIP           NODE   ASN
global   192.168.10.120          64512

$ calicoctl node status
Calico process is running.
IPv4 BGP status
+----------------+-------------------+-------+----------+-------------+
|  PEER ADDRESS  |     PEER TYPE     | STATE |  SINCE   |    INFO     |
+----------------+-------------------+-------+----------+-------------+
| 192.168.10.81  | node-to-node mesh | up    | 03:32:52 | Established |
| 192.168.10.82  | node-to-node mesh | up    | 06:00:04 | Established |
| 192.168.10.100 | node-to-node mesh | up    | 03:11:04 | Established |
| 192.168.10.102 | node-to-node mesh | up    | 03:11:03 | Established |
| 192.168.10.103 | node-to-node mesh | up    | 03:11:04 | Established |
| 192.168.10.120 | node-to-node mesh | up    | 03:11:03 | Established |
| 192.168.10.121 | node-to-node mesh | up    | 07:08:54 | Established |
| 192.168.10.120 | global            | start | 07:11:32 | Idle        |
+----------------+-------------------+-------+----------+-------------+
```

## keepalived

```bash
$ yum install -y keepalived
```

```bash
$ cat <<EOF > /etc/keepalived/keepalived.conf
global_defs {
  enable_traps
  router_id LVS_DEVEL
}

vrrp_script check_calico {
  script "pidof calico-felix"
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
  virtual_router_id 98
  advert_int 1
  authentication {
    auth_type PASS
    auth_pass 1111
  }
  virtual_ipaddress {
    192.168.10.98
  }
  track_script {
    check_calico
  }
}
EOF
```

```bash
$ systemctl restart keepalived
$ systemctl enable keepalived
```

```bash
$ ip addr show em1
em1: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast state UP qlen 1000
  link/ether 1c:1b:0d:00:22:c8 brd ff:ff:ff:ff:ff:ff
  inet 192.168.10.121/24 brd 192.168.10.255 scope global em1
     valid_lft forever preferred_lft forever
  inet 192.168.10.98/32 scope global em1
     valid_lft forever preferred_lft forever
  inet6 fe80::1e1b:dff:fe00:22c8/64 scope link
     valid_lft forever preferred_lft forever
```

## 参考

* [Openshift router dockerfiles](https://github.com/openshift/origin/tree/master/images/router)
* [Openshift/origin-haproxy-router image](https://hub.docker.com/r/openshift/origin-haproxy-router/)
* [Openshift HA Router and Failover](https://github.com/openshift/origin/tree/master/images/ipfailover/keepalived)
