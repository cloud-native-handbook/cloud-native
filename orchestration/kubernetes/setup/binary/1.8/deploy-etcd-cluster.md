# 部署 ETCD 集群

## 自签名 CA

为了减低 etcd 和 kubernetes 的耦合性，我们单独创建一套 CA 来为 etcd 签名证书。

### 创建 CA 配置文件 【kube-master-1】

CA 配置文件用于签发证书时设置证书的过期时间、用途、使用场景等等。

```bash
$ mkdir -p /etc/etcd/pki

$ cat <<EOF > /etc/etcd/pki/etcd-ca-config.json
{
  "signing": {
    "default": {
      "expiry": "87600h"
    },
    "profiles": {
      "server": {
        "expiry": "87600h",
        "usages": [
          "signing",
          "key encipherment",
          "server auth"
        ]
      },
      "client": {
        "expiry": "87600h",
        "usages": [
          "signing",
          "key encipherment",
          "client auth"
        ]
      },
      "etcd": {
        "expiry": "87600h",
        "usages": [
          "signing",
          "key encipherment",
          "server auth",
          "client auth"
        ]
      }
    }
  }
}
EOF

# 如果需要自定义，请先查看默认配置
$ cfssl print-defaults config
```

相关说明：

  * `kubernetes-ca-config.json`：定义了多个 profile，分别指定了相应的过期时间、用途和使用场景等参数，后续签发证书时再根据使用场景指定要使用哪个 profile；
  * `signing`：表示该证书用于签名其他证书，即该证书将作为 CA 证书；
  * `profile`（profile name 是自定义的）：
    * server: 使用 `server auth` 对服务端进行认证；客户端可以使用自签名的 CA 对服务端提供的证书进行身份校验；
    * client: 使用 `client auth` 对客户端进行认证；服务端可以使用自签名的 CA 对客户端提供的证书进行身份校验；
    * peer: 同时对客户端和服务端进行认证，常用于彼此间相互通信；客户端和服务端可以使用自签名的 CA 对彼此提供的证书进行身份校验。

### 为 CA 创建 CSR 配置文件 【kube-master-1】

```bash
$ mkdir -p /etc/etcd/csr

$ cat <<EOF > /etc/etcd/csr/etcd-ca-csr.json
{
  "CN": "ETCD CA",
  "key": {
    "algo": "rsa",
    "size": 2048
  },
  "names": [
    {
      "C": "CN",
      "ST": "ShangHai",
      "L": "ShangHai",
      "O": "CA",
      "OU": "China"
    }
  ]
}
EOF

# 如果需要自定义，请先查看默认配置
$ cfssl print-defaults csr
```

### 创建 CA 证书和私钥 【kube-master-1】

```bash
$ cd /etc/etcd/pki

$ cfssl gencert -initca /etc/etcd/csr/etcd-ca-csr.json | cfssljson -bare etcd-ca
[INFO] generating a new CA key and certificate from CSR
[INFO] generate received request
[INFO] received CSR
[INFO] generating key: rsa-2048
[INFO] encoded CSR
[INFO] signed certificate with serial number 229697730353699304248558030300666842446794954246

$ ls etcd-ca*
etcd-ca-config.json  etcd-ca.csr  etcd-ca-key.pem  etcd-ca.pem

# 转移 csr 文件
$ mv -f etcd-ca.csr ../csr

# 校验 CA 证书（由于是自签名证书，所以 subject 和 issuer 相同）
$ cfssl-certinfo -cert etcd-ca.pem
{
  "subject": {
    "common_name": "ETCD CA",
    "country": "CN",
    "organization": "CA",
    "organizational_unit": "China",
    "locality": "ShangHai",
    "province": "ShangHai",
    "names": [
      "CN",
      "ShangHai",
      "ShangHai",
      "CA",
      "China",
      "ETCD CA"
    ]
  },
  "issuer": {
    "common_name": "ETCD CA",
    "country": "CN",
    "organization": "CA",
    "organizational_unit": "China",
    "locality": "ShangHai",
    "province": "ShangHai",
    "names": [
      "CN",
      "ShangHai",
      "ShangHai",
      "CA",
      "China",
      "ETCD CA"
    ]
  },
  ...
}
```

### 分发 CA 证书和私钥 【kube-master-1】

```bash
# 分发 CA 相应文件到所有 etcd 节点

$ OTHER_ETCD_NODES=(kube-master-2 kube-master-3)
$ for etcd_node in ${OTHER_ETCD_NODES[@]}; do
  ssh -t root@${etcd_node} "mkdir -p /etc/etcd/pki"; \
  scp /etc/etcd/pki/etcd-ca* root@${etcd_node}:/etc/etcd/pki; \
done
```


## 签发 etcd 证书

### 创建 etcd csr 配置文件 【kube-master-1】

```bash
$ mkdir -p /etc/etcd/csr

# 服务端 csr 配置
$ cat <<EOF > /etc/etcd/csr/etcd-server-csr.json
{
  "CN": "etcd-server",
  "hosts": [
    "127.0.0.1",
    "192.168.10.80",
    "192.168.10.81",
    "192.168.10.82"
  ],
  "key": {
    "algo": "rsa",
    "size": 2048
  },
  "names": [
    {
      "C": "CN",
      "ST": "ShangHai",
      "L": "ShangHai",
      "O": "ETCD"
    }
  ]
}
EOF

# 成员之间通信的 csr 配置
$ cat <<EOF > /etc/etcd/csr/etcd-member-csr.json
{
  "CN": "etcd",
  "hosts": [
    "127.0.0.1",
    "192.168.10.80",
    "192.168.10.81",
    "192.168.10.82"
  ],
  "key": {
    "algo": "rsa",
    "size": 2048
  },
  "names": [
    {
      "C": "CN",
      "ST": "ShangHai",
      "L": "ShangHai",
      "O": "ETCD"
    }
  ]
}
EOF

# 客户端 csr 配置
$ cat > /etc/etcd/csr/etcd-client-csr.json <<EOF
{
  "CN": "etcd-client",
  "hosts": [],
  "key": {
    "algo": "rsa",
    "size": 2048
  },
  "names": [
    {
      "C": "CN",
      "ST": "ShangHai",
      "L": "ShangHai",
      "O": "ETCD"
    }
  ]
}
EOF
```

相关说明：

  * etcd-client-csr.json: 为了便于其他节点连接 etcd 集群，我们需要忽略 `hosts` 字段；

### 生成 etcd 证书和私钥 【kube-master-1】

```bash
$ cd /etc/etcd/pki

# 生成服务端证书（使用 server auth 和 client auth）
$ cfssl gencert -ca=etcd-ca.pem -ca-key=etcd-ca-key.pem \
-config=etcd-ca-config.json -profile=etcd ../csr/etcd-server-csr.json | cfssljson -bare etcd-server

# 生成对等证书
$ cfssl gencert -ca=etcd-ca.pem -ca-key=etcd-ca-key.pem \
-config=etcd-ca-config.json -profile=etcd ../csr/etcd-member-csr.json | cfssljson -bare etcd-member

# 生成客户端证书
$ cfssl gencert -ca=etcd-ca.pem -ca-key=etcd-ca-key.pem \
-config=etcd-ca-config.json -profile=client ../csr/etcd-client-csr.json | cfssljson -bare etcd-client

# 转移 csr 文件
$ mv -f *.csr ../csr

$ ls etcd-server*
etcd-server-key.pem  etcd-server.pem

$ ls etcd-client*
etcd-client-key.pem  etcd-client.pem

$ ls etcd-member*
etcd-member-key.pem  etcd-member.pem
```

> 签发服务端证书时同时使用 server auth 和 client auth，是因为如果只使用 server auth，在启动 etcd 可能会提示 " etcdserver/api/v3rpc: Failed to dial xxx.xxx.xxx.xxx:2379: connection error: desc = "transport: remote error: tls: bad certificate"; please retry.".

### 分发 etcd 证书和私钥到其它 etcd 服务器

```bash
# cd /etc/etcd/pki

$ OTHER_ETCD_NODES=(kube-master-2 kube-master-3)
$ for etcd_node in ${OTHER_ETCD_NODES[@]}; do
  ssh -t root@${etcd_node} "mkdir -p /etc/etcd/pki"; \
  scp /etc/etcd/pki/etcd-server* root@${etcd_node}:/etc/etcd/pki; \
  scp /etc/etcd/pki/etcd-client* root@${etcd_node}:/etc/etcd/pki; \
  scp /etc/etcd/pki/etcd-member* root@${etcd_node}:/etc/etcd/pki; \
done
```


## 部署 etcd

### 设置 etcd 配置 【ALL ETCD】

```bash
# etcd2: 192.168.10.81, etcd3: 192.168.10.82
$ ETCD_NAME=etcd1 && ETCD_IP=192.168.10.80
$ INITIAL_CLUSTER="https://192.168.10.80:2380,etcd2=https://192.168.10.81:2380,etcd3=https://192.168.10.82:2380"

$ cat <<EOF > /usr/lib/systemd/system/etcd.service
[Unit]
Description=Etcd Server
After=network.target
After=network-online.target
Wants=network-online.target

[Service]
Type=notify
ExecStart=/usr/bin/etcd \\
  --name=${ETCD_NAME} \\
  --client-cert-auth=true \\
  --cert-file=/etc/etcd/pki/etcd-server.pem \\
  --key-file=/etc/etcd/pki/etcd-server-key.pem \\
  --trusted-ca-file=/etc/etcd/pki/etcd-ca.pem \\
  --peer-client-cert-auth=true \\
  --peer-cert-file=/etc/etcd/pki/etcd-member.pem \\
  --peer-key-file=/etc/etcd/pki/etcd-member-key.pem \\
  --peer-trusted-ca-file=/etc/etcd/pki/etcd-ca.pem \\
  --advertise-client-urls=https://${ETCD_IP}:2379 \\
  --listen-client-urls=https://${ETCD_IP}:2379 \\
  --listen-peer-urls=https://${ETCD_IP}:2380 \\
  --initial-advertise-peer-urls=https://${ETCD_IP}:2380 \\
  --initial-cluster=etcd1=${INITIAL_CLUSTER} \\
  --initial-cluster-token=k8s-etcd-cluster \\
  --initial-cluster-state=new \\
  --data-dir=/var/lib/etcd
Restart=on-failure
RestartSec=5
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF
```

相关说明：
  * --client-cert-auth：启用客户端证书认证，默认为 false，表示不需要客户端证书也能访问 etcd；
  * --cert-file: 这里也使用对等证书，否则会有一个错误提示；
  * --listen-client-urls：如果监听了 `127.0.0.1:2379`，可以在 etcd 节点不使用客户端证书直接访问 etcd，如：`ETCDCTL_API=3 etcdctl get / --prefix --keys-only`；

### 启动 etcd 服务 【ALL ETCD】

```bash
# 清空存储目录
$ rm -rf /var/lib/etcd && mkdir -p /var/lib/etcd

# 运行
$ systemctl daemon-reload
$ systemctl enable etcd
$ systemctl start etcd

# 查看状态
$ systemctl status etcd

# 排查日志
$ journalctl -f -u etcd
```

> 注意：启动第一个 etcd 时可能会卡住（原因是 3 个 etcd 组成的集群最少需要 ２ 个 etcd 正常运行），待启动第一个 etcd 后立即启动第二个即可。

## 操作 etcd

### 健康检查

```bash
# 使用客户端证书
$ ETCDCTL_API=3 etcdctl --endpoints=https://192.168.10.80:2379,https://192.168.10.81:2379,https://192.168.10.82:2379 \
  --cacert=/etc/etcd/pki/etcd-ca.pem \
  --key=/etc/etcd/pki/etcd-client-key.pem \
  --cert=/etc/etcd/pki/etcd-client.pem \
  endpoint health
```

为了便于操作，我们把证书统一放到环境变量中：

```bash
$ cat <<EOF >> ~/.bashrc
export ETCDCTL_API=3
export ETCDCTL_CACERT=/etc/etcd/pki/etcd-ca.pem
export ETCDCTL_KEY=/etc/etcd/pki/etcd-client-key.pem
export ETCDCTL_CERT=/etc/etcd/pki/etcd-client.pem
export ETCDCTL_ENDPOINTS=https://192.168.10.80:2379,https://192.168.10.81:2379,https://192.168.10.82:2379
EOF

# 使环境变量生效
$ source ~/.bashrc

# 集群状态
$ etcdctl endpoint health
https://192.168.10.81:2379 is healthy: successfully committed proposal: took = 1.979898ms
https://192.168.10.82:2379 is healthy: successfully committed proposal: took = 1.874018ms
https://192.168.10.80:2379 is healthy: successfully committed proposal: took = 1.728605ms

# 集群成员
$ etcdctl member list
425e7764da473110, started, etcd1, https://192.168.10.80:2380, https://192.168.10.80:2379
b9049dc60e51a3c2, started, etcd3, https://192.168.10.82:2380, https://192.168.10.82:2379
baaab2fe299e712a, started, etcd2, https://192.168.10.81:2380, https://192.168.10.81:2379
```

### 基本命令

```bash
# 查询所有 key
$ etcdctl get / --prefix --keys-only

# 写入值
$ etcdctl put /foo bar

# 查看某个 key
$ etcdctl get /foo --prefix

$ 删除某个 key
$ etcdctl del /foo --prefix
```


## 集群扩展

待 etcd 集群部署好后，可能会因为最初部署的集群不满足当前需求，需要增加或者减少节点来满足需求，但是需要确保集群节点个数为 `奇数`，这里仅作演示。

### 添加成员 【任一 etcd 节点】

假设我们要增加一个节点 `192.168.10.100`，需要在原来的集群中添加它的 `peer-urls`。

```bash
$ etcdctl member add etcd4 --peer-urls="https://192.168.10.100:2380"
Member  142f0d0ebf55bc1 added to cluster 6275ca1fffd53f66
```

### 为新成员签发证书 【kube-master-1】

为新成员签发服务端证书：

```bash
$ mkdir -p /tmp/etcd/etcd4

# 自定义节点 IP
$ MEMBER_IP=192.168.10.100

# 服务端 csr 配置
$ cat > /tmp/etcd/etcd4/etcd-server-csr.json <<EOF
{
  "CN": "etcd-server",
  "hosts": [
    "127.0.0.1",
    "${MEMBER_IP}"
  ],
  "key": {
    "algo": "rsa",
    "size": 2048
  },
  "names": [
    {
      "C": "CN",
      "ST": "ShangHai",
      "L": "ShangHai",
      "O": "ETCD"
    }
  ]
}
EOF

# 成员间通信的 csr 配置
$ cat > /tmp/etcd/etcd4/etcd-member-csr.json <<EOF
{
  "CN": "etcd-member",
  "hosts": [
    "127.0.0.1",
    "${MEMBER_IP}"
  ],
  "key": {
    "algo": "rsa",
    "size": 2048
  },
  "names": [
    {
      "C": "CN",
      "ST": "ShangHai",
      "L": "ShangHai",
      "O": "ETCD"
    }
  ]
}
EOF
```

签发证书（客户端证书不用再单独签发）：

```bash
$ cd /etc/kubernetes/pki

# 生成服务端证书（server auth + client auth）
$ cfssl gencert -ca=etcd-ca.pem -ca-key=etcd-ca-key.pem \
-config=etcd-ca-config.json -profile=etcd /tmp/etcd/etcd4/etcd-server-csr.json | cfssljson -bare /tmp/etcd/etcd4/etcd-server

# 生成对等证书
$ cfssl gencert -ca=etcd-ca.pem -ca-key=etcd-ca-key.pem \
-config=etcd-ca-config.json -profile=etcd /tmp/etcd/etcd4/etcd-member-csr.json | cfssljson -bare /tmp/etcd/etcd4/etcd-peer
```

分发证书：

```bash
$ MEMBERS=(192.168.10.100)
$ for member in ${MEMBERS[@]}; do
  ssh -t root@${member} "mkdir -p /etc/etcd/pki"; \
  scp /tmp/etcd/etcd4/etcd-server* root@${member}:/etc/etcd/pki; \
  scp /tmp/etcd/etcd4/etcd-peer* root@${member}:/etc/etcd/pki; \
  scp /etc/etcd/pki/etcd-client* root@${member}:/etc/etcd/pki; \
done
```

### 启动新的 etcd 成员 【新节点】

配置：

```bash
$ cat <<EOF > /usr/lib/systemd/system/etcd.service
[Unit]
Description=Etcd Server
After=network.target
After=network-online.target
Wants=network-online.target

[Service]
Type=notify
ExecStart=/usr/bin/etcd \\
  --name=${ETCD_NAME} \\
  --client-cert-auth=true \\
  --cert-file=/etc/etcd/pki/etcd-server.pem \\
  --key-file=/etc/etcd/pki/etcd-server-key.pem \\
  --trusted-ca-file=/etc/etcd/pki/etcd-ca.pem \\
  --peer-client-cert-auth=true \\
  --peer-cert-file=/etc/etcd/pki/etcd-peer.pem \\
  --peer-key-file=/etc/etcd/pki/etcd-peer-key.pem \\
  --peer-trusted-ca-file=/etc/etcd/pki/etcd-ca.pem \\
  --advertise-client-urls=https://${ETCD_IP}:2379 \\
  --listen-client-urls=https://${ETCD_IP}:2379 \\
  --listen-peer-urls=https://${ETCD_IP}:2380 \\
  --initial-advertise-peer-urls=https://${ETCD_IP}:2380 \\
  --initial-cluster=etcd1=https://192.168.10.80:2380,etcd2=https://192.168.10.81:2380,etcd3=https://192.168.10.82:2380,etcd4=https://192.168.10.100:2380 \\
  --initial-cluster-token=k8s-etcd-cluster \\
  --initial-cluster-state=existing \\
  --data-dir=/var/lib/etcd
Restart=on-failure
RestartSec=5
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF
```

运行：

```bash
# 清空存储目录
$ rm -rf /var/lib/etcd && mkdir -p /var/lib/etcd

# 运行
$ systemctl daemon-reload
$ systemctl enable etcd
$ systemctl start etcd

# 查看状态
$ systemctl status etcd

# 排查日志
$ journalctl -f -u etcd

# 查看集群成员
$ etcdctl member list
142f0d0ebf55bc1, started, etcd4, https://192.168.10.100:2380, https://192.168.10.100:2379
425e7764da473110, started, etcd1, https://192.168.10.80:2380, https://192.168.10.80:2379
b9049dc60e51a3c2, started, etcd3, https://192.168.10.82:2380, https://192.168.10.82:2379
baaab2fe299e712a, started, etcd2, https://192.168.10.81:2380, https://192.168.10.81:2379
```

### 移除成员 【任一 etcd 节点】

```bash
# 移除
$ etcdctl member remove 142f0d0ebf55bc1

# 检查
$ etcdctl member list
425e7764da473110, started, etcd1, https://192.168.10.80:2380, https://192.168.10.80:2379
b9049dc60e51a3c2, started, etcd3, https://192.168.10.82:2380, https://192.168.10.82:2379
baaab2fe299e712a, started, etcd2, https://192.168.10.81:2380, https://192.168.10.81:2379
```


## 参考

* [Generate self-signed certificates](https://coreos.com/os/docs/latest/generate-self-signed-certificates.html)

* [etcd 启用 https](http://www.jianshu.com/p/1043903bc359)
* [ETCD Security model](https://coreos.com/etcd/docs/latest/op-guide/security.html)
