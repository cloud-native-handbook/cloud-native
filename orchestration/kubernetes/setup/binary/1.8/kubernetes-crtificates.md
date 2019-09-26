# 创建 Kubernetes 证书

## CA & SSL/TLS

CA，即 Certificate Authority，也就是证书签发机构，负责签发证书。CA 证书将使用默认的 ServiceAccount 自动加载到 Pod 的 `/var/run/secrets/kubernetes.io/serviceaccount/ca.crt` 路径下。

单向认证 vs 双向认证：
  * 单向认证：客户端会验证服务器端身份，而服务器端不会验证客户端身份。
  * 双向认证：双方交换证书，并相互验证对方的身份。

双向认证流程：
  1. client 发送请求到 server，包括加密方式（`加密算法` 和 `秘钥大小`）；
  2. server 选择双方都支持的加密方式，并响应 client；
  3. server 发送一个证书/证书链到 client；


## 安装 CFSSL 【All Master】

`Kubernetes` 中各个组件均需要使用 TLS 证书对通信进行加密，本文档使用 CloudFlare 的 PKI 工具集 cfssl 来签发所有证书和私钥。

```bash
$ ops/cfssl/install-cfssl.sh
$ cfssl version
```


## 自签名 CA

### 创建 CA 配置文件 【kube-master-1】

CA 配置文件用于签发证书时设置证书的过期时间、用途、使用场景等等。

```bash
$ mkdir -p /etc/kubernetes/pki

$ cat <<EOF > /etc/kubernetes/pki/kubernetes-ca-config.json
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
      "kubernetes": {
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

  * Kubenretes 中大部分组件都会即作为客户端又作为服务端（kubectl、kubefed 仅作为客户端），所以签发证书是需要同时指定 `server auth` 和 `client auth`。

### 为 CA 创建 CSR 配置文件 【kube-master-1】

```bash
$ mkdir -p /etc/kubernetes/csr

$ cat <<EOF > /etc/kubernetes/csr/kubernetes-ca-csr.json
{
  "CN": "Kubernetes CA",
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

相关说明：

  * `CSR`：Cerificate Signing Request（证书签名请求）；证书申请者在申请数字证书之前，除了要生成证书私钥外，还要生成 CSR 并将其提交给 CA 认证中心；CSR 是公钥证书原始文件，包含了证书申请者的服务器信息、单位信息等等；
  * `C`：Country Code，证书申请者所在国家的国码；
  * `ST`：State，证书申请者所在的省份；
  * `L`：Locality，证书申请者所在的城市；
  * `O`：Organization，用户所属组织/单位；kube-apiserver 从证书中提取该字段作为请求用户所属的组（Group）；
  * `OU`：Organization Unit，用户所属的部门；可选；
  * `CN`：Common Name，kube-apiserver 从证书中提取该字段作为请求的用户名（User Name）；浏览器使用该字段验证网站是否合法；如果是网站的话填写具体的域名；

由于是为了创建 CA 证书，所以 `CN`、`O`、`OU` 等字段均不是特别重要。


### 创建 CA 证书和私钥 【kube-master-1】

```bash
$ cd /etc/kubernetes/pki

$ cfssl gencert -initca /etc/kubernetes/csr/kubernetes-ca-csr.json | cfssljson -bare kubernetes-ca
[INFO] generating a new CA key and certificate from CSR
[INFO] generate received request
[INFO] received CSR
[INFO] generating key: rsa-2048
[INFO] encoded CSR
[INFO] signed certificate with serial number 450616179365730206569482666411351887051460531949

$ ls kubernetes-ca*
kubernetes-ca-config.json  kubernetes-ca.csr  kubernetes-ca-key.pem  kubernetes-ca.pem

# 转移 csr 文件
$ mv -f kubernetes-ca.csr ../csr

# 校验 CA 证书（由于是自签名证书，所以 subject 和 issuer 相同）
$ cfssl-certinfo -cert kubernetes-ca.pem
{
  "subject": {
    "common_name": "Kubernetes CA",
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
      "Kubernetes CA"
    ]
  },
  "issuer": {
    "common_name": "Kubernetes CA",
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
      "Kubernetes CA"
    ]
  },
  ......
}
```

### 分发 CA 证书和私钥 【kube-master-1】

为了方便 Master 节点管理、备份 CA，建议将 `CA 证书`、`CA 私钥`、`CA 配置文件` 分发到所有 Master 节点上，日后也可以在任一 Master 节点上签发证书。另外，由于 Node 节点需要使用 `CA 证书` 验证服务端的身份，还需要将 `CA 证书` 分发到所有 Node 节点。

```bash
# 分发 CA 相应文件到 Master 节点

$ OTHER_MASTERS=(kube-master-2 kube-master-3)
$ for master in ${OTHER_MASTERS[@]}; do
  ssh -t root@${master} "mkdir -p /etc/kubernetes/pki"; \
  scp /etc/kubernetes/pki/kubernetes-ca* root@${master}:/etc/kubernetes/pki; \
done
```

```bash
# 分发 CA 证书到所有 Worker 节点

$ OTHER_NODES=(kube-node-1 kube-node-2)
$ for worker in ${OTHER_NODES[@]}; do
  ssh -t root@${worker} "mkdir -p /etc/kubernetes/pki"; \
  scp /etc/kubernetes/pki/kubernetes-ca.pem root@${worker}:/etc/kubernetes/pki; \
done
```


## 创建 kube-apiserver 证书

### 为 kube-apiserver 创建 CSR 配置文件 【kube-master-1】

```bash
$ mkdir -p /etc/kubernetes/csr

$ cat <<EOF > /etc/kubernetes/csr/kube-apiserver-csr.json
{
  "CN": "kube-apiserver",
  "hosts": [
    "127.0.0.1",
    "172.254.0.1",
    "192.168.10.80",
    "192.168.10.81",
    "192.168.10.82",
    "192.168.10.99",
    "api.k8s.local",
    "kubernetes",
    "kubernetes.default",
    "kubernetes.default.svc",
    "kubernetes.default.svc.cluster",
    "kubernetes.default.svc.cluster.local"
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
      "O": "k8s",
      "OU": "PaaS"
    }
  ]
}
EOF
```

相关说明：

  * `hosts`：指定授权使用该证书的主机 IP 和域名列表，由于该证书会被 kubernetes master 集群使用，所以指定的是 master 节点的 IP 地址以及 "kubernetes" SVC 的虚拟 IP 地址；如果集群部署好后要增加 Master 节点，指定新节点的 IP 地址并为新节点单独签发一个服务端证书即可；
  * `192.168.10.99`：虚拟 IP （VIP），在部署高可用 Master 时会用到，该地址必须事先设定，并且设定后无法再修改。
  * `172.254.0.1`：`kube-apiserver` 指定的 `service-cluster-ip-range` 网段的第一个 IP 地址，即 “kubernetes” SVC 的虚拟 IP 地址，其 Endpoints 指定的就是 kube-apiserver 的实际地址；

### 为 kube-apiserver 生成证书和私钥 【kube-master-1】

```bash
$ cd /etc/kubernetes/pki

$ cfssl gencert -ca=kubernetes-ca.pem -ca-key=kubernetes-ca-key.pem \
-config=kubernetes-ca-config.json -profile=kubernetes ../csr/kube-apiserver-csr.json | cfssljson -bare kube-apiserver

$ ls kube-apiserver*
kube-apiserver.csr  kube-apiserver-key.pem  kube-apiserver.pem

# 转移 csr 文件
$ mv -f kube-apiserver.csr ../csr
```

### 分发 kube-apiserver 证书和私钥 【kube-master-1】

需要将 kube-apiserver 的证书和私钥分发到所有 Master 节点上。

```bash
$ cd /etc/kubernetes/pki

$ OTHER_MASTERS=(kube-master-2 kube-master-3)
$ for master in ${OTHER_MASTERS[@]}; do
  ssh -t root@${master} "mkdir -p /etc/kubernetes/pki"; \
  scp /etc/kubernetes/pki/kube-apiserver* root@${master}:/etc/kubernetes/pki; \
done
```


## 创建 kube-scheduler 客户端证书

### 为 kube-scheduler 创建 CSR 配置文件 【kube-master-1】

```bash
$ mkdir -p /etc/kubernetes/csr

$ cat <<EOF > /etc/kubernetes/csr/kube-scheduler-csr.json
{
  "CN": "system:kube-scheduler",
  "key": {
    "algo": "rsa",
    "size": 2048
  },
  "names": [
    {
      "C": "CN",
      "ST": "ShangHai",
      "L": "ShangHai",
      "O": "k8s",
      "OU": "PaaS"
    }
  ]
}
EOF
```

相关说明：

  * `CN`：指定该证书的 User 为 `system:kube-scheduler`，不可修改；原因是 kube-apiserver 首次运行时会自动为该用户绑定了 `system:kube-scheduler` ClusterRole（`kubectl get clusterrolebinding system:kube-scheduler`）；
  * `hosts`：这里不指定 hosts，目的是希望下发的客户端证书可以在所有 Master 节点通用；

```bash
# 待 kube-apiserver 启动后进行校验
$ kubectl get clusterrolebinding system:kube-scheduler -o yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  ...
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: system:kube-scheduler
subjects:
- apiGroup: rbac.authorization.k8s.io
  kind: User
  name: system:kube-schedule
```

### 生成 kube-scheduler 客户端证书和私钥 【kube-master-1】

```bash
$ cd /etc/kubernetes/pki

$ cfssl gencert -ca=kubernetes-ca.pem -ca-key=kubernetes-ca-key.pem \
-config=kubernetes-ca-config.json -profile=kubernetes ../csr/kube-scheduler-csr.json | cfssljson -bare kube-scheduler

$ ls kube-scheduler*
kube-scheduler.csr  kube-scheduler-key.pem  kube-scheduler.pem

# 转移 csr 文件
$ mv -f kube-scheduler.csr ../csr
```

### 分发 kube-scheduler 证书和私钥【kube-master-1】

```bash
$ OTHER_MASTERS=(kube-master-2 kube-master-3)
$ for master in ${OTHER_MASTERS[@]}; do
  ssh -t root@${master} "mkdir -p /etc/kubernetes/pki"; \
  scp /etc/kubernetes/pki/kube-scheduler* root@${master}:/etc/kubernetes/pki; \
done
```


## 创建 kube-controller-manager 客户端证书

### 为 kube-controller-manager 创建 CSR 配置文件 【kube-master-1】

```bash
$ mkdir -p /etc/kubernetes/csr

$ cat <<EOF > /etc/kubernetes/csr/kube-controller-manager-csr.json
{
  "CN": "system:kube-controller-manager",
  "key": {
    "algo": "rsa",
    "size": 2048
  },
  "names": [
    {
      "C": "CN",
      "ST": "ShangHai",
      "L": "ShangHai",
      "O": "k8s",
      "OU": "PaaS"
    }
  ]
}
EOF
```

相关说明：

  * `CN`：指定该证书的 User 为 `system:kube-controller-manager`，不可修改；原因是 kube-apiserver 首次运行时会自动为该用户绑定了 `system:kube-controller-manager` ClusterRole（`kubectl get clusterrolebinding system:kube-controller-manager`）；
  * `hosts`：这里不指定 hosts，目的是希望下发的客户端证书可以在所有 Master 节点通用；

```bash
# 待 kube-apiserver 启动后进行校验
$ kubectl get clusterrolebinding system:kube-controller-manager -o yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  ...
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: system:kube-controller-manager
subjects:
- apiGroup: rbac.authorization.k8s.io
  kind: User
  name: system:kube-controller-manager
```

### 生成 kube-controller-manager 客户端证书和私钥 【kube-master-1】

```bash
$ cd /etc/kubernetes/pki

$ cfssl gencert -ca=kubernetes-ca.pem -ca-key=kubernetes-ca-key.pem \
-config=kubernetes-ca-config.json -profile=kubernetes ../csr/kube-controller-manager-csr.json | cfssljson -bare kube-controller-manager

$ ls kube-controller-manager*
kube-controller-manager.csr  kube-controller-manager-key.pem  kube-controller-manager.pem

# 转移 csr 文件
$ mv -f kube-controller-manager.csr ../csr
```

### 分发 kube-controller-manager 证书和私钥【kube-master-1】

```bash
$ OTHER_MASTERS=(kube-master-2 kube-master-3)
$ for master in ${OTHER_MASTERS[@]}; do
  ssh -t root@${master} "mkdir -p /etc/kubernetes/pki"; \
  scp /etc/kubernetes/pki/kube-controller-manager* root@${master}:/etc/kubernetes/pki; \
done
```


## 为 kubelet 签发客户端证书

如果 kubelet 启用了 `Webhook` 授权模式，kube-apiserver 必须指定 `--kubelet-client-certificate` 和 `--kubelet-client-key` 来访问 kubelet，否则执行 `kubectl exec`、`kubectl logs` 等命令会出错。

#### CSR 配置 【k8s-master-1】

```bash
$ mkdir -p /etc/kubernetes/csr

$ cat > /etc/kubernetes/csr/apiserver-kubelet-client-csr.json <<EOF
{
  "CN": "apiserver-kubelet-client",
  "hosts": [
    "127.0.0.1",
    "172.254.0.1",
    "192.168.10.80",
    "192.168.10.81",
    "192.168.10.82",
    "192.168.10.99"
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
      "O": "system:masters"
    }
  ]
}
EOF
```

相关说明：
  * `CN`：可以自行修改；
  * `hosts`：不限定客户端 IP 地址，便于复用该证书；
  * `O`：Organization，用户组，这里必须是 `system:masters`。

### 生成证书和私钥

```bash
$ cd /etc/kubernetes/pki

$ cfssl gencert -ca=kubernetes-ca.pem -ca-key=kubernetes-ca-key.pem -config=kubernetes-ca-config.json \
--profile=kubernetes ../csr/apiserver-kubelet-client-csr.json | cfssljson -bare apiserver-kubelet-client

$ ls apiserver-kubelet-client*
apiserver-kubelet-client.csr  apiserver-kubelet-client-key.pem  apiserver-kubelet-client.pem

# 转移 csr 文件
$ mv -f apiserver-kubelet-client.csr ../csr
```

### 分发 kubelet 客户端证书 【kube-master-1】

```bash
$ # 分发到其它 Master 节点上
$ OTHER_MASTERS=(kube-master-2 kube-master-3)
$ for master in ${OTHER_MASTERS[@]}; do
  ssh -t root@${master} "mkdir -p /etc/kubernetes/pki"; \
  scp /etc/kubernetes/pki/apiserver-kubelet-client* root@${master}:/etc/kubernetes/pki; \
done
```


## 创建 kube-proxy 客户端证书

如果 kube-proxy 是使用 `二进制` 方式部署的话需要为其签发证书。

### 为 kube-proxy 创建 CSR 配置文件 【kube-master-1】

```bash
$ mkdir -p /etc/kubernetes/csr

$ cat <<EOF > /etc/kubernetes/csr/kube-proxy-csr.json
{
  "CN": "system:kube-proxy",
  "key": {
    "algo": "rsa",
    "size": 2048
  },
  "names": [
    {
      "C": "CN",
      "ST": "ShangHai",
      "L": "ShangHai",
      "O": "k8s",
      "OU": "PaaS"
    }
  ]
}
EOF
```

相关说明：

  * `CN`：指定该证书的 User 为 `system:kube-proxy`，不可修改；原因是 kube-apiserver 首次运行时会自动为该用户绑定了 `system:node-proxier` ClusterRole（`kubectl get clusterrolebinding system:node-proxier`）；
  * `hosts`：这里不指定 hosts，目的是希望下发的客户端证书可以在所有 Node 中使用；

```bash
# 待 kube-apiserver 启动后进行校验
$ kubectl get clusterrolebinding system:node-proxier -o yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  ...
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: system:node-proxier
subjects:
- apiGroup: rbac.authorization.k8s.io
  kind: User
  name: system:kube-proxy
```

### 生成 kube-proxy 客户端证书和私钥 【kube-master-1】

```bash
$ cd /etc/kubernetes/pki

# 客户端证书
$ cfssl gencert -ca=kubernetes-ca.pem -ca-key=kubernetes-ca-key.pem \
-config=kubernetes-ca-config.json -profile=kubernetes ../csr/kube-proxy-csr.json | cfssljson -bare kube-proxy

$ ls kube-proxy*
kube-proxy.csr  kube-proxy-key.pem  kube-proxy.pem

# 转移 csr 文件
$ mv -f kube-proxy.csr ../csr
```

### 分发 kube-proxy 证书和私钥【kube-master-1】

由于我们希望 Master 节点也能通过 Service IP 访问 Kubernetes 集群服务，所以将 `kube-proxy` 的证书和私钥分发到所有节点。

```bash
$ OTHER_NODES=(kube-master-2 kube-master-3 kube-node-1 kube-proxy-2)
$ for node in ${OTHER_NODES[@]}; do
  ssh -t root@${node} "mkdir -p /etc/kubernetes/pki"; \
  scp /etc/kubernetes/pki/kube-proxy* root@${node}:/etc/kubernetes/pki; \
done
```


## 创建用户证书

### 集群管理员

为了便于对 Kubernetes 集群进行管理，需要创建一个集群管理员（`cluster-admin`）并为其签发证书。

集群管理员可以 `完全` 访问 Kubernetes 集群。

为了方便管理 kubernetes 集群，需要创建一个集群管理员（假设是 `cluster-admin` User）来统一管理集群。kube-apiserver 首次启动的时候自动添加了一个 `cluster-admin` ClusterRoleBinding，将 `cluster-admin` ClusterRole 与 `system:masters` Group 绑定，所以创建集群管理员时只需要让其属于 `system:masters` Group 即可，用户名可以随意指定。

```bash
# 待集群运行正常后检查
$ kubectl get clusterrolebinding cluster-admin -o yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  ...
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
- apiGroup: rbac.authorization.k8s.io
  kind: Group
  name: system:masters
```

```bash
# 待集群运行正常后检查
$ kubectl get clusterrole cluster-admin -o yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  ...
rules:
- apiGroups:
  - '*'
  resources:
  - '*'
  verbs:
  - '*'
- nonResourceURLs:
  - '*'
  verbs:
  - '*'
```

### 为 cluster-admin 用户创建 CSR 配置文件【kube-master-1】

```bash
$ mkdir -p /etc/kubernetes/csr

$ cat <<EOF > /etc/kubernetes/csr/cluster-admin-csr.json
{
  "CN": "cluster-admin",
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
      "O": "system:masters",
      "OU": "PaaS"
    }
  ]
}
EOF
```

相关说明：

  * `CN`：Common Name，即用户名，可以自行修改；
  * `OU`：Organization，即用户组；指定该证书的 Group 为 `system:masters`；kube-apiserver 首次运行时会初始化一个 `cluster-admin` ClusterRoleBinding，将 `system:masters` Group 与 `cluster-admin` ClusterRole 进行绑定；
  * `hosts`: 这里不限定使用集群管理员证书的 IP 地址。

### 生成 cluster-admin 用户证书和私钥 【kube-master-1】

```bash
$ mkdir -p /etc/kubernetes/user && cd /etc/kubernetes/user

# 用户客户端证书
$ cfssl gencert -ca=../pki/kubernetes-ca.pem -ca-key=../pki/kubernetes-ca-key.pem \
-config=../pki/kubernetes-ca-config.json -profile=client ../csr/cluster-admin-csr.json | cfssljson -bare cluster-admin

$ ls cluster-admin*
cluster-admin.csr  cluster-admin-key.pem  cluster-admin.pem

# 转移 csr 文件
$ mv -f cluster-admin.csr ../csr
```

### 分发 cluster-admin 用户的证书和私钥 【kube-master-1】

目前只将 `cluster-admin` 用户的证书分发到 Master 节点。

```bash
$ OTHER_MASTERS=(kube-master-2 kube-master-3)
$ for master in ${OTHER_MASTERS[@]}; do
  ssh -t root@${master} "mkdir -p /etc/kubernetes/user"; \
  scp /etc/kubernetes/user/cluster-admin* root@${master}:/etc/kubernetes/user; \
done
```


## 参考

* [创建 CA 证书和秘钥](https://github.com/opsnull/follow-me-install-kubernetes-cluster/blob/master/02-%E5%88%9B%E5%BB%BACA%E8%AF%81%E4%B9%A6%E5%92%8C%E7%A7%98%E9%92%A5.md)
* [Certificates](https://kubernetes.io/docs/concepts/cluster-administration/certificates/)
* [Generate self-signed certificates](https://coreos.com/os/docs/latest/generate-self-signed-certificates.html)
> http://www.jianshu.com/p/1043903bc359
